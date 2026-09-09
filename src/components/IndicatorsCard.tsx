'use client';

import type { PairAnalysis } from '@/lib/types';
import ScoreBar from './ScoreBar';

/** Compact indicators-only card for the dashboard pair strip. */
export default function IndicatorsCard({ analysis }: { analysis: PairAnalysis }) {
  const ind = analysis.indicators;
  const chip = ind.score >= 15 ? 'green' : ind.score <= -15 ? 'red' : 'gray';
  const top = [...ind.readings]
    .filter((r) => r.signal !== 'neutral')
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6);
  const neutralCount = ind.neutral;

  return (
    <div className="panel">
      <h3>Technical Indicators</h3>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span className={`chip ${chip}`} style={{ fontSize: 12 }}>{ind.label}</span>
        <span className="tone-muted" style={{ fontFamily: 'var(--mono)' }}>
          {ind.score > 0 ? '+' : ''}{ind.score}
        </span>
      </div>
      <div style={{ marginBottom: 8 }}><ScoreBar score={ind.score} /></div>
      <div className="snapshot-grid" style={{ marginBottom: 8 }}>
        <span>Bullish</span><b className="up-text">{ind.bull}</b>
        <span>Bearish</span><b className="down-text">{ind.bear}</b>
        <span>Neutral</span><b className="tone-muted">{neutralCount}</b>
        <span>ATR</span><b>{ind.atr != null ? ind.atr.toFixed(analysis.pair.symbol.includes('JPY') ? 3 : 5) : '—'}</b>
      </div>
      {top.length > 0 ? (
        <div className="hbar">
          {top.map((r) => (
            <div className="row" key={r.key} title={r.note}>
              <span className="lb">{r.name}</span>
              <span className="track">
                <span className="mid" />
                <span
                  className="f"
                  style={{
                    left: r.signal === 'buy' ? '50%' : `${50 - r.strength * 50}%`,
                    width: `${r.strength * 50}%`,
                    background: r.signal === 'buy' ? 'var(--up)' : 'var(--down)'
                  }}
                />
              </span>
              <span className={`vl ${r.signal === 'buy' ? 'up-text' : 'down-text'}`}>{r.signal}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="tone-muted" style={{ fontSize: 12 }}>All indicators neutral on this timeframe.</p>
      )}
      <ul className="note-list" style={{ marginTop: 8 }}>
        {ind.drivers.slice(0, 3).map((d, i) => <li key={i}>{d}</li>)}
      </ul>
    </div>
  );
}
