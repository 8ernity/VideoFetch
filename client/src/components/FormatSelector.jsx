import React, { useState } from 'react';
import { formatBytes } from '../utils/formatters';

const AUDIO_OPTIONS = [
  { bitrate: '320k', displayLabel: '320 kbps', subLabel: 'Maximum Quality', ext: 'mp3', type: 'audio-only' },
  { bitrate: '256k', displayLabel: '256 kbps', subLabel: 'High Quality', ext: 'mp3', type: 'audio-only' },
  { bitrate: '192k', displayLabel: '192 kbps', subLabel: 'Medium Quality', ext: 'mp3', type: 'audio-only' },
  { bitrate: '128k', displayLabel: '128 kbps', subLabel: 'Standard Quality', ext: 'mp3', type: 'audio-only' },
  { bitrate: '96k', displayLabel: '96 kbps', subLabel: 'Low Quality', ext: 'mp3', type: 'audio-only' },
];

function getFormatLabel(fmt, index) {
  if (fmt.type === 'audio-only') return 'Audio Stream (MP3)';

  if (fmt.height && typeof fmt.height === 'number') {
    return `${fmt.height}p`;
  }

  if (fmt.resolution && fmt.resolution !== 'HD' && fmt.resolution !== 'SD') {
    if (fmt.resolution.includes('x')) {
      const parts = fmt.resolution.split('x');
      if (parts[1] && !isNaN(parts[1])) return `${parts[1]}p`;
    }
    if (/^\d{3,4}p?$/i.test(String(fmt.resolution).trim())) {
      const res = String(fmt.resolution).trim().toLowerCase();
      return res.endsWith('p') ? res : `${res}p`;
    }
    return String(fmt.resolution);
  }

  if (fmt.quality && fmt.quality !== 'HD' && fmt.quality !== 'SD') {
    if (/^\d{3,4}p?$/i.test(String(fmt.quality).trim())) {
      const res = String(fmt.quality).trim().toLowerCase();
      return res.endsWith('p') ? res : `${res}p`;
    }
    return String(fmt.quality);
  }

  const resolutionLadder = ['1080p (Full HD)', '720p (HD)', '480p (SD)', '360p (SD)', '240p (SD)'];
  if (index < resolutionLadder.length) {
    return resolutionLadder[index];
  }

  return `Option ${index + 1}`;
}

export default function FormatSelector({ formats = [], selected, onSelect }) {
  const [mediaType, setMediaType] = useState('video'); // 'video' | 'audio'

  const videoFormats = formats.filter((f) => f.type !== 'audio-only');

  const deduplicatedVideoFormats = [];
  const seenLabels = new Set();

  videoFormats.forEach((fmt, idx) => {
    let label = getFormatLabel(fmt, deduplicatedVideoFormats.length);
    if (seenLabels.has(label)) {
      label = `${label} (Option ${deduplicatedVideoFormats.length + 1})`;
    }
    if (deduplicatedVideoFormats.length < 6) {
      seenLabels.add(label);
      deduplicatedVideoFormats.push({ ...fmt, displayLabel: label });
    }
  });

  const getAudioFormatPayload = (audioOpt) => {
    const sourceFormat = deduplicatedVideoFormats[0] || formats[0];
    const sourceId = sourceFormat ? sourceFormat.format_id : 'best';
    return {
      ...audioOpt,
      format_id: `${audioOpt.bitrate}|${sourceId}`,
      ext: 'mp3',
      type: 'audio-only',
    };
  };

  const currentFormats = mediaType === 'video' ? deduplicatedVideoFormats : AUDIO_OPTIONS;

  return (
    <div className="glass-panel rounded-xl p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h2 className="font-body-lg text-body-lg text-on-surface font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">tune</span> Configuration
        </h2>
      </div>

      {/* Segmented Control (Video / Audio toggle) */}
      <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant/50">
        <button
          type="button"
          onClick={() => {
            setMediaType('video');
            if (deduplicatedVideoFormats.length > 0) {
              onSelect(deduplicatedVideoFormats[0]);
            }
          }}
          className={`flex-1 py-2 font-label-sm text-label-sm rounded shadow-sm border transition-colors flex justify-center items-center gap-2 ${
            mediaType === 'video'
              ? 'bg-surface-container-highest text-on-surface border-white/10'
              : 'text-on-surface-variant hover:text-on-surface border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">videocam</span> Video
        </button>
        <button
          type="button"
          onClick={() => {
            setMediaType('audio');
            onSelect(getAudioFormatPayload(AUDIO_OPTIONS[0]));
          }}
          className={`flex-1 py-2 font-label-sm text-label-sm rounded shadow-sm border transition-colors flex justify-center items-center gap-2 ${
            mediaType === 'audio'
              ? 'bg-surface-container-highest text-on-surface border-white/10'
              : 'text-on-surface-variant hover:text-on-surface border-transparent'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">music_note</span> Audio
        </button>
      </div>

      {/* Quality / Bitrate List */}
      <div className="flex flex-col gap-2">
        <label className="font-label-sm text-label-sm text-on-surface-variant mb-1">
          {mediaType === 'video' ? 'Quality & Resolution' : 'Audio Bitrate Options'}
        </label>

        {currentFormats.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic">No {mediaType} formats available.</p>
        ) : (
          currentFormats.map((fmt, idx) => {
            const isSelected = mediaType === 'audio'
              ? selected && selected.bitrate === fmt.bitrate
              : selected && selected.format_id === fmt.format_id;

            const extLabel = (fmt.ext || 'mp4').toUpperCase();
            const sizeLabel = fmt.filesize ? formatBytes(fmt.filesize) : fmt.filesize_approx ? `~${formatBytes(fmt.filesize_approx)}` : '';
            const resolutionLabel = fmt.displayLabel;

            return (
              <label
                key={fmt.bitrate || fmt.format_id || idx}
                onClick={() => {
                  if (mediaType === 'audio') {
                    onSelect(getAudioFormatPayload(fmt));
                  } else {
                    onSelect(fmt);
                  }
                }}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-white/5 bg-surface-container hover:bg-surface-container-highest'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Custom Radio Button Indicator */}
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/20'
                      : 'border-white/20 bg-surface-container-highest'
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>

                  <div>
                    <div className="font-body-md text-on-surface flex items-center gap-2 font-medium">
                      <span>{resolutionLabel}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                          isSelected
                            ? 'bg-surface-container-highest text-primary border-primary/30'
                            : 'bg-surface-container-highest text-on-surface-variant border-white/10'
                        }`}
                      >
                        {extLabel}
                      </span>
                    </div>
                    {fmt.subLabel && (
                      <p className="text-[11px] text-on-surface-variant">{fmt.subLabel}</p>
                    )}
                  </div>
                </div>

                {sizeLabel && (
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                    {sizeLabel}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
