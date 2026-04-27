/**
 * Blocklist — DRM-protected and restricted platforms.
 * Requests to these domains are rejected to comply with legal requirements.
 */

const BLOCKED_DOMAINS = [
  'netflix.com',
  'primevideo.com',
  'amazon.com/gp/video',
  'disneyplus.com',
  'hulu.com',
  'hbomax.com',
  'max.com',
  'peacocktv.com',
  'paramountplus.com',
  'apple.com/tv',
  'tv.apple.com',
  'crunchyroll.com',
  'funimation.com',
  'showtime.com',
  'starz.com',
  'britbox.com',
  'mubi.com',
  'curiositystream.com',
];

/**
 * Check if a URL belongs to a blocked platform.
 * @param {string} url
 * @returns {{ blocked: boolean, platform?: string }}
 */
export function checkBlocklist(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const domain of BLOCKED_DOMAINS) {
      if (hostname.includes(domain.split('/')[0])) {
        return { blocked: true, platform: domain };
      }
    }
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}
