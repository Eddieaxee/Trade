'use client';

import type { StrengthResult } from '@/lib/types';

const tone = (v: number) => (v > 0.5 ? 'up-text' : v < -0.5 ? 'down-text' : 'neutral-text');

/** Relative currency-strength board: needle gauge per currency. */
export default function StrengthBoard({ strength }: { strength: StrengthResult | null }) {
  if (!strength || !strength.currencies.length) {
    return <div className="note-list" style={{ paddingLeft: 0 }}>Strength feed unavailable.</div>;
  }
  return (
    <div className="strength-grid">
      {strength.currencies.map((c) => {
        const pos = Math.max(-1, Math.min(1, c.score / 42));
        const leftPct = 50 + pos * 50;
        return (
          <div className="strong-card" key={c.code}>
            <div className="code">{c.code}</div>
            <div className="strong-meter">
              <div className="needle" />
              <div className="value" style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }} />
            </div>
            <div className="strong-delta">
              <span className={tone(c.score)}>{c.score > 0 ? '+' : ''}{c.score.toFixed(1)}</span>
              {' · '}
              {c.delta1d > 0 ? '+' : ''}{c.delta1d.toFixed(2)}%/1d
            </div>
          </div>
        );
      })}
    </div>
  );
}