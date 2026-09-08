'use client';

import type { PairAnalysis } from '@/lib/types';
import { fmtPrice } from '@/lib/utils';
import ScoreBar from './ScoreBar';

/** Deep-dive card for the SMC engine. */
export default function SMCCard({ analysis }: { analysis: PairAnalysis }) {
  const { smc } = analysis;
  const trendChip =
    smc.trend === 'bullish' ? 'green' : smc.trend === 'bearish' ? 'red' : 'gray';
  const biasChip = smc.bias === 'long' ? 'green' : smc.bias === 'short' ? 'red' : 'gray';

  return (
    <div className="panel">
      <h3>Smart Money Concepts</h3>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <span className={`chip ${trendChip}`}>{smc.trendLabel}</span>
        <span className={`chip ${biasChip}`}>bias {smc.bias}</span>
      </div>
      <div style={{ marginBottom: 8 }}><ScoreBar score={smc.score} /></div>
      <div className="zone-row">
        <span>Last BOS</span>
        <span>{smc.lastBOS ? `${smc.lastBOS.direction === 'up' ? '↑' : '↓'} @ ${fmtPrice(smc.lastBOS.price)}` : '—'}</span>
      </div>
      <div className="zone-row">
        <span>Last CHoCH</span>
        <span>{smc.lastCHoCH ? `${smc.lastCHoCH.direction === 'up' ? '↑' : '↓'} @ ${fmtPrice(smc.lastCHoCH.price)}` : '—'}</span>
      </div>
      <div className="zone-row">
        <span>Demand (nearest)</span>
        <span>{smc.demandZones.length ? `${fmtPrice(smc.demandZones[smc.demandZones.length - 1][0])}–${fmtPrice(smc.demandZones[smc.demandZones.length - 1][1])}` : '—'}</span>
      </div>
      <div className="zone-row">
        <span>Supply (nearest)</span>
        <span>{smc.supplyZones.length ? `${fmtPrice(smc.supplyZones[0][0])}–${fmtPrice(smc.supplyZones[0][1])}` : '—'}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
        {smc.liquidity.slice(0, 4).map((l, i) => (
          <div className="zone-row" key={i}>
            <span>{l.label}</span>
            <span className="w">{l.side === 'above' ? '↑' : '↓'} {fmtPrice(l.price)} ×{l.weight}</span>
          </div>
        ))}
      </div>
      {smc.notes.length > 0 && (
        <ul className="note-list">
          {smc.notes.slice(0, 5).map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}