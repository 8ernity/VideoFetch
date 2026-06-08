
/**
 * yt-dlp service — wraps the yt-dlp CLI for metadata extraction and downloads.
 * Configured for maximum site compatibility with automatic proxy fallback.
 */

import https from 'https';
import http from 'http';
import tls from 'tls';
import dns from 'dns';
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
 * Stream data from a given HTTPS URL directly into the client response,
 * bypassing DNS/SNI blocks for targeted domains and supporting redirections.
 */
function streamHttpsUrl(targetUrl, headers, res, onHeaders, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      return reject(new Error('Too many redirects'));
    }

    const requestOptions = {
      headers,
      rejectUnauthorized: false
    };

    if (isBypassTarget(targetUrl)) {
      requestOptions.servername = '';
      requestOptions.lookup = secureDnsLookup;
    }

    https.get(targetUrl, requestOptions, (dlRes) => {
      if (dlRes.statusCode >= 300 && dlRes.statusCode < 400 && dlRes.headers.location) {
        let redirectUrl = dlRes.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, new URL(targetUrl).origin).href;
        }
        console.log(`[Redirect] Following download redirect to: ${redirectUrl}`);
        return streamHttpsUrl(redirectUrl, headers, res, onHeaders, redirectCount + 1).then(resolve).catch(reject);
      }

      if (dlRes.statusCode >= 400) {
        return reject(new Error(`Server returned status ${dlRes.statusCode}`));
      }

      if (dlRes.headers['content-length']) {
        res.setHeader('Content-Length', dlRes.headers['content-length']);
      }
      if (dlRes.headers['content-type']) {
        res.setHeader('Content-Type', dlRes.headers['content-type']);
      }
      
      onHeaders();
      dlRes.pipe(res);

      dlRes.on('end', () => resolve());
      dlRes.on('error', reject);
      res.on('close', () => {
        dlRes.destroy();
      });
    }).on('error', reject);
  });
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
      const headers = {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': url
      };

      if (!opts || (opts.start == null && opts.end == null)) {
        console.log(`[Process] Streaming direct URL on-the-fly: ${directUrl.substring(0, 60)}...`);
        try {
          await streamHttpsUrl(directUrl, headers, res, onHeaders);
          return resolve();
        } catch (err) {
          console.error('[Process] Direct stream failed:', err.message);
          return reject(err);
        }
      } else {
        // Efficient partial download: spin up a local reverse proxy so FFmpeg can
        // use HTTP Range requests to download ONLY the bytes it needs for the trim.
        console.log(`[Process] Partial download via proxy+FFmpeg for trim: ${formatSeconds(opts.start)} → ${formatSeconds(opts.end)}`);
        
        let proxyServer = null;
        let resolvedCdnUrl = directUrl; // Will be updated after following redirects
        
        try {
          // Step 1: Follow redirects to get the final CDN URL (redirects can't be followed per-range)
          resolvedCdnUrl = await resolveRedirects(directUrl, headers);
          console.log(`[Process] Resolved CDN URL: ${resolvedCdnUrl.substring(0, 80)}...`);
          
          // Step 2: Start a local reverse proxy that forwards Range requests through SNI bypass
          proxyServer = await createRangeProxy(resolvedCdnUrl, headers);
          const proxyUrl = `http://127.0.0.1:${proxyServer.address().port}/video.mp4`;
          console.log(`[Process] Range proxy listening at: ${proxyUrl}`);
          
          // Step 3: Use FFmpeg with the proxy URL — it will send Range requests to seek efficiently
          const trimmedTempFile = path.join(TEMP_DIR, `vfetch_trimmed_${tempId}.${ext}`);
          const start = formatSeconds(opts.start);
          const end = formatSeconds(opts.end);
          const ffArgs = [
            '-ss', start,
            '-i', proxyUrl,
            '-to', formatSeconds(opts.end - opts.start), // duration relative to seek point
            '-c', 'copy',
            '-movflags', '+faststart',
            '-y', trimmedTempFile
          ];
          
          console.log(`[Process] FFmpeg trimming via Range proxy...`);
          
          await new Promise((resolveFF, rejectFF) => {
            const ffProc = spawn(FFMPEG_PATH, ffArgs, { cwd: TEMP_DIR, stdio: ['ignore', 'ignore', 'pipe'] });
            let ffError = '';
            ffProc.stderr.on('data', (d) => { ffError += d.toString(); });
            
            ffProc.on('close', (code) => {
              if (code !== 0) {
                rejectFF(new Error(`FFmpeg trim failed (code ${code}): ${ffError.substring(0, 300)}`));
              } else {
                resolveFF();
              }
            });
            ffProc.on('error', rejectFF);
          });
          
          // Step 4: Stream the trimmed file to the client
          proxyServer.close();
          proxyServer = null;
          
          if (!fs.existsSync(trimmedTempFile)) {
            return reject(new Error('FFmpeg completed but output file is missing.'));
          }
          
          const stats = fs.statSync(trimmedTempFile);
          res.setHeader('Content-Length', stats.size);
          onHeaders();
          
          const fileStream = fs.createReadStream(trimmedTempFile);
          fileStream.pipe(res);
          
          const cleanup = () => {
            fileStream.unpipe(res);
            fileStream.destroy();
            setTimeout(() => {
              if (fs.existsSync(trimmedTempFile)) {
                try { fs.unlinkSync(trimmedTempFile); } catch (e) {}
              }
            }, 100);
          };
          
          fileStream.on('end', () => { cleanup(); resolve(); });
          fileStream.on('error', (err) => { cleanup(); reject(err); });
          res.on('close', cleanup);
          
        } catch (err) {
          if (proxyServer) { try { proxyServer.close(); } catch (e) {} }
          if (fs.existsSync(tempFile)) { try { fs.unlinkSync(tempFile); } catch (e) {} }
          console.error('[Process] Proxy-based trim failed:', err.message);
          return reject(err);
        }
      }
      return;
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
 * Follow HTTPS redirects (3xx) to resolve the final CDN URL.
 * Uses SNI bypass for targeted domains.
 */
function resolveRedirects(targetUrl, headers, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 8) return reject(new Error('Too many redirects'));

    const requestOptions = { headers, method: 'HEAD', rejectUnauthorized: false };
    if (isBypassTarget(targetUrl)) {
      requestOptions.servername = '';
      requestOptions.lookup = secureDnsLookup;
    }

    const req = https.request(targetUrl, requestOptions, (res) => {
      req.destroy();
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, new URL(targetUrl).origin).href;
        }
        return resolveRedirects(redirectUrl, headers, redirectCount + 1).then(resolve).catch(reject);
      }
      resolve(targetUrl);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Redirect resolve timed out')); });
    req.setTimeout(10000);
    req.end();
  });
}

/**
 * Create a temporary local HTTP server that acts as a reverse proxy to a CDN URL,
 * transparently forwarding HTTP Range headers through our SNI-bypass layer.
 * This allows FFmpeg to perform efficient HTTP seeking (partial downloads).
 * @returns {Promise<http.Server>}
 */
function createRangeProxy(cdnUrl, cdnHeaders) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const proxyHeaders = { ...cdnHeaders };

      // Forward Range header from FFmpeg
      if (req.headers.range) {
        proxyHeaders['Range'] = req.headers.range;
      }

      const requestOptions = {
        headers: proxyHeaders,
        rejectUnauthorized: false
      };
      if (isBypassTarget(cdnUrl)) {
        requestOptions.servername = '';
        requestOptions.lookup = secureDnsLookup;
      }

      https.get(cdnUrl, requestOptions, (cdnRes) => {
        // Forward status code and relevant headers back to FFmpeg
        const fwdHeaders = {};
        if (cdnRes.headers['content-length']) fwdHeaders['Content-Length'] = cdnRes.headers['content-length'];
        if (cdnRes.headers['content-type']) fwdHeaders['Content-Type'] = cdnRes.headers['content-type'];
        if (cdnRes.headers['content-range']) fwdHeaders['Content-Range'] = cdnRes.headers['content-range'];
        if (cdnRes.headers['accept-ranges']) fwdHeaders['Accept-Ranges'] = cdnRes.headers['accept-ranges'];

        res.writeHead(cdnRes.statusCode, fwdHeaders);
        cdnRes.pipe(res);

        cdnRes.on('error', () => { res.end(); });
        res.on('close', () => { cdnRes.destroy(); });
      }).on('error', (err) => {
        console.error('[Range Proxy] CDN request error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502);
        }
        res.end();
      });
    });

    server.listen(0, '127.0.0.1', () => {
      console.log(`[Range Proxy] Started on port ${server.address().port}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

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
 * Check if the URL hostname points to a Pornhub or phncdn domain.
 */
function isBypassTarget(urlStr) {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    return host.includes('pornhub') || host.includes('phncdn');
  } catch (e) {
    return false;
  }
}

/**
 * Custom DNS lookup resolver using Cloudflare and Google DNS to bypass ISP DNS hijacking.
 */
function secureDnsLookup(hostname, opts, callback) {
  const resolver = new dns.Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  resolver.resolve4(hostname, (err, addresses) => {
    if (err || addresses.length === 0) {
      return dns.lookup(hostname, opts, callback);
    }
    if (opts.all) {
      callback(null, [{ address: addresses[0], family: 4 }]);
    } else {
      callback(null, addresses[0], 4);
    }
  });
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

      if (isBypassTarget(targetUrl)) {
        requestOptions.servername = '';
        requestOptions.lookup = secureDnsLookup;
      }
      
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
export function customExtractor(url, prevCookies = '') {
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
      console.log(`[Pornhub Scraper] Fetch URL: ${fetchUrl}, Status: ${statusCode}, HTML length: ${html.length}`);
      
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

        // Parse title — try multiple sources (flashvars, og:title, then <title>)
        let title = 'Custom Extracted Video';
        const ogTitleMatch = data.match(/property="og:title"\s+content="([^"]+)"/i) ||
                             data.match(/content="([^"]+)"\s+property="og:title"/i);
        const titleTagMatch = data.match(/<title>([^<]+)<\/title>/i);
        const flashvarsTitleMatch = data.match(/"video_title"\s*:\s*"([^"]+)"/);
        
        if (flashvarsTitleMatch) {
          title = flashvarsTitleMatch[1];
        } else if (ogTitleMatch) {
          title = ogTitleMatch[1];
        } else if (titleTagMatch && !titleTagMatch[1].includes('Embed Player')) {
          title = titleTagMatch[1];
        }
        title = title.replace(' - xHamster', '').replace(' - Pornhub.com', '').replace(' - Pornhub.org', '').trim();

        // Parse duration — try multiple patterns, each with different capture semantics
        let duration = null;
        let durationLabel = 'Unknown';
        const durPT = data.match(/duration\":\s*\"PT(\d+H)?(\d+M)?(\d+S)?\"/i);
        const durInt = data.match(/\"duration\":\s*(\d+)/) || data.match(/\"video_duration\"\s*:\s*"?(\d+)"?/);
        if (durPT && (durPT[1] || durPT[2] || durPT[3])) {
          const h = parseInt(durPT[1]) || 0;
          const m = parseInt(durPT[2]) || 0;
          const s = parseInt(durPT[3]) || 0;
          duration = h * 3600 + m * 60 + s;
        } else if (durInt) {
          duration = parseInt(durInt[1]);
        }
        if (duration) {
          durationLabel = formatDuration(duration);
        };

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
          // Robust bracket-counting JSON extractor — immune to nested brackets/braces
          function extractJsonValue(html, marker) {
            const idx = html.indexOf(marker);
            if (idx === -1) return null;
            // Find the opening bracket/brace after the marker
            let start = idx + marker.length;
            while (start < html.length && html[start] !== '{' && html[start] !== '[') start++;
            if (start >= html.length) return null;

            const open = html[start];
            const close = open === '{' ? '}' : ']';
            let depth = 0;
            let inString = false;
            let escape = false;
            for (let i = start; i < html.length; i++) {
              const ch = html[i];
              if (escape) { escape = false; continue; }
              if (ch === '\\') { escape = true; continue; }
              if (ch === '"') { inString = !inString; continue; }
              if (inString) continue;
              if (ch === open) depth++;
              else if (ch === close) {
                depth--;
                if (depth === 0) {
                  return html.substring(start, i + 1);
                }
              }
            }
            return null;
          }

          // Helper: fetch JSON from a URL using SNI bypass
          async function fetchJsonUrl(jsonUrl) {
            return new Promise((resolveJson, rejectJson) => {
              const reqOpts = {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
                  'Referer': url,
                  'Cookie': cookies
                },
                rejectUnauthorized: false
              };
              if (isBypassTarget(jsonUrl)) {
                reqOpts.servername = '';
                reqOpts.lookup = secureDnsLookup;
              }
              https.get(jsonUrl, reqOpts, (jsonRes) => {
                let body = '';
                jsonRes.on('data', chunk => body += chunk);
                jsonRes.on('end', () => {
                  try {
                    resolveJson(JSON.parse(body));
                  } catch (e) {
                    rejectJson(new Error(`JSON parse failed for get_media: ${e.message}`));
                  }
                });
              }).on('error', rejectJson);
            });
          }

          // Helper: process a list of mediaDefinitions into formats
          function addDirectFormats(defs) {
            defs.forEach(def => {
              const link = def.videoUrl || def.url;
              if (!link || typeof link !== 'string' || !link.startsWith('http')) return;
              // Skip HLS streams — we use direct MP4
              if (def.format === 'hls' || link.includes('.m3u8')) return;
              let quality = def.quality || 'HD';
              if (Array.isArray(quality)) {
                quality = quality.length > 0 ? String(quality[0]) : 'Direct MP4';
              }
              // Append resolution label from height if quality is numeric
              const resLabel = def.height ? `${def.height}p` : String(quality);
              formats.push({
                format_id: `custom_direct_url|${link}|${cookies}`,
                ext: 'mp4', quality: resLabel, resolution: resLabel, type: 'video+audio'
              });
            });
          }

          // 1. Try flashvars object (contains mediaDefinitions inside)
          const flashvarsJson = extractJsonValue(data, 'flashvars') ||
                                extractJsonValue(data, 'flashvars_');
          let allDefs = [];
          if (flashvarsJson) {
            try {
              const vars = JSON.parse(flashvarsJson.replace(/\\\//g, '/'));
              allDefs = vars.mediaDefinitions || [];
            } catch (e) {
              console.log('[Pornhub Scraper] flashvars JSON parse failed:', e.message);
            }
          }

          // 2. Fallback: Try mediaDefinitions array directly
          if (allDefs.length === 0) {
            const mediaDefsJson = extractJsonValue(data, '"mediaDefinitions"');
            if (mediaDefsJson) {
              try {
                allDefs = JSON.parse(mediaDefsJson.replace(/\\\//g, '/'));
              } catch (e) {
                console.log('[Pornhub Scraper] mediaDefinitions JSON parse failed:', e.message);
              }
            }
          }

          if (allDefs.length > 0) {
            // Separate remote (get_media redirect) entries from direct entries
            const remoteDefs = allDefs.filter(d => d.remote === true);
            const directDefs = allDefs.filter(d => !d.remote);

            // Add any direct (non-remote, non-HLS) entries first
            addDirectFormats(directDefs);

            // Follow remote get_media URLs to resolve actual CDN links
            for (const remoteDef of remoteDefs) {
              const mediaUrl = remoteDef.videoUrl || remoteDef.url;
              if (!mediaUrl || !mediaUrl.startsWith('http')) continue;
              try {
                console.log(`[Pornhub Scraper] Following get_media URL...`);
                const resolvedDefs = await fetchJsonUrl(mediaUrl);
                if (Array.isArray(resolvedDefs)) {
                  addDirectFormats(resolvedDefs);
                }
              } catch (e) {
                console.log('[Pornhub Scraper] get_media fetch failed:', e.message);
              }
            }

            console.log(`[Pornhub Scraper] Total formats extracted: ${formats.length}`);
          }

          // 3. Mobile-specific pattern: video_url or link_mp4 (very reliable on m.pornhub.com)
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

          // 4. Fallback: search for direct .mp4 URLs anywhere in script tags
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

