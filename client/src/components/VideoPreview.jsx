import React, { useState } from 'react';
import { formatDuration, formatViews, decodeHtmlEntities } from '../utils/formatters';

export default function VideoPreview({ info, selectedFormat, videoUrl, onDurationDetected }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!info) return null;

  const titleStr = decodeHtmlEntities(info.title);
  const durationStr = formatDuration(info.duration);
  const viewsStr = formatViews(info.view_count);

  const proxiedThumbnail = info.thumbnail
    ? `/api/video/thumbnail?url=${encodeURIComponent(info.thumbnail)}`
    : null;

  const streamFormatId = selectedFormat ? selectedFormat.format_id : info.formats && info.formats[0] ? info.formats[0].format_id : 'best';
  const proxiedStreamUrl = videoUrl
    ? `/api/video/stream?url=${encodeURIComponent(videoUrl)}&format_id=${encodeURIComponent(streamFormatId)}`
    : null;

  return (
    <div className="glass-panel rounded-xl overflow-hidden flex flex-col border border-white/10 glow-active">
      {/* Video Player / Thumbnail Area */}
      <div className="relative aspect-video bg-black flex items-center justify-center group overflow-hidden">
        {isPlaying ? (
          <video
            controls
            autoPlay
            preload="auto"
            playsInline
            src={proxiedStreamUrl}
            onLoadedMetadata={(e) => {
              if (e.target.duration && typeof onDurationDetected === 'function') {
                onDurationDetected(e.target.duration);
              }
            }}
            className="w-full h-full object-contain bg-black"
          >
            Your browser does not support HTML5 video playback.
          </video>
        ) : (
          <>
            {/* Thumbnail Display */}
            {!imgError && proxiedThumbnail ? (
              <img
                src={proxiedThumbnail}
                alt={titleStr}
                onError={(e) => {
                  if (e.target.src !== info.thumbnail) {
                    e.target.src = info.thumbnail;
                  } else {
                    setImgError(true);
                  }
                }}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-95 transition-opacity duration-300"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-primary/40">play_circle</span>
              </div>
            )}

            {/* Player Controls Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none">
              {/* Duration Badge */}
              <div className="flex justify-end">
                {durationStr && (
                  <span className="bg-black/70 backdrop-blur-sm text-white font-label-sm text-label-sm px-2.5 py-1 rounded-md font-mono">
                    {durationStr}
                  </span>
                )}
              </div>

              {/* Play Button */}
              <div className="flex items-center justify-center h-full pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  className="w-16 h-16 rounded-full bg-primary text-on-primary-fixed flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-[0_0_25px_rgba(154,205,50,0.5)]"
                  title="Play Video"
                >
                  <span className="material-symbols-outlined text-[34px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_arrow
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Metadata Info */}
      <div className="p-5 flex flex-col gap-2">
        <h3 className="font-body-lg text-body-lg text-on-surface font-semibold line-clamp-1">
          {titleStr}
        </h3>
        <div className="flex flex-wrap items-center gap-4 font-label-sm text-label-sm text-on-surface-variant">
          {info.uploader && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">person</span> {info.uploader}
            </span>
          )}
          {viewsStr && viewsStr !== '—' && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">visibility</span> {viewsStr} views
            </span>
          )}
          {info.upload_date && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span> {info.upload_date}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
