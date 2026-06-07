
/**
 * yt-dlp service — wraps the yt-dlp CLI for metadata extraction and downloads.
 * Configured for maximum site compatibility with automatic proxy fallback.
 */

import https from 'https';
import http from 'http';
import tls from 'tls';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, execSync } from 'child_process';
import { formatBytes, formatDuration } from '../utils/helpers.js';

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
let FFMPEG_PATH = 'ffmpeg'; // default
const TIMEOUT_MS = 120_000;
const PROXY = process.env.PROXY_URL || '';
const TEMP_DIR = process.env.NODE_ENV === 'production' 
  ? '/tmp' 
  : path.join(process.cwd(), 'temp_downloads');

// Ensure temp directory exists
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Resolve absolute FFmpeg path synchronously on startup
try {
  const output = execSync('where ffmpeg', { encoding: 'utf8' });
  FFMPEG_PATH = output.split(/[\r\n]+/)[0].trim();
  console.log(`[Init] Resolved FFmpeg path: ${FFMPEG_PATH}`);
} catch (e) {
  console.warn('[Init] Could not resolve FFmpeg path via "where", using default "ffmpeg"');
  // Fallback check for common Winget path if 'where' failed
  const fallback = path.join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffmpeg.exe');
  if (fs.existsSync(fallback)) {
    FFMPEG_PATH = fallback;
    console.log(`[Init] Fallback FFmpeg resolved: ${FFMPEG_PATH}`);
  }
}

/**
 * Common yt-dlp flags for maximum compatibility across all sites.
 * @param {object} opts
 * @param {boolean} opts.useProxy - force proxy usage
 */
function getBaseArgs(url, opts = {}) {
  const args = [
    '--no-warnings',
    '--quiet',
    '--no-playlist',
    '--no-check-certificates',
    '--geo-bypass',
    '--socket-timeout', '30',
    '--retries', '3',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--extractor-args', 'pornhub:api=0',  // Force non-PhantomJS extraction
    '--js-runtimes', 'node',              // Use Node.js for site challenges
    '--no-part',
    '--no-mtime',
    '--paths', `temp:${TEMP_DIR}`,
  ];

  if (url) {
    args.push('--referer', url);
  }

  const proxy = opts.useProxy ? (PROXY || 'auto') : PROXY;
  if (proxy) {
    args.push('--proxy', proxy);
  }

  if (process.env.COOKIES_FILE) {
    args.push('--cookies', process.env.COOKIES_FILE);
  }

  return args;
}

/**
 * Run yt-dlp with given args and return { stdout, stderr, code }.
 */
function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    // Ensure yt-dlp can find the node runtime for JS challenges
    const nodeDir = path.dirname(process.execPath);
    
    // Windows path can be 'Path' or 'PATH', we need to find the right one
    const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH';
    const currentPath = env[pathKey] || '';
    
    if (!currentPath.includes(nodeDir)) {
      env[pathKey] = `${nodeDir}${path.delimiter}${currentPath}`;
    }

    const proc = spawn(YTDLP, args, { 
      cwd: TEMP_DIR,
      env
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Request timed out. The site may be slow, geo-blocked, or unreachable from your network.'));
    }, TIMEOUT_MS);

    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Fetch video metadata and available formats.
 * Automatically retries with proxy if direct connection fails due to ISP block.
 * @param {string} url
 * @returns {Promise<object>}
 */
export async function getVideoInfo(url, opts = {}) {
  try {
    // Try the native yt-dlp method first
    return await attemptGetInfo(url, opts.useProxy);
  } catch (err) {
    // If native yt-dlp fails for PornHub, use the custom scraper as a fallback
    if (url.includes('pornhub')) {
      try {
        console.log('[PornHub] Native yt-dlp failed, using custom fallback...');
        return await customExtractor(url, 'age_verified=1; accessAgeDisclaimerPH=1; is_adult=1');
      } catch (customErr) {
        console.log('[PornHub] Custom fallback also failed:', customErr.message);
      }
    }
    
    // If it's not PornHub but still failed, try custom extractor as a last resort
    if (!url.includes('pornhub')) {
      try {
        return await customExtractor(url);
      } catch (customErr) {}
    }

    // Connection error retry logic
    if (isConnectionError(err.message) && PROXY && !opts.useProxy) {
      console.log(`[yt-dlp] Connection failed, retrying via proxy for: ${url}`);
      try {
        return await attemptGetInfo(url, true);
      } catch (proxyErr) {
        throw proxyErr;
      }
    }
    throw err;
  }
}

/**
 * Attempt to get video info, optionally through a proxy.
 */
async function attemptGetInfo(url, useProxy) {
  const args = [
    ...getBaseArgs(url, { useProxy }),
    '--dump-json',
    '--no-download',
    url,
  ];

  let result;
  try {
    result = await runYtdlp(args);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('yt-dlp is not installed or not found on PATH. Please install it first.');
    }
    throw err;
  }

  if (result.code !== 0) {
    const errorMsg = result.stderr.toLowerCase();
    if (
      errorMsg.includes('unable to extract') || 
      errorMsg.includes('unsupported url') ||
      errorMsg.includes('unable to download webpage') ||
      errorMsg.includes('unable to download api page') ||
      errorMsg.includes('phantomjs')
    ) {
      console.log('[yt-dlp] Native extraction failed, attempting custom fallback...');
      try {
        const customResult = await customExtractor(url, 'age_verified=1; accessAgeDisclaimerPH=1; is_adult=1');
        return customResult;
      } catch (customErr) {
        console.log('[yt-dlp] Custom extractor fallback failed:', customErr.message);
      }
    }
    throw new Error(parseError(result.stderr));
  }

  try {
    const raw = JSON.parse(result.stdout);
    return formatInfo(raw);
  } catch {
    throw new Error('Failed to parse video metadata.');
  }
}

/**
 * Download a video format and stream it to the client.
 * Simple, direct pipe for maximum reliability.
 */
export function streamDownload(url, formatId, type, res, onHeaders, useProxy = false, opts = null) {
  return new Promise(async (resolve, reject) => {
    const isAudioOnly = type === 'audio-only';
    const ext = isAudioOnly ? 'mp3' : 'mp4';
    
    const tempId = crypto.randomBytes(8).toString('hex');
    const tempFile = path.join(TEMP_DIR, `vfetch_${tempId}.${ext}`);
    
    let hasError = false;
    let ytError = '';

    // 1. Prepare download arguments
    const isDirectUrl = formatId.startsWith('custom_direct_url|');
    let targetFormat = formatId;
    
    if (!isDirectUrl && !isAudioOnly && (url.includes('youtube.com') || url.includes('youtu.be')) && !targetFormat.includes('+')) {
      targetFormat = `${targetFormat}+bestaudio[ext=m4a]/bestaudio/best`;
    }

    // Determine if we can stream directly to stdout on-the-fly
    const canStreamDirect = !isDirectUrl && (!opts || (opts.start == null && opts.end == null)) && (isAudioOnly || !targetFormat.includes('+'));

    let ytProc;
    if (isDirectUrl) {
      const [_, directUrl, cookies] = formatId.split('|');
      const ffArgs = [
        '-headers', `Cookie: ${cookies}\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36\r\nReferer: ${url}`,
        '-i', directUrl,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-y', tempFile
      ];
      console.log(`[Process] Buffering to file: ${tempFile}`);
      console.log(`[Process] Downloading direct URL via FFmpeg: ${directUrl.substring(0, 50)}...`);
      ytProc = spawn(FFMPEG_PATH, ffArgs, { cwd: TEMP_DIR, stdio: ['ignore', 'ignore', 'pipe'] });
    } else if (canStreamDirect) {
      console.log(`[Process] Streaming directly on-the-fly for format: ${targetFormat}`);
      // Notify headers immediately (chunked transfer encoding)
      onHeaders();

      const ytArgs = [
        ...getBaseArgs(url, { useProxy }),
        '-f', targetFormat,
      ];

      if (isAudioOnly) {
        ytArgs.push('-x', '--audio-format', 'mp3', '--audio-quality', '5');
      }

      ytArgs.push('-o', '-', url);
      ytProc = spawn(YTDLP, ytArgs, { cwd: TEMP_DIR });

      ytProc.stdout.pipe(res);

      ytProc.stderr.on('data', (d) => {
        ytError += d.toString();
      });

      ytProc.on('close', (code) => {
        if (code !== 0) {
          const errMsg = parseError(ytError);
          console.error(`[yt-dlp] Direct streaming failed with code ${code}. Error: ${errMsg}`);
          if (!res.headersSent) {
            res.status(500).json({ error: errMsg });
          }
          return reject(new Error(errMsg));
        }
        resolve();
      });

      ytProc.on('error', (err) => {
        console.error('[yt-dlp] Direct streaming process error:', err);
        reject(err);
      });

      res.on('close', () => {
        ytProc.kill('SIGTERM');
      });
      return;
    } else {
      console.log(`[Process] Buffering to file: ${tempFile}`);
      const ytArgs = [
        ...getBaseArgs(url, { useProxy }),
        '-f', targetFormat,
        '--no-part',
        '-o', tempFile,
        '--ffmpeg-location', FFMPEG_PATH
      ];

      if (isAudioOnly) {
        ytArgs.push('-x', '--audio-format', 'mp3', '--audio-quality', '5');
      } else {
        ytArgs.push('--remux-video', 'mp4');
      }

      if (opts && opts.start != null && opts.end != null) {
        const start = formatSeconds(opts.start);
        const end = formatSeconds(opts.end);
        ytArgs.push('--download-sections', `*${start}-${end}`);
        ytArgs.push('--force-keyframes-at-cuts');
      }
      
      ytArgs.push(url);
      ytProc = spawn(YTDLP, ytArgs, { cwd: TEMP_DIR, stdio: ['ignore', 'ignore', 'pipe'] });
    }

    ytProc.stderr.on('data', (d) => {
      ytError += d.toString();
    });

    ytProc.on('close', async (code) => {
      if (code !== 0) {
        hasError = true;
        const errMsg = parseError(ytError);
        console.error(`[yt-dlp] Download failed with code ${code}. Error: ${errMsg}`);
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        return reject(new Error(errMsg));
      }

      if (!fs.existsSync(tempFile)) {
        return reject(new Error('Download completed but output file is missing.'));
      }

      // 2. Stream the completed file
      try {
        const stats = fs.statSync(tempFile);
        const totalSize = stats.size;

        // Set headers with correct content length
        res.setHeader('Content-Length', totalSize);
        onHeaders();

        const fileStream = fs.createReadStream(tempFile);
        fileStream.pipe(res);

        const cleanup = () => {
          fileStream.unpipe(res);
          fileStream.destroy();
          // Small delay to ensure Windows releases the lock
          setTimeout(() => {
            if (fs.existsSync(tempFile)) {
              try { fs.unlinkSync(tempFile); } catch (e) {
                console.warn(`[Cleanup] Could not delete temp file (likely locked): ${tempFile}`);
              }
            }
          }, 100);
        };

        fileStream.on('end', () => {
          cleanup();
          resolve();
        });

        fileStream.on('error', (err) => {
          console.error('[File Stream Error]', err);
          cleanup();
          reject(err);
        });

        res.on('close', cleanup);
      } catch (err) {
        if (fs.existsSync(tempFile)) {
          try { fs.unlinkSync(tempFile); } catch {}
        }
        reject(err);
      }
    });

    ytProc.on('error', (err) => {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      reject(err);
    });
  });
}



/**
 * Quick HEAD request to verify if a direct link is still valid.
 */
function validateDirectLink(directUrl, referer, cookies) {
  return new Promise((resolve, reject) => {
    console.log(`[Stream] Validating link: ${directUrl.substring(0, 100)}...`);
    const options = {
      method: 'GET', // Some video servers block HEAD
      headers: {
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Cookie': cookies
      },
      timeout: 10000
    };

    const req = https.request(directUrl, options, (res) => {
      if (res.statusCode >= 400) {
        const err = new Error(`Link validation failed with status ${res.statusCode}`);
        err.statusCode = res.statusCode;
        reject(err);
      } else {
        resolve();
      }
      req.destroy(); // Abort after headers
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Link validation timed out'));
    });
    req.end();
  });
}

/* ───────── helpers ───────── */

/**
 * Convert seconds to HH:MM:SS for yt-dlp --download-sections syntax.
 */
function formatSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}


/**
 * Check if the error is a network/connection failure (ISP block, timeout, etc.)
 */
function isConnectionError(msg) {
  const patterns = [
    'WinError 10060', 'WinError 10061',
    'Connection timed out', 'timed out',
    'Connection refused', 'Connection reset',
    'Network is unreachable',
    'Unable to download webpage',
    'getaddrinfo failed',
    'Name or service not known',
  ];
  return patterns.some((p) => msg.includes(p));
}

/**
 * Parse yt-dlp stderr into a user-friendly error message.
 */
function parseError(stderr) {
  const s = stderr || '';

  if (s.includes('Unsupported URL'))
    return 'This URL is not supported by yt-dlp. Check that the URL is correct.';
  if (s.includes('Private video'))
    return 'This video is private and cannot be accessed.';
  if (s.includes('Video unavailable'))
    return 'This video is unavailable or has been removed.';
  if (s.includes('Sign in') || s.includes('login') || s.includes('cookies'))
    return 'This video requires authentication. Try providing a cookies file via COOKIES_FILE env var.';
  if (s.includes('age') && s.includes('restricted'))
    return 'This video is age-restricted. A cookies file from a logged-in browser session may be needed.';
  if (s.includes('geo') || s.includes('not available in your country'))
    return 'This video is geo-restricted and not available from your region. Try using a proxy (PROXY_URL env var).';
  if (s.includes('copyright'))
    return 'This video was removed due to a copyright claim.';
  if (s.includes('WinError 10060') || s.includes('Connection timed out') || s.includes('timed out'))
    return 'Connection timed out — the site may be blocked by your ISP. Set PROXY_URL in .env or use a VPN.';
  if (s.includes('WinError 10061') || s.includes('Connection refused'))
    return 'Connection refused by the server. The site may be down.';
  if (s.includes('Name or service not known') || s.includes('getaddrinfo failed'))
    return 'Could not resolve the hostname. Check the URL or your internet connection.';
  if (s.includes('HTTP Error 403') || s.includes('403'))
    return 'Access forbidden (HTTP 403). The site may be blocking automated access. Try using a proxy or providing cookies from a browser session.';
  if (s.includes('HTTP Error 404') || s.includes('404'))
    return 'Video not found (HTTP 404). The URL may be incorrect or the content was removed.';
  if (s.includes('HTTP Error 429') || s.includes('429'))
    return 'Rate limited by the site (HTTP 429). Please wait a moment and try again.';

  // Fallback: show a cleaned-up version of stderr
  const cleaned = s.replace(/^ERROR:\s*/im, '').trim();
  return cleaned.length > 0 && cleaned.length < 300
    ? cleaned
    : 'Failed to fetch video information. The URL may be invalid or the site unsupported.';
}

/* ───────── info formatting ───────── */

function formatInfo(raw) {
  const formats = (raw.formats || [])
    .filter((f) => f.url && (f.vcodec !== 'none' || f.acodec !== 'none'))
    .map((f) => {
      const isAudioOnly = f.vcodec === 'none' && f.acodec !== 'none';
      return {
        format_id: f.format_id,
        url: f.url,
        manifest_url: f.manifest_url,
        http_headers: f.http_headers,
        cookies: f.cookies,
        // Set 'mp3' extension for audio-only downloads; keep 'mp4' for videos
        ext: isAudioOnly ? 'mp3' : 'mp4',
        quality: f.format_note || f.quality || 'Unknown',
        resolution: f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : null),
        fps: f.fps || null,
        filesize: f.filesize || f.filesize_approx || null,
        filesize_label: formatBytes(f.filesize || f.filesize_approx),
        vcodec: f.vcodec !== 'none' ? f.vcodec : null,
        acodec: f.acodec !== 'none' ? f.acodec : null,
        // Treat all video streams as 'video+audio' because our backend will merge audio automatically
        type: f.vcodec !== 'none'
          ? 'video+audio'
          : 'audio-only',
      };
    });

  const deduped = deduplicateFormats(formats);

  return {
    title: raw.title || 'Untitled',
    thumbnail: raw.thumbnail || null,
    duration: raw.duration || null,
    duration_label: formatDuration(raw.duration),
    uploader: raw.uploader || raw.channel || 'Unknown',
    view_count: raw.view_count || null,
    upload_date: raw.upload_date || null,
    webpage_url: raw.webpage_url || null,
    extractor: raw.extractor || 'unknown',
    formats: deduped,
  };
}

function deduplicateFormats(formats) {
  const seen = new Map();
  for (const f of formats) {
    const key = `${f.ext}-${f.resolution || f.quality}-${f.type}`;
    if (!seen.has(key) || (f.filesize && f.filesize > (seen.get(key).filesize || 0))) {
      seen.set(key, f);
    }
  }
  const arr = [...seen.values()];
  arr.sort((a, b) => {
    const typeOrder = { 'video+audio': 0, 'audio-only': 1 };
    const ta = typeOrder[a.type] ?? 2;
    const tb = typeOrder[b.type] ?? 2;
    if (ta !== tb) return ta - tb;
    const ra = parseInt(a.resolution) || 0;
    const rb = parseInt(b.resolution) || 0;
    return rb - ra;
  });
  return arr;
}

/**
 * Fetch HTML content from a URL, supporting optional HTTP proxy routing.
 * Returns { html, headers, statusCode }.
 */
function fetchHtml(targetUrl, headers, proxyUrl = '') {
  return new Promise((resolve, reject) => {
    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch (e) {
      return reject(new Error(`Invalid target URL: ${targetUrl}`));
    }

    if (proxyUrl) {
      let parsedProxy;
      try {
        parsedProxy = new URL(proxyUrl);
      } catch (e) {
        return reject(new Error(`Invalid proxy URL: ${proxyUrl}`));
      }

      const proxyPort = parsedProxy.port || (parsedProxy.protocol === 'https:' ? 443 : 80);
      const targetPort = parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80);

      const options = {
        host: parsedProxy.hostname,
        port: proxyPort,
        method: 'CONNECT',
        path: `${parsedTarget.hostname}:${targetPort}`,
        headers: {
          Host: `${parsedTarget.hostname}:${targetPort}`,
        }
      };

      if (parsedProxy.username || parsedProxy.password) {
        const auth = Buffer.from(`${parsedProxy.username}:${parsedProxy.password}`).toString('base64');
        options.headers['Proxy-Authorization'] = `Basic ${auth}`;
      }

      const req = http.request(options);
      req.end();

      req.on('connect', (res, socket) => {
        if (res.statusCode !== 200) {
          socket.destroy();
          return reject(new Error(`Proxy CONNECT failed with status: ${res.statusCode}`));
        }

        const tlsSocket = tls.connect({
          socket: socket,
          servername: parsedTarget.hostname,
          rejectUnauthorized: false
        }, () => {
          const pathAndSearch = (parsedTarget.pathname || '/') + (parsedTarget.search || '');
          let headersStr = `GET ${pathAndSearch} HTTP/1.1\r\n`;
          Object.entries(headers).forEach(([k, v]) => {
            headersStr += `${k}: ${v}\r\n`;
          });
          headersStr += `Host: ${parsedTarget.hostname}\r\nConnection: close\r\n\r\n`;
          tlsSocket.write(headersStr);
        });

        let data = Buffer.alloc(0);
        tlsSocket.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });

        tlsSocket.on('end', () => {
          const rawResponse = data.toString('utf8');
          const headerEnd = rawResponse.indexOf('\r\n\r\n');
          if (headerEnd === -1) {
            return resolve({ html: rawResponse, headers: {}, statusCode: 200 });
          }

          const headerPart = rawResponse.substring(0, headerEnd);
          const htmlPart = rawResponse.substring(headerEnd + 4);

          const headerLines = headerPart.split('\r\n');
          const statusLine = headerLines[0];
          const statusMatch = statusLine.match(/HTTP\/1\.[01]\s+(\d+)/);
          const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 200;

          const responseHeaders = {};
          headerLines.slice(1).forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
              const k = parts[0].trim().toLowerCase();
              const v = parts.slice(1).join(':').trim();
              if (k === 'set-cookie') {
                if (!responseHeaders[k]) responseHeaders[k] = [];
                responseHeaders[k].push(v);
              } else {
                responseHeaders[k] = v;
              }
            }
          });

          resolve({ html: htmlPart, headers: responseHeaders, statusCode });
        });

        tlsSocket.on('error', (err) => {
          reject(err);
        });
      });

      req.on('error', (err) => {
        reject(err);
      });
    } else {
      const requestOptions = {
        headers,
        rejectUnauthorized: false
      };
      
      https.get(targetUrl, requestOptions, (res) => {
        let html = '';
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
          resolve({
            html,
            headers: res.headers,
            statusCode: res.statusCode
          });
        });
      }).on('error', reject);
    }
  });
}

/**
 * Custom extractor for specific sites not supported by yt-dlp
 */
function customExtractor(url, prevCookies = '') {
  return new Promise(async (resolve, reject) => {
    // Embed Strategy for PornHub: Embed pages are much easier to scrape
    let fetchUrl = url;
    const isPornHub = url.includes('pornhub');
    const isXHamster = url.includes('xhamster');
    const isPimpBunny = url.includes('pimpbunny');

    if (isPornHub) {
      let hostname = 'www.pornhub.com';
      try {
        hostname = new URL(url).hostname;
      } catch (e) {}
      
      const pornhubMatch = url.match(/viewkey=([a-zA-Z0-9]+)/);
      if (pornhubMatch) {
        fetchUrl = `https://${hostname}/embed/${pornhubMatch[1]}`;
      } else {
        fetchUrl = url.replace('www.', 'm.');
      }
    }

    const userAgent = isPornHub 
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

    const headers = {
      'User-Agent': userAgent,
      'Referer': 'https://www.google.com/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'cross-site',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'Cookie': prevCookies
    };
    
    try {
      const { html, headers: responseHeaders, statusCode } = await fetchHtml(fetchUrl, headers, PROXY);
      
      const newCookies = responseHeaders['set-cookie'] 
        ? (Array.isArray(responseHeaders['set-cookie']) ? responseHeaders['set-cookie'] : [responseHeaders['set-cookie']]).map(c => c.split(';')[0]).join('; ')
        : '';
      const combinedCookies = [prevCookies, newCookies].filter(Boolean).join('; ');
      
      // If we get a redirect, follow it and pass cookies
      if (statusCode >= 300 && statusCode < 400 && responseHeaders.location) {
        let redirectUrl = responseHeaders.location;
        if (!redirectUrl.startsWith('http')) {
          const origin = new URL(url).origin;
          redirectUrl = new URL(redirectUrl, origin).href;
        }
        return customExtractor(redirectUrl, combinedCookies).then(resolve).catch(reject);
      }

      const cookies = combinedCookies;
      const data = html;
      
      if (statusCode >= 400 && !data.includes('mp4')) {
        return reject(new Error(`Site returned error ${statusCode}`));
      }

        // Parse title
        let title = 'Custom Extracted Video';
        const titleMatch = data.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].replace(' - xHamster', '').trim();

        // Parse duration
        let duration = null;
        let durationLabel = 'Unknown';
        const durMatch = data.match(/duration\":\s*\"PT(\d+H)?(\d+M)?(\d+S)?\"/i) || data.match(/\"duration\":\s*(\d+)/);
        if (durMatch) {
          if (durMatch[1] || durMatch[2] || durMatch[3]) {
            const h = parseInt(durMatch[1]) || 0;
            const m = parseInt(durMatch[2]) || 0;
            const s = parseInt(durMatch[3]) || 0;
            duration = h * 3600 + m * 60 + s;
          } else {
            duration = parseInt(durMatch[1]);
          }
          durationLabel = formatDuration(duration);
        }

        const formats = [];

        // 1. Specific site config extraction (HIGHEST PRIORITY)
        if (isXHamster) {
          const xhMatch = data.match(/\"sources\":\s*(\{[^\}]+\})/);
          if (xhMatch) {
            try {
              const sources = JSON.parse(xhMatch[1]);
              Object.entries(sources).forEach(([label, link]) => {
                if (typeof link === 'string' && link.startsWith('http')) {
                  formats.push({
                    format_id: `custom_direct_url|${link}|${cookies}`,
                    ext: 'mp4',
                    quality: label,
                    resolution: label,
                    filesize_label: 'Unknown',
                    type: 'video+audio'
                  });
                }
              });
            } catch (e) {}
          }
        } else if (isPornHub) {
          // 1. Search for mediaDefinitions, flashvars, or medias in the source
          const jsonMatch = data.match(/mediaDefinitions\":\s*(\[[^\]]+\])/) || 
                           data.match(/flashvars\s*=\s*({[^;]+})/) || 
                           data.match(/medias\s*=\s*(\[[^\]]+\])/);
          
          if (jsonMatch) {
            try {
              const content = JSON.parse(jsonMatch[1].replace(/\\\//g, '/').replace(/\\'/g, "'"));
              const list = Array.isArray(content) ? content : (content.mediaDefinitions || []);
              list.forEach(def => {
                const link = def.videoUrl || def.url;
                if (link && typeof link === 'string' && link.startsWith('http')) {
                  formats.push({
                    format_id: `custom_direct_url|${link}|${cookies}`,
                    ext: 'mp4', quality: def.quality || 'HD', resolution: def.quality || 'HD', type: 'video+audio'
                  });
                }
              });
            } catch(e) {}
          }

          // 2. Mobile-specific pattern: search for video_url or link_mp4 (Very reliable on m.pornhub.com)
          const mobileMatch = data.match(/\"video_url\":\"([^\"]+)\"/) || data.match(/link_mp4\":\"([^\"]+)\"/);
          if (mobileMatch) {
            const link = mobileMatch[1].replace(/\\\//g, '/');
            if (!formats.some(f => f.format_id.includes(link))) {
              formats.push({
                format_id: `custom_direct_url|${link}|${cookies}`,
                ext: 'mp4', quality: 'Mobile SD', resolution: 'Mobile SD', type: 'video+audio'
              });
            }
          }
          // Fallback: search for direct MP4 links in flashvars or medias
          if (formats.length === 0) {
            const flashMatch = data.match(/flashvars_[0-9]*\s*=\s*({[^;]+})/) || data.match(/flashvars\s*=\s*({[^;]+})/) || data.match(/medias\s*=\s*(\[[^;]+\])/) || data.match(/\"medias\":\s*(\[[^;]+\])/);
            if (flashMatch) {
               try {
                 const cleaned = flashMatch[1].replace(/\\\//g, '/').replace(/\\'/g, "'");
                 const vars = JSON.parse(cleaned);
                 const defs = vars.mediaDefinitions || (Array.isArray(vars) ? vars : []);
                 defs.forEach(def => {
                   const link = def.videoUrl || def.url;
                   if (link) {
                      const finalLink = link.startsWith('//') ? `https:${link}` : link;
                      formats.push({
                        format_id: `custom_direct_url|${finalLink}|${cookies}`,
                        ext: 'mp4', quality: def.quality || 'HD', resolution: def.quality || 'HD',
                        type: 'video+audio'
                      });
                   }
                 });
               } catch (e) {}
            }
          }
          // Final Fallback: search for direct MP4 links anywhere in script tags
          if (formats.length === 0) {
            const mp4Matches = data.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/g) || [];
            mp4Matches.forEach(link => {
              if (link.includes('video') && !link.includes('preview')) {
                const finalLink = link.replace(/\\\//g, '/');
                formats.push({
                  format_id: `custom_direct_url|${finalLink}|${cookies}`,
                  ext: 'mp4', quality: 'HD', resolution: 'HD', type: 'video+audio'
                });
              }
            });
          }
          // Mobile-specific pattern: search for video_url or link_mp4
          if (formats.length === 0) {
             const mobileMatch = data.match(/\"video_url\":\"([^\"]+)\"/) || data.match(/link_mp4\":\"([^\"]+)\"/);
             if (mobileMatch) {
               const link = mobileMatch[1].replace(/\\\//g, '/');
               formats.push({
                 format_id: `custom_direct_url|${link}|${cookies}`,
                 ext: 'mp4', quality: 'Mobile SD', resolution: 'Mobile SD', type: 'video+audio'
               });
             }
          }
        } else if (isPimpBunny) {
          const configPatterns = [
            { key: 'video_url', label: '360p' },
            { key: 'video_alt_url', label: 'SD' },
            { key: 'video_alt_url2', label: '720p' },
            { key: 'video_alt_url3', label: '1080p' },
            { key: 'video_alt_url4', label: '2K' },
            { key: 'video_alt_url5', label: '4K' }
          ];

          configPatterns.forEach(p => {
            const urlMatch = data.match(new RegExp(`${p.key}:\\s*'([^']+)'`));
            if (urlMatch) {
              let link = urlMatch[1].replace(/\\\//g, '/').replace(/\\/g, '').replace('function/0/', '');
              if (link.startsWith('http') && !link.includes('upgrade=true')) {
                formats.push({
                  format_id: `custom_direct_url|${link}|${cookies}`,
                  ext: 'mp4',
                  quality: p.label,
                  resolution: p.label,
                  filesize_label: 'Unknown',
                  type: 'video+audio'
                });
              }
            }
          });
        }

        // 2. Fallback Generic Scraping (LOWER PRIORITY)
        const mp4Matches = data.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/g) || [];
        const uniqueMp4s = [...new Set(mp4Matches.map(m => {
          let link = m.replace(/\\\//g, '/').replace(/\\/g, '');
          if (isPimpBunny) link = link.replace('function/0/', '');
          return link;
        }))]
          .filter(link => !link.includes('_preview.mp4') && !link.toLowerCase().endsWith('.jpg'));

        uniqueMp4s.forEach(link => {
          // Only add if this link is not already present in formats
          if (!formats.some(f => f.format_id.includes(link))) {
            let resLabel = 'HD';
            if (link.includes('_2160p') || link.includes('2160p')) resLabel = '4K';
            else if (link.includes('_1440p') || link.includes('1440p')) resLabel = '2K';
            else if (link.includes('_1080p') || link.includes('1080p')) resLabel = '1080p';
            else if (link.includes('_720p') || link.includes('720p')) resLabel = '720p';
            else if (link.includes('_480p') || link.includes('480p')) resLabel = '480p';
            else if (link.includes('_360p') || link.includes('360p')) resLabel = '360p';

            formats.push({
              format_id: `custom_direct_url|${link}|${cookies}`,
              ext: 'mp4',
              quality: resLabel,
              resolution: resLabel,
              filesize_label: 'Unknown',
              type: 'video+audio'
            });
          }
        });

        if (formats.length > 0) {
          const qualityMap = { '4K': 2160, '2160p': 2160, '2K': 1440, '1440p': 1440, '1080p': 1080, '720p': 720, 'HD': 719, '480p': 480, '360p': 360, 'SD': 359 };
          formats.sort((a, b) => (qualityMap[b.resolution] || 0) - (qualityMap[a.resolution] || 0));

          // Refine title for PornHub
          let uploader = isXHamster ? 'xHamster' : 'Web';
          if (isPornHub) {
            uploader = 'PornHub';
            title = title.replace(' - Pornhub.com', '').replace(' - Pornhub.org', '').trim();
          }

          resolve({
            title,
            thumbnail: null,
            duration,
            duration_label: durationLabel,
            uploader: uploader,
            view_count: null,
            upload_date: null,
            webpage_url: url,
            extractor: 'custom-scraper',
            formats: formats
          });
        } else {
          reject(new Error('Could not find any direct video links in page source.'));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

