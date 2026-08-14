import React from 'react';

export default function DownloadProgress({ downloading, progress, filename, onPause, onCancel }) {
  if (!downloading) return null;

  const percent = progress?.percent || 45;
  const speed = progress?.speed || '12.4 MB/s';
  const downloaded = progress?.downloaded || '202 MB';
  const total = progress?.total || '450 MB';
  const eta = progress?.eta || '00:00:20';

  return (
    <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 glow-active relative overflow-hidden">
      {/* Top progress bar overlay */}
      <div className="absolute inset-0 bg-primary/5 pointer-events-none">
        <div className="h-1 w-full bg-surface-container absolute top-0 left-0">
          <div
            className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(154,205,50,0.8)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="font-body-lg text-body-lg text-on-surface font-semibold">Downloading...</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 truncate max-w-xs">
              {filename || 'HIIT_FullBody_1080p.mp4'}
            </p>
          </div>
          <span className="font-headline-md text-primary font-bold">{Math.round(percent)}%</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-surface-container p-3 rounded-lg border border-white/5">
          <div className="flex flex-col items-center justify-center p-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant mb-1">Speed</span>
            <span className="font-body-md text-on-surface font-mono text-xs sm:text-sm">{speed}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 border-l border-r border-white/5">
            <span className="font-label-sm text-label-sm text-on-surface-variant mb-1">Downloaded</span>
            <span className="font-body-md text-on-surface font-mono text-xs sm:text-sm">
              {downloaded} / {total}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant mb-1">ETA</span>
            <span className="font-body-md text-on-surface font-mono text-primary text-xs sm:text-sm">{eta}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onPause}
            className="flex-1 bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-highest transition-colors rounded-lg py-3 font-body-md font-medium flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">pause</span> Pause
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors rounded-lg py-3 font-body-md font-medium flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">close</span> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
