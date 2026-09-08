'use client';

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CURRENCIES } from '@/lib/constants';
import { fmtAgo } from '@/lib/utils';
import { getPairMTFCached } from '@/lib/analysis/mtf';
import { usePairAnalysis } from '@/components/usePairAnalysis';
import PairDashboard from '@/components/PairDashboard';

function PairPageInner({ symbol }: { symbol: string }) {
  const state = usePairAnalysis(symbol, '1h');
  const a = state.data;
  const mtf = state.mtf;

  return (
    <div className="page">
      <div className="page-title">
        <h1>{symbol.slice(0, 3)}/{symbol.slice(3)}</h1>
        <p>Full pair dashboard — price, bias per analysis system, multi-timeframe table and the &quot;why&quot; behind every score.</p>
      </div>
      <div className="status-bar">
        {state.loading && <><span className="spinner" /> <span>Loading {symbol}…</span></>}
        {state.error && <span className="err">⚠ {state.error}</span>}
        {a && !state.loading && (
          <span className="pill">real OHLC · {a.source} · updated {fmtAgo(state.fetchedAt / 1000)} ago</span>
        )}
      </div>
      {a && <PairDashboard a={a} mtf={mtf} />}
    </div>
  );
}

export default function PairPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  if (symbol.length !== 6 || !CURRENCIES.includes(symbol.slice(0, 3)) || !CURRENCIES.includes(symbol.slice(3))) {
    notFound();
  }
  return (
    <Suspense fallback={<div className="page"><div className="status-bar"><span className="spinner" /> Loading…</div></div>}>
      <PairPageInner symbol={symbol} />
    </Suspense>
  );
}