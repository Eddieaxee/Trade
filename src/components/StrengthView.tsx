'use client';

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

export default function StrengthView({ matrix }: { matrix: StrengthMatrix }) {
  const latest = matrix.tfs[matrix.tfs.length - 1];
  return (
    <>
      <div className="panel">
        <h3>Multi-timeframe strength heatmap</h3>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 0 }}>
          Cross-sectional z-score of each currency vs EUR over a rolling window per TF. Green = outperforming, red = underperforming. Scores always sum to ≈ 0.
        </p>
        <Heatmap matrix={matrix} />
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