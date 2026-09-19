/** Inline SVG icon library — zero runtime deps, rendered on demand.
 *  Use <Icon name="moon" /> anywhere in the app for crisp, themeable icons. */
export type IconName =
  | 'sun' | 'moon' | 'menu' | 'close' | 'arrow-right' | 'arrow-up' | 'arrow-down'
  | 'dashboard' | 'strength' | 'smc' | 'indicators' | 'crt' | 'news' | 'guide'
  | 'globe' | 'clock' | 'check' | 'star' | 'alert' | 'trend' | 'layers' | 'zap'
  | 'trending-up' | 'trending-down' | 'volume' | 'target' | 'shield' | 'info'
  | 'chevron-down' | 'external'
  | 'calendar' | 'refresh' | 'bell';

const PATHS: Record<IconName, JSX.Element> = {
    sun: (
    <path d="M12 4.5a.75.75 0 0 1 .75.75V6.5a.75.75 0 0 1-1.5 0V5.25a.75.75 0 0 1 .75-.75ZM6.343 6.343a.75.75 0 0 1 1.06 0L8.5 7.257a.75.75 0 1 1-1.06 1.06l-1.097-1.097a.75.75 0 0 1 0-1.06ZM18.196 5.05a.75.75 0 0 1 .98-.277l.13.07a.75.75 0 1 1-.757 1.348l-.13-.07a.75.75 0 0 1 0-1.06ZM4.5 12a.75.75 0 0 1 .75-.75H6a.75.75 0 1 1 0 1.5h-.75A.75.75 0 0 1 4.5 12ZM17.5 12a.75.75 0 0 1 .75-.75H18a.75.75 0 1 1 0 1.5h-.75a.75.75 0 0 1 0-1.5ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
  ),
  moon: <path d="M21 12.25a9.25 9.25 0 0 1-12.63 0 .75.75 0 0 1 .558-1.31 7.75 7.75 0 0 0 10.8 1.313.75.75 0 0 1 1.272 1.335A9.21 9.21 0 0 1 21 12.25Z" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" strokeWidth={1.5} strokeLinecap="round" />,
  close: <path d="M18 6L6 18M6 6l12 12" strokeWidth={1.5} strokeLinecap="round" />,
  'arrow-right': <path d="M5 12h14M12 5l7 7-7 7" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />,
  'arrow-up': <path d="M12 5l7 7-7 7V5Z" />,
  'arrow-down': <path d="M12 19l-7-7 7-7v14Z" />,
  dashboard: <path d="M3 11.25V5.25a2.25 2.25 0 012.25-2.25h5.5m-7.75 0h11.5a2.25 2.25 0 012.25 2.25v13.5a2.25 2.25 0 01-2.25 2.25h-11.5A2.25 2.25 0 013 14.75V11.25Z" />,
  strength: <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9c0 2.08-.72 3.97-1.92 5.45-.16.2-.43.27-.66.18l-3.23-1.08a3.75 3.75 0 00-4.16 0L5.58 17.4a.75.75 0 01-.97-.21A8.96 8.96 0 013 12Z" />,
  smc: <path d="M4 4v16h16V4H4Zm2 2h12v12H6V6Zm3 2v8h2V8H9Zm3 0v8h2V8h-2Z" />,
  indicators: <path d="M3 18V6h18v12H3Zm2-2h14V8H5v8Zm2-6h2v4H7V9Zm3 0h2v4h-2V9Zm3 0h2v4h-2V9Z" />,
  crt: <path d="M4 4h16v2H4ZM4 8h16v2H4ZM4 12h16v2H4Zm0 4h10v2H4z" />,
  news: <path d="M4 4h16v2H4ZM4 8h16v2H4Zm0 4h16v2H4Zm0 4h10v2H4z" />,
  guide: <path d="M4 4h16v2H4Zm0 4h16v2H4Zm0 4h16v2H4Zm0 4h10v2H4Z" />,
  globe: <path d="M12 2a10 10 0 100 20 10 10 0 000-20Z" />,
  clock: <path d="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20Z" />,
  check: <path d="M5 13l4 4L19 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />,
  star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L15.18 22 12 18.27 8.82 22 8 14.14 5 9.27z" fill="currentColor" />,
  alert: <path d="M12 2a9 9 0 00-9 9v5l-2 2v2h20v-2l-2-2V11a9 9 0 00-9-9Z" />,
  trend: <path d="M3 17l6-6 4 4 6-6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />,
  layers: <path d="M12 2L3 7v10l9 5 9-5V7l-9-5Z" />,
  zap: <path d="M13 10V2L4 14h6v6l9-12h-6Z" />,
  'trending-up': <path d="M3 17l8-8 4 4 6-6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />,
  'trending-down': <path d="M3 7l8 8 4-4 6 6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />,
  volume: <path d="M3 20v-2h4l8-8h6v2l-8 8H3Zm11-13V5a5 5 0 00-7 0v2a3 3 0 00-2 2.47V15a3 3 0 003 3h5a3 3 0 003-3V9.47A3 3 0 0014 7Z" />,
  target: <path d="M12 2a10 10 0 00-3 19.6v-2.34A8 8 0 1112 20a8 8 0 01-3-16Z" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  info: <circle cx="12" cy="12" r="10" />,
  'chevron-down': <path d="M6 9l6 6 6-6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />,
  external: <path d="M18 6L6 18M6 6l12 12" strokeWidth={1.5} strokeLinecap="round" />,
  calendar: <path d="M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />,
  refresh: <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />,
  bell: <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />,
};

export default function Icon({
  name,
  size = 16,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const p = PATHS[name] ?? PATHS.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {p}
    </svg>
  );
}
