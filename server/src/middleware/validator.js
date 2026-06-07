import { checkBlocklist } from '../utils/blocklist.js';

/**
 * Middleware to validate and sanitise incoming video URLs.
 */
export function validateVideoUrl(req, res, next) {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid URL is required.' });
  }

  const trimmed = url.trim();

  // Basic URL format check
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  // Blocklist check
  const { blocked, platform } = checkBlocklist(trimmed);
  if (blocked) {
    return res.status(403).json({
      error: `This platform (${platform}) is DRM-protected and not supported.`,
    });
  }

  req.videoUrl = trimmed;
  next();
}

/**
 * Validate download query parameters.
 */
export function validateDownloadParams(req, res, next) {
  const { url, format_id } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing "url" query parameter.' });
  }

  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  const { blocked, platform } = checkBlocklist(url.trim());
  if (blocked) {
    return res.status(403).json({
      error: `Platform (${platform}) is DRM-protected and not supported.`,
    });
  }

  if (!format_id || typeof format_id !== 'string') {
    return res.status(400).json({ error: 'Missing "format_id" query parameter.' });
  }

  req.videoUrl = url.trim();
  req.formatId = format_id.trim();
  req.videoType = typeof req.query.type === 'string' ? req.query.type.trim() : 'video+audio';

  // Optional trim parameters (seconds)
  const { trim_start, trim_end } = req.query;
  if (trim_start != null && trim_end != null) {
    const start = parseInt(trim_start, 10);
    const end = parseInt(trim_end, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || end <= start) {
      return res.status(400).json({ error: 'Invalid trim parameters. End must be greater than start.' });
    }
    req.trimStart = start;
    req.trimEnd = end;
  }

  next();
}
