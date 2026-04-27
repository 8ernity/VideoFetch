
/**
 * yt-dlp service — wraps the yt-dlp CLI for metadata extraction and downloads.
 * Configured for maximum site compatibility with automatic proxy fallback.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, execSync } from 'child_process';
import { formatBytes, formatDuration } from '../utils/helpers.js';

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
let FFMPEG_PATH = 'ffmpeg'; // default
const TIMEOUT_MS = 120_000;
const PROXY = process.env.PROXY_URL || '';
const TEMP_DIR = path.join(process.cwd(), 'temp_downloads');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
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
    '--quiet',                        // strictly no logs to stdout
    '--no-playlist',
    '--no-check-certificates',       // bypass SSL cert issues
    '--geo-bypass',                   // bypass geo-restrictions
    '--socket-timeout', '30',
    '--retries', '3',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--no-part',                      // avoid .part files when possible
    '--no-mtime',                     // don't try to set modification time
    '--paths', `temp:${TEMP_DIR}`,    // ensure temp files go to our temp dir
  ];

  if (url) {
    args.push('--referer', url);
  }

  // Proxy support — either explicit env var or fallback
  const proxy = opts.useProxy ? (PROXY || 'auto') : PROXY;
  if (proxy) {
    args.push('--proxy', proxy);
  }

  // Optional cookies file for sites that need login
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
    const proc = spawn(YTDLP, args, { cwd: TEMP_DIR });

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
export async function getVideoInfo(url) {
  try {
    return await attemptGetInfo(url, false);
  } catch (err) {
    // If it's a connection error and we have a proxy configured, try with proxy
    if (isConnectionError(err.message) && PROXY) {
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
      errorMsg.includes('unable to download api page')
    ) {
      console.log('[yt-dlp] Native extraction failed, attempting custom fallback...');
      try {
        const customResult = await customExtractor(url);
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
export function streamDownload(url, formatId, res, onHeaders, useProxy = false, opts = null) {
  return new Promise(async (resolve, reject) => {
    const tempId = crypto.randomBytes(8).toString('hex');
    const tempFile = path.join(TEMP_DIR, `vfetch_${tempId}.mp4`);
    console.log(`[Process] Buffering to file: ${tempFile}`);
    
    let hasError = false;
    let ytError = '';

    // 1. Prepare download arguments
    let isDirectUrl = formatId.startsWith('custom_direct_url|');
    let targetFormat = formatId;
    
    if (!isDirectUrl && (url.includes('youtube.com') || url.includes('youtu.be')) && !targetFormat.includes('+')) {
      targetFormat = `${targetFormat}+bestaudio[ext=m4a]/bestaudio/best`;
    }

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
      console.log(`[Process] Downloading direct URL via FFmpeg: ${directUrl.substring(0, 50)}...`);
      ytProc = spawn(FFMPEG_PATH, ffArgs, { cwd: TEMP_DIR });
    } else {
      const ytArgs = [
        ...getBaseArgs(url, { useProxy }),
        '-f', targetFormat,
        '--js-runtimes', 'node',
        '--no-part',
        '-o', tempFile,
        '--ffmpeg-location', FFMPEG_PATH,
        '--recode-video', 'mp4'
      ];

      if (opts && opts.start != null && opts.end != null) {
        const start = formatSeconds(opts.start);
        const end = formatSeconds(opts.end);
        ytArgs.push('--download-sections', `*${start}-${end}`);
        ytArgs.push('--force-keyframes-at-cuts');
      }
      
      ytArgs.push(url);
      ytProc = spawn(YTDLP, ytArgs, { cwd: TEMP_DIR });
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
      const isVideoOnly = f.vcodec !== 'none' && f.acodec === 'none';
      return {
        format_id: f.format_id,
        url: f.url,
        manifest_url: f.manifest_url,
        http_headers: f.http_headers,
        cookies: f.cookies,
        // Since our backend always remuxes into a streamable MP4, we report mp4 extension
        ext: 'mp4',
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
 * Custom extractor for specific sites not supported by yt-dlp
 */
function customExtractor(url, prevCookies = '') {
  return new Promise((resolve, reject) => {
    // Determine which custom logic to use based on URL
    const isPimpBunny = url.includes('pimpbunny.com');
    const isXHamster = url.includes('xhamster.com');
    
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    const headers = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': prevCookies
    };
    
    https.get(url, { headers }, (res) => {
      const newCookies = res.headers['set-cookie'] ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
      const combinedCookies = [prevCookies, newCookies].filter(Boolean).join('; ');
      
      // If we get a redirect, follow it and pass cookies
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const origin = new URL(url).origin;
          redirectUrl = new URL(redirectUrl, origin).href;
        }
        return customExtractor(redirectUrl, combinedCookies).then(resolve).catch(reject);
      }

      const cookies = combinedCookies;
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400 && !data.includes('mp4')) {
          return reject(new Error(`Site returned error ${res.statusCode}`));
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

          resolve({
            title,
            thumbnail: null,
            duration,
            duration_label: durationLabel,
            uploader: isXHamster ? 'xHamster' : 'Web',
            view_count: null,
            upload_date: null,
            webpage_url: url,
            extractor: 'custom-scraper',
            formats: formats
          });
        } else {
          reject(new Error('Could not find any direct video links in page source. The site may be protected or the content removed.'));
        }
      });
    }).on('error', reject);
  });
}

