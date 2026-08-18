import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'VideoFetch',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const PORT = Math.floor(Math.random() * 10000) + 30000;

  const serverScript = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar/server/src/index.js')
    : path.join(__dirname, '../server/src/index.js');
    
  const ytdlpBin = app.isPackaged
    ? path.join(process.resourcesPath, 'bin/yt-dlp.exe')
    : path.join(__dirname, '../server/bin/yt-dlp.exe');

  console.log('[Electron] Starting server at:', serverScript);
  console.log('[Electron] Using yt-dlp binary at:', ytdlpBin);

  serverProcess = spawn('node', [serverScript], {
    env: {
      ...process.env,
      PORT: PORT.toString(),
      IS_ELECTRON: 'true',
      YTDLP_PATH: ytdlpBin,
      NODE_ENV: app.isPackaged ? 'production' : 'development'
    }
  });

  serverProcess.stdout.on('data', (data) => console.log(`[Server]: ${data}`));
  serverProcess.stderr.on('data', (data) => console.error(`[Server]: ${data}`));

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
  if (serverProcess) {
    serverProcess.kill();
  }
});
