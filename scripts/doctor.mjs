import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { execSync, spawnSync } from 'node:child_process';

const checks = [
  {
    name: 'root',
    dir: '.',
    files: ['.env.local', '.env'],
    required: ['DATABASE_URL', 'REDIS_URL'],
  },
  {
    name: 'apps/api',
    dir: 'apps/api',
    files: ['.env.local', '.env'],
    required: ['PORT', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'],
  },
  {
    name: 'apps/web',
    dir: 'apps/web',
    files: ['.env.local', '.env'],
    required: ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  },
  {
    name: 'apps/worker',
    dir: 'apps/worker',
    files: ['.env.local', '.env'],
    required: ['REDIS_URL'],
  },
  {
    name: 'packages/db',
    dir: 'packages/db',
    files: ['.env', '.env.local'],
    required: ['DATABASE_URL'],
  },
];

function parseEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key) {
      env[key] = value.replace(/^"|"$/g, '');
    }
  }
  return env;
}

function loadEnv(dir, files) {
  const merged = {};
  const foundFiles = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    Object.assign(merged, parseEnv(content));
    foundFiles.push(filePath);
  }
  return { env: merged, foundFiles };
}

let totalMissing = 0;
let totalWarnings = 0;
console.log('doctor: environment checks');

function ok(message) {
  console.log(`[OK] ${message}`);
}

function warn(message) {
  totalWarnings += 1;
  console.warn(`[WARN] ${message}`);
}

function fail(message) {
  totalMissing += 1;
  console.error(`[FAIL] ${message}`);
}

function run(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

function checkCommand(cmd, label) {
  try {
    const result = run(cmd);
    ok(`${label}: ${result}`);
    return true;
  } catch {
    fail(`${label} not available`);
    return false;
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        warn(`port ${port} already in use`);
      } else {
        warn(`port ${port} check failed`);
      }
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        ok(`port ${port} available`);
        resolve(true);
      });
    });
    server.listen(port, '127.0.0.1');
  });
}

async function checkRedis(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.once('connect', () => {
      ok(`Redis reachable at ${host}:${port}`);
      socket.end();
      resolve(true);
    });
    socket.once('error', () => {
      fail(`Redis not reachable at ${host}:${port}`);
      socket.destroy();
      resolve(false);
    });
  });
}

ok(`Node ${process.version}`);
checkCommand('pnpm -v', 'pnpm');
checkCommand('docker -v', 'docker');
checkCommand('docker compose version', 'docker compose');

for (const check of checks) {
  const { env, foundFiles } = loadEnv(check.dir, check.files);
  const missing = check.required.filter((key) => !env[key] || env[key].trim() === '');
  if (foundFiles.length === 0) {
    warn(`${check.name}: missing env file (.env or .env.local)`);
  }
  if (missing.length > 0) {
    totalMissing += missing.length;
    fail(`${check.name}: missing ${missing.join(', ')}`);
  } else if (foundFiles.length > 0) {
    ok(`${check.name}: env OK`);
  }
}

const schemaPath = path.join('packages', 'db', 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  ok('Prisma schema found');
} else {
  fail('Prisma schema missing at packages/db/prisma/schema.prisma');
}

await checkPort(3000);
await checkPort(3001);
await checkRedis('127.0.0.1', 6379);

try {
  const parseVersions = (text) =>
    new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.match(/ioredis@(\d+\.\d+\.\d+)/))
        .filter(Boolean)
        .map((match) => match[1]),
    );

  const result = spawnSync('pnpm', ['-r', 'why', 'ioredis', '--color=never'], {
    encoding: 'utf-8',
  });
  const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  let versions = parseVersions(combinedOutput);

  if (versions.size === 0) {
    const fallbackOutput = run('pnpm -r why ioredis --color=never');
    versions = parseVersions(fallbackOutput);
  }

  if (versions.size === 1) {
    ok(`ioredis single version (${Array.from(versions)[0]})`);
  } else if (versions.size > 1) {
    warn(`ioredis multiple versions (${Array.from(versions).join(', ')})`);
  } else {
    warn('ioredis not found in pnpm why output');
  }
} catch {
  warn('pnpm why ioredis failed');
}

if (totalMissing > 0) {
  console.error(`doctor: ${totalMissing} failure(s)`);
  process.exit(1);
}

if (totalWarnings > 0) {
  console.warn(`doctor: ${totalWarnings} warning(s)`);
}