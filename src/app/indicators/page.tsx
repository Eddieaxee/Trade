'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fmtAgo } from '@/lib/utils';
import PairSelect, { readParams } from '@/components/PairSelect';
import { usePairAnalysis } from '@/components/usePairAnalysis';
import ScoreBar from '@/components/ScoreBar';
import IndicatorsView from '@/components/IndicatorsView';

function IndicatorsPageInner() {
  const sp = useSearchParams();
  const { pair, tf } = readParams(sp);
  const state = usePairAnalysis(pair, tf);
  const a = state.data;

  return (
    <div className="page">
      <div className="page-title">
        <h1>Technical Indicators</h1>
        <p>16 standard indicators per pair and timeframe — SMA/EMA, RSI, MACD, Stochastic, Bollinger, Ichimoku, ATR and more. Buy/Sell speedometer, signal histogram and per-indicator conviction.</p>
      </div>
      <PairSelect defaultPair={pair} defaultTf={tf} tfLabel="Timeframe" />
      <div className="status-bar">
        {state.loading && <><span className="spinner" /> <span>Computing indicators for {pair} on {tf}…</span></>}
        {state.error && <span className="err">⚠ {state.error}</span>}
        {a && !state.loading && (
          <span className="pill">real OHLC · {a.source} · updated {fmtAgo(state.fetchedAt / 1000)} ago</span>
        )}
      </div>

      {a && (
        <>
          <div className="page-head-cards">
            <div className="panel">
              <h3>Overall technical bias</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 34, fontWeight: 800, fontFamily: 'var(--mono)', color: a.indicators.score >= 25 ? 'var(--up)' : a.indicators.score <= -25 ? 'var(--down)' : 'var(--warn)' }}>
                  {a.indicators.score >= 25 ? 'BULLISH' : a.indicators.score <= -25 ? 'BEARISH' : 'NEUTRAL'}
                </span>
                <span style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                  {a.indicators.score > 0 ? '+' : ''}{a.indicators.score}
                </span>
              </div>
              <ScoreBar score={a.indicators.score} />
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="chip green">{a.indicators.bull} bullish</span>
                <span className="chip red">{a.indicators.bear} bearish</span>
                <span className="chip gray">{a.indicators.neutral} neutral</span>
              </div>
            </div>
            <div className="panel">
              <h3>Signal summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>Total indicators</div><b>{a.indicators.readings.length}</b>
                <div>Bullish</div><b className="tone-up">{a.indicators.bull}</b>
                <div>Bearish</div><b className="tone-down">{a.indicators.bear}</b>
                <div>Neutral</div><b className="tone-muted">{a.indicators.neutral}</b>
                <div>ATR</div><b>{a.indicators.atr !== null ? a.indicators.atr.toFixed(5) : '—'}</b>
                <div>Label</div><b>{a.indicators.label}</b>
              </div>
            </div>
          </div>
          <div className="cards-2"><IndicatorsView a={a} /></div>
        </>
      )}
    </div>
  );
}

export default function IndicatorsPage() {
  return (
    <Suspense fallback={<div className="page"><div className="status-bar"><span className="spinner" /> Loading…</div></div>}>
      <IndicatorsPageInner />
    </Suspense>
  );
}