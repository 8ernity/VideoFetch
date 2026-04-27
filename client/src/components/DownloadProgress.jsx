import { formatBytes } from '../utils/formatters';

/**
 * Download progress overlay with animated progress bar.
 */
export default function DownloadProgress({ progress, filename }) {
  const { loaded, total, percent } = progress || {};
  const displayPercent = percent != null ? percent : null;

  return (
    <section className="download-progress glass-card" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="download-progress__header">
        <span className="download-progress__icon spinner-pulse">⬇️</span>
        <div>
          <h3 className="download-progress__title">Downloading…</h3>
          {filename && <p className="download-progress__filename">{filename}</p>}
        </div>
      </div>

      <div className="progress-bar">
        <div
          className="progress-bar__fill"
          style={{ width: displayPercent != null ? `${displayPercent}%` : '100%' }}
          data-indeterminate={displayPercent == null ? 'true' : undefined}
        />
      </div>

      <div className="download-progress__stats">
        {displayPercent != null ? (
          <>
            <span>{displayPercent}%</span>
            <span>
              {formatBytes(loaded)} / {formatBytes(total)}
            </span>
          </>
        ) : (
          <span>{formatBytes(loaded)} downloaded</span>
        )}
      </div>
    </section>
  );
}
