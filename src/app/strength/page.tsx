// Server component — the matrix is built server-side (client-side Yahoo fetches
// hit CORS and hang forever, which was the old infinite-loading bug).
import { getStrengthMatrixCached } from '@/lib/analysis/matrix';
import StrengthView from '@/components/StrengthView';
import type { StrengthMatrix } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StrengthPage() {
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
        <p>Multi-timeframe relative-strength matrix for EUR, USD, GBP, JPY, CHF, AUD, CAD, NZD. Heatmap, rankings, histograms and strongest-vs-weakest pair combinations across 30S† → 1W. Auto-refreshes every 60s.</p>
      </div>
      {error && (
        <div className="status-bar">
          <span className="err">⚠ {error} — showing last cached snapshot below, if any.</span>
        </div>
      )}
      {matrix ? <StrengthView initial={matrix} /> : (
        <div className="status-bar"><span className="spinner" /> Building strength matrix…</div>
      )}
    </div>
  );
}