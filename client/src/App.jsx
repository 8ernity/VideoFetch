import { useState, useCallback, useRef } from 'react';
import ParticleBackground from './components/ParticleBackground';
import Header from './components/Header';
import Disclaimer from './components/Disclaimer';
import URLInput from './components/URLInput';
import VideoPreview from './components/VideoPreview';
import FormatSelector from './components/FormatSelector';
import VideoTrimmer from './components/VideoTrimmer';
import DownloadProgress from './components/DownloadProgress';
import DownloadHistory from './components/DownloadHistory';
import Footer from './components/Footer';
import { useClipboard } from './hooks/useClipboard';
import { useDownloadHistory } from './hooks/useDownloadHistory';
import { fetchVideoInfo, getDownloadUrl } from './utils/api';
import './App.css';

export default function App() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const trimDataRef = useRef(null);

  const { clipboardUrl, dismiss: dismissClipboard } = useClipboard();
  const { history, addToHistory, clearHistory, removeItem } = useDownloadHistory();

  /* Fetch video metadata */
  const handleFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVideoInfo(null);
    setSelectedFormat(null);
    try {
      const info = await fetchVideoInfo(url);
      setVideoInfo(info);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  /* Download selected format */
  const handleDownload = useCallback(async () => {
    if (!videoInfo || !selectedFormat) return;
    setDownloading(true);
    setDownloadProgress({ loaded: 0, total: null, percent: 0 });
    setError(null);

    try {
      const trim = trimDataRef.current;
      const downloadUrl = getDownloadUrl(
        url,
        selectedFormat.format_id,
        videoInfo.title,
        selectedFormat.ext,
        trim ? trim.startTime : null,
        trim ? trim.endTime : null
      );

      // Trigger native browser download in a new tab
      // This ensures if the backend throws an error (e.g. format unavailable), you can see it.
      const newWindow = window.open(downloadUrl, '_blank');
      if (!newWindow) {
        throw new Error('Your browser blocked the download popup. Please allow popups for this site.');
      }

      // Add to history
      addToHistory({
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        format: `${selectedFormat.ext.toUpperCase()} ${selectedFormat.resolution || selectedFormat.quality || ''}`.trim(),
        url,
      });

      // Show the downloading state briefly so the user knows it started
      setTimeout(() => {
        setDownloading(false);
      }, 3000);

    } catch (err) {
      setError(err.message);
      setDownloading(false);
    }
  }, [videoInfo, selectedFormat, url, addToHistory]);

  /* Handle trim changes */
  const handleTrimChange = useCallback((trimData) => {
    trimDataRef.current = trimData;
  }, []);

  /* Reset state for a new search */
  const handleReset = () => {
    setUrl('');
    setVideoInfo(null);
    setSelectedFormat(null);
    setError(null);
    trimDataRef.current = null;
  };

  return (
    <div className="app">
      <ParticleBackground />

      <Header
        onHistoryToggle={() => setShowHistory((p) => !p)}
        historyOpen={showHistory}
      />

      <main className="app__main container">
        <div className="hero" style={{ animation: 'fadeIn 0.6s ease' }}>
          <h2 className="hero__title">
            Download Videos <span className="hero__accent">Instantly</span>
          </h2>
          <p className="hero__subtitle">
            Paste any supported video URL and choose your preferred format.
            Fast, free, and private.
          </p>
        </div>

        <Disclaimer />

        <URLInput
          url={url}
          setUrl={setUrl}
          onSubmit={handleFetch}
          loading={loading}
          clipboardUrl={clipboardUrl}
          onClipboardUse={dismissClipboard}
        />

        {/* Loading skeleton */}
        {loading && (
          <div className="loading-state glass-card" style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="loading-state__spinner">
              <div className="spinner-ring" />
            </div>
            <p className="loading-state__text">Fetching video information…</p>
            <p className="loading-state__sub">This may take a few seconds</p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="error-display glass-card" style={{ animation: 'fadeIn 0.3s ease' }}>
            <span className="error-display__icon">❌</span>
            <div>
              <p className="error-display__msg">{error}</p>
              <button className="btn btn-secondary btn-sm" onClick={handleReset} style={{ marginTop: '0.75rem' }}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Video info + format selector */}
        {videoInfo && !loading && (
          <>
            <VideoPreview info={videoInfo} />
            <FormatSelector
              formats={videoInfo.formats}
              selected={selectedFormat}
              onSelect={setSelectedFormat}
            />

            {selectedFormat && (
              <VideoTrimmer
                duration={videoInfo.duration}
                selectedFormat={selectedFormat}
                onTrimChange={handleTrimChange}
              />
            )}

            {selectedFormat && !downloading && (
              <div className="download-action" style={{ animation: 'fadeIn 0.3s ease' }}>
                <button
                  id="download-btn"
                  className="btn btn-primary download-action__btn"
                  onClick={handleDownload}
                >
                  ⬇️ Download {selectedFormat.ext.toUpperCase()}
                  {selectedFormat.resolution ? ` — ${selectedFormat.resolution}` : ''}
                </button>
              </div>
            )}
          </>
        )}

        {/* Download progress */}
        {downloading && (
          <div className="download-progress glass-card" style={{ animation: 'slideUp 0.4s ease', textAlign: 'center', padding: '1.5rem' }}>
            <div className="download-progress__header" style={{ justifyContent: 'center' }}>
              <span className="download-progress__icon spinner-pulse">📦</span>
              <h3 className="download-progress__title">Download Started!</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Your download is now being handled by your browser. Check your browser's download manager.
            </p>
          </div>
        )}

        {/* History panel */}
        {showHistory && (
          <DownloadHistory
            history={history}
            onClear={clearHistory}
            onRemove={removeItem}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
