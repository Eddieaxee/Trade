/** Inline SVG icon library — pure-minimalist 1.5px stroke, single color, 24×24.
 *  Clean geometric line icons, themeable via currentColor. */
export type IconName =
  | 'sun' | 'moon' | 'menu' | 'close' | 'arrow-right' | 'arrow-up' | 'arrow-down'
  | 'dashboard' | 'strength' | 'smc' | 'indicators' | 'crt' | 'news' | 'guide'
  | 'globe' | 'clock' | 'check' | 'star' | 'alert' | 'trend' | 'layers' | 'zap'
  | 'trending-up' | 'trending-down' | 'volume' | 'target' | 'shield' | 'info'
  | 'chevron-down' | 'external'
  | 'calendar' | 'refresh' | 'bell'
  | 'settings' | 'chevron-up' | 'chevron-left' | 'chevron-right' | 'inflow'
  | 'chart-line' | 'chart-bar' | 'search' | 'user';

const PATHS: Record<IconName, JSX.Element> = {
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>,
  menu: <><path d="M4 7.5h16"/><path d="M4 12h16"/><path d="M4 16.5h16"/></>,
  close: <><path d="M18.5 6.5L6.5 18.5"/><path d="M6.5 6.5l12 12"/></>,
  'arrow-right': <><path d="M5 12h13"/><path d="M14 6l5 6-5 6"/></>,
  'arrow-up': <><path d="M12 19.5V5.5"/><path d="M6.5 11.5l5.5-5.5 5.5 5.5"/></>,
  'arrow-down': <><path d="M12 5.5v14"/><path d="M6.5 13.5l5.5 5.5 5.5-5.5"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
  strength: (
    <>
      <path d="M21 12.5h-4" />
      <path d="M17 12.5l-3 8-7-16-3 8h-4" />
      <path d="M6 10l3 5" />
      <path d="M9.5 7.5l3 5" />
    </>
  ),
  smc: (
    <>
      <path d="M3 4v16" />
      <path d="M3 4h18" />
      <path d="M15 17l4-7" />
      <path d="M19 10l-4 7" />
      <path d="M9 17l3-6" />
    </>
  ),
  indicators: (
    <>
      <path d="M3 21h18" />
      <path d="M6 21V15" />
      <path d="M11 21V14" />
      <path d="M16 21V11" />
      <path d="M21 21V4" />
    </>
  ),
  crt: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 14h16"/><path d="M10 4v16"/></>,
  news: (
    <>
      <path d="M4 4h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4z" />
      <path d="M4 20h16" />
      <path d="M8 8h8" />
      <path d="M8 12h5" />
      <path d="M8 16h3" />
    </>
  ),
  guide: (
    <>
      <path d="M4 20A2.5 2.5 0 0 1 6.5 17.5H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15.5z" />
      <path d="M4 20A2.5 2.5 0 0 0 6.5 22.5H20" />
      <path d="M12 12h.01" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15.2 15.2 0 0 1 0 18 15.2 15.2 0 0 1 0-18z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="M20 6L9 17l-4-4" />,
  star: <path d="m12 2 3.4 6.6 7.4.8-5.4 5.2 1.4 7-6.2-3.6L5.4 17.6 0 12.4l7.4-1 3.4-6.6 6.2 3.6L18.6 7l-6.2 3.6 1.4-7z" />,
  alert: (
    <>
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
      <path d="M6.5 3.5L1.8 18.2a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L17.5 3.5a2 2 0 0 0-3.4 0z" />
    </>
  ),
  trend: (
    <>
      <path d="M22 8L13 17l-4-4 3-3" />
      <path d="M17 8h4v4" />
    </>
  ),
  layers: (
    <>
      <path d="M12 2l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 17l9 5 9-5" />
    </>
  ),
  zap: <path d="M13 2 3 14h7l1 8 10-12H13z" />,
  'trending-up': (
    <>
      <path d="M22 8L13 17l-4-4 3-3" />
      <path d="M17 8h4v4" />
    </>
  ),
  'trending-down': (
    <>
      <path d="M22 16l-9-9-3 3 6 6-4 4" />
      <path d="M17 16h4v-4" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15 8a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  shield: <path d="M12 22s6-4 6-12V5l-6-3-6 3v7c0 8 6 12 6 12z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10.5 14L21 4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10.5h18" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15-7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M10 21a2 2 0 0 0 3-1" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="M4.5 4.5l2 2" />
      <path d="M17.5 17.5l2 2" />
      <path d="M4.5 19.5l2-2" />
      <path d="M17.5 6.5l2-2" />
    </>
  ),
  'chevron-up': <path d="M6 15l6-6 6 6" />,
  'chevron-left': <path d="M15 6l6 6-6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  inflow: (
    <>
      <path d="M12 2v20" />
      <path d="M8 6l4-4 4 4" />
      <path d="M8 18l4 4 4-4" />
    </>
  ),
  'chart-line': (
    <>
      <path d="M2 18l5-9 4 6 7-13" />
      <path d="M2 18h20" />
    </>
  ),
  'chart-bar': (
    <>
      <path d="M3 20V10" />
      <path d="M7 20V6" />
      <path d="M11 20V14" />
      <path d="M15 20V4" />
      <path d="M19 20V12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l3 3" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-3a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v3" />
      <circle cx="12" cy="7.5" r="3.5" />
    </>
  ),
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
