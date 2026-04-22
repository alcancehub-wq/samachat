import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const targets = [
  'apps/web/.next',
  'apps/api/dist',
  'apps/worker/dist',
  'packages/shared/dist',
  'packages/logger/dist',
  'packages/messaging/dist',
  'packages/storage/dist',
  'packages/config/dist',
  'node_modules/.cache',
  '.turbo',
];

const hardTargets = ['node_modules'];

const isHard = process.argv.includes('--hard');

console.log('reset: cleaning build outputs');
for (const target of targets) {
  const fullPath = path.resolve(target);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`removed ${target}`);
  }
}

if (isHard) {
  console.log('reset: hard cleanup');
  for (const target of hardTargets) {
    const fullPath = path.resolve(target);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`removed ${target}`);
    }
  }
}

console.log('reset: reinstalling dependencies');
execSync('pnpm install', { stdio: 'inherit' });

console.log('reset: prisma generate');
try {
  execSync('pnpm prisma:generate', { stdio: 'inherit' });
} catch {
  console.warn('reset: prisma generate failed (check packages/db/.env)');
}
