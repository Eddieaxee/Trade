'use client';

import { Suspense } from 'react';
import { fmtAgo } from '@/lib/utils';
import { getStrengthMatrixCached } from '@/lib/analysis/matrix';
import StrengthView from '@/components/StrengthView';
import type { StrengthMatrix } from '@/lib/types';

async function StrengthPageInner() {
  let matrix: StrengthMatrix | null = null;
  let error: string | null = null;
  try {
    matrix = await getStrengthMatrixCached();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Strength matrix unavailable.';
  }
  return (
    <div className="page">
      <div className="page-title">
        <h1>Currency Strength</h1>
        <p>Multi-timeframe relative-strength matrix for EUR, USD, GBP, JPY, CHF, AUD, CAD, NZD. Heatmap, rankings, histograms and strongest-vs-weakest pair combinations across 1M → 1W.</p>
      </div>
      {error && (
        <div className="status-bar">
          <span className="err">⚠ {error} — showing last cached snapshot below, if any.</span>
        </div>
      )}
      {matrix && <StrengthView matrix={matrix} />}
    </div>
  );
}

export default function StrengthPage() {
  return (
    <Suspense fallback={<div className="page"><div className="status-bar"><span className="spinner" /> Building strength matrix…</div></div>}>
      <StrengthPageInner />
    </Suspense>
  );
}