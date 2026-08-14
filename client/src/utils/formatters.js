/**
 * Display formatting utilities.
 */

export function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#124;/g, '|');
}

export function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

export function calculateEstimatedBytes(format, totalDuration = 0, trimData = null) {
  if (!format) return null;

  let startVal = 0;
  let endVal = totalDuration;
  let isTrimmed = false;

  if (trimData && (trimData.enabled || trimData.startTime != null || trimData.startSec != null)) {
    const s = trimData.startSec ?? trimData.startTime ?? trimData.start;
    const e = trimData.endSec ?? trimData.endTime ?? trimData.end;
    if (s != null && e != null && e > s) {
      startVal = typeof s === 'number' ? s : parseTimestamp(s) || 0;
      endVal = typeof e === 'number' ? e : parseTimestamp(e) || totalDuration;
      isTrimmed = true;
    }
  }

  const effectiveSec = isTrimmed ? Math.max(1, endVal - startVal) : (totalDuration || 180);

  const rawBytes = format.filesize || format.filesize_approx;
  if (rawBytes && rawBytes > 0) {
    if (isTrimmed && totalDuration > 0) {
      const ratio = effectiveSec / totalDuration;
      return Math.round(rawBytes * ratio);
    }
    return rawBytes;
  }

  let bytesPerSec = 300_000;

  if (format.type === 'audio-only' || format.ext === 'mp3') {
    const kbps = parseInt(format.bitrate) || 192;
    bytesPerSec = (kbps * 1000) / 8;
  } else {
    const resStr = String(format.displayLabel || format.resolution || format.height || format.quality || '');
    if (resStr.includes('1080')) bytesPerSec = 450_000;
    else if (resStr.includes('720')) bytesPerSec = 250_000;
    else if (resStr.includes('480')) bytesPerSec = 140_000;
    else if (resStr.includes('360')) bytesPerSec = 80_000;
    else if (resStr.includes('240')) bytesPerSec = 50_000;
    else bytesPerSec = 350_000;
  }

  return Math.round(bytesPerSec * effectiveSec);
}

export function formatDuration(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatNumber(num) {
  if (!num) return '—';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export const formatViews = formatNumber;

export function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return '';
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

export function formatSeconds(seconds) {
  if (seconds == null || isNaN(seconds)) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function parseTimestamp(str) {
  if (!str) return null;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}
