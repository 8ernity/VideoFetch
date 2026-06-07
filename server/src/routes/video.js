/**
 * Video API routes — /api/video
 */

import { Router } from 'express';
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
      // Use RFC 5987 encoding for the filename to handle all special characters safely
      const encodedName = encodeURIComponent(`${title}.${ext}`);
      res.setHeader('Content-Disposition', `attachment; filename="video.${ext}"; filename*=UTF-8''${encodedName}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Accept-Ranges', 'none');
    };

    try {
      await streamDownload(req.videoUrl, req.formatId, req.videoType, res, setDownloadHeaders, false, trimOpts);
    } catch (err) {
      // If the link is expired (403/404), try to refresh it once automatically
      if (err.statusCode === 403 || err.statusCode === 404) {
        console.log(`[Download] Link expired (status ${err.statusCode}), attempting refresh for: ${req.videoUrl}`);
        
        try {
          const freshInfo = await getVideoInfo(req.videoUrl);
          const oldFormatId = req.formatId;
          let newFormat = null;
          
          if (oldFormatId.startsWith('custom_direct_url|')) {
            // Find the best available custom direct URL
            newFormat = freshInfo.formats.find(f => f.format_id.startsWith('custom_direct_url|'));
          } else {
            // Try to find the exact same format ID, or fall back to the first available format
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

export default router;
