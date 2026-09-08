// ── Analysis orchestration imports ────────────────────────────────────────────

import type { Granularity, MarketSnapshot, Pair, PairAnalysis, StrengthResult } from '@/lib/types';
import { DEFAULT_INTERVAL, GRAN_SECONDS, TTL_ANALYSIS_DAILY, TTL_ANALYSIS_INTRADAY, WATCHLIST } from '@/lib/constants';
import { cacheGet, cacheKey, cacheSet } from '@/lib/cache';
import { getCandlesCached, fetchReferenceSeries } from '@/lib/providers';
import { computeStrength } from '@/lib/analysis/strength';
import { analyzeSMC } from '@/lib/analysis/smc';
import { analyzeCRT, analyzeCRTPhase } from '@/lib/analysis/crt';
import { buildIndicators } from '@/lib/analysis/indicators';
import { computeConfluence } from '@/lib/analysis/confluence';
import { pctChange } from '@/lib/utils';

/** Reference rates with TTL cache (hourly; ECB publishes once daily). */
export async function getRatesCached(): Promise<{ source: string; series: import('@/lib/types').RatePoint[]; notes: string[] }> {
  const key = cacheKey('rates', 'eur');
  const hit = await cacheGet<{ source: string; series: import('@/lib/types').RatePoint[]; notes: string[] }>(key);
  if (hit && hit.series && hit.series.length >= 1) return hit;
  const fresh = await fetchReferenceSeries();
  await cacheSet(key, fresh, 3600);
  return fresh;
}

export async function getStrengthCached(): Promise<StrengthResult | null> {
  const key = cacheKey('strength', 'eur');
  const hit = await cacheGet<StrengthResult>(key);
  if (hit && hit.currencies && hit.currencies.length >= 6) return hit;
  try {
    const rates = await getRatesCached();
    const s = computeStrength(rates.series);
    if (s.currencies.length >= 6) {
      await cacheSet(key, s, 1800);
      return s;
    }
    return s;
  } catch {
    return null;
  }
}

export async function analyzePair(
  pair: Pair,
  interval: Granularity,
  strength: StrengthResult | null
): Promise<PairAnalysis> {
  const { source, candles } = await getCandlesCached(pair, interval);
  if (candles.length < 8) {
    throw new Error(`${pair.symbol}: too few candles (${candles.length}) for structure analysis.`);
  }

  const smc = analyzeSMC(candles);
  const crt = analyzeCRT(candles);
  const crtPhase = analyzeCRTPhase(candles);
  const indicators = buildIndicators(candles);
  const confluence = computeConfluence(pair, candles, smc, crt, strength);

  const last = candles[candles.length - 1];
  const granMs = GRAN_SECONDS[interval] * 1000;
  const barsPerHour = Math.max(1, Math.round(3_600_000 / granMs));
  const barsPerDay = Math.max(barsPerHour, Math.round(86_400_000 / granMs));
  const atHourAgo = candles[Math.max(0, candles.length - 1 - barsPerHour)];
  const atDayAgo = candles[Math.max(0, candles.length - 1 - barsPerDay)];

  // ATR(14) via True Range mean, plus a simple volatility regime read.
  let atr: number | null = null;
  if (candles.length >= 15) {
    const trs: number[] = [];
    for (let i = candles.length - 14; i < candles.length; i++) {
      const c = candles[i];
      const p = candles[i - 1];
      trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
    }
    atr = trs.reduce((a, b) => a + b, 0) / 14;
  }

  // Spread estimate from ATR (keyless providers don't expose bid/ask).
  const spread = atr && last.c ? Math.round(atr * 0.3 * 100000) / 100000 : null;

  // Volatility regime from ATR as % of price.
  const atrPct = atr && last.c ? atr / last.c : 0;
  const volatility: 'low' | 'normal' | 'high' = atrPct > 0.008 ? 'high' : atrPct > 0.003 ? 'normal' : 'low';

  return {
    pair,
    interval,
    candles,
    price: last.c,
    change1h: pctChange(atHourAgo.c, last.c),
    change24h: pctChange(atDayAgo.c, last.c),
    atr,
    spread,
    volatility,
    source,
    smc,
    crt,
    crtPhase,
    confluence,
    indicators,
    error: null
  };
}

export async function buildMarketSnapshot(
  interval: Granularity = DEFAULT_INTERVAL
): Promise<Omit<MarketSnapshot, 'cached' | 'ttl'>> {
  const warnings: string[] = [];

  let strength: StrengthResult | null = null;
  try {
    strength = await getStrengthCached();
  } catch (e) {
    warnings.push(`strength: ${e instanceof Error ? e.message : String(e)}`);
  }

  const settled = await Promise.allSettled(WATCHLIST.map((p) => analyzePair(p, interval, strength)));
  const pairs: PairAnalysis[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') pairs.push(s.value);
    else warnings.push(s.reason instanceof Error ? s.reason.message : String(s.reason));
  }
  if (!pairs.length && !strength) {
    throw new Error('No pair data could be produced from any provider.');
  }

  return {
    generatedAt: Date.now() / 1000,
    interval,
    strength,
    pairs,
    warnings
  };
}

export interface CachedSnapshot extends MarketSnapshot {
  cached: boolean;
  ttl: number;
}

/** Snapshot with a shared TTL cache — warms Upstash for serverless instances. */
export async function getSnapshotCached(interval: Granularity = DEFAULT_INTERVAL): Promise<CachedSnapshot> {
  const key = cacheKey('snapshot', interval);
  const ttl = interval === '1d' ? TTL_ANALYSIS_DAILY : TTL_ANALYSIS_INTRADAY;
  const hit = await cacheGet<CachedSnapshot>(key);
  if (hit && hit.pairs && hit.pairs.length) return hit;
  const snap = await buildMarketSnapshot(interval);
  const out: CachedSnapshot = { ...snap, cached: false, ttl };
  await cacheSet(key, out, ttl);
  return out;
}