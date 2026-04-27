import { useState, useEffect, useCallback } from 'react';
import { formatBytes } from '../utils/formatters';

/**
 * Format seconds into HH:MM:SS or MM:SS display.
 */
function formatTime(seconds) {
  if (!seconds || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Parse a time string (MM:SS or HH:MM:SS) into seconds.
 */
function parseTime(str) {
  const parts = str.split(':').map(Number).filter((n) => !isNaN(n));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/**
 * Video trimmer with dual-range slider, time inputs, and estimated size.
 */
export default function VideoTrimmer({ duration, selectedFormat, onTrimChange }) {
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(duration || 0);
  const [startInput, setStartInput] = useState('00:00');
  const [endInput, setEndInput] = useState(formatTime(duration));

  // Reset when duration changes (new video)
  useEffect(() => {
    setStartTime(0);
    setEndTime(duration || 0);
    setStartInput('00:00');
    setEndInput(formatTime(duration));
    setEnabled(false);
  }, [duration]);

  // Sync display when slider changes
  useEffect(() => {
    setStartInput(formatTime(startTime));
  }, [startTime]);

  useEffect(() => {
    setEndInput(formatTime(endTime));
  }, [endTime]);

  // Notify parent of trim state changes
  const notifyChange = useCallback((isEnabled, start, end) => {
    if (isEnabled && duration > 0) {
      const trimDuration = Math.max(0, end - start);
      const ratio = trimDuration / duration;
      const estimatedSize = selectedFormat?.filesize
        ? Math.round(selectedFormat.filesize * ratio)
        : null;
      onTrimChange({ startTime: start, endTime: end, estimatedSize });
    } else {
      onTrimChange(null);
    }
  }, [duration, selectedFormat, onTrimChange]);

  useEffect(() => {
    notifyChange(enabled, startTime, endTime);
  }, [enabled, startTime, endTime, notifyChange]);

  const handleStartSlider = (e) => {
    const val = Number(e.target.value);
    const clamped = Math.min(val, endTime - 1);
    setStartTime(Math.max(0, clamped));
  };

  const handleEndSlider = (e) => {
    const val = Number(e.target.value);
    const clamped = Math.max(val, startTime + 1);
    setEndTime(Math.min(duration, clamped));
  };

  const handleStartInputBlur = () => {
    const parsed = parseTime(startInput);
    const clamped = Math.max(0, Math.min(parsed, endTime - 1));
    setStartTime(clamped);
  };

  const handleEndInputBlur = () => {
    const parsed = parseTime(endInput);
    const clamped = Math.max(startTime + 1, Math.min(parsed, duration));
    setEndTime(clamped);
  };

  if (!duration || duration <= 0) return null;

  const trimDuration = Math.max(0, endTime - startTime);
  const ratio = duration > 0 ? trimDuration / duration : 1;
  const estimatedSize = selectedFormat?.filesize
    ? Math.round(selectedFormat.filesize * ratio)
    : null;
  const originalSize = selectedFormat?.filesize || null;

  // Selection bar positioning
  const leftPct = (startTime / duration) * 100;
  const widthPct = (trimDuration / duration) * 100;

  return (
    <section className="trimmer glass-card" style={{ animation: 'slideUp 0.4s ease' }}>
      <div className="trimmer__header">
        <div className="trimmer__title-row">
          <h3 className="trimmer__title">✂️ Trim Video</h3>
          <span className="trimmer__title-sub">
            {enabled ? 'Adjust start and end points' : 'Enable to trim before downloading'}
          </span>
        </div>
        <label className="trimmer__toggle" htmlFor="trim-toggle">
          <input
            id="trim-toggle"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="trimmer__toggle-track">
            <span className="trimmer__toggle-thumb" />
          </span>
        </label>
      </div>

      {enabled && (
        <div className="trimmer__body" style={{ animation: 'fadeIn 0.3s ease' }}>
          {/* Timeline slider */}
          <div className="trimmer__timeline-wrapper">
            <div className="trimmer__timeline">
              {/* Background track */}
              <div className="trimmer__track" />
              {/* Selected region - using thumb-offset calculation for perfect alignment */}
              <div
                className="trimmer__selection"
                style={{
                  left: `calc(${leftPct}% + ${9 - (leftPct * 0.18)}px)`,
                  right: `calc(${100 - ((endTime / duration) * 100)}% + ${9 - ((100 - (endTime / duration) * 100) * 0.18)}px)`
                }}
              />
              {/* Start range */}
              <input
                type="range"
                className="trimmer__range"
                min={0}
                max={duration}
                step={1}
                value={startTime}
                onChange={handleStartSlider}
                aria-label="Trim start time"
              />
              {/* End range */}
              <input
                type="range"
                className="trimmer__range"
                min={0}
                max={duration}
                step={1}
                value={endTime}
                onChange={handleEndSlider}
                aria-label="Trim end time"
              />
            </div>
            {/* Timeline labels */}
            <div className="trimmer__timeline-labels">
              <span>0:00</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Time inputs row */}
          <div className="trimmer__inputs">
            <div className="trimmer__input-group">
              <label className="trimmer__input-label">Start</label>
              <input
                type="text"
                className="input trimmer__time-field"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                onBlur={handleStartInputBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleStartInputBlur()}
                placeholder="00:00"
              />
            </div>

            <div className="trimmer__duration-display">
              <span className="trimmer__duration-icon">⏱️</span>
              <span className="trimmer__duration-value">{formatTime(trimDuration)}</span>
              <span className="trimmer__duration-label">selected</span>
            </div>

            <div className="trimmer__input-group">
              <label className="trimmer__input-label">End</label>
              <input
                type="text"
                className="input trimmer__time-field"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                onBlur={handleEndInputBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleEndInputBlur()}
                placeholder="00:00"
              />
            </div>
          </div>

          {/* Size info bar */}
          <div className="trimmer__size-bar">
            {originalSize && (
              <div className="trimmer__size-item">
                <span className="trimmer__size-label">Original</span>
                <span className="trimmer__size-value">{formatBytes(originalSize)}</span>
              </div>
            )}
            <div className="trimmer__size-item">
              <span className="trimmer__size-label">Trimmed Duration</span>
              <span className="trimmer__size-value">
                {formatTime(trimDuration)} / {formatTime(duration)}
              </span>
            </div>
            {estimatedSize && (
              <div className="trimmer__size-item trimmer__size-item--highlight">
                <span className="trimmer__size-label">Estimated Download</span>
                <span className="trimmer__size-value trimmer__size-value--neon">
                  ~{formatBytes(estimatedSize)}
                </span>
              </div>
            )}
            {!estimatedSize && (
              <div className="trimmer__size-item">
                <span className="trimmer__size-label">Estimated Download</span>
                <span className="trimmer__size-value">~{Math.round(ratio * 100)}% of original</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
