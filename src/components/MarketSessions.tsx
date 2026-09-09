'use client';

import { useEffect, useState } from 'react';

export interface SessionInfo {
  name: string;
  city: string;
  flag: string;
  open: number; // UTC hour
  close: number; // UTC hour
  offset: number; // hours from UTC (approximate, DST-aware via month)
  status: 'open' | 'closed' | 'opening-soon' | 'closing-soon';
  localTime: string;
}

function dstShift(now: Date): number {
  // Approximate DST: Northern hemisphere — Apr..Oct = summer (e.g. London +1, NY -4).
  const m = now.getUTCMonth();
  return m >= 2 && m <= 9 ? 1 : 0;
}

export function sessionStatus(
  name: string,
  city: string,
  flag: string,
  openUtc: number,
  closeUtc: number,
  offsetBase: number,
  now: Date
): SessionInfo {
  const offset = offsetBase + (offsetBase === 0 || offsetBase === 5 ? dstShift(now) : 0);
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const openMin = openUtc * 60;
  const closeMin = closeUtc * 60;

  // Trading-week guard: weekends (Fri 21:00 UTC → Sun 22:00 UTC) are closed.
  const dow = now.getUTCDay(); // 0=Sun … 6=Sat
  const dayOpen = (dow >= 1 && dow <= 5 && !(dow === 5 && utcMin >= 21 * 60));
  const dayClosed = dow === 0 || (dow === 5 && utcMin >= 21 * 60) || (dow === 6 && utcMin < 22 * 60);

  let status: SessionInfo['status'];
  if (dayClosed) {
    status = 'closed';
  } else if (utcMin >= openMin - 30 && utcMin < openMin) {
    status = 'opening-soon';
  } else if (utcMin >= closeMin - 45 && utcMin < closeMin) {
    status = 'closing-soon';
  } else if (utcMin >= openMin && utcMin < closeMin) {
    status = 'open';
  } else {
    status = 'closed';
  }
  void dayOpen;

  // Local clock at the session's offset.
  const local = new Date(now.getTime() + offset * 3600_000);
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');

  return {
    name,
    city,
    flag,
    open: openUtc,
    close: closeUtc,
    offset,
    status,
    localTime: `${hh}:${mm}`
  };
}

/** FX market sessions: Sydney open → Tokyo → London → New York, tracked live. */
export function getSessions(now: Date): SessionInfo[] {
  return [
    sessionStatus('Sydney', 'AUS', '🇦🇺', 21, 6, 10, now),
    sessionStatus('Tokyo', 'JPN', '🇯🇵', 0, 9, 9, now),
    sessionStatus('London', 'GBR', '🇬🇧', 7, 16, 0, now),
    sessionStatus('New York', 'USA', '🇺🇸', 12, 21, 5, now)
  ];
}

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

  const utc = new Date(now.getTime());
  const utcHh = String(utc.getUTCHours()).padStart(2, '0');
  const utcMm = String(utc.getUTCMinutes()).padStart(2, '0');
  // West Africa Time (UTC+1, no DST)
  const watHh = String((utc.getUTCHours() + 1) % 24).padStart(2, '0');

  const chip = (s: SessionInfo) => {
    const cls =
      s.status === 'open' ? 'session-open' :
      s.status === 'opening-soon' ? 'session-soon' :
      s.status === 'closing-soon' ? 'session-closing' : 'session-closed';
    const label =
      s.status === 'open' ? 'OPEN' :
      s.status === 'opening-soon' ? 'OPENS 30m' :
      s.status === 'closing-soon' ? 'CLOSING' : 'closed';
    return (
      <span key={s.city} className={`session-chip ${cls}`} title={`${s.name} ${s.open}:00–${s.close > 24 ? s.close - 24 : s.close}:00 UTC`}>
        {s.flag} {s.city} <b>{s.localTime}</b> <em>{label}</em>
      </span>
    );
  };

  return (
    <div className="market-sessions" data-open={anyOpen ? '1' : '0'}>
      <span className="utc-pill">UTC {utcHh}:{utcMm}</span>
      <span className="utc-pill wat">WAT {watHh}:{utcMm}</span>
      {sessions.map(chip)}
      {!anyOpen && (
        <span className={`session-banner ${opening || closing ? 'session-soon' : 'session-closed'}`}>
          {opening ? `🌅 ${opening.city} session opens in ~30 min` : closing ? `🌇 ${closing.city} session closing soon` : '🌙 Forex market closed — weekend'}
        </span>
      )}
    </div>
  );
}