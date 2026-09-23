// ── Multi-timeframe currency-strength matrix (all-against-all pairwise) ─────
// For every timeframe the 7 EUR-star pairs are fetched once (cached). Each
// currency's raw % move over the rolling window is isolated, then every
// currency is measured directly against all 7 others (ch(A vs B) = chA − chB,
// exact in log terms). Scores are raw pairwise % — no anchors, no z-scores.
// Any cross AB follows exactly, so the full 28-pair matrix comes from 7 real
// fetches — no invented data. The 30S column is derived from the freshest
// sub-minute movement in the 1m feed and is marked with "†".

import type { Candle, Granularity, StrengthMatrix, StrengthTFColumn } from '@/lib/types';
import { CURRENCIES, STAR_PAIRS, TTL_STRENGTH_MATRIX, canonicalPair } from '@/lib/constants';
import { cacheGet, cacheKey, cacheSet } from '@/lib/cache';
import { getCandlesCached } from '@/lib/providers';
import { mean, pctChange } from '@/lib/utils';

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

function pairwiseMap(changes: Partial<Record<string, number>>): Record<string, number | null> {
  // All-against-all: ch(A vs B) = ch(A) − ch(B) (exact in log terms for these
  // move sizes). Each currency's score is the raw mean of its signed % change
  // against all 7 other currencies — no normalization, no z-scores.
  const out: Record<string, number | null> = {};
  for (const a of CURRENCIES) {
    const vals: number[] = [];
    for (const b of CURRENCIES) {
      if (a === b) continue;
      const ca = changes[a];
      const cb = changes[b];
      if (Number.isFinite(ca as number) && Number.isFinite(cb as number)) {
        vals.push((ca as number) - (cb as number));
      }
    }
    out[a] = vals.length ? Math.round(mean(vals) * 1000) / 1000 : null;
  }
  return out;
}

/** Best directional pair per TF: highest-scoring currency vs lowest (canonical order). */
export function bestPairFor(col: StrengthTFColumn): { symbol: string; spread: number } | null {
  const entries = CURRENCIES
    .map((c) => ({ c, s: col.scores[c] }))
    .filter((e): e is { c: string; s: number } => typeof e.s === 'number');
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => b.s - a.s);
  const hi = sorted[0];
  const lo = sorted[sorted.length - 1];
  return { symbol: canonicalPair(hi.c, lo.c), spread: Math.round((hi.s - lo.s) * 10) / 10 };
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
  const scores = pairwiseMap(changes);
  const deltas: Record<string, number | null> = {};
  for (const c of CURRENCIES) {
    const v = changes[c];
    deltas[c] = Number.isFinite(v as number) ? Math.round((v as number) * 1000) / 1000 : null;
  }
  return { tf: tfLabel, scores, deltas };
}
// ── matrix.ts part 2: full-matrix build + cache ─────────────────────────────

import type { RatePoint } from '@/lib/types';
import { getRatesCached } from '@/lib/analysis/index';
import { sleep } from '@/lib/utils';

const BASE_NOTE =
  'Scores are raw all-against-all pairwise % changes: each currency is measured directly against all 7 others — no anchors, no z-scores.';

/** Max open provider requests at once (avoids Yahoo/limit blocks). */
const BATCH_LIMIT = 3;
/** Pause between throttled batches to avoid 429s. */
const BATCH_DELAY_MS = 400;

/**
 * Fetch one star-pair set with a small concurrency cap. Returns whatever
 * resolved; does NOT throw when individual pairs fail (they filter out).
 */
async function starSeriesThrottled(tf: Granularity): Promise<StarSeries> {
  const out: StarSeries = {};
  for (let i = 0; i < STAR_PAIRS.length; i += BATCH_LIMIT) {
    const batch = STAR_PAIRS.slice(i, i + BATCH_LIMIT);
    const settled = await Promise.allSettled(
      batch.map(async (p) => ({ p, r: await getCandlesCached(p, tf) }))
    );
    for (const s of settled) {
      if (s.status === 'fulfilled') out[s.value.p.symbol] = s.value.r.candles;
    }
    if (i + BATCH_LIMIT < STAR_PAIRS.length) await sleep(BATCH_DELAY_MS);
  }
  return out;
}

/** Build a daily candle series per EUR-star pair from ECB/Frankfurter rates.
 *  This is keyless, daily, and never rate-limited — it keeps the 1D/1W columns
 *  alive even when intraday feeds are down. */
function dailyStarSeries(points: RatePoint[]): StarSeries {
  const out: StarSeries = {};
  for (const p of STAR_PAIRS) {
    const q = p.symbol.slice(3); // EURXXX → XXX
    const candles: Candle[] = [];
    for (const pt of points) {
      const v = pt.rates[q];
      if (!v || !Number.isFinite(v) || v <= 0) continue;
      candles.push({ t: pt.t, o: v, h: v, l: v, c: v });
    }
    candles.sort((a, b) => a.t - b.t);
    if (candles.length >= 5) out[p.symbol] = candles;
  }
  return out;
}

/** Build the full matrix across all timeframes (cache-wrapped by the getter). */
export async function buildStrengthMatrix(): Promise<StrengthMatrix> {
  const notes: string[] = [
    '30S† is derived from the freshest sub-minute movement in the 1m feed — keyless providers floor at 1-minute granularity.',
    BASE_NOTE
  ];
  const cols: StrengthTFColumn[] = [];

  // ── Daily backbone (1D / 1W) from ECB/Frankfurter — always reliable. ──────
  try {
    const rates = await getRatesCached();
    const daily = dailyStarSeries(rates.series);
    if (Object.keys(daily).length >= 4) {
      cols.push(columnFrom(daily, '1d', WINDOW_BARS['1d'] ?? 5, false));
      cols.push(columnFrom(daily, '1w', WINDOW_BARS['1w'] ?? 4, false));
    } else {
      notes.push('Daily rate backbone unavailable — only intraday columns shown.');
    }
  } catch (e) {
    notes.push(`Daily rates: ${e instanceof Error ? e.message : 'unavailable'} — skipped.`);
  }

  // ── Intraday TFs (best-effort, throttled + delayed). ──────────────────────
  const intraday: Granularity[] = ['1m', '5m', '15m', '30m', '1h', '4h'];
  for (const tf of intraday) {
    try {
      const series = await starSeriesThrottled(tf);
      const keys = Object.keys(series);
      if (keys.length < 4) {
        notes.push(`${tf}: only ${keys.length} star pairs resolved — skipped.`);
        continue;
      }
      cols.push(columnFrom(series, tf, WINDOW_BARS[tf] ?? 6, false));
    } catch (e) {
      notes.push(`${tf}: ${e instanceof Error ? e.message : 'feed failed'} — skipped.`);
    }
  }

  // 30S† column from the freshest 1m closes (only if 1m survived).
  const has1m = cols.some((c) => c.tf === '1m');
  if (has1m) {
    try {
      const series = await starSeriesThrottled('1m');
      if (Object.keys(series).length >= 4) cols.unshift(columnFrom(series, '30s†', 0, true));
    } catch {
      notes.push('30S† column unavailable — 1m feed failed.');
    }
  } else {
    notes.push('30S† column unavailable — 1m feed failed.');
  }

  const merged_notes = [...new Set(notes)];
  if (!cols.length) {
    throw new Error('strength matrix: every timeframe feed failed');
  }
  if (cols.length < 6) merged_notes.push('Only a subset of timeframes resolved — see breakdown above.');
  merged_notes.push('Feed throttle: provider requests are batched and delayed to avoid rate limits.');

  cols.sort((a, b) => TF_ORDER.indexOf(a.tf) - TF_ORDER.indexOf(b.tf));

  return { updatedAt: Date.now() / 1000, sources: ['yahoo', 'frankfurter'], tfs: cols, notes: merged_notes };
}

const MATRIX_KEY = cacheKey('strength-matrix', 'v4');

// ── Date-anchored strength history (MarketMilk-style lines) ─────────────────
export interface StrengthHistoryPoint {
  date: string; // YYYY-MM-DD
  scores: Record<string, number | null>; // ccy → cumulative all-against-all % since window start
}

/**
 * Cumulative all-against-all % move per currency from the window start date,
 * day by day — exactly how BabyPips MarketMilk traces strength over 1W / 1M.
 * Built from the daily ECB/Frankfurter reference-rate series (keyless).
 *
 * RAW PAIRWISE (no z-score, no EUR anchor): for each date we derive all 28
 * crosses from the 7 EUR-star rates, compute each pair's % change from the
 * window start, then per-currency average its signed % change across the 7
 * direct crosses it forms (base +, quote −, inversions handled). Every
 * currency is measured against every other — zero-sum by construction, but
 * expressed as raw %, not a normalized index.
 */
export async function buildStrengthHistory(days: number): Promise<{
  range: string;
  points: StrengthHistoryPoint[];
  notes: string[];
}> {
  const notes: string[] = [];
  const { series } = await getRatesCached();
  if (series.length < 3) throw new Error('rate history too short for strength lines');
  const window = series.slice(-Math.max(3, days));

  // Build canonical 28-pair cross table (base, quote) in institutional order.
  const ccies = CURRENCIES;
  const xpairs: Array<{ base: string; quote: string }> = [];
  for (let i = 0; i < ccies.length; i++) {
    for (let j = i + 1; j < ccies.length; j++) {
      const sym = canonicalPair(ccies[i], ccies[j]);
      xpairs.push({ base: sym.slice(0, 3), quote: sym.slice(3) });
    }
  }

  // For each currency, pre-compute its EUR-star rate series (EUR = 1/base).
  // crossRate(base, quote) = rates[quote] / rates[base]  (value of 1 base in quote).
  const pts: Array<{ t: number; iso: string; rates: Record<string, number> }> = [];
  for (const pt of window) {
    const r: Record<string, number> = {};
    for (const c of ccies) r[c] = c === 'EUR' ? 1 : (pt.rates[c] ?? null);
    pts.push({ t: pt.t, iso: new Date(pt.t * 1000).toISOString().slice(0, 10), rates: r });
  }

  const startRates = pts[0].rates;

  const points: StrengthHistoryPoint[] = pts.map((pt) => {
    const ch: Record<string, number> = {};
    // For each currency, average its signed % change across all 7 direct pairs.
    for (const ccy of ccies) {
      const vals: number[] = [];
      for (const { base, quote } of xpairs) {
        if (base !== ccy && quote !== ccy) continue;
        const s0b = startRates[base], s0q = startRates[quote];
        const nowb = pt.rates[base], nowq = pt.rates[quote];
        if (s0b == null || s0q == null || nowb == null || nowq == null) continue;
        if (s0b <= 0 || s0q <= 0 || nowb <= 0 || nowq <= 0) continue;
        const before = s0q / s0b; // cross rate at start
        const after = nowq / nowb; // cross rate at pt
        const chg = pctChange(before, after); // already a % number
        if (chg !== null && Number.isFinite(chg)) {
          const sign = base === ccy ? 1 : -1;
          vals.push(chg * sign);
        }
      }
      ch[ccy] = vals.length ? mean(vals) : 0;
    }
    const scores: Record<string, number | null> = {};
    for (const c of ccies) scores[c] = ch[c] != null ? Math.round(ch[c] * 1000) / 1000 : null;
    return { date: pt.iso, scores };
  });

  // First point IS the window start (all zeros by construction) — it was
  // already emitted by the map above, so no extra push is needed.
  const seen = new Set<string>();
  const deduped = points.filter((p) => (seen.has(p.date) ? false : (seen.add(p.date), true)));
  deduped.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  notes.push('Cumulative all-against-all % move from the window start (0 = start date).');
  return { range: days <= 10 ? '1w' : '1m', points: deduped, notes };
}

export async function getStrengthMatrixCached(): Promise<StrengthMatrix> {
  const hit = await cacheGet<StrengthMatrix>(MATRIX_KEY);
  if (hit && hit.tfs && hit.tfs.length >= 4) return hit;
  const fresh = await buildStrengthMatrix();
  await cacheSet(MATRIX_KEY, fresh, TTL_STRENGTH_MATRIX);
  return fresh;
}