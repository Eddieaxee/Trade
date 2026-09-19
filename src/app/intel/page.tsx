// ── Intelligence Board: the market's pre-session briefing ────────────────────
// One page that ties everything together before the week opens: live FX market
// status (weekend-aware), the raw all-against-all strength snapshot with
// extended parameters, the highest-conviction pairs per timeframe, and the
// high-impact macro events on the calendar. Server-rendered from cached data.
import Link from 'next/link';
import { getRatesCached } from '@/lib/analysis/index';
import { computeStrength } from '@/lib/analysis/strength';
import { getStrengthMatrixCached, bestPairFor } from '@/lib/analysis/matrix';
import { getNewsRoom } from '@/lib/news';
import { CURRENCY_NAMES, canonicalPair } from '@/lib/constants';
import type { StrengthResult, StrengthMatrix } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`;
}

function marketStatus(): { open: boolean; label: string; detail: string } {
  const now = new Date();
  const dow = now.getUTCDay();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const closed = dow === 6 || (dow === 5 && utcMin >= 21 * 60) || (dow === 0 && utcMin < 21 * 60);
  if (closed) {
    let m: number;
    if (dow === 6) m = (7 - dow) * 1440 + 21 * 60 - utcMin;
    else if (dow === 5) m = 3 * 1440 + 21 * 60 - utcMin;
    else m = 21 * 60 - utcMin;
    const d = Math.floor(m / 1440);
    const h = Math.floor((m % 1440) / 60);
    return {
      open: false,
      label: 'MARKET CLOSED — WEEKEND',
      detail: `FX week reopens Sunday 21:00 UTC (Sydney open) — in ${d > 0 ? `${d}d ${h}h` : `${h}h ${m % 60}m`}. Values below reflect the last session close.`
    };
  }
  return { open: true, label: 'MARKET OPEN', detail: 'Live session — all values update in real time.' };
}

export default async function IntelPage() {
  const status = marketStatus();

  let strength: StrengthResult | null = null;
  let matrix: StrengthMatrix | null = null;
  let calendar: Awaited<ReturnType<typeof getNewsRoom>>['calendar'] = [];
  try {
    const { series } = await getRatesCached();
    strength = computeStrength(series);
  } catch { /* strength optional */ }
  try {
    matrix = await getStrengthMatrixCached();
  } catch { /* matrix optional */ }
  try {
    const room = await getNewsRoom();
    const nowTs = Date.now() / 1000;
    calendar = room.calendar
      .filter((c) => c.direction === 'future' && c.when >= nowTs - 60)
      .sort((a, b) => a.when - b.when)
      .slice(0, 5);
  } catch { /* calendar optional */ }

  const ranked = strength?.currencies ?? [];
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const topPair = strongest && weakest && strongest.code !== weakest.code
    ? canonicalPair(strongest.code, weakest.code)
    : null;

  return (
    <div className="page">
      <div className="page-title">
        <h1>Intelligence Board</h1>
        <p>The pre-session briefing — market status, raw strength parameters, conviction pairs and macro risk.</p>
      </div>

      {/* ── Market status ── */}
      <div className={`panel ${status.open ? '' : 'tone-muted'}`} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className={`chip ${status.open ? 'green' : 'red'}`} style={{ fontSize: 12, fontWeight: 800 }}>
            {status.open ? '● LIVE' : '○ ' + status.label}
          </span>
          <span className="tone-muted" style={{ fontSize: 12.5 }}>{status.detail}</span>
          {topPair && (
            <Link href={`/pair/${topPair}`} className="chip blue" style={{ textDecoration: 'none' }}>
              Top pair {topPair.slice(0, 3)}/{topPair.slice(3)} →
            </Link>
          )}
        </div>
      </div>

      {/* ── Extended strength snapshot (raw, all-against-all) ── */}
      {ranked.length > 0 && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <h3>Strength snapshot — all-against-all raw % (no anchors, no z-scores)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Ccy</th><th>Score</th><th>1d</th><th>3d mom</th><th>7d</th><th>30d</th><th>10d vol</th><th>Breadth</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => (
                  <tr key={c.code}>
                    <td>
                      <strong>{c.code}</strong>
                      <span className="tone-muted" style={{ marginLeft: 6, fontSize: 10.5 }}>{CURRENCY_NAMES[c.code]}</span>
                      {i === 0 && <span className="chip green" style={{ marginLeft: 6 }}>strongest</span>}
                      {i === ranked.length - 1 && <span className="chip red" style={{ marginLeft: 6 }}>weakest</span>}
                    </td>
                    <td className={c.score > 0 ? 'tone-up' : c.score < 0 ? 'tone-down' : 'tone-muted'}>{c.score > 0 ? '+' : ''}{c.score.toFixed(1)}</td>
                    <td className={c.delta1d > 0 ? 'tone-up' : c.delta1d < 0 ? 'tone-down' : ''}>{fmtPct(c.delta1d)}</td>
                    <td className={(c.momentum3d ?? 0) > 0 ? 'tone-up' : (c.momentum3d ?? 0) < 0 ? 'tone-down' : 'tone-muted'}>{fmtPct(c.momentum3d)}</td>
                    <td className={c.delta7d > 0 ? 'tone-up' : c.delta7d < 0 ? 'tone-down' : ''}>{fmtPct(c.delta7d)}</td>
                    <td className={(c.delta30d ?? 0) > 0 ? 'tone-up' : (c.delta30d ?? 0) < 0 ? 'tone-down' : 'tone-muted'}>{fmtPct(c.delta30d)}</td>
                    <td className="tone-muted">{c.vol10 !== null ? `±${c.vol10.toFixed(2)}%` : '—'}</td>
                    <td>
                      {c.breadth !== null ? (
                        <span className={`chip ${c.breadth >= 5 ? 'green' : c.breadth <= 2 ? 'red' : 'gray'}`}>{c.breadth}/7</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tone-muted" style={{ fontSize: 11, margin: '8px 0 0' }}>
            Score = 0.45×1d + 0.55×7d raw all-against-all %, ×40 display scale. Breadth = direct crosses won over 7d. 10d vol = std-dev of daily all-against-all scores.
          </p>
        </div>
      )}

      {/* ── Conviction pairs per timeframe ── */}
      {matrix && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <h3>Highest-conviction pairs per timeframe</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {matrix.tfs.map((col) => {
              const bp = bestPairFor(col);
              const sym = bp?.symbol ?? null;
              return (
                <Link key={col.tf} href={sym ? `/pair/${sym}` : '/dashboard'} className="strong-card" style={{ textDecoration: 'none' }}>
                  <div className="code">{col.tf}</div>
                  <div className="strong-delta tone-up">{sym ? `${sym.slice(0, 3)}/${sym.slice(3)}` : '—'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                    spread {bp ? fmtPct(bp.spread) : '—'}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Macro risk on deck ── */}
      <div className="panel">
        <h3>Macro risk on deck — next 5 high-impact events</h3>
        {calendar.length === 0 ? (
          <p className="tone-muted">No upcoming high-impact events available.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="grid-table">
              <thead><tr><th>When (UTC)</th><th>Ccy</th><th>Event</th><th>Forecast</th><th>Prev</th></tr></thead>
              <tbody>
                {calendar.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>{fmtWhenUtc(e.when)}</td>
                    <td><strong>{e.symbol}</strong></td>
                    <td>{e.event}</td>
                    <td>{e.forecast ?? '—'}</td>
                    <td>{e.previous ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <Link className="chip blue" href="/news">Full calendar →</Link>
        </div>
      </div>
    </div>
  );
}

function fmtWhenUtc(ts: number): string {
  const d = new Date(ts * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
