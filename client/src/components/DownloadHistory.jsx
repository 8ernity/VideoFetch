import React from 'react';

export default function DownloadHistory({ history = [], onClear, onRemove }) {
  return (
    <div className="w-full flex flex-col gap-6" style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Download History</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">View and manage your past downloads.</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClear}
            className="self-start sm:self-auto bg-surface-container border border-outline-variant/40 hover:bg-error/10 hover:text-error hover:border-error/30 text-on-surface-variant transition-colors rounded-lg px-4 py-2 font-label-sm text-label-sm font-medium flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span> Clear History
          </button>
        )}
      </div>

      {/* History Grid */}
      {history.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">folder_open</span>
          <p className="text-on-surface-variant">No download history found.</p>
          <p className="text-xs text-on-surface-variant/60">Your downloaded videos will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item, idx) => (
            <div
              key={item.id || idx}
              className="glass-panel rounded-xl overflow-hidden flex flex-col border border-white/10 hover:border-primary/40 transition-all duration-300 group"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-black overflow-hidden">
                <img
                  src={item.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                />
                <div className="absolute top-2 left-2">
                  <span className="bg-primary/90 text-on-primary-fixed font-mono text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                    {item.format || 'MP4'}
                  </span>
                </div>
                {item.duration && (
                  <div className="absolute bottom-2 right-2">
                    <span className="bg-black/70 backdrop-blur-sm text-white font-mono text-[11px] px-2 py-0.5 rounded">
                      {item.duration}
                    </span>
                  </div>
                )}
              </div>

              {/* Item Info */}
              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div>
                  <h3 className="font-body-md text-on-surface font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                    {item.channel || 'Vitality Pro Channel'}
                  </p>
                </div>

                <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant border-t border-white/5 pt-3">
                  <span>{item.date || 'Recently'}</span>
                  {item.size && <span className="font-mono">{item.size}</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={item.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-surface-container hover:bg-surface-container-highest border border-white/5 text-on-surface text-center rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span> Open
                  </a>
                  <button
                    onClick={() => onRemove(item.id || idx)}
                    className="p-2 bg-surface-container hover:bg-error/20 hover:text-error border border-white/5 text-on-surface-variant rounded-lg transition-colors"
                    title="Delete item"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
