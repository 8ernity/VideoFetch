import React, { useState, useEffect, useRef } from 'react';
import { isValidUrl } from '../utils/validators';

const RECENT_SEARCHES_KEY = 'videofetch_recent_searches';

export default function URLInput({ url, setUrl, onSubmit, loading, clipboardUrl, onClipboardUse }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const dropdownRef = useRef(null);
  const isValid = isValidUrl(url);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentLink = (linkToSave) => {
    if (!linkToSave || !isValidUrl(linkToSave)) return;
    try {
      const updated = [linkToSave, ...recentSearches.filter((item) => item !== linkToSave)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      /* ignore storage quota */
    }
  };

  const handleRemoveRecent = (e, linkToRemove) => {
    e.stopPropagation();
    const updated = recentSearches.filter((item) => item !== linkToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const handleClearAllRecent = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setShowDropdown(false);
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedText = e.dataTransfer.getData('text');
    if (droppedText) {
      setUrl(droppedText.trim());
      setShowDropdown(false);
    }
  };

  const handleSelectRecent = (link) => {
    setUrl(link);
    setShowDropdown(false);
  };

  const handleFormSubmit = () => {
    if (isValid && !loading) {
      saveRecentLink(url.trim());
      setShowDropdown(false);
      onSubmit();
    }
  };

  const formatRecentLink = (linkStr) => {
    if (!linkStr) return '';
    if (linkStr.length > 40) {
      return `${linkStr.substring(0, 36)}...`;
    }
    return linkStr;
  };

  return (
    <div
      ref={dropdownRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`glass-panel rounded-xl p-6 flex flex-col gap-4 relative z-50 overflow-visible group transition-all duration-300 ${
        isDragOver ? 'glow-active border-primary' : ''
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />

      {/* Label & Validation Header */}
      <div className="flex items-center justify-between">
        <label htmlFor="url-input" className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">link</span> Target URL
        </label>
        {isValid && (
          <span className="font-label-sm text-label-sm text-primary flex items-center gap-1 transition-opacity duration-200">
            <span className="material-symbols-outlined text-[14px]">check_circle</span> Valid Source
          </span>
        )}
      </div>

      {/* Input & Action Button Area */}
      <div className="flex flex-col sm:flex-row gap-3 relative">
        <div className="relative flex-1">
          <input
            id="url-input"
            name="videofetch_url_input_no_autocomplete"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={url}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setUrl(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFormSubmit();
              }
            }}
            placeholder="https://..."
            className="w-full bg-surface-container border border-outline-variant rounded-lg py-4 pl-4 pr-12 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
          />

          <button
            type="button"
            onClick={handlePaste}
            title="Paste from clipboard"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-1"
          >
            <span className="material-symbols-outlined">content_paste</span>
          </button>

          {/* RECENT SEARCHES CUSTOM DROPDOWN */}
          {showDropdown && recentSearches.length > 0 && (
            <div className="absolute left-0 top-full mt-2 w-full bg-[#191d13] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl animate-fadeIn">
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">history</span> Recent Searches
                </span>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="text-on-surface-variant hover:text-primary transition-colors text-[10px] lowercase hover:underline"
                >
                  Clear all
                </button>
              </div>
              <ul className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {recentSearches.map((linkStr, idx) => (
                  <li key={idx} className="flex items-center justify-between hover:bg-primary/10 transition-colors group">
                    <button
                      type="button"
                      onClick={() => handleSelectRecent(linkStr)}
                      className="flex-1 text-left px-4 py-3 text-on-surface font-mono text-sm flex items-center gap-2 truncate"
                    >
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">link</span>
                      <span className="truncate group-hover:text-primary transition-colors">
                        {formatRecentLink(linkStr)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveRecent(e, linkStr)}
                      title="Delete entry"
                      className="px-3 py-3 text-on-surface-variant hover:text-red-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={handleFormSubmit}
          disabled={!isValid || loading}
          className="bg-primary text-on-primary-fixed hover:bg-primary-fixed disabled:opacity-40 disabled:cursor-not-allowed transition-all rounded-lg px-8 py-4 font-body-md font-medium whitespace-nowrap flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(154,205,50,0.3)]"
        >
          {loading ? (
            <>
              <span className="animate-spin material-symbols-outlined text-[18px]">sync</span> Analyzing...
            </>
          ) : (
            <>
              Analyze <span className="material-symbols-outlined text-[18px]">search</span>
            </>
          )}
        </button>
      </div>

      <p className="font-label-sm text-label-sm text-on-surface-variant/60 text-center sm:text-left mt-1">
        Or drag and drop a supported link here
      </p>
    </div>
  );
}
