'use client';

import type { MarketSnapshot } from '@/lib/types';
import { fmtPct, fmtPrice } from '@/lib/utils';
import Sparkline from '@/components/Sparkline';
import ScoreBar from './ScoreBar';

const biasChip = (b: string) => {
  if (b === 'long') return <span className="chip green">LONG</span>;
  if (b === 'short') return <span className="chip red">SHORT</span>;
  return <span className="chip gray">NEUT</span>;
};

const confChip = (score: number) => {
  if (score >= 10) return <span className="chip green">+{score}</span>;
  if (score <= -10) return <span className="chip red">{score}</span>;
  return <span className="chip gray">{score}</span>;
};

/** Master watchlist table: price, deltas, structure, CRT, SMC & confluence scores. */
export default function PairTable({ snapshot }: { snapshot: MarketSnapshot }) {
  const rows = [...snapshot.pairs].sort(
    (a, b) => Math.abs(b.confluence.score) - Math.abs(a.confluence.score) || b.confluence.score - a.confluence.score
  );
  return (
    <div className="panel">
      <h3>Watchlist — signature: price · deltas · structure · SMC · CRT · confluence</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="grid-table">
          <thead>
            <tr>
              <th>Pair</th>
              <th>Price</th>
              <th>1H</th>
              <th>24H</th>
              <th>Range</th>
              <th>SMC bias</th>
              <th>CRT bias</th>
              <th style={{ textAlign: 'right' }}>Confluence</th>
              <th>Chart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const c1 = p.change1h ?? 0;
              const c24 = p.change24h ?? 0;
              return (
                <tr key={p.pair.symbol}>
                  <td>
                    <strong>{p.pair.symbol.slice(0, 3)}</strong>
                    <span className="tone-muted">/{p.pair.symbol.slice(3)}</span>
                  </td>
                  <td>{fmtPrice(p.price)}</td>
                  <td className={c1 >= 0 ? 'tone-up' : 'tone-down'}>{fmtPct(c1)}</td>
                  <td className={c24 >= 0 ? 'tone-up' : 'tone-down'}>{fmtPct(c24)}</td>
                  <td className="tone-muted">{p.crt.rangeMode.toUpperCase()}{p.crt.expansion ? ' ⤢' : p.crt.contraction ? ' ⤡' : ''}</td>
                  <td>{biasChip(p.smc.bias)}</td>
                  <td>{biasChip(p.crt.bias)}</td>
                  <td style={{ minWidth: 90 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{ width: 56 }}>{confChip(p.confluence.score)}</div>
                      <div style={{ width: 54 }}><ScoreBar score={p.confluence.score} /></div>
                    </div>
                  </td>
                  <td><Sparkline candles={p.candles.slice(-40)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}