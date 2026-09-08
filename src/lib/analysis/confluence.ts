// ── Technical confluence: weighted agreement of strength + SMC + CRT + momentum

import type { Candle, Confluence, ConfluenceFactor, CRT, Pair, SMC, StrengthResult } from '@/lib/types';
import { clamp } from '@/lib/utils';

export function confluenceLabel(score: number): string {
  if (score >= 60) return 'Strong long';
  if (score >= 30) return 'Long';
  if (score >= 10) return 'Lean long';
  if (score <= -60) return 'Strong short';
  if (score <= -30) return 'Short';
  if (score <= -10) return 'Lean short';
  return 'Neutral';
}

function strengthDelta(pair: Pair, strength: StrengthResult | null): { s: number; note: string } {
  if (!strength || !strength.currencies.length) {
    return { s: 0, note: 'Strength feed unavailable.' };
  }
  const base = strength.currencies.find((c) => c.code === pair.base);
  const quote = strength.currencies.find((c) => c.code === pair.quote);
  if (!base || !quote) return { s: 0, note: 'Pair currencies missing from strength matrix.' };
  const delta = base.score - quote.score; // -84..84 typical
  return {
    s: clamp(delta / 40, -1, 1),
    note: `${pair.base} ${base.score > 0 ? '+' : ''}${base.score.toFixed(1)} vs ${pair.quote} ${quote.score > 0 ? '+' : ''}${quote.score.toFixed(1)}`
  };
}

function candleDrift(candles: Candle[]): { s: number; pct: number | null } {
  if (candles.length < 4) return { s: 0, pct: null };
  const a = candles[candles.length - 4].o;
  const b = candles[candles.length - 1].c;
  const pct = ((b - a) / a) * 100;
  return { s: clamp(pct / 0.35, -1, 1), pct };
}

export function computeConfluence(
  pair: Pair,
  candles: Candle[],
  smc: SMC,
  crt: CRT,
  strength: StrengthResult | null
): Confluence {
  const factors: ConfluenceFactor[] = [];

  // 1 ── macro: relative currency strength delta
  const sd = strengthDelta(pair, strength);
  factors.push({ key: 'strength', label: 'Currency strength', score: sd.s, weight: 0.3, note: sd.note });

  // 2 ── structure: SMC bias
  factors.push({
    key: 'smc',
    label: 'SMC structure',
    score: smc.score / 100,
    weight: 0.3,
    note: `${smc.trendLabel}; ${smc.bias} bias ${smc.score > 0 ? '+' : ''}${smc.score}`
  });

  // 3 ── momentum: trailing candle drift
  const drift = candleDrift(candles);
  factors.push({
    key: 'momentum',
    label: 'Recent momentum',
    score: drift.s,
    weight: 0.15,
    note: drift.pct === null ? 'Insufficient candles.' : `${drift.pct > 0 ? '+' : ''}${drift.pct.toFixed(2)}% over last 3 bars`
  });

  // 4 ── CRT state
  factors.push({
    key: 'crt',
    label: 'Candle range theory',
    score: crt.score / 100,
    weight: 0.15,
    note: `${crt.rangeMode.toUpperCase()} range, ${crt.expansion ? 'expanding' : crt.contraction ? 'contracting' : 'steady'}, ${(crt.bodyStrength * 100).toFixed(0)}% body`
  });

  // 5 ── nearby order-block liquidity
  let liqNote = 'No recent order blocks near price.';
  let liqS = 0;
  const last = candles.length ? candles[candles.length - 1].c : 0;
  if (last) {
    const sells = smc.orderBlocks.filter((b) => b.side === 'sell' && !b.removed);
    const buys = smc.orderBlocks.filter((b) => b.side === 'buy' && !b.removed);
    const bestSell = sells.map((b) => Math.abs(b.price - last) / last).reduce((a, c) => Math.min(a, c), Infinity);
    const bestBuy = buys.map((b) => Math.abs(b.price - last) / last).reduce((a, c) => Math.min(a, c), Infinity);
    if (Number.isFinite(bestSell) && Number.isFinite(bestBuy)) {
      if (bestSell < bestBuy && bestSell < 0.004) {
        liqS = -0.8;
        liqNote = `Supply block ${(bestSell * 100).toFixed(2)}% overhead — rejection risk.`;
      } else if (bestBuy < bestSell && bestBuy < 0.004) {
        liqS = 0.8;
        liqNote = `Demand block ${(bestBuy * 100).toFixed(2)}% below — bid support.`;
      } else if (bestSell < 0.006 || bestBuy < 0.006) {
        liqS = (bestBuy < bestSell ? 1 : -1) * 0.25;
        liqNote = `Order liquidity within 0.6% (${bestBuy < bestSell ? 'buy' : 'sell'} side).`;
      }
    }
  }
  factors.push({ key: 'liquidity', label: 'Order-block proximity', score: liqS, weight: 0.1, note: liqNote });

  const totalW = factors.reduce((a, f) => a + f.weight, 0);
  const raw = factors.reduce((a, f) => a + f.score * f.weight, 0) / totalW;
  const score = clamp(Math.round(raw * 100), -100, 100);

  // Support / resistance from swing-based zones.
  const price = candles.length ? candles[candles.length - 1].c : 0;
  let support: number | null = null;
  let resistance: number | null = null;
  if (price) {
    const below = smc.demandZones.filter(([, hi]) => hi < price);
    const above = smc.supplyZones.filter(([lo]) => lo > price);
    if (below.length) support = below[below.length - 1][1];
    if (above.length) resistance = above[0][0];
  }

  return {
    score,
    label: confluenceLabel(score),
    factors,
    support: support ? Math.round(support * 100000) / 100000 : null,
    resistance: resistance ? Math.round(resistance * 100000) / 100000 : null
  };
}