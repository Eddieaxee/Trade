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
  | 'chart-line' | 'chart-bar' | 'search' | 'user'
  | 'sunrise' | 'sunset' | 'flame' | 'snowflake' | 'gauge' | 'activity'
  | 'sparkles' | 'crosshair' | 'compass' | 'pin' | 'hourglass' | 'waves' | 'grid';


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
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 3v5.6" />
      <path d="M21 12h-5.6" />
      <path d="M12 21v-5.6" />
      <path d="M3 12h5.6" />
    </>
  ),
  smc: (
    <>
      <path d="M3 19.5 8.5 12l4 4L21 4.5" />
      <circle cx="3" cy="19.5" r="1.3" />
      <circle cx="8.5" cy="12" r="1.3" />
      <circle cx="12.5" cy="16" r="1.3" />
      <circle cx="21" cy="4.5" r="1.3" />
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
  star: <path d="m12 2.6 2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.68l-5.9 3.1 1.13-6.58L2.45 9.54l6.6-.96z" />,
  alert: (
    <>
      <path d="M12 8.5v4.5" />
      <path d="M12 16.4h.01" />
      <path d="M10.3 3.9 2.4 17.6a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17.5 9.5 11l4 4L21 7.5" />
      <path d="M15.5 7.5H21v5.5" />
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
      <path d="M3 17.5 9.5 11l4 4L21 7.5" />
      <path d="M15.5 7.5H21v5.5" />
    </>
  ),
  'trending-down': (
    <>
      <path d="M3 6.5 9.5 13l4-4L21 16.5" />
      <path d="M15.5 16.5H21V11" />
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
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
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
      <path d="M20.5 20.5 16.2 16.2" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-3a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v3" />
      <circle cx="12" cy="7.5" r="3.5" />
    </>
  ),
  sunrise: (
    <>
      <path d="M12 2v4" />
      <path d="M5.6 5.6 8 8" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M18.4 5.6 16 8" />
      <path d="M8 18a4 4 0 0 1 8 0" />
      <path d="M2 22h20" />
    </>
  ),
  sunset: (
    <>
      <path d="M12 10V6" />
      <path d="M5.6 13.6 8 11.2" />
      <path d="M2 18h4" />
      <path d="M18 18h4" />
      <path d="M18.4 13.6 16 11.2" />
      <path d="M8 18a4 4 0 0 1 8 0" />
      <path d="M2 22h20" />
    </>
  ),
  flame: <path d="M12 22c4 0 6.5-2.7 6.5-6.3 0-4.6-5-5.9-3.4-11.7-3 1-5.6 3.7-5.6 6.4 0 1.2.3 2 .3 2.6 0 1-.7 1.6-1.6 1.6-1 0-1.7-.9-1.7-2.3 0-.5 0-1 .2-1.5C5.6 12.6 5.5 14 5.5 15.5 5.5 19.2 8 22 12 22z" />,
  snowflake: (
    <>
      <path d="M12 2v20" />
      <path d="M4.2 7l15.6 10" />
      <path d="M19.8 7 4.2 17" />
      <path d="M9.5 4.5 12 7l2.5-2.5" />
      <path d="M9.5 19.5 12 17l2.5 2.5" />
    </>
  ),
  gauge: (
    <>
      <path d="M12 14a2 2 0 1 0 2-2" />
      <path d="M13.4 10.6 20 5.5" />
      <path d="M3.5 20a10 10 0 1 1 17 0" />
    </>
  ),
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  sparkles: (
    <>
      <path d="M12 3.5c.7 3.1 1.9 4.3 5 5-3.1.7-4.3 1.9-5 5-.7-3.1-1.9-4.3-5-5 3.1-.7 4.3-1.9 5-5z" />
      <path d="M18.5 14c.4 1.7 1 2.3 2.7 2.7-1.7.4-2.3 1-2.7 2.7-.4-1.7-1-2.3-2.7-2.7 1.7-.4 2.3-1 2.7-2.7z" />
      <path d="M6.5 16c.3 1.2.7 1.6 1.9 1.9-1.2.3-1.6.7-1.9 1.9-.3-1.2-.7-1.6-1.9-1.9 1.2-.3 1.6-.7 1.9-1.9z" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5" />
      <circle cx="12" cy="12" r="1.6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  hourglass: (
    <>
      <path d="M7 2h10" />
      <path d="M7 22h10" />
      <path d="M7 2c0 5 5 6 5 10s-5 5-5 10" />
      <path d="M17 2c0 5-5 6-5 10s5 5 5 10" />
    </>
  ),
  waves: (
    <>
      <path d="M2 8c2.2 0 2.2 2 4.4 2S8.6 8 10.8 8s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" />
      <path d="M2 14c2.2 0 2.2 2 4.4 2s2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
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
