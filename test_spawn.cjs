const { spawn } = require('child_process');
const ytdlp = 'C:\\Users\\arpan\\AppData\\Local\\Programs\\videofetch-root\\resources\\bin\\yt-dlp.exe';
const proc = spawn(ytdlp, ['--version'], { cwd: require('os').tmpdir(), env: process.env });
proc.on('error', (err) => console.error('ERROR:', err));
proc.stdout.on('data', (d) => console.log('OUT:', d.toString()));
proc.on('close', (code) => console.log('CODE:', code));
