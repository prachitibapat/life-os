/**
 * afterPack hook — runs after electron-builder packs the app but before
 * creating the installer. We use it to copy the Next.js standalone
 * node_modules back in, because electron-builder strips node_modules from
 * extraResources regardless of the filter setting.
 */

const fs   = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const projectRoot = context.packager.projectDir;
  const appOutDir   = context.appOutDir;

  const src = path.join(projectRoot, '.next', 'standalone', 'node_modules');
  const dst = path.join(appOutDir, 'resources', 'next-server', 'node_modules');

  if (!fs.existsSync(src)) {
    console.warn('[afterPack] WARNING: standalone node_modules not found at', src);
    console.warn('[afterPack] Make sure you ran `next build` first.');
    return;
  }

  console.log('[afterPack] Copying Next.js server node_modules...');
  console.log(`[afterPack]   ${src}`);
  console.log(`[afterPack] → ${dst}`);

  fs.cpSync(src, dst, { recursive: true, force: true });

  console.log('[afterPack] Done.');
};
