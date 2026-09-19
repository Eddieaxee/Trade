'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';

export interface SessionInfo {
  name: string;
  city: string;
  flag: string;
  open: number; // UTC hour
  close: number; // UTC hour (+24 if it wraps)
  offset: number; // hours from UTC (DST-aware)
  status: 'open' | 'closed' | 'opening-soon' | 'closing-soon';
  localTime: string; // HH:MM:SS
  utcTime: string;   // HH:MM:SS
  weekend: boolean;            // true during the FX weekend shutdown
  reopensInMin: number | null; // minutes until Sunday 21:00 UTC when weekend
}

function dstShift(offsetBase: number, now: Date): number {
  // Northern hemisphere (positive offsets) — Apr..Oct = summer.
  // Sydney (+10/+11) — Southern Hemisphere, opposite schedule.
  const m = now.getUTCMonth();
  if (offsetBase >= 10) return m >= 9 || m <= 2 ? 1 : 0; // Sydney summer = Oct..Mar
  if (offsetBase > 0 || offsetBase <= -3) return m >= 2 && m <= 9 ? 1 : 0; // Northern summer
  return 0;
}

function fmtHm(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function fmtHms(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function sessionStatus(
  name: string,
  city: string,
  flag: string,
  openUtc: number,
  closeUtc: number,
  offsetBase: number,
  now: Date
): SessionInfo {
  const offset = offsetBase + dstShift(offsetBase, now);
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const openMin = openUtc * 60;
  const closeMin = closeUtc * 60;
  const wrapsMidnight = closeMin <= openMin;

  // ── Trading-week guard (institutional FX hours) ────────────────────────────
  // Market closes Friday 21:00 UTC (5pm New York) and reopens Sunday 21:00 UTC
  // (Sydney's local Monday-morning open in DST). The whole of Saturday is
  // closed, and Sunday is closed until 21:00 UTC — no session is "open" and
  // none is "opening in 30m" during the weekend.
  const dow = now.getUTCDay();
  const weekendClosed =
    dow === 6 ||
    (dow === 5 && utcMin >= 21 * 60) ||
    (dow === 0 && utcMin < 21 * 60);

  const inSession = wrapsMidnight
    ? utcMin >= openMin || utcMin < closeMin
    : utcMin >= openMin && utcMin < closeMin;

  // Closing soon = within last 45 minutes before session close.
  const minsToClose = wrapsMidnight
    ? utcMin >= openMin ? (24 * 60 - utcMin + closeMin) : (closeMin - utcMin)
    : closeMin - utcMin;

  // Intra-day minutes until this session's next open (today or tomorrow).
  const opensInToday = wrapsMidnight
    ? utcMin < openMin ? (openMin - utcMin)
    : (openMin + 24 * 60 - utcMin)
    : (openMin - utcMin);

  // Minutes until the market week reopens (Sunday 21:00 UTC) — crosses days.
  const minutesToSunday2100 = (() => {
    if (dow === 6) return (7 - dow) * 24 * 60 + 21 * 60 - utcMin;           // Sat → Sun
    if (dow === 5 && utcMin >= 21 * 60) return 3 * 24 * 60 + 21 * 60 - utcMin; // Fri night → Sun
    return 21 * 60 - utcMin;                                                 // Sun early
  })();

  let status: SessionInfo['status'];
  if (weekendClosed) status = 'closed';
  else if (inSession && minsToClose <= 45) status = 'closing-soon';
  else if (inSession) status = 'open';
  else if (!inSession && opensInToday <= 30) status = 'opening-soon';
  else status = 'closed';

  const local = new Date(now.getTime() + offset * 3600_000);
  return {
    name,
    city,
    flag,
    open: openUtc,
    close: closeUtc,
    offset,
    status,
    localTime: fmtHm(local), // dashboard cards: HH:MM (no live seconds)
    utcTime: fmtHms(now),    // header clocks keep HH:MM:SS
    weekend: weekendClosed,
    reopensInMin: weekendClosed ? minutesToSunday2100 : null
  };
}

/** True while the FX market week is live (Fri 21:00 UTC → Sun 21:00 UTC closed). */
export function isMarketOpen(now: Date): boolean {
  const dow = now.getUTCDay();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return !(
    dow === 6 ||
    (dow === 5 && utcMin >= 21 * 60) ||
    (dow === 0 && utcMin < 21 * 60)
  );
}

/** Live market clock + session bar — header only. UTC + WAT tick every second
 *  (HH:MM:SS); session chips show a static HH:MM local time + status icon. */
export function getSessions(now: Date): SessionInfo[] {
  return [
    sessionStatus('Sydney', 'AUS', '🇦🇺', 22, 7, 10, now),
    sessionStatus('Tokyo', 'JPN', '🇯🇵', 0, 9, 9, now),
    sessionStatus('London', 'GBR', '🇬🇧', 8, 17, 0, now),
    sessionStatus('New York', 'USA', '🇺🇸', 13, 22, -5, now)
  ];
}

const STATUS_ICON: Record<SessionInfo['status'], JSX.Element> = {
  open: <Icon name="check" size={11} />,
  'opening-soon': <Icon name="clock" size={11} />,
  'closing-soon': <Icon name="clock" size={11} />,
  closed: <Icon name="moon" size={11} />,
};

const STATUS_LABEL: Record<SessionInfo['status'], string> = {
  open: 'OPEN',
  'opening-soon': 'OPENS 30m',
  'closing-soon': 'CLOSING',
  closed: 'closed',
};

/** Live market clock + session bar — header only. UTC + WAT tick every second
 *  (HH:MM:SS); session chips show a static HH:MM local time + status icon. */
export default function MarketSessions() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!now) return null;
  const sessions = getSessions(now);
  const anyOpen = sessions.some((s) => s.status === 'open');
  const closing = sessions.find((s) => s.status === 'closing-soon');
  const opening = sessions.find((s) => s.status === 'opening-soon');

  if (typeof document !== 'undefined') {
    document.body.setAttribute('data-market', anyOpen ? 'open' : 'closed');
  }

  const utcHh = String(now.getUTCHours()).padStart(2, '0');
  const utcMm = String(now.getUTCMinutes()).padStart(2, '0');
  const utcSs = String(now.getUTCSeconds()).padStart(2, '0');
  const watHh = String((now.getUTCHours() + 1) % 24).padStart(2, '0');
  const watSs = utcSs;

  const chip = (s: SessionInfo) => (
    <span
      key={s.city}
      className={`session-chip ${s.status === 'open' ? 'session-open' :
        s.status === 'opening-soon' ? 'session-soon' :
        s.status === 'closing-soon' ? 'session-closing' : 'session-closed'}`}
      title={`${s.name} ${s.open}:00–${s.close > 24 ? s.close - 24 : s.close}:00 UTC · local ${s.localTime}`}
    >
      {s.flag} {s.city} <b>{s.localTime}</b>
      <em style={{ marginLeft: 3 }}>{STATUS_ICON[s.status]} {STATUS_LABEL[s.status]}</em>
    </span>
  );

  return (
    <div className="market-sessions" data-open={anyOpen ? '1' : '0'}>
      <span className="utc-pill">UTC {utcHh}:{utcMm}:{utcSs}</span>
      <span className="utc-pill">WAT {watHh}:{utcMm}:{watSs}</span>
      {sessions.map(chip)}
      {!anyOpen && (
        <span className={`session-banner ${opening || closing ? 'session-soon' : 'session-closed'}`}>
          {opening ? `🌅 ${opening.name} session opens in ~30 min`
            : closing ? '🌇 Session closing soon'
            : `🌙 Forex market closed — weekend · reopens in ${(() => {
                const m = sessions[0]?.reopensInMin ?? 0;
                const d = Math.floor(m / 1440);
                const h = Math.floor((m % 1440) / 60);
                const mm = m % 60;
                return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${mm}m` : `${mm}m`;
              })()}`}
        </span>
      )}
    </div>
  );
}
