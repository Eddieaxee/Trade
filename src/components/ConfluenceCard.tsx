'use client';

import type { PairAnalysis } from '@/lib/types';
import { fmtPrice } from '@/lib/utils';
import ScoreBar from './ScoreBar';

/** Deep-dive card for the weighted technical-confluence engine. */
export default function ConfluenceCard({ analysis }: { analysis: PairAnalysis }) {
  const { confluence: c } = analysis;
  const labelChip = c.score >= 10 ? 'green' : c.score <= -10 ? 'red' : 'gray';
  const hi = (v: number) => v > 0 ? 'up-text' : v < 0 ? 'down-text' : 'tone-muted';

  return (
    <div className="panel">
      <h3>Technical Confluence</h3>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span className={`chip ${labelChip}`} style={{ fontSize: 12 }}>{c.label}</span>
        <span className="tone-muted" style={{ fontFamily: 'var(--mono)' }}>
          {c.score > 0 ? '+' : ''}{c.score}
        </span>
      </div>
      <div style={{ marginBottom: 8 }}><ScoreBar score={c.score} /></div>
      <div className="hbar">
        {c.factors.map((f) => (
          <div className="row" key={f.key}>
            <span className="lb">{f.label}</span>
            <span className="track">
              <span className="mid" />
              <span
                className="f"
                style={{
                  left: f.score >= 0 ? '50%' : `${50 - Math.abs(f.score) * 50}%`,
                  width: `${Math.abs(f.score) * 50}%`,
                  background: f.score >= 0 ? 'var(--up)' : 'var(--down)'
                }}
              />
            </span>
            <span className="vl" title={f.note}>{(f.score * 100).toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
        <div className="zone-row">
          <span>Support (demand)</span>
          <span>{c.support ? fmtPrice(c.support) : '—'}</span>
        </div>
        <div className="zone-row">
          <span>Resistance (supply)</span>
          <span>{c.resistance ? fmtPrice(c.resistance) : '—'}</span>
        </div>
      </div>
      <ul className="note-list" style={{ marginTop: 8 }}>
        {c.factors.map((f) => (
          <li key={f.key}>
            <span className={hi(f.score)}>{f.label}</span> — {f.note}
          </li>
        ))}
      </ul>
    </div>
  );
}