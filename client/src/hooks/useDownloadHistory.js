import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'videofetch_history';
const MAX_ITEMS = 20;

/**
 * Manage download history persisted in localStorage.
 * Automatically deduplicates existing entries so each video appears only once.
 */
export function useDownloadHistory() {
  const [history, setHistory] = useState([]);

  // Load from localStorage on mount & clean up existing duplicates
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Clean initial duplicates if any exist in storage
          const uniqueList = [];
          const seenKeys = new Set();
          parsed.forEach((item) => {
            const key = (item.url || item.title || '').trim().toLowerCase();
            if (key && !seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueList.push(item);
            }
          });
          setHistory(uniqueList);
        }
      }
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
      const newUrl = (item.url || '').trim().toLowerCase();
      const newTitle = (item.title || '').trim().toLowerCase();

      // Deduplicate: remove any existing entry with matching URL or matching Title
      const filtered = prev.filter((existing) => {
        const existUrl = (existing.url || '').trim().toLowerCase();
        const existTitle = (existing.title || '').trim().toLowerCase();

        if (newUrl && existUrl && newUrl === existUrl) return false;
        if (newTitle && existTitle && newTitle === existTitle) return false;
        return true;
      });

      const entry = {
        id: Date.now(),
        title: item.title || 'Untitled',
        thumbnail: item.thumbnail || null,
        format: item.format || 'unknown',
        url: item.url || '',
        uploader: item.uploader || null,
        timestamp: new Date().toISOString(),
      };

      return [entry, ...filtered].slice(0, MAX_ITEMS);
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
