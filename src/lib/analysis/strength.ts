// ── Currency-strength engine ─────────────────────────────────────────────────
// Full 28-pair cross-matrix summation (no Euro anchor):
//  1. From EUR-based reference rates derive every cross AB (28 pairs).
//  2. Raw % change per pair over 1d / 7d.
//  3. Average each currency's signed changes across the 7 direct pairs it forms
//     (base +, quote − → inversions handled).
//  4. Z-score ACROSS THE 8 CURRENCIES (cross-sectional), then blend 1d/7d.
// EUR's score is the implicit residual → Σ ≈ 0 (relative strength).
// Symbols follow institutional base/quote standards via canonicalPair
// (USDJPY, GBPJPY … — never JPYUSD or USDEUR).

import type { CurrencyStrength, RatePoint, StrengthResult } from '@/lib/types';
import { CURRENCIES, canonicalPair } from '@/lib/constants';
import { clamp, mean, pctChange, stdev } from '@/lib/utils';

export interface CrossPair {
  base: string;
  quote: string;
  symbol: string;
}

export function allCrossPairs(ccies: string[]): CrossPair[] {
  const out: CrossPair[] = [];
  for (let i = 0; i < ccies.length; i++) {
    for (let j = i + 1; j < ccies.length; j++) {
      out.push({ base: ccies[i], quote: ccies[j], symbol: canonicalPair(ccies[i], ccies[j]) });
    }
  }
  return out;
}

function crossRate(pt: RatePoint, base: string, quote: string): number | null {
  const rb = pt.rates[base];
  const rq = pt.rates[quote];
  if (!rb || !rq) return null;
  return rq / rb; // value of 1 unit of base in terms of quote
}

function pointOnOrBefore(series: RatePoint[], target: number): RatePoint | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].t <= target) return series[i];
  }
  return null;
}

function windowChange(series: RatePoint[], pairs: CrossPair[], lookbackSec: number): number[] {
  const last = series[series.length - 1];
  const prev = pointOnOrBefore(series, last.t - lookbackSec);
  if (!prev) return new Array(pairs.length).fill(NaN);
  const out: number[] = [];
  for (const p of pairs) {
    const a = crossRate(prev, p.base, p.quote);
    const b = crossRate(last, p.base, p.quote);
    out.push(pctChange(a ?? NaN, b ?? NaN) ?? NaN);
  }
  return out;
}

function zscores(values: number[]): number[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 4) return values.map(() => 0);
  const sd = stdev(finite);
  if (sd === 0) return values.map(() => 0);
  const m = mean(finite);
  return values.map((v) => (Number.isFinite(v) ? (v - m) / sd : 0));
}

/**
 * Full 28-pair cross-matrix summation: average each currency's raw % changes
 * across the 7 direct pairs it forms (inversions handled via sign).
 */
function perCurrencyMean(changes: number[], pairs: CrossPair[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ccy of CURRENCIES) {
    const vals: number[] = [];
    pairs.forEach((p, idx) => {
      if (p.base !== ccy && p.quote !== ccy) return;
      if (!Number.isFinite(changes[idx])) return;
      const sign = p.base === ccy ? 1 : -1;
      vals.push(changes[idx] * sign);
    });
    out[ccy] = vals.length ? mean(vals) : 0;
  }
  return out;
}

/** Z-score across the 8 per-currency means — the non-anchored baseline. */
function zscoreAcross(byCcy: Record<string, number>): Record<string, number> {
  const vals = CURRENCIES.map((c) => byCcy[c]).filter((v) => Number.isFinite(v));
  const out: Record<string, number> = {};
  if (vals.length < 4) {
    for (const c of CURRENCIES) out[c] = 0;
    return out;
  }
  const sd = stdev(vals);
  const m = mean(vals);
  for (const c of CURRENCIES) {
    out[c] = sd > 0 && Number.isFinite(byCcy[c]) ? (byCcy[c] - m) / sd : 0;
  }
  return out;
}

export function computeStrength(series: RatePoint[]): StrengthResult {
  const notes: string[] = [];
  const currencies: CurrencyStrength[] = [];
  const updatedAt = series.length ? series[series.length - 1].t : Date.now() / 1000;

  const pairs = allCrossPairs(CURRENCIES);

  if (series.length < 2) {
    notes.push('Insufficient rate history — strength unavailable.');
    return { updatedAt, source: 'none', currencies, notes };
  }

  // Raw % change per pair, then per-currency mean across its 7 direct pairs.
  const change1d = windowChange(series, pairs, 86400);
  const change7d = windowChange(series, pairs, 7 * 86400);

  const avg1d = perCurrencyMean(change1d, pairs);
  const avg7d = perCurrencyMean(change7d, pairs);

  // Z-score ACROSS THE 8 CURRENCIES — no isolated Euro anchor.
  const z1 = zscoreAcross(avg1d);
  const z7 = zscoreAcross(avg7d);

  for (const ccy of CURRENCIES) {
    const signed1: number[] = [];
    const signed7: number[] = [];
    pairs.forEach((p, idx) => {
      if (p.base !== ccy && p.quote !== ccy) return;
      const sign = p.base === ccy ? 1 : -1;
      if (Number.isFinite(change1d[idx])) signed1.push(change1d[idx] * sign);
      if (Number.isFinite(change7d[idx])) signed7.push(change7d[idx] * sign);
    });
    const blended = 0.45 * (z1[ccy] ?? 0) + 0.55 * (z7[ccy] ?? 0);
    const score = clamp(blended / 2.4, -1, 1) * 42;
    currencies.push({
      code: ccy,
      score: Math.round(score * 10) / 10,
      delta1d: signed1.length ? Math.round(mean(signed1) * 100) / 100 : 0,
      delta7d: signed7.length ? Math.round(mean(signed7) * 100) / 100 : 0
    });
  }

  currencies.sort((a, b) => b.score - a.score);
  const total = mean(currencies.map((c) => c.score));
  if (Math.abs(total) > 0.5) notes.push('Residual imbalance in strength decomposition.');
  return { updatedAt, source: 'frankfurter', currencies, notes };
}