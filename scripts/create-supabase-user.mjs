import fs from 'node:fs';
import path from 'node:path';

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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return parseEnv(fs.readFileSync(filePath, 'utf8'));
}

const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

if (!email || !password) {
  console.error('usage: node scripts/create-supabase-user.mjs <email> <password>');
  process.exit(1);
}

const apiEnv = loadEnvFile(path.join('apps', 'api', '.env.local'));
const supabaseUrl = apiEnv.SUPABASE_URL;
const serviceRoleKey = apiEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.local');
  process.exit(1);
}

const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
  }),
});

const text = await response.text();
if (!response.ok) {
  console.error(`Supabase error (${response.status}): ${text}`);
  process.exit(1);
}

console.log(`Created Supabase user: ${email}`);
console.log(text);
