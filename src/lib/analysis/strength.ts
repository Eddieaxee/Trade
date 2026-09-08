// ── Currency-strength engine ─────────────────────────────────────────────────
// Method: from a series of EUR-based reference rates derive the full cross
// matrix (8 currencies → 28 pairs). Percent-change per pair over 1d / 7d is
// z-scored *across pairs* (removes the common forex drift), then each currency
// receives the mean of its signed pair scores (base sign +, quote sign −).
// EUR's score is the implicit residual → sum of scores ≈ 0 (relative strength).

import type { CurrencyStrength, RatePoint, StrengthResult } from '@/lib/types';
import { CURRENCIES } from '@/lib/constants';
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
      out.push({ base: ccies[i], quote: ccies[j], symbol: ccies[i] + ccies[j] });
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

export function computeStrength(series: RatePoint[]): StrengthResult {
  const notes: string[] = [];
  const currencies: CurrencyStrength[] = [];
  const updatedAt = series.length ? series[series.length - 1].t : Date.now() / 1000;

  const pairs = allCrossPairs(CURRENCIES);

  if (series.length < 2) {
    notes.push('Insufficient rate history — strength unavailable.');
    return { updatedAt, source: 'none', currencies, notes };
  }

  const change1d = windowChange(series, pairs, 86400);
  const change7d = windowChange(series, pairs, 7 * 86400);
  const z1d = zscores(change1d);
  const z7d = zscores(change7d);

  for (const ccy of CURRENCIES) {
    const z1: number[] = [];
    const z7: number[] = [];
    const d1: number[] = [];
    const d7: number[] = [];
    pairs.forEach((p, idx) => {
      if (p.base !== ccy && p.quote !== ccy) return;
      const sign = p.base === ccy ? 1 : -1;
      z1.push(z1d[idx] * sign);
      z7.push(z7d[idx] * sign);
      if (Number.isFinite(change1d[idx])) d1.push(change1d[idx] * sign);
      if (Number.isFinite(change7d[idx])) d7.push(change7d[idx] * sign);
    });
    if (!z1.length) continue;
    const blended = 0.45 * mean(z1) + 0.55 * mean(z7);
    const score = clamp(blended / 2.4, -1, 1) * 42;
    currencies.push({
      code: ccy,
      score: Math.round(score * 10) / 10,
      delta1d: Math.round(mean(d1) * 100) / 100,
      delta7d: Math.round(mean(d7) * 100) / 100
    });
  }

  currencies.sort((a, b) => b.score - a.score);
  const total = mean(currencies.map((c) => c.score));
  if (Math.abs(total) > 0.5) notes.push('Residual imbalance in strength decomposition.');
  return { updatedAt, source: 'frankfurter', currencies, notes };
}