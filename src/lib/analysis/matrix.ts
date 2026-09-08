// ── Multi-timeframe currency-strength matrix (star-pair decomposition) ──────
// For every timeframe, the 7 EUR-star pairs are fetched once (cached), each
// currency's return vs EUR is isolated over a rolling window, then z-scored
// across the 8 currencies. Any cross AB ≈ r_A − r_B follows exactly, so the
// full 28-pair matrix comes from 7 real fetches — no invented data.
// The 30S column is derived from the freshest sub-minute movement available
// in the 1m feed (keyless providers floor at 1m) and is marked with "†".

import type { Candle, Granularity, StrengthMatrix, StrengthTFColumn } from '@/lib/types';
import { CURRENCIES, STAR_PAIRS, TTL_STRENGTH_MATRIX } from '@/lib/constants';
import { cacheGet, cacheKey, cacheSet } from '@/lib/cache';
import { getCandlesCached } from '@/lib/providers';
import { clamp, mean, stdev } from '@/lib/utils';

/** Rolling window (bars) used per timeframe. */
const WINDOW_BARS: Partial<Record<Granularity, number>> = {
  '1m': 10,
  '5m': 8,
  '15m': 6,
  '30m': 6,
  '1h': 6,
  '4h': 5,
  '1d': 5,
  '1w': 4
};

/** TF display order (30S† first — it is the freshest, derived column). */
export const TF_ORDER = ['30s†', '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

function pairPct(candles: Candle[], bars: number): number | null {
  if (candles.length < bars + 1) return null;
  const a = candles[candles.length - 1 - bars].c;
  const b = candles[candles.length - 1].c;
  if (!a) return null;
  return (b - a) / a * 100;
}

/** 30S†: last completed 1m close → live candle close (freshest real move). */
function livePct(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  const a = candles[candles.length - 2].c;
  const b = candles[candles.length - 1].c;
  if (!a) return null;
  return (b - a) / a * 100;
}

function zscoreMap(changes: Partial<Record<string, number>>): Record<string, number | null> {
  const vals = Object.values(changes).filter((v): v is number => Number.isFinite(v as number));
  const out: Record<string, number | null> = {};
  if (vals.length < 4) {
    for (const c of CURRENCIES) out[c] = null;
    return out;
  }
  const sd = stdev(vals);
  const m = mean(vals);
  for (const c of CURRENCIES) {
    const v = changes[c];
    out[c] = Number.isFinite(v as number) && sd > 0
      ? clamp(((v as number) - m) / sd / 2.5, -1, 1) * 100
      : 0;
  }
  return out;
}

/** Best directional pair per TF: highest-scoring currency vs lowest. */
export function bestPairFor(col: StrengthTFColumn): { symbol: string; spread: number } | null {
  const entries = CURRENCIES
    .map((c) => ({ c, s: col.scores[c] }))
    .filter((e): e is { c: string; s: number } => typeof e.s === 'number');
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => b.s - a.s);
  const hi = sorted[0];
  const lo = sorted[sorted.length - 1];
  return { symbol: hi.c + lo.c, spread: Math.round((hi.s - lo.s) * 10) / 10 };
}

type StarSeries = Record<string, Candle[]>;

async function starSeries(tf: Granularity): Promise<StarSeries> {
  const settled = await Promise.allSettled(
    STAR_PAIRS.map(async (p) => {
      const r = await getCandlesCached(p, tf);
      return [p.symbol, r.candles] as const;
    })
  );
  const out: StarSeries = {};
  for (const s of settled) if (s.status === 'fulfilled') out[s.value[0]] = s.value[1];
  if (Object.keys(out).length < 5) {
    throw new Error('insufficient star-pair series for the strength matrix');
  }
  return out;
}

function columnFrom(series: StarSeries, tfLabel: string, bars: number, useLive: boolean): StrengthTFColumn {
  const changes: Partial<Record<string, number>> = {};
  for (const ccy of CURRENCIES) {
    if (ccy === 'EUR') {
      // EUR vs EUR ≡ 0 by construction; derive from the mean inverse star move.
      const inv: number[] = [];
      for (const p of STAR_PAIRS) {
        const cs = series[p.symbol];
        if (!cs) continue;
        const ch = useLive ? livePct(cs) : pairPct(cs, bars);
        if (ch !== null) inv.push(-ch);
      }
      changes.EUR = inv.length ? mean(inv) : NaN;
    } else {
      const cs = series['EUR' + ccy];
      if (!cs) { changes[ccy] = NaN; continue; }
      const ch = useLive ? livePct(cs) : pairPct(cs, bars);
      changes[ccy] = ch ?? NaN;
    }
  }
  const scores = zscoreMap(changes);
  const deltas: Record<string, number | null> = {};
  for (const c of CURRENCIES) {
    const v = changes[c];
    deltas[c] = Number.isFinite(v as number) ? Math.round((v as number) * 1000) / 1000 : null;
  }
  return { tf: tfLabel, scores, deltas };
}
// ── matrix.ts part 2: full-matrix build + cache ─────────────────────────────

const BASE_NOTE =
  'Scores are cross-sectional z-scores over the rolling window: relative strength, always summing to ≈ 0.';

/** Build the full matrix across all timeframes (cache-wrapped by the getter). */
export async function buildStrengthMatrix(): Promise<StrengthMatrix> {
  const tfs: Granularity[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
  const notes: string[] = [
    '30S† is derived from the freshest sub-minute movement in the 1m feed — keyless providers floor at 1-minute granularity.',
    BASE_NOTE
  ];
  const cols: StrengthTFColumn[] = [];

  const settled = await Promise.allSettled(
    tfs.map(async (tf) => ({ tf, series: await starSeries(tf) }))
  );

  const failed: string[] = [];
  for (const s of settled) {
    if (s.status !== 'fulfilled') {
      failed.push(s.reason instanceof Error ? s.reason.message : String(s.reason));
      continue;
    }
    const { tf, series } = s.value;
    cols.push(columnFrom(series, tf, WINDOW_BARS[tf] ?? 6, false));
  }
  if (failed.length) {
    notes.push(`${failed.length} of ${tfs.length} timeframe feeds failed: ${failed[0]}${failed.length > 1 ? ' …' : ''}`);
  }

  // 30S† column from the freshest 1m closes.
  try {
    const series = await starSeries('1m');
    cols.unshift(columnFrom(series, '30s†', 0, true));
  } catch {
    notes.push('30S† column unavailable — 1m feed failed.');
  }

  cols.sort((a, b) => TF_ORDER.indexOf(a.tf) - TF_ORDER.indexOf(b.tf));

  if (!cols.length) throw new Error('strength matrix: every timeframe feed failed');
  return { updatedAt: Date.now() / 1000, sources: ['yahoo'], tfs: cols, notes };
}

const MATRIX_KEY = cacheKey('strength-matrix', 'v2');

export async function getStrengthMatrixCached(): Promise<StrengthMatrix> {
  const hit = await cacheGet<StrengthMatrix>(MATRIX_KEY);
  if (hit && hit.tfs && hit.tfs.length) return hit;
  const fresh = await buildStrengthMatrix();
  await cacheSet(MATRIX_KEY, fresh, TTL_STRENGTH_MATRIX);
  return fresh;
}