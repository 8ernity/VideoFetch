import React, { useState, useEffect, useRef } from 'react';
import { formatSeconds, parseTimestamp } from '../utils/formatters';

export default function VideoTrimmer({ duration = 0, onTrimChange }) {
  const [enabled, setEnabled] = useState(false);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(duration > 0 ? duration : 0);

  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState(formatSeconds(duration > 0 ? duration : 0));

  const trackRef = useRef(null);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);

  const maxVal = duration > 0 ? duration : 60;

  // Ensure endSec syncs with duration when metadata finishes loading
  useEffect(() => {
    if (duration > 0 && (endSec === 0 || endSec > duration)) {
      setEndSec(duration);
      setEndTime(formatSeconds(duration));
    }
  }, [duration, endSec]);

  // Keep text input strings formatted when seconds change
  useEffect(() => {
    setStartTime(formatSeconds(startSec));
  }, [startSec]);

  useEffect(() => {
    setEndTime(formatSeconds(endSec));
  }, [endSec]);

  const handleToggle = (e) => {
    const nextVal = e.target.checked;
    setEnabled(nextVal);
    if (nextVal && (endSec === 0 || endSec <= startSec)) {
      const validEnd = duration > 0 ? duration : 60;
      setEndSec(validEnd);
      setEndTime(formatSeconds(validEnd));
    }
  };

  // Notify parent component of trim state changes
  useEffect(() => {
    if (enabled) {
      onTrimChange({
        enabled: true,
        startTime: startSec,
        endTime: endSec || maxVal,
        startSec,
        endSec: endSec || maxVal,
        start: startSec,
        end: endSec || maxVal,
      });
    } else {
      onTrimChange(null);
    }
  }, [enabled, startSec, endSec, maxVal, onTrimChange]);

  const calcSecondsFromX = (clientX) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = offsetX / rect.width;
    return Math.round(ratio * maxVal);
  };

  const handlePointerDown = (handle) => (e) => {
    e.preventDefault();
    if (handle === 'left') isDraggingLeft.current = true;
    if (handle === 'right') isDraggingRight.current = true;

    const handlePointerMove = (moveEvt) => {
      const clientX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const newSec = calcSecondsFromX(clientX);

      if (isDraggingLeft.current) {
        if (newSec >= 0 && newSec < endSec - 1) {
          setStartSec(newSec);
        }
      } else if (isDraggingRight.current) {
        if (newSec > startSec + 1 && newSec <= maxVal) {
          setEndSec(newSec);
        }
      }
    };

    const handlePointerUp = () => {
      isDraggingLeft.current = false;
      isDraggingRight.current = false;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);
  };

  const handleStartTextChange = (e) => {
    const val = e.target.value;
    setStartTime(val);
    const parsed = parseTimestamp(val);
    if (parsed !== null && parsed >= 0 && parsed < endSec) {
      setStartSec(parsed);
    }
  };

  const handleEndTextChange = (e) => {
    const val = e.target.value;
    setEndTime(val);
    const parsed = parseTimestamp(val);
    if (parsed !== null && parsed > startSec && parsed <= maxVal) {
      setEndSec(parsed);
    }
  };

  const leftPercent = Math.max(0, Math.min(100, (startSec / maxVal) * 100));
  const rightPercent = Math.max(0, Math.min(100, 100 - (endSec / maxVal) * 100));
  const selectedDuration = Math.max(0, endSec - startSec);
  const percentageStr = Math.round((selectedDuration / maxVal) * 100);

  return (
    <div className="glass-panel rounded-xl p-6 flex flex-col gap-5">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="font-body-lg text-body-lg text-on-surface font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">content_cut</span> Trim Selection
        </h2>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
        </label>
      </div>

      {enabled && (
        <>
          {/* Selected Duration Info Box */}
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg text-sm">
            <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[18px] text-primary">timer</span>
              Duration Being Downloaded:
            </span>
            <span className="font-mono font-bold text-primary text-base">
              {formatSeconds(selectedDuration)}
              <span className="text-xs text-on-surface-variant font-sans font-normal ml-1">
                ({percentageStr}% of {formatSeconds(maxVal)})
              </span>
            </span>
          </div>

          {/* Waveform Interactive Slider */}
          <div
            ref={trackRef}
            className="relative h-12 bg-surface-container rounded-lg border border-white/5 select-none touch-none cursor-pointer"
          >
            {/* Background waveform bars */}
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-30 pointer-events-none">
              <div className="w-1 h-3 bg-white rounded-full" />
              <div className="w-1 h-6 bg-white rounded-full" />
              <div className="w-1 h-4 bg-white rounded-full" />
              <div className="w-1 h-8 bg-white rounded-full" />
              <div className="w-1 h-5 bg-white rounded-full" />
              <div className="w-1 h-7 bg-white rounded-full" />
              <div className="w-1 h-3 bg-white rounded-full" />
              <div className="w-1 h-9 bg-white rounded-full" />
              <div className="w-1 h-4 bg-white rounded-full" />
              <div className="w-1 h-6 bg-white rounded-full" />
              <div className="w-1 h-3 bg-white rounded-full" />
              <div className="w-1 h-5 bg-white rounded-full" />
              <div className="w-1 h-8 bg-white rounded-full" />
              <div className="w-1 h-4 bg-white rounded-full" />
              <div className="w-1 h-6 bg-white rounded-full" />
              <div className="w-1 h-3 bg-white rounded-full" />
            </div>

            {/* Active Selected Range Area */}
            <div
              className="absolute top-0 bottom-0 bg-primary/25 border-l-2 border-r-2 border-primary pointer-events-none"
              style={{ left: `${leftPercent}%`, right: `${rightPercent}%` }}
            />

            {/* Left Handle */}
            <div
              onMouseDown={handlePointerDown('left')}
              onTouchStart={handlePointerDown('left')}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-surface border-2 border-primary rounded-full cursor-ew-resize flex items-center justify-center shadow-lg hover:scale-110 active:scale-125 transition-transform z-20"
              style={{ left: `${leftPercent}%` }}
              title="Drag to set Start Time"
            >
              <span className="material-symbols-outlined text-[12px] text-primary select-none">drag_indicator</span>
            </div>

            {/* Right Handle */}
            <div
              onMouseDown={handlePointerDown('right')}
              onTouchStart={handlePointerDown('right')}
              className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-7 h-7 bg-surface border-2 border-primary rounded-full cursor-ew-resize flex items-center justify-center shadow-lg hover:scale-110 active:scale-125 transition-transform z-20"
              style={{ right: `${rightPercent}%` }}
              title="Drag to set End Time"
            >
              <span className="material-symbols-outlined text-[12px] text-primary select-none">drag_indicator</span>
            </div>
          </div>

          {/* Timestamp Inputs */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">
                Start Time
              </label>
              <input
                type="text"
                value={startTime}
                onChange={handleStartTextChange}
                className="w-full bg-surface border border-outline-variant rounded-md py-2 px-3 text-on-surface text-center font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <span className="text-on-surface-variant mt-6">-</span>
            <div className="flex-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">
                End Time
              </label>
              <input
                type="text"
                value={endTime}
                onChange={handleEndTextChange}
                className="w-full bg-surface border border-outline-variant rounded-md py-2 px-3 text-on-surface text-center font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
