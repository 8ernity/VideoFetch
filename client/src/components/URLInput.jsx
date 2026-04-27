import { useRef, useState } from 'react';
import { isValidUrl } from '../utils/validators';

/**
 * URL input with paste detection, drag-and-drop, and clipboard auto-paste.
 */
export default function URLInput({ url, setUrl, onSubmit, loading, clipboardUrl, onClipboardUse }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setValidationError('Please enter a video URL.');
      return;
    }
    if (!isValidUrl(url)) {
      setValidationError('Please enter a valid HTTP or HTTPS URL.');
      return;
    }
    setValidationError('');
    onSubmit();
  };

  const handleChange = (e) => {
    setUrl(e.target.value);
    if (validationError) setValidationError('');
  };

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text');
    if (text && isValidUrl(text.trim())) {
      setUrl(text.trim());
      setValidationError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const text = e.dataTransfer?.getData('text/plain');
    if (text && isValidUrl(text.trim())) {
      setUrl(text.trim());
      setValidationError('');
    }
  };

  const handleUseClipboard = () => {
    if (clipboardUrl) {
      setUrl(clipboardUrl);
      setValidationError('');
      onClipboardUse?.();
    }
  };

  return (
    <section className="url-input-section" style={{ animation: 'slideUp 0.6s ease' }}>
      <form onSubmit={handleSubmit} className="url-input-form glass-card">
        <div
          className={`url-input-wrapper ${dragOver ? 'url-input-wrapper--drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <label htmlFor="video-url" className="url-input-label">
            Paste a video URL to get started
          </label>
          <div className="url-input-row">
            <div className="url-input-field-wrapper">
              <span className="url-input-icon">🔗</span>
              <input
                ref={inputRef}
                id="video-url"
                type="url"
                className="input url-input-field"
                placeholder="Paste video link here..."
                value={url}
                onChange={handleChange}
                onPaste={handlePaste}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              id="fetch-btn"
              type="submit"
              className="btn btn-primary url-input-btn"
              disabled={loading || !url.trim()}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>🔍 Fetch</>
              )}
            </button>
          </div>
          {validationError && (
            <p className="url-input-error">{validationError}</p>
          )}
          {dragOver && (
            <div className="url-input-drop-overlay">
              <span>Drop URL here</span>
            </div>
          )}
        </div>

        {/* Clipboard suggestion */}
        {clipboardUrl && clipboardUrl !== url && (
          <div className="clipboard-hint" style={{ animation: 'fadeIn 0.3s ease' }}>
            <span>📋 Detected URL in clipboard:</span>
            <button type="button" className="clipboard-hint-btn" onClick={handleUseClipboard}>
              Use it
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
