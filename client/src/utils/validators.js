/**
 * URL validation utilities.
 */

const URL_REGEX = /^https?:\/\/.+\..+/i;

/**
 * Check if a string looks like a valid HTTP/HTTPS URL.
 */
export function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false;
  if (!URL_REGEX.test(str.trim())) return false;
  try {
    const u = new URL(str.trim());
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}
