/**
 * Format selector — lists available download formats grouped by type.
 */
export default function FormatSelector({ formats, selected, onSelect }) {
  if (!formats || formats.length === 0) {
    return (
      <section className="format-selector glass-card" style={{ animation: 'fadeIn 0.4s ease' }}>
        <p className="format-selector__empty">No downloadable formats found for this video.</p>
      </section>
    );
  }

  const grouped = {
    'video+audio': formats.filter((f) => f.type === 'video+audio'),
    'video-only': formats.filter((f) => f.type === 'video-only'),
    'audio-only': formats.filter((f) => f.type === 'audio-only'),
  };

  const groupLabels = {
    'video+audio': { label: '🎬 Video + Audio', badge: 'badge-cyan' },
    'video-only': { label: '📹 Video Only', badge: 'badge-purple' },
    'audio-only': { label: '🎵 Audio Only', badge: 'badge-green' },
  };

  return (
    <section className="format-selector glass-card" style={{ animation: 'slideUp 0.5s ease 0.1s both' }}>
      <h3 className="format-selector__title">Choose Format</h3>

      {Object.entries(grouped).map(([type, items]) => {
        if (items.length === 0) return null;
        const { label, badge } = groupLabels[type];

        return (
          <div key={type} className="format-group">
            <div className="format-group__header">
              <span className={`badge ${badge}`}>{label}</span>
              <span className="format-group__count">{items.length} options</span>
            </div>
            <div className="format-group__list">
              {items.map((f) => (
                <button
                  key={f.format_id}
                  className={`format-option ${selected?.format_id === f.format_id ? 'format-option--selected' : ''}`}
                  onClick={() => onSelect(f)}
                  type="button"
                >
                  <span className="format-option__ext">{f.ext.toUpperCase()}</span>
                  <span className="format-option__details">
                    {f.resolution && <span className="format-option__res">{f.resolution}</span>}
                    {f.fps && <span className="format-option__fps">{f.fps}fps</span>}
                    {f.quality && !f.resolution && (
                      <span className="format-option__quality">{f.quality}</span>
                    )}
                  </span>
                  <span className="format-option__size">{f.filesize_label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
