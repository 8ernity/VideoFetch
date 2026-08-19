import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

async function createWindow() {
  const appIconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar/client/dist/logo.png')
    : path.join(__dirname, '../client/public/logo.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'VideoFetch',
    icon: appIconPath,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const PORT = Math.floor(Math.random() * 10000) + 30000;

  const ytdlpBin = app.isPackaged
    ? path.join(process.resourcesPath, 'bin/yt-dlp.exe')
    : path.join(__dirname, '../server/bin/yt-dlp.exe');

  console.log('[Electron] Using yt-dlp binary at:', ytdlpBin);

  // Set environment variables before loading the server
  process.env.PORT = PORT.toString();
  process.env.IS_ELECTRON = 'true';
  process.env.YTDLP_PATH = ytdlpBin;
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';

  // Run the Express server natively in the Electron main process
  try {
    const serverModulePath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar/server/src/index.js')
      : path.join(__dirname, '../server/src/index.js');
    
    // Dynamic import to ensure env vars are applied first
    await import('file://' + serverModulePath);
    console.log('[Electron] Internal Express server started successfully.');
  } catch (err) {
    console.error('[Electron] Failed to start internal server:', err);
  }

  const checkServer = setInterval(() => {
    http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
      if (res.statusCode === 200) {
        clearInterval(checkServer);
        if (app.isPackaged) {
           mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
        } else {
           mainWindow.loadURL(`http://localhost:5173`);
        }
      }
    }).on('error', () => {
      // ignore, keep waiting
    });
  }, 500);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  // Server is running inside the main process now, so it will exit automatically when Electron quits.
});
