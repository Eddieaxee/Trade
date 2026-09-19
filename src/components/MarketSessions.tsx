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
}

function dstShift(offsetBase: number, now: Date): number {
  // Northern hemisphere (positive offsets) — Apr..Oct = summer.
  // Sydney (+10/+11) — Southern Hemisphere, opposite schedule.
  const m = now.getUTCMonth();
  if (offsetBase >= 10) return m >= 9 || m <= 2 ? 1 : 0; // Sydney summer = Oct..Mar
  if (offsetBase > 0 || offsetBase <= -3) return m >= 2 && m <= 9 ? 1 : 0; // Northern summer
  return 0;
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

  // Trading-week guard: weekends (Fri 21:00 UTC → Sun 22:00 UTC) are closed.
  const dow = now.getUTCDay();
  const dayClosed = dow === 0 || (dow === 5 && utcMin >= 21 * 60) || (dow === 6 && utcMin < 22 * 60);

  const inSession = wrapsMidnight
    ? utcMin >= openMin || utcMin < closeMin
    : utcMin >= openMin && utcMin < closeMin;

  // Closing soon = within last 45 minutes before session close.
  const minsToClose = wrapsMidnight
    ? utcMin >= openMin ? (24 * 60 - utcMin + closeMin) : (closeMin - utcMin)
    : closeMin - utcMin;

  const opensIn = wrapsMidnight
    ? utcMin < openMin ? (openMin - utcMin)
    : (openMin + 24 * 60 - utcMin)
    : (openMin - utcMin);

  let status: SessionInfo['status'];
  if (dayClosed) status = 'closed';
  else if (inSession && minsToClose <= 45) status = 'closing-soon';
  else if (inSession) status = 'open';
  else if (!inSession && opensIn <= 30) status = 'opening-soon';
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
    localTime: fmtHms(local),
    utcTime: fmtHms(now)
  };
}

/** FX market sessions: Sydney → Tokyo → London → New York, tracked live to the second. */
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

/** Live market clock + session bar — mounted in the app header so market state
 *  is visible everywhere and "market closed" tints the whole app. */
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
          {opening ? '🌅 New York session opens in ~30 min'
            : closing ? '🌇 Session closing soon'
            : '🌙 Forex market closed — weekend'}
        </span>
      )}
    </div>
  );
}
