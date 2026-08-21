import { app, BrowserWindow, session, dialog } from 'electron';
import fs from 'fs';
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
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logDebug(`[Client Console]: ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logDebug(`[Client Fail Load]: ${errorCode} ${errorDescription} ${validatedURL}`);
  });

  const PORT = Math.floor(Math.random() * 10000) + 30000;

  const ytdlpBin = app.isPackaged
    ? path.join(process.resourcesPath, 'bin/yt-dlp.exe')
    : path.join(__dirname, '../server/bin/yt-dlp.exe');
    
  const ffmpegBin = app.isPackaged
    ? path.join(process.resourcesPath, 'bin/ffmpeg.exe')
    : path.join(__dirname, '../server/bin/ffmpeg.exe');

  console.log('[Electron] Using yt-dlp binary at:', ytdlpBin);
  console.log('[Electron] Using ffmpeg binary at:', ffmpegBin);

  // Set environment variables before loading the server
  process.env.PORT = PORT.toString();
  process.env.IS_ELECTRON = 'true';
  process.env.YTDLP_PATH = ytdlpBin;
  process.env.FFMPEG_PATH = ffmpegBin;
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';

  const debugLogPath = path.join(app.getPath('userData'), 'server_debug.log');
  fs.writeFileSync(debugLogPath, '[Electron] Starting up...\n');
  const logDebug = (msg) => {
    console.log(msg);
    fs.appendFileSync(debugLogPath, msg + '\n');
  };

  // Run the Express server as a child process using Electron's internal Node environment
  const serverScript = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked/server/dist/server.js')
    : path.join(__dirname, '../server/dist/server.js');
    
  logDebug(`[Electron] Starting server at: ${serverScript}`);
  logDebug(`[Electron] process.execPath: ${process.execPath}`);

  try {
    const { spawn } = await import('child_process');
    serverProcess = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: PORT.toString(),
        IS_ELECTRON: 'true',
        YTDLP_PATH: ytdlpBin,
        FFMPEG_PATH: ffmpegBin,
        NODE_ENV: app.isPackaged ? 'production' : 'development'
      }
    });

    serverProcess.stdout.on('data', (data) => logDebug(`[Server STDOUT]: ${data.toString()}`));
    serverProcess.stderr.on('data', (data) => logDebug(`[Server STDERR]: ${data.toString()}`));
    serverProcess.on('error', (err) => logDebug(`[Server ERROR]: ${err.stack || err.message}`));
    serverProcess.on('exit', (code, signal) => logDebug(`[Server EXIT]: code ${code} signal ${signal}`));
  } catch (err) {
    logDebug(`[Electron] Failed to spawn internal server: ${err.stack || err.message}`);
  }

  let attempts = 0;
  const checkServer = setInterval(() => {
    attempts++;
    logDebug(`[Electron] Checking server health on port ${PORT} (Attempt ${attempts})...`);
    http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
      if (res.statusCode === 200) {
        logDebug(`[Electron] Server is healthy! Loading URL.`);
        clearInterval(checkServer);
        if (app.isPackaged) {
          const indexPath = path.join(process.resourcesPath, 'app.asar.unpacked/client/dist/index.html');
          const fallbackPath = path.join(__dirname, '../client/dist/index.html');
          const targetPath = fs.existsSync(indexPath) ? indexPath : fallbackPath;
          logDebug(`[Electron] Loading UI from: ${targetPath}`);
          mainWindow.loadFile(targetPath, { query: { port: PORT.toString() } });
        } else {
          mainWindow.loadURL(`http://localhost:5173`);
        }
      }
    }).on('error', (err) => {
      logDebug(`[Electron] Health check failed: ${err.message}`);
      if (attempts > 20) {
        clearInterval(checkServer);
        logDebug(`[Electron] Giving up after 20 attempts.`);
      }
    });
  }, 1000);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Handle native downloads in Electron session
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const filename = item.getFilename();
    const downloadsDir = app.getPath('downloads');
    const savePath = path.join(downloadsDir, filename);

    // Auto-set the save path directly into the user's Downloads directory
    try {
      item.setSavePath(savePath);
      logDebug(`[Download] Native savePath set to: ${savePath}`);
    } catch (e) {
      logDebug(`[Download] Error setting save path: ${e.message}`);
    }
    
    item.on('updated', (event, state) => {
      if (state === 'progressing') {
        logDebug(`[Download Progress]: ${item.getReceivedBytes()} / ${item.getTotalBytes()}`);
      }
    });
    
    item.once('done', (event, state) => {
      if (state === 'completed') {
        logDebug(`[Download Completed]: ${savePath}`);
      } else {
        logDebug(`[Download Failed/Cancelled]: ${state}`);
      }
    });
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
