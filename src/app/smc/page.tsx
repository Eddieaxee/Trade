'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { PairAnalysis } from '@/lib/types';
import { fmtAgo, fmtPrice } from '@/lib/utils';
import PairSelect, { readParams } from '@/components/PairSelect';
import { usePairAnalysis } from '@/components/usePairAnalysis';
import ScoreBar from '@/components/ScoreBar';
import SMCDetails, { SMCBlocksAndZones, StatRow } from '@/components/SMCDetails';

function SMCPageInner() {
  const sp = useSearchParams();
  const { pair, tf } = readParams(sp);
  const state = usePairAnalysis(pair, tf);
  const a = state.data;

  return (
    <div className="page">
      <div className="page-title">
        <h1>Smart Money Concepts</h1>
        <p>Dedicated SMC breakdown — structure, liquidity, order blocks and dealing-range positioning per pair and timeframe.</p>
      </div>
      <PairSelect defaultPair={pair} defaultTf={tf} tfLabel="Timeframe" />
      <div className="status-bar">
        {state.loading && <><span className="spinner" /> <span>Analysing {pair} on {tf}…</span></>}
        {state.error && <span className="err">⚠ {state.error}</span>}
        {a && !state.loading && (
          <span className="pill">real OHLC · {a.source} · updated {fmtAgo(state.fetchedAt / 1000)} ago</span>
        )}
      </div>

      {a && (
        <>
          <div className="page-head-cards">
            <div className="panel">
              <h3>SMC directional bias</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 34, fontWeight: 800, fontFamily: 'var(--mono)', color: a.smc.bias === 'long' ? 'var(--up)' : a.smc.bias === 'short' ? 'var(--down)' : 'var(--warn)' }}>
                  {a.smc.bias === 'long' ? 'BULLISH' : a.smc.bias === 'short' ? 'BEARISH' : 'NEUTRAL'}
                </span>
                <span style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                  {a.smc.score > 0 ? '+' : ''}{a.smc.score}
                </span>
              </div>
              <ScoreBar score={a.smc.score} />
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`chip ${a.smc.trend === 'bullish' ? 'green' : a.smc.trend === 'bearish' ? 'red' : 'gray'}`}>{a.smc.trendLabel}</span>
                <span className="chip blue">{pair}</span>
                <span className="chip gray">{tf}</span>
              </div>
            </div>
            <div className="panel">
              <h3>Quick status</h3>
              <StatRow k="Last BOS" v={a.smc.lastBOS ? `${a.smc.lastBOS.direction === 'up' ? '↑' : '↓'} ${fmtPrice(a.smc.lastBOS.price)}` : '—'} />
              <StatRow k="Last CHoCH" v={a.smc.lastCHoCH ? `${a.smc.lastCHoCH.direction === 'up' ? '↑' : '↓'} ${fmtPrice(a.smc.lastCHoCH.price)}` : '—'} />
              <StatRow k="Order blocks (fresh)" v={a.smc.orderBlocks.filter((b) => !b.removed).length} />
              <StatRow k="Breakers" v={a.smc.breakers.length} />
              <StatRow k="EQH / EQL pools" v={`${a.smc.equalHighs.length} / ${a.smc.equalLows.length}`} />
              <StatRow k="Zone" v={a.smc.pd ? a.smc.pd.zone.toUpperCase() : '—'} />
              <div style={{ marginTop: 10 }}>
                <Link className="chip blue" href={`/pair/${pair}`}>Full pair dashboard →</Link>
              </div>
            </div>
          </div>
          <div className="cards-2">
            <SMCDetails a={a} />
            <SMCBlocksAndZones a={a} />
          </div>
        </>
      )}
    </div>
  );
}

export default function SMCPage() {
  return (
    <Suspense fallback={<div className="page"><div className="status-bar"><span className="spinner" /> Loading…</div></div>}>
      <SMCPageInner />
    </Suspense>
  );
}