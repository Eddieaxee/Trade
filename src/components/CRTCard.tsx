'use client';

import type { PairAnalysis } from '@/lib/types';
import { fmtPrice } from '@/lib/utils';
import ScoreBar from './ScoreBar';

/** Deep-dive card for the Candle Range Theory engine. */
export default function CRTCard({ analysis }: { analysis: PairAnalysis }) {
  const { crt } = analysis;
  const biasChip = crt.bias === 'long' ? 'green' : crt.bias === 'short' ? 'red' : 'gray';

  return (
    <div className="panel">
      <h3>Candle Range Theory</h3>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <span className={`chip ${crt.expansion ? 'blue' : crt.contraction ? 'gray' : 'gray'}`}>
          {crt.rangeMode.toUpperCase()}
        </span>
        <span className={`chip ${crt.expansion ? 'green' : crt.contraction ? 'red' : 'gray'}`}>
          {crt.expansion ? 'EXPANDING' : crt.contraction ? 'CONTRACTING' : 'STEADY'} {crt.expansionRatio}×
        </span>
        <span className={`chip ${biasChip}`}>bias {crt.bias}</span>
      </div>
      <div style={{ marginBottom: 8 }}><ScoreBar score={crt.score} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
        <div>Body strength <b>{Math.round(crt.bodyStrength * 100)}%</b></div>
        <div>Wick imb. <b className={crt.wickImbalance >= 0 ? 'up-text' : 'down-text'}>{crt.wickImbalance > 0 ? '+' : ''}{(crt.wickImbalance * 100).toFixed(0)}%</b></div>
        <div>Last FVG <b>{crt.lastFVG ? `${crt.lastFVG.side === 'up' ? '↑' : '↓'} ${fmtPrice(crt.lastFVG.bottom)}–${fmtPrice(crt.lastFVG.top)}` : 'none'}</b></div>
        <div>Open FVGs <b>{crt.fvgs.length}</b></div>
      </div>
      {crt.notes.length > 0 && (
        <ul className="note-list">
          {crt.notes.slice(0, 4).map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}