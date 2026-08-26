/** Keyboard-first skip links — first tab stop, visually hidden until focused. */
export function SkipLinks() {
  return (
    <nav aria-label="Skip links" className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <a href="#map-ask" className="skip-link">
        Skip to ask box
      </a>
    </nav>
  );
}
