import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'videofetch_history';
const MAX_ITEMS = 20;

/**
 * Manage download history persisted in localStorage.
 */
export function useDownloadHistory() {
  const [history, setHistory] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      setHistory([]);
    }
  }, []);

  // Persist whenever history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch { /* quota exceeded — silently ignore */ }
  }, [history]);

  const addToHistory = useCallback((item) => {
    setHistory((prev) => {
      const entry = {
        id: Date.now(),
        title: item.title || 'Untitled',
        thumbnail: item.thumbnail || null,
        format: item.format || 'unknown',
        url: item.url || '',
        timestamp: new Date().toISOString(),
      };
      return [entry, ...prev].slice(0, MAX_ITEMS);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const removeItem = useCallback((id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { history, addToHistory, clearHistory, removeItem };
}
