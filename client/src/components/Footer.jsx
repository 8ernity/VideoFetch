/**
 * Footer with credits and links.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <p className="footer__text">
          Built with ⚡ by <span className="footer__accent">VideoFetch</span>
        </p>
        <p className="footer__sub">
          Powered by{' '}
          <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noopener noreferrer" className="footer__link">
            yt-dlp
          </a>
          {' · '}Open source & free to use
        </p>
      </div>
    </footer>
  );
}
