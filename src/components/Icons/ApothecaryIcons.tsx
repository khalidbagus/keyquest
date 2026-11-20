/**
 * Bespoke Apothecary SVG Icon Library
 * Replaces raw OS-dependent emojis with cohesive thick-stroke icons
 * that match the KeyQuest v2 twilight-plum storybook art direction.
 */

interface IconProps {
  size?: number;
  className?: string;
}

export function KeyCrestIcon({ size = 28, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="2"
        y="2"
        width="32"
        height="32"
        rx="10"
        fill="#231936"
        stroke="#fbbf24"
        strokeWidth="2"
      />
      <circle
        cx="13.5"
        cy="18"
        r="5.2"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2.4"
      />
      <circle cx="13.5" cy="18" r="2" fill="#d43558" />
      <path
        d="M18.8 18H28.5M24.2 18V22.5M27.6 18V23.5"
        stroke="#fbbf24"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LanternIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 4h6" />
      <path d="M10 4V2.5a2 2 0 0 1 4 0V4" />
      <path d="M7 8h10l-1 11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 8Z" />
      <path d="M12 11c1.2 1.3 1.8 2.3 1.8 3.3a1.8 1.8 0 0 1-3.6 0c0-1 .6-2 1.8-3.3Z" fill="currentColor" />
    </svg>
  );
}

export function GhostVisionEyeIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ScreenReaderWaveIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function ContrastScanIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor" />
    </svg>
  );
}

export function CostumeMaskIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 10c0-2.5 2-4 5-4 1.8 0 3 .8 4 2 1-1.2 2.2-2 4-2 3 0 5 1.5 5 4 0 4.5-3 8-6.5 8-1.4 0-2-.7-2.5-1.4-.5.7-1.1 1.4-2.5 1.4C6 18 3 14.5 3 10Z" />
      <circle cx="8.5" cy="11.5" r="1.4" fill="currentColor" />
      <circle cx="15.5" cy="11.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function WrenchSparkIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.2 9.2a2.1 2.1 0 0 1-3-3l9.2-9.2a4 4 0 0 0-2-2Z" />
      <path d="M5 4v3M3.5 5.5h3" />
    </svg>
  );
}

export function CartBagIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2.5 4h2.8l2.2 10.5a2 2 0 0 0 2 1.5h8.2a2 2 0 0 0 1.9-1.4L21 7.5H6.2" />
    </svg>
  );
}

export function ExitPortalIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function KeyboardKeyIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 15h10" />
    </svg>
  );
}

export function ShieldNoticeIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3 4 6.5V12c0 4.6 3.4 8.2 8 9 4.6-.8 8-4.4 8-9V6.5L12 3Z" />
      <path d="M12 8.5v4" />
      <circle cx="12" cy="15.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function CompassQuestIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" fill="currentColor" />
    </svg>
  );
}

export function ResetArrowsIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
