import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CLEANUP_ITEMS, getDiskInfo, scanItem, cleanItem, scanItemDetails, cleanSelectedPaths } from './scanner';

const execAsync = promisify(exec);

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 680,
    height: 840,
    minWidth: 520,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#faf8f4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('disk:info', async () => {
  return getDiskInfo();
});

ipcMain.handle('cleanup:items', () => {
  return CLEANUP_ITEMS;
});

ipcMain.handle('scan:start', async (event) => {
  const queue = [...CLEANUP_ITEMS];
  const CONCURRENCY = 4;

  async function runNext(): Promise<void> {
    const item = queue.shift();
    if (!item) return;
    try {
      const result = await scanItem(item.id);
      event.sender.send('scan:result', result);
    } catch (e: any) {
      event.sender.send('scan:result', {
        id: item.id,
        size: 0,
        available: false,
        error: e.message || String(e),
      });
    }
    await runNext();
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => runNext()));
});

ipcMain.handle('scan:item', async (_event, id: string) => {
  return scanItem(id);
});

ipcMain.handle('clean:item', async (_event, id: string) => {
  return cleanItem(id);
});

ipcMain.handle('scan:details', async (_event, id: string) => {
  return scanItemDetails(id);
});

ipcMain.handle('clean:selected', async (_event, paths: string[]) => {
  return cleanSelectedPaths(paths);
});

ipcMain.handle('open:external', async (_event, url: string) => {
  if (url.startsWith('https://')) {
    shell.openExternal(url);
  }
});

ipcMain.handle('reveal:finder', async (_event, id: string) => {
  const home = homedir();
  const paths: Record<string, string> = {
    'next-dirs': path.join(home, 'Developer'),
    'turbo-cache': path.join(home, 'Developer'),
    'expo-dirs': path.join(home, 'Developer'),
    'gradle-cache': path.join(home, '.gradle'),
    'pnpm-store': path.join(home, 'Library', 'pnpm'),
    'yarn-cache': path.join(home, 'Library', 'Caches', 'Yarn'),
    'cocoapods-cache': path.join(home, 'Library', 'Caches', 'CocoaPods'),
    'pip-cache': path.join(home, 'Library', 'Caches', 'pip'),
    'xcode-derived-data': path.join(home, 'Library', 'Developer', 'Xcode', 'DerivedData'),
    'core-simulator-unavailable': path.join(home, 'Library', 'Developer', 'CoreSimulator'),
    'shipit-caches': path.join(home, 'Library', 'Caches'),
    'playwright-browsers': path.join(home, 'Library', 'Caches', 'ms-playwright'),
    'trash': path.join(home, '.Trash'),
  };

  let targetPath = paths[id] || '';

  if (id === 'homebrew-cache') {
    try {
      const { stdout } = await execAsync('brew --cache 2>/dev/null', { timeout: 5000 });
      targetPath = stdout.trim();
    } catch { /* ignore */ }
  }

  if (targetPath && existsSync(targetPath)) {
    shell.openPath(targetPath);
  }
});
