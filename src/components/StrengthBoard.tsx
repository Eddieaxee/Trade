'use client';

import { useMemo } from 'react';
import type { StrengthResult } from '@/lib/types';

/** Relative currency-strength board — ranked status cards (not tight pills).
 *  Each card: rank · code · signed score bar · 1d/7d deltas · momentum arrow. */
export default function StrengthBoard({ strength, compact = false }: { strength: StrengthResult | null; compact?: boolean }) {
  const sorted = useMemo(
    () => (strength?.currencies ? [...strength.currencies].sort((a, b) => b.score - a.score) : []),
    [strength]
  );

  if (!sorted.length) {
    return <div className="note-list" style={{ paddingLeft: 0 }}>Strength feed unavailable.</div>;
  }

  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`);

  return (
    <div className="strength-grid">
      {sorted.map((c, i) => {
        const pos = c.score > 0.5;
        const neg = c.score < -0.5;
        const cls = pos ? 'strong' : neg ? 'weak' : 'neutral';
        const arrow = c.delta1d > 0.05 ? '▲' : c.delta1d < -0.05 ? '▼' : '▬';
        const barPct = Math.min(100, (Math.abs(c.score) / 42) * 100);
        return (
          <div
            key={c.code}
            className={`strength-card ${cls}`}
            title={`${c.code} 1d ${c.delta1d > 0 ? '+' : ''}${c.delta1d.toFixed(2)}% · 7d ${c.delta7d > 0 ? '+' : ''}${c.delta7d.toFixed(2)}%`}
          >
            <div className="strength-top">
              <span className="strength-rank">{medal(i)}</span>
              <span className="strength-code">{c.code}</span>
              <span className={`strength-arrow ${pos ? 'up' : neg ? 'down' : ''}`}>{arrow}</span>
            </div>
            <div className="strength-score">{c.score > 0 ? '+' : ''}{c.score.toFixed(1)}</div>
            <div className="strength-bar" role="img" aria-label={`${c.code} strength ${c.score > 0 ? '+' : ''}${c.score.toFixed(1)}`}><span style={{ width: `${barPct}%` }} className={pos ? 'up' : neg ? 'down' : 'flat'} /></div>
            <div className="strength-deltas">
              <span className={c.delta1d >= 0 ? 'tone-up' : 'tone-down'}>1d {c.delta1d > 0 ? '+' : ''}{c.delta1d.toFixed(2)}%</span>
              {!compact && <span className="tone-muted">·</span>}
              {!compact && <span className={c.delta7d >= 0 ? 'tone-up' : 'tone-down'}>7d {c.delta7d > 0 ? '+' : ''}{c.delta7d.toFixed(2)}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}