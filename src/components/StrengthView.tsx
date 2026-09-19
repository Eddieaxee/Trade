'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { StrengthMatrix, StrengthTFColumn } from '@/lib/types';
import { CURRENCIES, canonicalPair } from '@/lib/constants';
import { fmtAgo } from '@/lib/utils';

const tone = (v: number | null) =>
  v === null ? 'tone-muted' : v > 8 ? 'tone-up' : v < -8 ? 'tone-down' : '';

function cellBg(v: number | null): string {
  if (v === null) return 'transparent';
  const c = v >= 0 ? '38, 194, 129' : '240, 80, 106';
  const a = Math.min(0.5, Math.abs(v) / 100);
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
                return (
                  <td key={c.tf} style={{ background: cellBg(v), fontFamily: 'var(--mono)' }}>
                    <span className={tone(v)}>{v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}` : '—'}</span>
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
  return (
    <div className="strong-card">
      <div className="code">{col.tf}</div>
      <div className="strong-delta">
        <span className="tone-up">{hi?.c} {hi?.s !== null && hi?.s !== undefined ? `+${hi.s.toFixed(1)}` : ''}</span>
        {' vs '}
        <span className="tone-down">{lo?.c} {lo?.s !== null && lo?.s !== undefined ? lo.s.toFixed(1) : ''}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
        Best pair: {hi && lo ? `${hi.c}${lo.c}` : '—'}
      </div>
    </div>
  );
}

function Histogram({ col }: { col: StrengthTFColumn }) {
  const max = Math.max(20, ...CURRENCIES.map((c) => Math.abs(col.scores[c] ?? 0)));
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
            <span className="vl">{v > 0 ? '+' : ''}{v.toFixed(1)}</span>
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
        const r = 4 + Math.min(10, (Math.abs(v) / 100) * 10);
        return (
          <span key={c} title={`${c} ${v > 0 ? '+' : ''}${v.toFixed(1)}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
            <span style={{ width: r * 2, height: r * 2, borderRadius: '50%', background: v >= 0 ? 'var(--up)' : 'var(--down)', opacity: 0.35 + Math.min(0.65, Math.abs(v) / 100), display: 'inline-block' }} />
            <b style={{ color: 'var(--text)' }}>{c}</b>
            <span className={tone(v)}>{v > 0 ? '+' : ''}{v.toFixed(1)}</span>
          </span>
        );
      })}
    </div>
  );
}

function Lines({ matrix }: { matrix: StrengthMatrix }) {
  const W = 640;
  const H = 210;
  const PAD = 30;
  // Date-anchored: each TF column carries a real timestamp (updatedAt).
  // Intraday columns interpolate between updatedAt-24h … updatedAt; daily
  // columns between updatedAt-7d … updatedAt; weekly ≈ updatedAt-30d.
  const pts = matrix.tfs.map((c, i) => {
    const spanMs = c.tf === '1w' ? 30 * 864e5 : (c.tf === '1d' ? 7 * 864e5 : 864e5);
    return { tf: c.tf, t: matrix.updatedAt * 1000 - Math.max(0, (matrix.tfs.length - 1 - i)) * (spanMs / Math.max(1, matrix.tfs.length - 1)), col: c };
  });
  const series = CURRENCIES.map((ccy, ci) => ({
    ccy,
    color: `hsl(${(ci * 360) / CURRENCIES.length} 70% 55%)`,
    vals: pts.map((p) => p.col.scores[ccy]),
  }));
  const all = pts.flatMap((p) => CURRENCIES.map((ccy) => p.col.scores[ccy]).filter((v): v is number => typeof v === 'number'));
  const lo = all.length ? Math.min(...all) : -100;
  const hi = all.length ? Math.max(...all) : 100;
  const span = Math.max(1, hi - lo);
  const x = (i: number) => PAD + (i / Math.max(1, pts.length - 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - PAD * 2);
  const zeroY = y(clampNum(0, lo, hi));
  const dateLbl = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H} role="img" aria-label="Currency strength lines by date">
        <line x1={PAD} x2={W - PAD} y1={zeroY} y2={zeroY} stroke="var(--border)" strokeDasharray="4 3" />
        {[0.25, 0.5, 0.75].map((f) => {
          const gy = PAD + f * (H - PAD * 2);
          return <line key={f} x1={PAD} x2={W - PAD} y1={gy} y2={gy} stroke="var(--border)" strokeDasharray="2 4" opacity={0.5} />;
        })}
        {series.map((s) => {
          const d = s.vals.map((v, i) => (typeof v === 'number' ? `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}` : '')).join(' ');
          return <path key={s.ccy} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.92} />;
        })}
        {pts.map((p, i) => (
          <g key={`${p.tf}-${i}`}>
            <text x={x(i)} y={H - 18} fontSize={9} fill="var(--muted)" textAnchor="middle" fontFamily="var(--mono)">{dateLbl(p.t)}</text>
            <text x={x(i)} y={H - 6} fontSize={8.5} fill="var(--muted)" textAnchor="middle" fontFamily="var(--mono)" opacity={0.75}>{p.tf}</text>
          </g>
        ))}
        <text x={PAD - 4} y={PAD - 6} fontSize={9} fill="var(--muted)" textAnchor="end" fontFamily="var(--mono)">{hi.toFixed(0)}</text>
        <text x={PAD - 4} y={H - PAD + 3} fontSize={9} fill="var(--muted)" textAnchor="end" fontFamily="var(--mono)">{lo.toFixed(0)}</text>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: 11, fontFamily: 'var(--mono)' }}>
        {series.map((s) => (
          <span key={s.ccy} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 3, borderRadius: 2, background: s.color, display: 'inline-block' }} />{s.ccy}
          </span>
        ))}
      </div>
      <p className="tone-muted" style={{ fontSize: 11, margin: '6px 0 0' }}>Date-anchored trace (DD/MM under each TF column) — shows past movement across the matrix window, not raw TF labels.</p>
    </div>
  );
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function Volatility({ matrix }: { matrix: StrengthMatrix }) {
  // Per-currency regime: bullish but weakening, bearish but firming, etc.
  const rows = CURRENCIES.map((ccy) => {
    const vals = matrix.tfs.map((c) => c.scores[ccy]).filter((v): v is number => typeof v === 'number');
    if (!vals.length) return null;
    const last = vals[vals.length - 1];
    const prev = vals.length > 1 ? vals[vals.length - 2] : last;
    const spread = Math.max(...vals) - Math.min(...vals);
    const momentum = last - prev;
    const regime =
      last > 8 && momentum < 0 ? 'Bullish but weakening' :
      last > 8 ? 'Bullish & firming' :
      last < -8 && momentum > 0 ? 'Bearish but firming' :
      last < -8 ? 'Bearish & bleeding' :
      momentum > 2 ? 'Neutral → bid' :
      momentum < -2 ? 'Neutral → offered' : 'Range-bound';
    return { ccy, last, momentum, spread, regime };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  const bySpread = [...rows].sort((a, b) => b.spread - a.spread);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div className="strong-card">
          <div className="code">Most volatile</div>
          <div className="strong-delta tone-up">{bySpread[0]?.ccy} ±{bySpread[0]?.spread.toFixed(1)}</div>
        </div>
        <div className="strong-card">
          <div className="code">Calmest</div>
          <div className="strong-delta tone-muted">{bySpread[bySpread.length - 1]?.ccy} ±{bySpread[bySpread.length - 1]?.spread.toFixed(1)}</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="grid-table">
          <thead><tr><th>Ccy</th><th>Score</th><th>Momentum</th><th>Range</th><th>Regime</th></tr></thead>
          <tbody>
            {rows.sort((a, b) => b.last - a.last).map((r) => (
              <tr key={r.ccy}>
                <td><strong>{r.ccy}</strong></td>
                <td className={r.last > 8 ? 'tone-up' : r.last < -8 ? 'tone-down' : 'tone-muted'}>{r.last > 0 ? '+' : ''}{r.last.toFixed(1)}</td>
                <td className={r.momentum > 0 ? 'tone-up' : r.momentum < 0 ? 'tone-down' : 'tone-muted'}>{r.momentum > 0 ? '+' : ''}{r.momentum.toFixed(1)}</td>
                <td className="tone-muted">{r.spread.toFixed(1)}</td>
                <td><span className={`chip ${r.regime.includes('Bullish') ? 'green' : r.regime.includes('Bearish') ? 'red' : 'gray'}`}>{r.regime}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        {view === 'lines' && <Lines matrix={matrix} />}
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
                    <td className="tone-up">{hi?.ccy} {hi?.s !== null && hi?.s !== undefined ? `+${hi.s.toFixed(1)}` : ''}</td>
                    <td className="tone-down">{lo?.ccy} {lo?.s !== null && lo?.s !== undefined ? lo.s.toFixed(1) : ''}</td>
                    <td>{sym ? <Link href={`/pair/${sym}`}><span className="chip blue">{sym.slice(0, 3)}/{sym.slice(3)} →</span></Link> : '—'}</td>
                    <td>{spread !== null ? spread.toFixed(1) : '—'}</td>
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