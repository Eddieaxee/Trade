// ── Provider orchestration: candles + reference rates with cache ─────────────
// Priority per source type:
//   candles  → Twelve Data (when key set) → Yahoo Finance (keyless)
//   rates    → Frankfurter series (keyless) → ER-API latest (keyless)

import type { Candle, Granularity, Pair, RatePoint } from '@/lib/types';
import { TTL_CANDLE_DAILY, TTL_CANDLE_INTRADAY, TWELVEDATA_API_KEY } from '@/lib/constants';
import { cacheGet, cacheKey, cacheSet } from '@/lib/cache';
import { fetchYahooCandles, SOURCE as YAHOO_SOURCE } from '@/lib/providers/yahoo';
import { fetchTwelveDataCandles, SOURCE as TD_SOURCE } from '@/lib/providers/twelvedata';
import { fetchFrankfurterSeries, SOURCE as FF_SOURCE } from '@/lib/providers/frankfurter';
import { fetchERAPILatest, SOURCE as ER_SOURCE } from '@/lib/providers/erapi';

export interface CandleResult {
  source: string;
  candles: Candle[];
}

export interface RatesResult {
  source: string;
  series: RatePoint[];
  notes: string[];
}

/** Fetch raw candles, trying providers in priority order. */
export async function fetchCandles(pair: Pair, interval: Granularity): Promise<CandleResult> {
  const failures: string[] = [];

  if (TWELVEDATA_API_KEY) {
    try {
      const candles = await fetchTwelveDataCandles(pair.symbol, interval);
      return { source: TD_SOURCE, candles };
    } catch (e) {
      failures.push(`${TD_SOURCE}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    const candles = await fetchYahooCandles(pair.symbol, interval);
    return { source: YAHOO_SOURCE, candles };
  } catch (e) {
    failures.push(`${YAHOO_SOURCE}: ${e instanceof Error ? e.message : String(e)}`);
  }

  throw new Error(`All candle providers failed — ${failures.join(' | ')}`);
}

/** Candles with TTL cache (per pair + interval). */
export async function getCandlesCached(pair: Pair, interval: Granularity): Promise<CandleResult> {
  const key = cacheKey('candles', interval, pair.symbol);
  const ttl = interval === '1d' ? TTL_CANDLE_DAILY : TTL_CANDLE_INTRADAY;
  const hit = await cacheGet<CandleResult>(key);
  if (hit && hit.candles && hit.candles.length >= 2) return hit;
  const fresh = await fetchCandles(pair, interval);
  await cacheSet(key, fresh, ttl);
  return fresh;
}

/** Reference-rate history (anchor for currency-strength decomposition). */
export async function fetchReferenceSeries(): Promise<RatesResult> {
  const failures: string[] = [];
  try {
    const series = await fetchFrankfurterSeries();
    return { source: FF_SOURCE, series, notes: [] };
  } catch (e) {
    failures.push(`${FF_SOURCE}: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    const series = await fetchERAPILatest();
    return {
      source: ER_SOURCE,
      series,
      notes: [
        'Reference rates degraded to latest-only ER-API snapshot — historic windows unavailable for strength deltas.'
      ]
    };
  } catch (e) {
    failures.push(`${ER_SOURCE}: ${e instanceof Error ? e.message : String(e)}`);
  }
  throw new Error(`All reference-rate providers failed — ${failures.join(' | ')}`);
}