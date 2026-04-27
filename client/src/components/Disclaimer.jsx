/**
 * Legal disclaimer banner.
 */
export default function Disclaimer() {
  return (
    <div className="disclaimer" style={{ animation: 'fadeIn 0.5s ease 0.2s both' }}>
      <span className="disclaimer__icon">⚠️</span>
      <p className="disclaimer__text">
        <strong>Disclaimer:</strong> Only download content you have the rights to access.
        VideoFetch does not host or store any media files. DRM-protected platforms are blocked.
      </p>
    </div>
  );
}
