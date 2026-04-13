/**
 * Build script for the Life OS Electron app.
 *
 * Usage:
 *   node scripts/build-electron.mjs               # stable build, no publish
 *   node scripts/build-electron.mjs --rc           # RC build, no publish
 *   node scripts/build-electron.mjs --publish      # stable build + publish to GitHub
 *   node scripts/build-electron.mjs --rc --publish # RC build + publish to GitHub
 *
 * Steps:
 *  1. next build  →  .next/standalone/
 *  2. Copy .next/static  →  .next/standalone/.next/static
 *  3. Copy public/       →  .next/standalone/public
 *  4. tsc -p tsconfig.electron.json  →  dist-electron/
 *  5. electron-builder --win --config electron-builder.<stable|rc>.json
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const isRC          = process.argv.includes('--rc');
const shouldPublish = process.argv.includes('--publish');
const configFile    = isRC ? 'electron-builder.rc.json' : 'electron-builder.stable.json';
const buildLabel    = isRC ? 'Life OS RC' : 'Life OS (stable)';

console.log(`\n Building: ${buildLabel}`);
console.log(` Config:   ${configFile}`);
console.log(` Publish:  ${shouldPublish ? 'yes → GitHub Releases' : 'no'}\n`);

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

// ── Step 1: Build Next.js ──────────────────────────────────────────────────────
console.log('── Step 1/4: Building Next.js ───────────────────────────────────');
run('npx next build');

// ── Step 2 & 3: Copy static assets into standalone output ─────────────────────
console.log('\n── Step 2/4: Copying static assets into standalone ──────────────');

const nextDir       = path.join(root, '.next');
const standaloneDir = path.join(nextDir, 'standalone');

const staticSrc = path.join(nextDir, 'static');
const staticDst = path.join(standaloneDir, '.next', 'static');
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDst, { recursive: true, force: true });
  console.log('  ✓ .next/static → standalone/.next/static');
}

const publicSrc = path.join(root, 'public');
const publicDst = path.join(standaloneDir, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDst, { recursive: true, force: true });
  console.log('  ✓ public/ → standalone/public');
}

// ── Step 3: Compile Electron TypeScript ───────────────────────────────────────
console.log('\n── Step 3/4: Compiling Electron TypeScript ──────────────────────');
run('npx tsc -p tsconfig.electron.json');

// ── Step 4: Package with electron-builder ─────────────────────────────────────
console.log(`\n── Step 4/4: Packaging with electron-builder (${configFile}) ────`);
const publishFlag = shouldPublish ? '--publish always' : '--publish never';
run(`npx electron-builder --win --config ${configFile} ${publishFlag}`);

console.log(`\n✓ Done — installer is in dist-app/`);
