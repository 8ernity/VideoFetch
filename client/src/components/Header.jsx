/**
 * Header component with logo and history toggle.
 */
export default function Header({ onHistoryToggle, historyOpen }) {
  return (
    <header className="header">
      <div className="header__inner container">
        <div className="header__logo">
          <span className="header__icon">⚡</span>
          <h1 className="header__title">
            Video<span className="header__title-accent">Fetch</span>
          </h1>
        </div>
        <button
          id="history-toggle"
          className="btn btn-secondary btn-sm"
          onClick={onHistoryToggle}
          aria-label="Toggle download history"
        >
          {historyOpen ? '✕ Close' : '📋 History'}
        </button>
      </div>
    </header>
  );
}
