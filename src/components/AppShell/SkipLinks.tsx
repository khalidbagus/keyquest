/**
 * Skip Links Component
 * Allows keyboard users to bypass navigation
 * Requirement: 14.5
 */

export function SkipLinks() {
  return (
    <>
      <a href="#main-content" className="skip-link" tabIndex={0}>
        Skip to main content
      </a>
    </>
  );
}
