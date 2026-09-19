// ── Currency-strength engine ─────────────────────────────────────────────────
// Full 28-pair all-against-all pairwise engine (no Euro anchor, no z-scores):
//  1. From EUR-based reference rates derive every cross AB (28 pairs).
//  2. Raw % change per pair over 1d / 7d.
//  3. For each currency, its score is the average of its signed % change in ALL
//     7 direct crosses it forms, each measured against the OTHER currency
//     directly (base +, quote − → inversions handled). Every currency is
//     therefore measured against every other currency — an explicit
//     all-against-all comparison, not an index and not a z-score.
//  4. Blended score = 0.45 × 1d + 0.55 × 7d raw % average, displayed on a
//     fixed linear scale (×40, clamped ±42) so numbers stay readable.
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

/**
 * Average each currency's raw % changes across the 7 direct pairs it forms
 * (inversions handled via sign).
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

/**
 * Explicit all-against-all pairwise average: build the full 28-pair change
 * matrix from the per-currency changes (ch(AB) = ch(A) − ch(B) in log terms,
 * exact for these move sizes), then average each currency's signed change
 * across its 7 direct crosses. No normalization, no z-scores — raw %.
 */
export function pairwiseScores(byCcy: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of CURRENCIES) {
    const vals: number[] = [];
    for (const b of CURRENCIES) {
      if (a === b) continue;
      const ca = byCcy[a];
      const cb = byCcy[b];
      if (!Number.isFinite(ca) || !Number.isFinite(cb)) continue;
      vals.push(ca - cb); // signed % change of A against B
    }
    out[a] = vals.length ? mean(vals) : 0;
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

  // Raw % change per pair, then the explicit all-against-all pairwise average.
  const change1d = windowChange(series, pairs, 86400);
  const change7d = windowChange(series, pairs, 7 * 86400);
  const change30d = windowChange(series, pairs, 30 * 86400);
  const change3d = windowChange(series, pairs, 3 * 86400);

  const raw1d = perCurrencyMean(change1d, pairs);
  const raw7d = perCurrencyMean(change7d, pairs);
  const raw30d = perCurrencyMean(change30d, pairs);
  const raw3d = perCurrencyMean(change3d, pairs);

  // All-against-all comparison across every other currency — raw %, no z-score.
  const pw1 = pairwiseScores(raw1d);
  const pw7 = pairwiseScores(raw7d);
  const pw30 = pairwiseScores(raw30d);
  const pw3 = pairwiseScores(raw3d);

  // Volatility: std-dev of the last 10 daily all-against-all scores per currency.
  const vol10: Record<string, number | null> = {};
  {
    const dailyScores: Record<string, number[]> = {};
    for (const c of CURRENCIES) dailyScores[c] = [];
    const days = Math.min(11, series.length - 1);
    for (let d = 1; d <= days; d++) {
      const win = windowChange(series.slice(0, series.length - d + 1), pairs, 86400);
      const pm = perCurrencyMean(win, pairs);
      const pw = pairwiseScores(pm);
      for (const c of CURRENCIES) dailyScores[c].push(pw[c]);
    }
    for (const c of CURRENCIES) {
      const vals = dailyScores[c];
      vol10[c] = vals.length >= 4 ? stdev(vals) : null;
    }
  }

  // Breadth: of the 7 direct crosses, how many moved in this currency's favour over 7d.
  const breadth: Record<string, number | null> = {};
  for (const ccy of CURRENCIES) {
    let wins = 0;
    let n = 0;
    pairs.forEach((p, idx) => {
      if (p.base !== ccy && p.quote !== ccy) return;
      const ch = change7d[idx];
      if (!Number.isFinite(ch)) return;
      n++;
      if ((p.base === ccy && ch > 0) || (p.quote === ccy && ch < 0)) wins++;
    });
    breadth[ccy] = n ? wins : null;
  }

  for (const ccy of CURRENCIES) {
    const signed1: number[] = [];
    const signed7: number[] = [];
    pairs.forEach((p, idx) => {
      if (p.base !== ccy && p.quote !== ccy) return;
      const sign = p.base === ccy ? 1 : -1;
      if (Number.isFinite(change1d[idx])) signed1.push(change1d[idx] * sign);
      if (Number.isFinite(change7d[idx])) signed7.push(change7d[idx] * sign);
    });
    const blended = 0.45 * (pw1[ccy] ?? 0) + 0.55 * (pw7[ccy] ?? 0);
    const score = clamp(blended * 40, -42, 42); // fixed linear display scale
    currencies.push({
      code: ccy,
      score: Math.round(score * 10) / 10,
      delta1d: signed1.length ? Math.round(mean(signed1) * 100) / 100 : 0,
      delta7d: signed7.length ? Math.round(mean(signed7) * 100) / 100 : 0,
      delta30d: Number.isFinite(pw30[ccy]) ? Math.round(pw30[ccy] * 100) / 100 : null,
      momentum3d: Number.isFinite(pw3[ccy]) ? Math.round(pw3[ccy] * 100) / 100 : null,
      vol10: vol10[ccy] !== null ? Math.round((vol10[ccy] as number) * 100) / 100 : null,
      breadth: breadth[ccy]
    });
  }

  currencies.sort((a, b) => b.score - a.score);
  const total = mean(currencies.map((c) => c.score));
  if (Math.abs(total) > 0.5) notes.push('Residual imbalance in strength decomposition.');
  return { updatedAt, source: 'frankfurter', currencies, notes };
}