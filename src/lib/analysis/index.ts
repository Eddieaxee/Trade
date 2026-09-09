// ── Analysis orchestration imports ────────────────────────────────────────────

import type { Confluence, Granularity, MarketSnapshot, Pair, PairAnalysis, SMC, StrengthResult, TradePlan } from '@/lib/types';
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

  // ── Suggested trade plan (informational only) — ATR risk + structure targets ──
  const tradePlan = buildTradePlan(pair, last.c, atr, confluence, smc, interval);

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
    tradePlan,
    error: null
  };
}

/**
 * Deterministic, structure-aware plan sketch with REALISTIC geometry:
 *  - direction from the overall confluence score (|score| ≥ 15 only),
 *  - risk bounded between 1×ATR and 2×ATR, widened only by swings in the
 *    recent window (last 40 bars) so stops never land absurdly far away,
 *  - every target pays ≥ 1:2 risk-to-reward (2R / 3R / 4R),
 *  - R:R quoted per target. Not advice — a starting sketch a user may ignore.
 */
function buildTradePlan(
  _pair: Pair,
  price: number,
  atr: number | null,
  confluence: Confluence,
  smc: SMC,
  interval: Granularity
): TradePlan | null {
  if (!price || !atr) return null;
  const score = confluence.score;
  if (Math.abs(score) < 15) return null; // no edge — refuse to invent one
  const dir: 'long' | 'short' = score > 0 ? 'long' : 'short';

  // Risk distance: 1.5×ATR baseline, hard-bounded to [1×ATR, 2×ATR], then
  // widened ONLY if a *recent* opposing swing (within the last 40 bars) sits
  // closer than the baseline — never by swings from days of history.
  let risk = atr * 1.5;
  const cutoff = Date.now() / 1000 - GRAN_SECONDS[interval] * 40;
  const recent = smc.swingLabels.filter((p) => p.t >= cutoff);
  const opposing = recent
    .filter((p) => (dir === 'long' ? p.kind === 'low' && p.price < price : p.kind === 'high' && p.price > price))
    .map((p) => p.price);
  if (opposing.length) {
    const nearest = dir === 'long' ? Math.max(...opposing) : Math.min(...opposing);
    const swingRisk = dir === 'long' ? price - nearest + atr * 0.25 : nearest - price + atr * 0.25;
    risk = Math.min(Math.max(risk, swingRisk), atr * 2);
  }
  risk = Math.max(atr, Math.min(risk, atr * 2));
  risk = Math.round(risk * 1e5) / 1e5;

  const sign = dir === 'long' ? 1 : -1;
  const snap = (v: number) => Math.round(v * 1e5) / 1e5;
  const stop = snap(price - sign * risk);
  // Minimum 1:2 RR — first target pays 2R, then 3R and 4R.
  const tps = [2, 3, 4].map((m) => snap(price + sign * risk * m));
  const rr = (tp: number) => Math.round((Math.abs(tp - price) / risk) * 100) / 100;

  // Retest entry zone: nearest confluence S/R if within 0.75×ATR, else ±0.25×ATR.
  const sr = dir === 'long' ? confluence.support : confluence.resistance;
  const zoneHalf = Math.min(atr * 0.25, risk * 0.2);
  const zoneCenter = sr && Math.abs(sr - price) < atr * 0.75 ? (price + sr) / 2 : price;
  const entryZoneLow = snap(Math.min(zoneCenter - zoneHalf, zoneCenter + zoneHalf));
  const entryZoneHigh = snap(Math.max(zoneCenter - zoneHalf, zoneCenter + zoneHalf));

  const conf = Math.min(95, Math.round(Math.abs(score)));
  const basis =
    `Confluence ${score > 0 ? '+' : ''}${score} (${confluence.label}) on ${interval} → ${dir}. ` +
    `Risk ${ (risk / atr).toFixed(1) }×ATR (${risk.toFixed(5)}), stop beyond the nearest recent opposing swing, ` +
    `targets at 2R / 3R / 4R (min 1:2 RR)` +
    (sr ? `, entry zone centered on the ${dir === 'long' ? 'support' : 'resistance'} ${sr.toFixed(5)}` : '') +
    '. Informational sketch — not financial advice.';

  return {
    direction: dir,
    confidence: conf,
    entry: snap(price),
    entryZoneLow,
    entryZoneHigh,
    stopLoss: stop,
    tp1: tps[0],
    tp2: tps[1],
    tp3: tps[2],
    rr1: rr(tps[0]),
    rr2: rr(tps[1]),
    rr3: rr(tps[2]),
    basis
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