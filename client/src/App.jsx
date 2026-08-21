import React, { useState, useCallback, useRef } from 'react';
import SideNavBar from './components/SideNavBar';
import Header from './components/Header';
import URLInput from './components/URLInput';
import VideoPreview from './components/VideoPreview';
import FormatSelector from './components/FormatSelector';
import VideoTrimmer from './components/VideoTrimmer';
import DownloadProgress from './components/DownloadProgress';
import DownloadHistory from './components/DownloadHistory';
import Settings from './components/Settings';
import Help from './components/Help';
import { useClipboard } from './hooks/useClipboard';
import { useDownloadHistory } from './hooks/useDownloadHistory';
import { useAppSettings } from './hooks/useAppSettings';
import { fetchVideoInfo, getDownloadUrl, downloadWithProgress, triggerBlobDownload } from './utils/api';
import { calculateEstimatedBytes, formatBytes } from './utils/formatters';

export default function App() {
  const [activeTab, setActiveTab] = useState('downloader'); // 'downloader' | 'history' | 'settings'
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [trimData, setTrimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const { clipboardUrl, dismiss: dismissClipboard } = useClipboard();
  const { history, addToHistory, removeItem, clearHistory } = useDownloadHistory();
  const { settings, updateSetting, resetSettings } = useAppSettings();

  const trimDataRef = useRef(trimData);
  trimDataRef.current = trimData;

  /* Fetch real video metadata from backend API */
  const handleFetch = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setVideoInfo(null);
    setSelectedFormat(null);
    try {
      const info = await fetchVideoInfo(url.trim());
      setVideoInfo(info);
      if (info.formats && info.formats.length > 0) {
        setSelectedFormat(info.formats[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze video URL. Please check the link and try again.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  /* Download selected format via real backend streaming endpoint */
  const handleDownload = useCallback(async () => {
    if (!videoInfo || !selectedFormat) return;
    setDownloading(true);
    setDownloadProgress({
      percent: 5,
      speed: 'Initializing connection...',
      downloaded: '0 MB',
      total: selectedFormat.filesize ? formatBytes(selectedFormat.filesize) : 'Calculating...',
      eta: 'Connecting...',
    });
    setError(null);

    try {
      const trim = trimDataRef.current;
      const downloadUrl = getDownloadUrl(
        url,
        selectedFormat.format_id,
        videoInfo.title,
        selectedFormat.ext,
        selectedFormat.type,
        trim && trim.enabled ? trim.startTime : null,
        trim && trim.enabled ? trim.endTime : null
      );

      let startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = Date.now();

      const blob = await downloadWithProgress(downloadUrl, ({ loaded, total, percent }) => {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        let speedStr = 'Downloading...';
        
        if (timeDiff > 0.5) {
          const bytesDiff = loaded - lastLoaded;
          const bytesPerSec = bytesDiff / timeDiff;
          speedStr = `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
          lastLoaded = loaded;
          lastTime = now;
        }

        const downloadedStr = formatBytes(loaded);
        const totalStr = total ? formatBytes(total) : 'Stream';
        
        setDownloadProgress({
          percent: percent || 50,
          speed: speedStr,
          downloaded: downloadedStr,
          total: totalStr,
          eta: percent && percent > 0 ? `${Math.ceil(((100 - percent) * (now - startTime)) / percent / 1000)}s` : 'Downloading...',
        });
      });

      const fileName = `${videoInfo.title}.${selectedFormat.ext || 'mp4'}`;
      triggerBlobDownload(blob, fileName);

      // Add real download item to history
      addToHistory({
        id: Date.now(),
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        format: `${selectedFormat.resolution || selectedFormat.quality || 'HD'} ${selectedFormat.ext ? selectedFormat.ext.toUpperCase() : 'MP4'}`.trim(),
        channel: videoInfo.uploader || 'Public Stream',
        size: formatBytes(blob.size),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        url,
      });

      setDownloading(false);
      setNotification('Download completed successfully!');
      setTimeout(() => setNotification(null), 4000);

    } catch (err) {
      console.error('[Download Error]', err);
      setError(err.message || 'Download failed. Please check your network connection.');
      setDownloading(false);
    }
  }, [videoInfo, selectedFormat, url, addToHistory]);

  /* Reset state for new URL search */
  const handleReset = () => {
    setUrl('');
    setVideoInfo(null);
    setSelectedFormat(null);
    setError(null);
    trimDataRef.current = null;
  };

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex antialiased selection:bg-primary selection:text-on-primary relative">
      {/* Side Navigation Bar */}
      <SideNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileNavOpen}
        setMobileOpen={setMobileNavOpen}
      />

      {/* Main App Wrapper */}
      <div className="flex-1 flex flex-col md:ml-64 relative min-h-screen">
        {/* Top Navigation Bar */}
        <Header
          mobileOpen={mobileNavOpen}
          setMobileOpen={setMobileNavOpen}
          onNotificationClick={() => {
            setNotification('System Status: Download Engine active.');
            setTimeout(() => setNotification(null), 3000);
          }}
        />

        {/* Global Toast Notification */}
        {notification && (
          <div className="fixed top-24 right-6 md:right-10 z-[99999] bg-primary text-on-primary font-medium px-5 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/20 flex items-center gap-3 animate-bounce">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="text-sm font-semibold">{notification}</span>
          </div>
        )}

        {/* Canvas / Content Area */}
        <main className="flex-1 pt-24 px-4 md:px-8 pb-12 overflow-y-auto w-full max-w-7xl mx-auto">
          {/* DOWNLOADER TAB VIEW */}
          {activeTab === 'downloader' && (
            <div className="w-full flex flex-col gap-8" style={{ animation: 'fadeIn 0.3s ease' }}>
              {/* Header section */}
              <div>
                <h1 className="font-headline-md text-headline-md text-on-surface font-bold mb-1">
                  Download Engine
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Paste a URL to analyze and extract media.
                </p>
              </div>

              {/* Error display if any */}
              {error && (
                <div className="glass-panel border-error/30 bg-error/10 text-on-surface p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-error">error</span>
                    <p className="text-sm">{error}</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs bg-surface border border-outline-variant px-3 py-1.5 rounded-lg hover:bg-surface-bright transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* URL Input Controller */}
              <URLInput
                url={url}
                setUrl={setUrl}
                onSubmit={handleFetch}
                loading={loading}
                clipboardUrl={clipboardUrl}
                onClipboardUse={dismissClipboard}
                recentLinks={history}
              />

              {/* Loading State */}
              {loading && (
                <div className="glass-panel rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center">
                  <span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span>
                  <p className="font-body-lg font-semibold text-on-surface">Analyzing Video Link...</p>
                  <p className="text-xs text-on-surface-variant">Extracting available video qualities and metadata</p>
                </div>
              )}

              {/* Real Video Information & Options (Only displayed after successful analysis) */}
              {videoInfo && !loading && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Real Media Preview & Video Trimmer */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    {videoInfo.is_fake_fallback && (
                      <div className="glass-panel border-warning/30 bg-warning/10 text-on-surface p-4 rounded-xl flex items-start gap-3">
                        <span className="material-symbols-outlined text-warning mt-0.5">warning</span>
                        <div className="text-sm">
                          <p className="font-bold text-warning mb-1">Unverified Formats (Bot Protection Triggered)</p>
                          <p className="opacity-90">YouTube blocked our metadata extractor. We are showing default fallback formats, but downloads might fail if the chosen format doesn't actually exist for this video.</p>
                        </div>
                      </div>
                    )}
                    <VideoPreview
                      info={videoInfo}
                      selectedFormat={selectedFormat}
                      videoUrl={url}
                      onDurationDetected={(durationSec) => {
                        if (durationSec > 0 && Math.round(durationSec) !== videoInfo.duration) {
                          setVideoInfo(prev => prev ? { ...prev, duration: Math.round(durationSec) } : prev);
                        }
                      }}
                    />
                    <VideoTrimmer
                      duration={videoInfo.duration || 0}
                      onTrimChange={(data) => {
                        trimDataRef.current = data;
                        setTrimData(data);
                      }}
                    />
                  </div>

                  {/* Right Column: Real Format Configuration */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <FormatSelector
                      formats={videoInfo.formats || []}
                      selected={selectedFormat}
                      onSelect={setSelectedFormat}
                    />

                    {/* Download Action Button & Estimated Size Display */}
                    {!downloading ? (
                      <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 glow-active">
                        {selectedFormat && (
                          <div className="flex items-center justify-between bg-surface-container border border-white/10 px-4 py-3 rounded-lg text-sm">
                            <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
                              <span className="material-symbols-outlined text-[18px] text-primary">hard_drive</span>
                              {trimData?.enabled ? 'Trimmed Download Size:' : 'Estimated Download Size:'}
                            </span>
                            <span className="font-mono font-bold text-primary text-base">
                              {formatBytes(calculateEstimatedBytes(selectedFormat, videoInfo.duration || 0, trimData))}
                            </span>
                          </div>
                        )}

                        <button
                          onClick={handleDownload}
                          disabled={!selectedFormat}
                          className="w-full bg-primary text-on-primary-fixed hover:bg-primary-fixed disabled:opacity-40 disabled:cursor-not-allowed transition-all rounded-lg py-4 font-body-md font-bold text-center flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(154,205,50,0.4)]"
                        >
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                            download
                          </span>
                          Download {selectedFormat ? `${selectedFormat.ext?.toUpperCase()} (${selectedFormat.resolution || selectedFormat.quality || 'HD'})` : 'Media'}
                        </button>
                      </div>
                    ) : (
                      <DownloadProgress
                        downloading={downloading}
                        progress={downloadProgress}
                        filename={videoInfo ? `${videoInfo.title.substring(0, 30)}.mp4` : 'video.mp4'}
                        onPause={() => {
                          setNotification('Download paused.');
                          setTimeout(() => setNotification(null), 3000);
                        }}
                        onCancel={() => setDownloading(false)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Initial Feature Badges (Only displayed before any URL is searched) */}
              {!videoInfo && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div className="glass-panel p-5 rounded-xl flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">high_quality</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-surface text-sm">Multiple Resolutions</h3>
                      <p className="text-xs text-on-surface-variant mt-1">Download in 4K, 1080p, 720p, 480p, or extract MP3 audio.</p>
                    </div>
                  </div>

                  <div className="glass-panel p-5 rounded-xl flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">content_cut</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-surface text-sm">Video Trimming</h3>
                      <p className="text-xs text-on-surface-variant mt-1">Specify custom start and end timestamps to download specific sections.</p>
                    </div>
                  </div>

                  <div className="glass-panel p-5 rounded-xl flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">speed</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-surface text-sm">Fast Chunk Streaming</h3>
                      <p className="text-xs text-on-surface-variant mt-1">Direct stream piping with zero server file storage required.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB VIEW */}
          {activeTab === 'history' && (
            <DownloadHistory
              history={history}
              onClear={clearHistory}
              onRemove={removeItem}
            />
          )}

          {/* SETTINGS TAB VIEW */}
          {activeTab === 'settings' && (
            <Settings
              settings={settings}
              updateSetting={updateSetting}
              resetSettings={resetSettings}
              onClearAllData={() => {
                clearHistory();
                handleReset();
                setNotification('All settings, history, and cache reset successfully.');
                setTimeout(() => setNotification(null), 3000);
              }}
            />
          )}

          {/* HELP TAB VIEW */}
          {activeTab === 'help' && (
            <Help onGoToDownloader={() => setActiveTab('downloader')} />
          )}
        </main>
      </div>
    </div>
  );
}
