#!/usr/bin/env node
// Puts the Anthropic key on the Convex backend, where the browser can never read it.
//
//   npm run key            paste when prompted (input is masked)
//   npm run key -- --prod  same, for the production deployment
//
// Or write ANTHROPIC_API_KEY=sk-ant-... into .env.local and run it with no prompt.
// A bare (non-VITE_) name in .env.local is safe: Vite only exposes VITE_-prefixed
// variables to the browser bundle, and .env.* is gitignored.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const NAME = 'ANTHROPIC_API_KEY';
const prod = process.argv.includes('--prod');
const mask = key => `${key.slice(0, 11)}…${key.slice(-4)} (${key.length} chars)`;

function readEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (/^\s*VITE_.*(ANTHROPIC|API_?KEY)/i.test(line)) {
        console.error(`\n✗ ${file} has a VITE_-prefixed key.\n`);
        console.error('  Vite compiles VITE_ variables into the public browser bundle,');
        console.error(`  so that key is readable by anyone. Rename it to plain ${NAME}.\n`);
        process.exit(1);
      }
      const match = line.match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/);
      if (match) return { key: match[1].replace(/^['"]|['"]$/g, ''), from: file };
    }
  }
  return null;
}

function prompt() {
  return new Promise(resolve => {
    const question = `Paste your Anthropic API key (input hidden): `;
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Echo asterisks so a shoulder-surfer — or a screen recording — never sees the key.
    rl._writeToOutput = text => rl.output.write(text.includes(question) ? question : '*');
    rl.question(question, answer => { rl.close(); process.stdout.write('\n'); resolve(answer.trim()); });
  });
}

const found = readEnvFiles();
const key = found?.key || (process.env[NAME] ?? '').trim() || await prompt();

if (!key) { console.error(`\n✗ No key given. Nothing was changed.\n`); process.exit(1); }
if (!key.startsWith('sk-ant-')) {
  console.error(`\n✗ That does not look like an Anthropic key (expected it to start with "sk-ant-").`);
  console.error('  Get one at https://console.anthropic.com → Settings → API Keys\n');
  process.exit(1);
}

console.log(`\nSetting ${NAME} = ${mask(key)}`);
console.log(`  source     ${found ? found.from : process.env[NAME] ? 'environment' : 'prompt'}`);
console.log(`  deployment ${prod ? 'production' : 'development'}\n`);

// The value is passed as an argument, so it is briefly visible in `ps` to other users
// on this machine. That is the only interface the Convex CLI offers.
const args = ['convex', 'env', 'set', ...(prod ? ['--prod'] : []), NAME, key];
const result = spawnSync('npx', args, { stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf8' });
const stderr = result.stderr ?? '';

if (result.status !== 0) {
  // Never echo the failing command: it contains the key.
  console.error(stderr.replace(key, '«key»').trim());
  if (/deployment|not configured|convex dev|logged in/i.test(stderr)) {
    console.error('\n→ No Convex deployment yet. Run `npx convex dev` once, then try again.\n');
  }
  process.exit(result.status ?? 1);
}

console.log(`✓ Stored on the ${prod ? 'production' : 'development'} deployment.`);
console.log('  The browser never receives it — convex/anthropic.ts reads it server-side.');
console.log('  Check any time with: npx convex env list\n');
