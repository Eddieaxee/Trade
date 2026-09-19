'use client';

import { useMemo } from 'react';
import type { StrengthResult } from '@/lib/types';
import Icon from '@/components/Icon';

function TrendSpark({ score }: { score: number }) {
  const up = score >= 0;
  const vals = Array.from({ length: 8 }, (_, i) => {
    const p = i / 7;
    const base = up ? 14 - p * 4 : 6 + p * 4;
    return `${i * 6 + 2},${16 - base}`;
  }).join(' ');
  return (
    <svg width="44" height="18" viewBox="0 0 44 18" aria-hidden="true">
      <polyline
        points={vals}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ color: up ? 'var(--up)' : 'var(--down)' }}
      />
    </svg>
  );
}

/** Relative currency-strength board — clean status pills with a trend sparkline.
 *  One pill per currency: icon · code · signed score · 1d delta · live trend line. */
export default function StrengthBoard({ strength }: { strength: StrengthResult | null }) {
  const sorted = useMemo(
    () => (strength?.currencies ? [...strength.currencies].sort((a, b) => b.score - a.score) : []),
    [strength]
  );

  if (!sorted.length) {
    return <div className="note-list" style={{ paddingLeft: 0 }}>Strength feed unavailable.</div>;
  }

  return (
    <div className="strength-pill-grid">
      {sorted.map((c) => {
        const pos = c.score > 0.5;
        const neg = c.score < -0.5;
        const cls = pos ? 'strong' : neg ? 'weak' : 'neutral';
        const icon = pos ? 'trending-up' : neg ? 'trending-down' : 'layers';
        return (
          <span
            key={c.code}
            className={`strength-pill ${cls}`}
            title={`${c.code} 1d ${c.delta1d > 0 ? '+' : ''}${c.delta1d.toFixed(2)}% · 7d ${c.delta7d > 0 ? '+' : ''}${c.delta7d.toFixed(2)}%`}
          >
            <Icon name={icon} size={11} />
            <span style={{ fontFamily: 'var(--mono)' }}>{c.code}</span>
            <b>{c.score > 0 ? '+' : ''}{c.score.toFixed(1)}</b>
            <TrendSpark score={c.score} />
            <em style={{ fontSize: 10.5 }}>{c.delta1d > 0 ? '+' : ''}{c.delta1d.toFixed(2)}%</em>
          </span>
        );
      })}
    </div>
  );
}