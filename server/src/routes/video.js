/**
 * Video API routes — /api/video
 */

import { Router } from 'express';
import http from 'http';
import https from 'https';
import { validateVideoUrl, validateDownloadParams } from '../middleware/validator.js';
import { getVideoInfo, streamDownload } from '../services/ytdlp.js';
import { sanitizeFilename } from '../utils/helpers.js';

const router = Router();

/**
 * POST /api/video/info
 * Body: { url: string }
 * Returns video metadata and available formats.
 */
router.post('/info', validateVideoUrl, async (req, res) => {
  try {
    const info = await getVideoInfo(req.videoUrl);
    res.json(info);
  } catch (err) {
    console.error('[/api/video/info]', err.message);
    const status = err.message.includes('not supported') ? 400
      : err.message.includes('private') ? 403
      : err.message.includes('unavailable') ? 404
      : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/video/thumbnail?url=...
 * Proxies thumbnail images with referer bypass.
 */
router.get('/thumbnail', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return res.status(400).send('Invalid image URL');
    }

    const fetchImage = (targetUrl, redirectDepth = 0) => {
      if (redirectDepth > 5) {
        return res.status(502).send('Too many redirects');
      }

      try {
        const parsed = new URL(targetUrl);
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Referer': `${parsed.protocol}//${parsed.hostname}/`,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        };

        const client = targetUrl.startsWith('https') ? https : http;
        const request = client.get(targetUrl, { headers }, (imgRes) => {
          // Follow HTTP redirects (301, 302, 303, 307, 308)
          if (imgRes.statusCode >= 300 && imgRes.statusCode < 400 && imgRes.headers.location) {
            const redirectUrl = new URL(imgRes.headers.location, targetUrl).toString();
            return fetchImage(redirectUrl, redirectDepth + 1);
          }

          if (imgRes.statusCode >= 400) {
            return res.status(imgRes.statusCode).send('Image fetch failed');
          }

          res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          imgRes.pipe(res);
        });

        request.on('error', () => {
          if (!res.headersSent) res.status(500).send('Failed to proxy image');
        });
      } catch (e) {
        if (!res.headersSent) res.status(500).send(e.message);
      }
    };

    fetchImage(imageUrl);
  } catch (err) {
    if (!res.headersSent) res.status(500).send(err.message);
  }
});

/**
 * GET /api/video/download?url=...&format_id=...&title=...
 * Streams the requested format to the client.
 */
router.get('/download', validateDownloadParams, async (req, res) => {
  try {
    const title = req.query.title || 'video';
    const ext = req.query.ext || 'mp4';

    const trimOpts = (req.trimStart != null && req.trimEnd != null)
      ? { start: req.trimStart, end: req.trimEnd }
      : null;

    const setDownloadHeaders = () => {
      const encodedName = encodeURIComponent(`${title}.${ext}`);
      res.setHeader('Content-Disposition', `attachment; filename="video.${ext}"; filename*=UTF-8''${encodedName}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Accept-Ranges', 'none');
    };

    try {
      await streamDownload(req.videoUrl, req.formatId, req.videoType, res, setDownloadHeaders, false, trimOpts);
    } catch (err) {
      if (err.statusCode === 403 || err.statusCode === 404) {
        console.log(`[Download] Link expired (status ${err.statusCode}), attempting refresh for: ${req.videoUrl}`);
        try {
          const freshInfo = await getVideoInfo(req.videoUrl);
          const oldFormatId = req.formatId;
          let newFormat = null;
          
          if (oldFormatId.startsWith('custom_direct_url|')) {
            newFormat = freshInfo.formats.find(f => f.format_id.startsWith('custom_direct_url|'));
          } else {
            newFormat = freshInfo.formats.find(f => f.format_id === oldFormatId) || freshInfo.formats[0];
          }

          if (newFormat) {
            console.log(`[Download] Found fresh link, restarting stream...`);
            return await streamDownload(req.videoUrl, newFormat.format_id, req.videoType, res, setDownloadHeaders, false, trimOpts);
          }
        } catch (refreshErr) {
          console.error('[Download] Automatic refresh failed:', refreshErr.message);
        }
      }
      throw err;
    }
  } catch (err) {
    console.error('[/api/video/download]', err.message);
    if (!res.headersSent) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message });
    }
  }
});

/**
 * GET /api/video/stream?url=...&format_id=...
 * Proxies the video stream to the client for playback and previewing.
 */
router.get('/stream', validateDownloadParams, async (req, res) => {
  try {
    const setStreamHeaders = () => {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
    };

    const rangeHeader = req.headers.range;
    const streamOpts = rangeHeader ? { range: rangeHeader } : null;

    // Fast progressive stream for in-app preview player to guarantee zero black screen
    let streamFormatId = req.formatId;
    if (streamFormatId && (streamFormatId.includes('+') || streamFormatId === '137' || streamFormatId === '299' || streamFormatId === '399')) {
      streamFormatId = 'best[ext=mp4]/18/best';
    }

    try {
      await streamDownload(req.videoUrl, streamFormatId, req.videoType, res, setStreamHeaders, false, streamOpts);
    } catch (err) {
      if (err.statusCode === 403 || err.statusCode === 404) {
        console.log(`[Stream] Link expired (status ${err.statusCode}), attempting refresh for: ${req.videoUrl}`);
        try {
          await streamDownload(req.videoUrl, 'best[ext=mp4]/best', req.videoType, res, setStreamHeaders, false, streamOpts);
        } catch (refreshErr) {
          console.error('[Stream] Automatic refresh failed:', refreshErr.message);
        }
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('[/api/video/stream]', err.message);
    if (!res.headersSent) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message });
    }
  }
});

export default router;
