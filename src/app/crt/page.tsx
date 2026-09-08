'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fmtAgo } from '../../lib/utils';
import PairSelect, { readParams } from '../../components/PairSelect';
import { usePairAnalysis } from '../../components/usePairAnalysis';
import ScoreBar from '../../components/ScoreBar';
import CRTView from '../../components/CRTView';

function CRTPageInner() {
  const sp = useSearchParams();
  const { pair, tf } = readParams(sp);
  const state = usePairAnalysis(pair, tf);
  const a = state.data;

  return (
    <div className="page">
      <div className="page-title">
        <h1>Candle Range Theory</h1>
        <p>Dedicated CRT analysis — range phase model (Developing → Confirming → Confirmed → Invalidated), manipulation, sweep, reclaim, displacement and confirmation per pair and timeframe.</p>
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
              <h3>CRT phase</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 34, fontWeight: 800, fontFamily: 'var(--mono)', color: a.crtPhase.status === 'confirmed' ? 'var(--up)' : a.crtPhase.status === 'invalidated' ? 'var(--down)' : 'var(--warn)' }}>
                  {a.crtPhase.status.toUpperCase()}
                </span>
                <span style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 700 }}>
                  {a.crtPhase.score > 0 ? '+' : ''}{a.crtPhase.score}
                </span>
              </div>
              <ScoreBar score={a.crtPhase.score} />
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`chip ${a.crtPhase.direction === 'bullish' ? 'green' : a.crtPhase.direction === 'bearish' ? 'red' : 'gray'}`}>{a.crtPhase.direction}</span>
                <span className="chip blue">{pair}</span>
                <span className="chip gray">{tf}</span>
              </div>
            </div>
            <div className="panel">
              <h3>Range stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>Range mode</div><b className="chip blue">{a.crt.rangeMode.toUpperCase()}</b>
                <div>Expansion</div><b>{a.crt.expansion ? `EXPANDING ${a.crt.expansionRatio}×` : 'no'}</b>
                <div>Contraction</div><b>{a.crt.contraction ? `CONTRACTING ${a.crt.expansionRatio}×` : 'no'}</b>
                <div>Body strength</div><b>{Math.round(a.crt.bodyStrength * 100)}%</b>
                <div>Wick imbalance</div><b className={a.crt.wickImbalance >= 0 ? 'tone-up' : 'tone-down'}>{a.crt.wickImbalance > 0 ? '+' : ''}{(a.crt.wickImbalance * 100).toFixed(0)}%</b>
                <div>Open FVGs</div><b>{a.crt.fvgs.length}</b>
              </div>
            </div>
          </div>
          <div className="cards-2"><CRTView a={a} /></div>
        </>
      )}
    </div>
  );
}

export default function CRTPage() {
  return (
    <Suspense fallback={<div className="page"><div className="status-bar"><span className="spinner" /> Loading…</div></div>}>
      <CRTPageInner />
    </Suspense>
  );
}