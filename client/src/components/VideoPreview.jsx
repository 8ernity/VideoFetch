import { formatNumber, formatDate } from '../utils/formatters';

/**
 * Video metadata preview — thumbnail, title, uploader, duration, views.
 */
export default function VideoPreview({ info }) {
  if (!info) return null;

  return (
    <section className="video-preview glass-card" style={{ animation: 'slideUp 0.5s ease' }}>
      <div className="video-preview__layout">
        {info.thumbnail && (
          <div className="video-preview__thumb-wrapper">
            <img
              src={info.thumbnail}
              alt={info.title}
              className="video-preview__thumb"
              loading="lazy"
            />
            {info.duration_label && (
              <span className="video-preview__duration">{info.duration_label}</span>
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
