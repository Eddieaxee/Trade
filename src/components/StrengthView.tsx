'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { StrengthMatrix, StrengthTFColumn } from '@/lib/types';
import { CURRENCIES } from '@/lib/constants';
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
  const W = 560;
  const H = 190;
  const PAD = 28;
  const series = CURRENCIES.map((ccy, ci) => ({
    ccy,
    color: `hsl(${(ci * 360) / CURRENCIES.length} 70% 55%)`,
    pts: matrix.tfs.map((c) => c.scores[ccy]),
  }));
  const all = matrix.tfs.flatMap((c) => CURRENCIES.map((ccy) => c.scores[ccy]).filter((v): v is number => typeof v === 'number'));
  const lo = all.length ? Math.min(...all) : -100;
  const hi = all.length ? Math.max(...all) : 100;
  const span = Math.max(1, hi - lo);
  const x = (i: number) => PAD + (i / Math.max(1, matrix.tfs.length - 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - PAD * 2);
  const zeroY = y(clampNum(0, lo, hi));
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H} role="img" aria-label="Currency strength lines">
        <line x1={PAD} x2={W - PAD} y1={zeroY} y2={zeroY} stroke="var(--border)" strokeDasharray="4 3" />
        {series.map((s) => {
          const d = s.pts.map((v, i) => (typeof v === 'number' ? `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}` : '')).join(' ');
          return <path key={s.ccy} d={d} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />;
        })}
        {matrix.tfs.map((c, i) => (
          <text key={c.tf} x={x(i)} y={H - 6} fontSize={9} fill="var(--muted)" textAnchor="middle" fontFamily="var(--mono)">{c.tf}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: 11, fontFamily: 'var(--mono)' }}>
        {series.map((s) => (
          <span key={s.ccy} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 3, borderRadius: 2, background: s.color, display: 'inline-block' }} />{s.ccy}
          </span>
        ))}
      </div>
    </div>
  );
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export default function StrengthView({ initial }: { initial: StrengthMatrix }) {
  const [matrix, setMatrix] = useState<StrengthMatrix>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [view, setView] = useState<'heatmap' | 'hist' | 'lines' | 'dots'>('heatmap');

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
          {(['heatmap', 'hist', 'lines', 'dots'] as const).map((v) => (
            <button key={v} className={`news-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {v === 'heatmap' ? 'Heatmap' : v === 'hist' ? 'Histogram' : v === 'lines' ? 'Lines' : 'Dots'}
            </button>
          ))}
        </div>
        {view === 'heatmap' && <Heatmap matrix={matrix} />}
        {view === 'lines' && <Lines matrix={matrix} />}
        {view === 'hist' && <Histogram col={latest} />}
        {view === 'dots' && <Dots col={latest} />}
      </div>

      <div className="panel">
        <h3>Rankings by timeframe</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          {matrix.tfs.map((c) => <Ranking key={c.tf} col={c} />)}
        </div>
      </div>

      <div className="panel">
        <h3>Strength histogram — {latest.tf}</h3>
        <Histogram col={latest} />
      </div>

      <div className="panel">
        <h3>Strength dots — {latest.tf}</h3>
        <Dots col={latest} />
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
                return (
                  <tr key={c.tf}>
                    <td>{c.tf}</td>
                    <td className="tone-up">{hi?.ccy} {hi?.s !== null && hi?.s !== undefined ? `+${hi.s.toFixed(1)}` : ''}</td>
                    <td className="tone-down">{lo?.ccy} {lo?.s !== null && lo?.s !== undefined ? lo.s.toFixed(1) : ''}</td>
                    <td>{hi && lo ? <Link href={`/pair/${hi.ccy}${lo.ccy}`}><span className="chip blue">{hi.ccy}{lo.ccy} →</span></Link> : '—'}</td>
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