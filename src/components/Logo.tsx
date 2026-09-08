/**
 * FX Pulse mini logo — a stylized pulse/wave mark that sits next to the title.
 * Pure SVG, no external assets. Two variants: full (with wordmark) and mark only.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="FX Pulse logo">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3aa5ff" />
          <stop offset="100%" stopColor="#26c281" />
        </linearGradient>
      </defs>
      {/* Hex/rounded container */}
      <rect x="2" y="2" width="36" height="36" rx="9" fill="#11151f" stroke="url(#logoGrad)" strokeWidth="1.5" />
      {/* Pulse wave */}
      <path
        d="M 6 20 L 12 20 L 16 10 L 20 28 L 24 14 L 28 20 L 34 20"
        stroke="url(#logoGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Dot at the end */}
      <circle cx="34" cy="20" r="2.5" fill="#3aa5ff" />
    </svg>
  );
}

/** Full logo with wordmark. */
export function Logo({ height = 22 }: { height?: number }) {
  const w = height * 4.2;
  return (
    <svg width={w} height={height} viewBox="0 0 105 25" fill="none" aria-label="FX Pulse">
      <defs>
        <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3aa5ff" />
          <stop offset="100%" stopColor="#26c281" />
        </linearGradient>
      </defs>
      {/* Mark */}
      <rect x="0" y="0" width="22" height="22" rx="5" fill="#11151f" stroke="url(#brandGrad)" strokeWidth="1" />
      <path
        d="M 4 11 L 7 11 L 9 6 L 11 16 L 13 8 L 15 11 L 18 11"
        stroke="url(#brandGrad)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="18" cy="11" r="1.6" fill="#3aa5ff" />
      {/* Wordmark */}
      <text x="27" y="16" fontFamily="var(--sans)" fontSize="15" fontWeight="800" fill="#dbe2ec" letterSpacing="0.04em">
        FX
      </text>
      <text x="47" y="16" fontFamily="var(--sans)" fontSize="15" fontWeight="800" fill="url(#brandGrad)" letterSpacing="0.04em">
        Pulse
      </text>
    </svg>
  );
}