import { useState, useEffect, useCallback } from 'react';
import { isValidUrl } from '../utils/validators';

/**
 * Detect clipboard content when the user focuses the window.
 * Returns the clipboard URL if it looks valid, null otherwise.
 */
export function useClipboard() {
  const [clipboardUrl, setClipboardUrl] = useState(null);

  const checkClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard?.readText) return;
      const text = await navigator.clipboard.readText();
      if (text && isValidUrl(text.trim())) {
        setClipboardUrl(text.trim());
      } else {
        setClipboardUrl(null);
      }
    } catch {
      // Permission denied or not available — silently ignore
    }
  }, []);

  useEffect(() => {
    const handler = () => checkClipboard();
    window.addEventListener('focus', handler);
    // Check once on mount
    checkClipboard();
    return () => window.removeEventListener('focus', handler);
  }, [checkClipboard]);

  const dismiss = () => setClipboardUrl(null);

  return { clipboardUrl, dismiss };
}
