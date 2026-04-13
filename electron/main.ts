import { app, BrowserWindow, shell, utilityProcess, dialog } from 'electron';
import path from 'path';
import net from 'net';
import fs from 'fs';

// Set the app name before any app.getPath() calls so that userData, logs, etc.
// are namespaced correctly for each channel (stable vs RC).
// electron-builder sets productName in the installer/shortcut but does NOT
// override the runtime app name — we derive it from the install path instead.
if (app.isPackaged) {
  const isRC = process.resourcesPath.includes('Life OS RC');
  app.setName(isRC ? 'Life OS RC' : 'Life OS');
}

let mainWindow: BrowserWindow | null = null;
let nextServer: ReturnType<typeof utilityProcess.fork> | null = null;
let appPort = 3000;

const isDev = !app.isPackaged;

// ── File logger (writes to %APPDATA%\<AppName>\logs\main.log) ─────────────────
let logStream: fs.WriteStream | null = null;

function initLogger() {
  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  logStream = fs.createWriteStream(path.join(logDir, 'main.log'), { flags: 'a' });
  log(`──────────────────────────────────────`);
  log(`Life OS starting  isDev=${isDev}  version=${app.getVersion()}`);
}

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream?.write(line + '\n');
}

// ── Find a free TCP port ───────────────────────────────────────────────────────
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on('error', reject);
  });
}

// ── Poll until the Next.js HTTP server is accepting connections ────────────────
function waitForServer(port: number, timeout = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const tryConnect = () => {
      const sock = net.connect({ host: '127.0.0.1', port }, () => {
        sock.destroy();
        resolve();
      });
      sock.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`Server did not respond on port ${port} within ${timeout / 1000}s`));
          return;
        }
        setTimeout(tryConnect, 500);
      });
    };
    tryConnect();
  });
}

// ── Resolve path to the Next.js standalone server.js ──────────────────────────
function getServerPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', '.next', 'standalone', 'server.js');
  }
  return path.join(process.resourcesPath, 'next-server', 'server.js');
}

// ── Start the Next.js server in a utility process ─────────────────────────────
function startNextServer(port: number): void {
  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const serverPath = getServerPath();
  log(`Server path: ${serverPath}`);
  log(`Server path exists: ${fs.existsSync(serverPath)}`);
  log(`userData: ${app.getPath('userData')}`);
  log(`resourcesPath: ${isDev ? 'N/A (dev)' : process.resourcesPath}`);

  if (!fs.existsSync(serverPath)) {
    throw new Error(
      `Next.js server not found at:\n${serverPath}\n\nThe app may not have been built correctly.`
    );
  }

  nextServer = utilityProcess.fork(serverPath, [], {
    cwd: path.dirname(serverPath),
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      LIFEOS_DATA_DIR: dataDir,
    },
  });

  nextServer.stdout?.on('data', (d: Buffer) => log(`[Next] ${d.toString().trim()}`));
  nextServer.stderr?.on('data', (d: Buffer) => log(`[Next ERR] ${d.toString().trim()}`));
  nextServer.on('exit', (code: number) => log(`[Next] exited with code ${code}`));

  log(`Next.js server started on port ${port}`);
}

// ── Create the main BrowserWindow ─────────────────────────────────────────────
function createWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    title: 'Life OS',
    backgroundColor: '#0a0a0a',
  });

  const url = `http://127.0.0.1:${port}`;
  log(`Loading URL: ${url}`);
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    log('Window ready-to-show, displaying');
    mainWindow?.show();
  });

  // Fallback: show the window after 10 s even if ready-to-show never fires
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      log('Fallback: forcing window visible after 10s timeout');
      mainWindow.show();
    }
  }, 10_000);

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url: u }) => {
    if (u.startsWith('http')) shell.openExternal(u);
    return { action: 'deny' };
  });
}

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  initLogger();

  try {
    if (isDev) {
      appPort = 3000;
    } else {
      appPort = await getFreePort();
      log(`Allocated port ${appPort}`);
      startNextServer(appPort);
      log('Waiting for Next.js server to be ready...');
      await waitForServer(appPort);
      log('Next.js server is ready');
    }

    createWindow(appPort);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`FATAL: ${msg}`);

    const logPath = path.join(app.getPath('userData'), 'logs', 'main.log');
    dialog.showErrorBox(
      'Life OS failed to start',
      `${msg}\n\nCheck the log file for details:\n${logPath}`
    );
    app.quit();
    return;
  }

  // Auto-updater (production only)
  if (!isDev) {
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.channel = app.getName() === 'Life OS RC' ? 'beta' : 'latest';
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  nextServer?.kill();
  logStream?.end();
});

app.on('activate', () => {
  if (!mainWindow) createWindow(appPort);
});
