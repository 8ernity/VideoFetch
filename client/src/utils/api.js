/**
 * API client for the VideoFetch backend.
 */

const BASE = '/api/video';

/**
 * Fetch video metadata and available formats.
 * @param {string} url — video URL
 * @returns {Promise<object>}
 */
export async function fetchVideoInfo(url) {
  const res = await fetch(`${BASE}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error('Server returned an invalid response. The backend might be down or unreachable.');
  }

  if (!res.ok) {
    throw new Error(data.error || `Server error (${res.status})`);
  }
  
  return data;
}

/**
 * Build the download URL for a given format.
 * Optionally includes trim start/end times (in seconds).
 */
export function getDownloadUrl(url, formatId, title, ext, type, trimStart, trimEnd) {
  const params = new URLSearchParams({ url, format_id: formatId, title: title || 'video', ext: ext || 'mp4', type: type || 'video' });
  if (trimStart != null && trimEnd != null) {
    params.set('trim_start', String(Math.floor(trimStart)));
    params.set('trim_end', String(Math.floor(trimEnd)));
  }
  return `${BASE}/download?${params.toString()}`;
}

/**
 * Download a video with progress tracking via fetch + ReadableStream.
 * @param {string} downloadUrl
 * @param {function} onProgress — called with { loaded, total, percent }
 * @returns {Promise<Blob>}
 */
export async function downloadWithProgress(downloadUrl, onProgress) {
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    const text = await res.text();
    let msg = 'Download failed.';
    try { msg = JSON.parse(text).error; } catch {}
    throw new Error(msg);
  }

  const contentLength = res.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : null;

  if (!res.body) {
    // Fallback: no streaming support
    const blob = await res.blob();
    onProgress?.({ loaded: blob.size, total: blob.size, percent: 100 });
    return blob;
  }

  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    const percent = total ? Math.round((loaded / total) * 100) : null;
    onProgress?.({ loaded, total, percent });
  }

  return new Blob(chunks, { type: 'video/mp4' });
}

/**
 * Trigger a browser download from a Blob.
 * Sanitizes the filename to prevent the browser from falling back to a blob UUID.
 */
export function triggerBlobDownload(blob, filename) {
  // Sanitize filename: replace invalid characters with underscore
  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Delay revoking the object URL to ensure the browser has time 
  // to initiate the save from memory to disk, especially for large files.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
