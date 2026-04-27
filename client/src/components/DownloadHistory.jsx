/**
 * Download history panel — shows past downloads stored in localStorage.
 */
export default function DownloadHistory({ history, onClear, onRemove }) {
  if (!history || history.length === 0) {
    return (
      <section className="download-history glass-card" style={{ animation: 'slideUp 0.4s ease' }}>
        <h3 className="download-history__title">Download History</h3>
        <p className="download-history__empty">No downloads yet. Your history will appear here.</p>
      </section>
    );
  }

  return (
    <section className="download-history glass-card" style={{ animation: 'slideUp 0.4s ease' }}>
      <div className="download-history__header">
        <h3 className="download-history__title">Download History</h3>
        <button className="btn btn-secondary btn-sm" onClick={onClear}>
          🗑️ Clear All
        </button>
      </div>
      <ul className="download-history__list">
        {history.map((item) => (
          <li key={item.id} className="download-history__item">
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                className="download-history__thumb"
                loading="lazy"
              />
            )}
            <div className="download-history__info">
              <span className="download-history__item-title">{item.title}</span>
              <span className="download-history__item-meta">
                <span className="badge badge-cyan">{item.format}</span>
                <span className="download-history__item-date">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </span>
            </div>
            <button
              className="download-history__remove"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.title}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
