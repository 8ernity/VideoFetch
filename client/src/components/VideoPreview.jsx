import { useState } from 'react';
import { formatNumber, formatDate } from '../utils/formatters';
import { getStreamUrl } from '../utils/api';

/**
 * Extract YouTube Video ID from a standard/short/embed URL.
 */
function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Video metadata preview — thumbnail/poster, title, uploader, duration, views.
 * Supports interactive inline video play/preview.
 */
export default function VideoPreview({ info }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeUrl, setActiveUrl] = useState(info?.webpage_url);

  if (!info) return null;

  // Reset play state if url changes
  if (info.webpage_url !== activeUrl) {
    setActiveUrl(info.webpage_url);
    setIsPlaying(false);
  }

  const isYouTube = info.extractor?.toLowerCase().includes('youtube') || 
                    info.webpage_url?.includes('youtube.com') || 
                    info.webpage_url?.includes('youtu.be');
  
  const ytId = isYouTube ? getYouTubeId(info.webpage_url) : null;
  
  const previewFormat = info.formats?.find(f => f.resolution === '480p') ||
                        info.formats?.find(f => f.resolution === '360p') ||
                        info.formats?.[0];
                        
  const streamUrl = (!isYouTube && previewFormat) 
    ? getStreamUrl(info.webpage_url, previewFormat.format_id, previewFormat.type)
    : null;

  const hasPreview = isYouTube ? !!ytId : !!streamUrl;

  return (
    <section className="video-preview glass-card" style={{ animation: 'slideUp 0.5s ease' }}>
      <div className="video-preview__layout">
        {(info.thumbnail || hasPreview) && (
          <div className="video-preview__thumb-wrapper">
            {isPlaying && hasPreview ? (
              isYouTube ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                  title="YouTube video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="video-preview__player"
                />
              ) : (
                <video
                  src={streamUrl}
                  controls
                  autoPlay
                  className="video-preview__player"
                  poster={info.thumbnail}
                />
              )
            ) : (
              <>
                {info.thumbnail ? (
                  <img
                    src={info.thumbnail}
                    alt={info.title}
                    className="video-preview__thumb"
                    loading="lazy"
                  />
                ) : (
                  <div className="video-preview__thumb" style={{ background: '#0e0e1e', aspectRatio: '16/9' }} />
                )}
                
                {info.duration_label && (
                  <span className="video-preview__duration">{info.duration_label}</span>
                )}
                
                {hasPreview && (
                  <div className="video-preview__play-overlay" onClick={() => setIsPlaying(true)}>
                    <button className="video-preview__play-btn" aria-label="Play Preview">
                      ▶
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div className="video-preview__info">
          <h2 className="video-preview__title">{info.title}</h2>
          <div className="video-preview__meta">
            {info.uploader && (
              <span className="video-preview__meta-item">
                👤 {info.uploader}
              </span>
            )}
            {info.view_count != null && (
              <span className="video-preview__meta-item">
                👁️ {formatNumber(info.view_count)} views
              </span>
            )}
            {info.upload_date && (
              <span className="video-preview__meta-item">
                📅 {formatDate(info.upload_date)}
              </span>
            )}
            {info.extractor && (
              <span className="badge badge-purple">{info.extractor}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
