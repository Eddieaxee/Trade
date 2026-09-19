'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { StrengthMatrix, StrengthTFColumn } from '@/lib/types';
import { CURRENCIES, canonicalPair } from '@/lib/constants';
import { fmtAgo } from '@/lib/utils';

const fmtVal = (v: number | null) =>
  v === null ? '—' : `${v > 0 ? '+' : ''}${Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2)}`;

const tone = (v: number | null, scale = 1) =>
  v === null ? 'tone-muted' : v > scale * 0.35 ? 'tone-up' : v < -scale * 0.35 ? 'tone-down' : '';

/** Adaptive column scale — raw pairwise % moves are small, so color/alpha
 *  intensity is relative to the strongest currency in the column. */
function colScale(col: { scores: Record<string, number | null> }): number {
  const vals = Object.values(col.scores).filter((v): v is number => typeof v === 'number');
  return Math.max(0.1, ...vals.map((v) => Math.abs(v)));
}

function cellBg(v: number | null, scale = 1): string {
  if (v === null) return 'transparent';
  const c = v >= 0 ? '38, 194, 129' : '240, 80, 106';
  const a = Math.min(0.5, Math.abs(v) / scale);
  return `rgba(${c}, ${a})`;
}

function Heatmap({ matrix }: { matrix: StrengthMatrix }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="grid-table">
        <thead>
          <tr>
            <th>Currency</th>
            {matrix.tfs.map((c) => <th key={c.tf}>{c.tf}</th>)}
          </tr>
        </thead>
        <tbody>
          {CURRENCIES.map((ccy) => (
            <tr key={ccy}>
              <td><strong>{ccy}</strong></td>
              {matrix.tfs.map((c) => {
                const v = c.scores[ccy];
                const s = colScale(c);
                return (
                  <td key={c.tf} style={{ background: cellBg(v, s), fontFamily: 'var(--mono)' }}>
                    <span className={tone(v, s)}>{fmtVal(v)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Ranking({ col }: { col: StrengthTFColumn }) {
  const sorted = CURRENCIES
    .map((c) => ({ c, s: col.scores[c] }))
    .filter((e) => e.s !== null)
    .sort((a, b) => (b.s as number) - (a.s as number));
  const hi = sorted[0];
  const lo = sorted[sorted.length - 1];
  const bestSym = hi && lo ? canonicalPair(hi.c, lo.c) : null;
  return (
    <div className="strong-card">
      <div className="code">{col.tf}</div>
      <div className="strong-delta">
        <span className="tone-up">{hi?.c} {hi?.s !== null && hi?.s !== undefined ? fmtVal(hi.s) : ''}</span>
        {' vs '}
        <span className="tone-down">{lo?.c} {lo?.s !== null && lo?.s !== undefined ? fmtVal(lo.s) : ''}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
        Best pair: {bestSym ? `${bestSym.slice(0, 3)}/${bestSym.slice(3)}` : '—'}
      </div>
    </div>
  );
}

function Histogram({ col }: { col: StrengthTFColumn }) {
  const max = colScale(col);
  return (
    <div className="hbar">
      {CURRENCIES.map((c) => {
        const v = col.scores[c];
        if (v === null) return null;
        return (
          <div className="row" key={c}>
            <span className="lb">{c}</span>
            <span className="track">
              <span className="mid" />
              <span className="f" style={{ left: v >= 0 ? '50%' : `${50 - (Math.abs(v) / max) * 50}%`, width: `${(Math.abs(v) / max) * 50}%`, background: v >= 0 ? 'var(--up)' : 'var(--down)' }} />
            </span>
            <span className="vl">{fmtVal(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Dots({ col }: { col: StrengthTFColumn }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {CURRENCIES.map((c) => {
        const v = col.scores[c];
        if (v === null) return null;
        const s = colScale(col);
        const r = 4 + Math.min(10, (Math.abs(v) / s) * 10);
        return (
          <span key={c} title={`${c} ${fmtVal(v)}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
            <span style={{ width: r * 2, height: r * 2, borderRadius: '50%', background: v >= 0 ? 'var(--up)' : 'var(--down)', opacity: 0.35 + Math.min(0.65, Math.abs(v) / s), display: 'inline-block' }} />
            <b style={{ color: 'var(--text)' }}>{c}</b>
            <span className={tone(v, s)}>{fmtVal(v)}</span>
          </span>
        );
      })}
    </div>
  );
}


interface HistoryPoint {
  date: string;
  scores: Record<string, number | null>;
}

const LINE_COLORS: Record<string, string> = {
  USD: '#38c281', EUR: '#3aa5ff', GBP: '#b48cff', JPY: '#ff6b81',
  CHF: '#ff4d4d', AUD: '#ffa94d', CAD: '#4dd4ff', NZD: '#c3e88d',
};

/** MarketMilk-style lines: cumulative all-against-all % move per currency
 *  from the window start date. X-axis = dates; 1W / 1M selector. */
function Lines() {
  const [range, setRange] = useState<'1w' | '1m'>('1w');
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    fetch(`/api/analysis/strength-history?range=${range}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { points?: HistoryPoint[] }) => {
        if (alive && d.points?.length) setPoints(d.points);
        else if (alive) setErr('No history available.');
      })
      .catch((e: unknown) => { if (alive) setErr(e instanceof Error ? e.message : 'load failed'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [range]);

  const W = 720;
  const H = 240;
  const PAD = 38;

  if (loading) return <div className="panel" style={{ padding: '24px 0', textAlign: 'center' }}><span className="spinner" /> <span className="tone-muted">Loading strength lines…</span></div>;
  if (err || !points.length) return <div className="panel"><p className="tone-muted">⚠ {err ?? 'No history available.'}</p></div>;

  const all = points.flatMap((p) => CURRENCIES.map((c) => p.scores[c]).filter((v): v is number => typeof v === 'number'));
  const lo = Math.min(0, ...all);
  const hi = Math.max(0, ...all);
  const span = Math.max(0.1, hi - lo);
  const x = (i: number) => PAD + (i / Math.max(1, points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - PAD * 2);
  const zeroY = y(0);
  const fmtVal = (v: number) => `${Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2)}%`;
  const dateLbl = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  };
  // Show ~every other date label on the 1M view so they don't collide.
  const labelStep = points.length > 14 ? 3 : points.length > 8 ? 2 : 1;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="news-tabs" style={{ margin: '0 0 10px', width: 'fit-content' }}>
        {(['1w', '1m'] as const).map((r) => (
          <button key={r} className={`news-tab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
            {r === '1w' ? 'Last 7 days' : 'Last 30 days'}
          </button>
        ))}
      </div>
      <svg width={W} height={H} role="img" aria-label={`Currency strength movement over the ${range === '1w' ? 'past week' : 'past month'}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const gy = PAD + f * (H - PAD * 2);
          return <line key={f} x1={PAD} x2={W - PAD} y1={gy} y2={gy} stroke="var(--border)" strokeDasharray={f === 0.5 ? '' : '2 4'} opacity={f === 0.5 ? 0.9 : 0.5} />;
        })}
        <text x={PAD - 5} y={PAD + 3} fontSize={9} fill="var(--muted)" textAnchor="end" fontFamily="var(--mono)">{fmtVal(hi)}</text>
        <text x={PAD - 5} y={H - PAD + 3} fontSize={9} fill="var(--muted)" textAnchor="end" fontFamily="var(--mono)">{fmtVal(lo)}</text>
        <text x={PAD - 5} y={zeroY + 3} fontSize={9} fill="var(--muted)" textAnchor="end" fontFamily="var(--mono)">0</text>
        {CURRENCIES.map((ccy) => {
          const d = points
            .map((p, i) => (typeof p.scores[ccy] === 'number' ? `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.scores[ccy] as number).toFixed(1)}` : ''))
            .join(' ');
          const last = [...points].reverse().find((p) => typeof p.scores[ccy] === 'number');
          const lx = x(points.length - 1) + 4;
          const ly = last ? y(last.scores[ccy] as number) : 0;
          return (
            <g key={ccy}>
              <path d={d} fill="none" stroke={LINE_COLORS[ccy] ?? '#888'} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />
              {last && (
                <text x={Math.min(lx, W - 30)} y={ly + 3} fontSize={9.5} fontWeight={700} fill={LINE_COLORS[ccy] ?? '#888'} fontFamily="var(--mono)">{ccy}</text>
              )}
            </g>
          );
        })}
        {points.map((p, i) => (
          i % labelStep === 0 || i === points.length - 1 ? (
            <text key={p.date} x={x(i)} y={H - 10} fontSize={9} fill="var(--muted)" textAnchor="middle" fontFamily="var(--mono)">{dateLbl(p.date)}</text>
          ) : null
        ))}
      </svg>
      <p className="tone-muted" style={{ fontSize: 11, margin: '6px 0 0' }}>
        Cumulative % move vs every other currency from the window start (0 line = start date). Date labels DD/MM.
      </p>
    </div>
  );
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function Volatility({ matrix }: { matrix: StrengthMatrix }) {
  // Per-currency regime — strictly consistent within ONE timeframe so nothing
  // can ever be labelled "Bullish" while ranked weakest (the old version mixed
  // 1W vs 1D values, which produced contradictions).
  //  · last      = score in the latest timeframe column (same source as ranking)
  //  · momentum  = that column's own raw % delta over its window (deltas field)
  //  · regime    = derived purely from the SIGN of last + momentum, so the
  //                weakest-ranked currencies can only ever be Bearish/Neutral.
  const latest = matrix.tfs[matrix.tfs.length - 1];
  const rows = CURRENCIES.map((ccy) => {
    const last = latest.scores[ccy];
    if (typeof last !== 'number') return null;
    const momentum = typeof latest.deltas[ccy] === 'number' ? (latest.deltas[ccy] as number) : 0;
    const spread = Math.max(0.01, colScale(latest));
    // Sign-consistent regime: sign(last) gates Bullish/Bearish, momentum only
    // picks firming vs weakening. Near-zero scores are neutral.
    const nearZero = Math.abs(last) < spread * 0.15;
    const flat = Math.abs(momentum) < spread * 0.08;
    const regime =
      nearZero
        ? (momentum > 0 ? 'Neutral → bid' : momentum < 0 ? 'Neutral → offered' : 'Range-bound')
        : last > 0
          ? (momentum < 0 ? 'Bullish but weakening' : flat ? 'Bullish (steady)' : 'Bullish & firming')
          : (momentum > 0 ? 'Bearish but firming' : flat ? 'Bearish (steady)' : 'Bearish & bleeding');
    return { ccy, last, momentum, spread, regime };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  const bySpread = [...rows].sort((a, b) => b.spread - a.spread);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div className="strong-card">
          <div className="code">Most volatile</div>
          <div className="strong-delta tone-up">{bySpread[0]?.ccy} ±{fmtVal(bySpread[0]?.spread ?? null)}</div>
        </div>
        <div className="strong-card">
          <div className="code">Calmest</div>
          <div className="strong-delta tone-muted">{bySpread[bySpread.length - 1]?.ccy} ±{fmtVal(bySpread[bySpread.length - 1]?.spread ?? null)}</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="grid-table">
          <thead><tr><th>Ccy</th><th>Score ({latest.tf})</th><th>Momentum (window Δ%)</th><th>TF range</th><th>Regime</th></tr></thead>
          <tbody>
            {rows.sort((a, b) => b.last - a.last).map((r) => (
              <tr key={r.ccy}>
                <td><strong>{r.ccy}</strong></td>
                <td className={r.last > 0 ? 'tone-up' : r.last < 0 ? 'tone-down' : 'tone-muted'}>{fmtVal(r.last)}</td>
                <td className={r.momentum > 0 ? 'tone-up' : r.momentum < 0 ? 'tone-down' : 'tone-muted'}>{fmtVal(r.momentum)}</td>
                <td className="tone-muted">{fmtVal(r.spread)}</td>
                <td><span className={`chip ${r.regime.startsWith('Bullish') ? 'green' : r.regime.startsWith('Bearish') ? 'red' : 'gray'}`}>{r.regime}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tone-muted" style={{ fontSize: 11, margin: '8px 0 0' }}>
        Regimes are sign-consistent by construction: a currency ranked weakest can only show Bearish/Neutral, never Bullish.
        Score and regime come from the same {latest.tf} column; momentum is that column's own raw % change.
      </p>
    </>
  );
}

export default function StrengthView({ initial }: { initial: StrengthMatrix }) {
  const [matrix, setMatrix] = useState<StrengthMatrix>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [view, setView] = useState<'heatmap' | 'lines' | 'volatility'>('heatmap');

  // Live polling — re-fetch the matrix every 60s so scores stay current.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      setRefreshing(true);
      try {
        const res = await fetch('/api/analysis/matrix', { cache: 'no-store' });
        if (res.ok) {
          const next = (await res.json()) as StrengthMatrix;
          if (alive && next?.tfs?.length) {
            setMatrix(next);
            setUpdatedAt(Date.now());
          }
        }
      } catch {
        /* keep last good matrix */
      } finally {
        if (alive) setRefreshing(false);
      }
    };
    const id = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const latest = matrix.tfs[matrix.tfs.length - 1];
  return (
    <>
      <div className="panel">
        <h3>Visualisation</h3>
        <div className="news-tabs" style={{ margin: '0 0 12px' }}>
          {(['heatmap', 'lines', 'volatility'] as const).map((v) => (
            <button key={v} className={`news-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {v === 'heatmap' ? 'Heatmap' : v === 'lines' ? 'Lines (by date)' : 'Volatility'}
            </button>
          ))}
        </div>
        {view === 'heatmap' && <Heatmap matrix={matrix} />}
        {view === 'lines' && <Lines />}
        {view === 'volatility' && <Volatility matrix={matrix} />}
      </div>

      <div className="panel">
        <h3>Rankings by timeframe</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {matrix.tfs.map((c) => <Ranking key={c.tf} col={c} />)}
        </div>
      </div>

      <div className="panel">
        <h3>Strongest vs weakest pair combinations</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr><th>Timeframe</th><th>Strongest</th><th>Weakest</th><th>Best pair</th><th>Spread</th></tr>
            </thead>
            <tbody>
              {matrix.tfs.map((c) => {
                const sorted = CURRENCIES.map((ccy) => ({ ccy, s: c.scores[ccy] })).filter((e) => e.s !== null).sort((a, b) => (b.s as number) - (a.s as number));
                const hi = sorted[0];
                const lo = sorted[sorted.length - 1];
                const spread = hi && lo ? Math.round(((hi.s as number) - (lo.s as number)) * 10) / 10 : null;
                const sym = hi && lo ? canonicalPair(hi.ccy, lo.ccy) : null;
                return (
                  <tr key={c.tf}>
                    <td>{c.tf}</td>
                    <td className="tone-up">{hi?.ccy} {hi?.s !== null && hi?.s !== undefined ? fmtVal(hi.s) : ''}</td>
                    <td className="tone-down">{lo?.ccy} {lo?.s !== null && lo?.s !== undefined ? fmtVal(lo.s) : ''}</td>
                    <td>{sym ? <Link href={`/pair/${sym}`}><span className="chip blue">{sym.slice(0, 3)}/{sym.slice(3)} →</span></Link> : '—'}</td>
                    <td>{spread !== null ? fmtVal(spread) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Methodology notes</h3>
        <ul className="note-list">
          {matrix.notes.map((n, i) => <li key={i}>{n}</li>)}
          <li>Matrix built from 7 real EUR-star pair series per TF — every cross AB ≈ r_A − r_B follows exactly. No invented data.</li>
          <li>Updated {fmtAgo(matrix.updatedAt)} ago.</li>
        </ul>
      </div>
    </>
  );
}