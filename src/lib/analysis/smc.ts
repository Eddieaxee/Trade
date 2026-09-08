// ── SMC analysis: swings, BOS / CHoCH, order blocks, liquidity, stop hunts ──

import type { Candle, LiquidityZone, OrderBlock, SMC, StopHunt, StructureEvent, Swing } from '@/lib/types';
import { SWING_ARMS } from '@/lib/constants';
import { clamp } from '@/lib/utils';

export function detectSwings(candles: Candle[], arm = SWING_ARMS): Swing[] {
  const out: Swing[] = [];
  const n = candles.length;
  for (let i = arm; i < n - arm; i++) {
    let high = true;
    let low = true;
    for (let k = 1; k <= arm; k++) {
      if (!(candles[i].h >= candles[i - k].h && candles[i].h >= candles[i + k].h)) high = false;
      if (!(candles[i].l <= candles[i - k].l && candles[i].l <= candles[i + k].l)) low = false;
      if (!high && !low) break;
    }
    if (high) out.push({ t: candles[i].t, price: candles[i].h, kind: 'high', index: i });
    if (low) out.push({ t: candles[i].t, price: candles[i].l, kind: 'low', index: i });
  }
  // Merge consecutive same-kind pivots, keeping the more extreme one.
  const merged: Swing[] = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(s);
      continue;
    }
    if (last.kind !== s.kind) {
      merged.push(s);
      continue;
    }
    const better =
      (s.kind === 'high' && s.price >= last.price) ||
      (s.kind === 'low' && s.price <= last.price);
    if (better) merged[merged.length - 1] = s;
  }
  return merged;
}

function decay(ageSec: number, halfLifeHours = 24): number {
  return Math.exp(-ageSec / (halfLifeHours * 3600));
}

function trendOf(swings: Swing[]): { trend: SMC['trend']; label: string } {
  const highs = swings.filter((s) => s.kind === 'high');
  const lows = swings.filter((s) => s.kind === 'low');
  if (highs.length < 2 || lows.length < 2) return { trend: 'ranging', label: 'Building structure' };
  const [h1, h2] = [highs[highs.length - 2], highs[highs.length - 1]];
  const [l1, l2] = [lows[lows.length - 2], lows[lows.length - 1]];
  const higherHigh = h2.price > h1.price;
  const higherLow = l2.price > l1.price;
  if (higherHigh && higherLow) return { trend: 'bullish', label: 'Bullish (HH / HL)' };
  if (!higherHigh && !higherLow) return { trend: 'bearish', label: 'Bearish (LH / LL)' };
  if (higherHigh) return { trend: 'bullish', label: 'Lean bullish (HH / LL)' };
  return { trend: 'bearish', label: 'Lean bearish (LH / HL)' };
}

function lastEvents(
  swings: Swing[]
): { lastBOS: StructureEvent | null; lastCHoCH: StructureEvent | null; regime: 'bullish' | 'bearish' } {
  let structureHigh: Swing | null = null;
  let structureLow: Swing | null = null;
  let regime: 'bullish' | 'bearish' = 'bearish';
  let lastBOS: StructureEvent | null = null;
  let lastCHoCH: StructureEvent | null = null;

  for (const s of swings) {
    if (s.kind === 'high') {
      if (!structureHigh || s.price > structureHigh.price) {
        lastBOS = { t: s.t, price: s.price, direction: 'up', kind: 'bos', label: 'BOS ↑' };
        regime = 'bullish';
        structureHigh = s;
      } else if (regime === 'bullish' && lastBOS && lastBOS.direction === 'up') {
        lastCHoCH = { t: s.t, price: s.price, direction: 'down', kind: 'choch', label: 'CHoCH ↓' };
      }
    } else {
      if (!structureLow || s.price < structureLow.price) {
        lastBOS = { t: s.t, price: s.price, direction: 'down', kind: 'bos', label: 'BOS ↓' };
        regime = 'bearish';
        structureLow = s;
      } else if (regime === 'bearish' && lastBOS && lastBOS.direction === 'down') {
        lastCHoCH = { t: s.t, price: s.price, direction: 'up', kind: 'choch', label: 'CHoCH ↑' };
      }
    }
  }
  return { lastBOS, lastCHoCH, regime };
}
function orderBlocks(
  candles: Candle[],
  swings: Swing[]
): {
  blocks: OrderBlock[];
  demandZones: Array<[number, number]>;
  supplyZones: Array<[number, number]>;
} {
  const blocks: OrderBlock[] = [];
  const n = candles.length;
  for (const s of swings) {
    if (s.kind === 'high') {
      for (let j = s.index - 1; j >= Math.max(0, s.index - 8); j--) {
        const c = candles[j];
        if (c.c < c.o) {
          blocks.push({ t: c.t, price: (c.o + c.c) / 2, side: 'sell', removed: false });
          break;
        }
      }
    } else {
      for (let j = s.index - 1; j >= Math.max(0, s.index - 8); j--) {
        const c = candles[j];
        if (c.c > c.o) {
          blocks.push({ t: c.t, price: (c.o + c.c) / 2, side: 'buy', removed: false });
          break;
        }
      }
    }
  }
  // Mark blocks as removed when price later trades through them.
  for (const b of blocks) {
    if (b.side === 'sell' && n > 0 && candles[n - 1].h > b.price * 1.0006) b.removed = true;
    else if (b.side === 'buy' && n > 0 && candles[n - 1].l < b.price * 0.9994) b.removed = true;
  }

  const band = (prices: number[]): Array<[number, number]> => {
    if (!prices.length) return [];
    const zones: Array<[number, number]> = [];
    for (const p of prices) {
      const z = zones.find(([lo, hi]) => p >= lo * 0.999 && p <= hi * 1.001);
      if (z) {
        if (p < z[0]) z[0] = p;
        else if (p > z[1]) z[1] = p;
      } else {
        zones.push([p, p]);
      }
    }
    return zones.sort((a, b) => a[0] - b[0]);
  };

  return {
    blocks,
    demandZones: band(swings.filter((s) => s.kind === 'low').map((s) => s.price)),
    supplyZones: band(swings.filter((s) => s.kind === 'high').map((s) => s.price))
  };
}

function liquidityZones(
  candles: Candle[],
  swings: Swing[]
): { zones: LiquidityZone[]; hunts: StopHunt[] } {
  const zones: LiquidityZone[] = [];
  const hunts: StopHunt[] = [];
  const tol = 0.0008;

  const clusters: Array<{ price: number; count: number; kind: 'buy' | 'sell'; t: number }> = [];
  for (const s of swings) {
    const kind = s.kind === 'high' ? 'sell' : 'buy'; // sell liquidity rests above highs
    const c = clusters.find((x) => x.kind === kind && Math.abs(x.price - s.price) / s.price <= tol);
    if (c) {
      c.price = (c.price * c.count + s.price) / (c.count + 1);
      c.count += 1;
      c.t = Math.max(c.t, s.t);
    } else {
      clusters.push({ price: s.price, count: 1, kind, t: s.t });
    }
  }

  const lastT = candles.length ? candles[candles.length - 1].t : 0;
  for (const c of clusters) {
    if (c.count < 2) continue;
    const age = Math.max(0, lastT - c.t);
    const weight = Math.round(c.count * decay(age, 336));
    if (weight <= 0) continue;
    zones.push({
      price: c.price,
      weight,
      side: c.kind === 'sell' ? 'above' : 'below',
      label: c.kind === 'sell' ? `${c.count}× highs` : `${c.count}× lows`
    });
  }

  // Stop hunts: thrust through a swing extreme that closes back inside.
  for (const s of swings) {
    if (s.kind === 'high') {
      for (let j = s.index + 1; j < Math.min(candles.length, s.index + 7); j++) {
        const c = candles[j];
        if (c.h > s.price * 1.0008 && c.c < s.price) {
          hunts.push({ t: c.t, price: s.price, side: 'high' });
          break;
        }
      }
    } else {
      for (let j = s.index + 1; j < Math.min(candles.length, s.index + 7); j++) {
        const c = candles[j];
        if (c.l < s.price * 0.9992 && c.c > s.price) {
          hunts.push({ t: c.t, price: s.price, side: 'low' });
          break;
        }
      }
    }
  }
  return { zones, hunts: hunts.slice(-6) };
}
export function analyzeSMC(candles: Candle[]): SMC {
  const notes: string[] = [];
  const swings = detectSwings(candles);
  const lastC = candles.length ? candles[candles.length - 1] : null;
  const lastT = lastC?.t ?? Date.now() / 1000;

  const { trend, label } = trendOf(swings);
  const { lastBOS, lastCHoCH, regime } = lastEvents(swings);
  const { blocks, demandZones, supplyZones } = orderBlocks(candles, swings);
  const { zones: liquidity, hunts: stopHunts } = liquidityZones(candles, swings);

  const swingHighs = swings.filter((s) => s.kind === 'high').map((s) => s.price);
  const swingLows = swings.filter((s) => s.kind === 'low').map((s) => s.price);

  // ── Score / bias ───────────────────────────────────────────────────────────
  let score = 0;
  score += trend === 'bullish' ? 35 : trend === 'bearish' ? -35 : 0;

  const evW = (e: StructureEvent | null, dir: 'up' | 'down', w: number): number =>
    e && e.direction === dir ? w * decay(Math.max(0, lastT - e.t), 48) : 0;

  score += evW(lastBOS, 'up', 30) - evW(lastBOS, 'down', 30);
  if (lastCHoCH) {
    const w = 20 * decay(Math.max(0, lastT - lastCHoCH.t), 48);
    score += lastCHoCH.direction === 'down' ? -w : w;
  }

  if (lastC) {
    const top = Math.max(...swingHighs.slice(-2), -Infinity);
    const bot = Math.min(...swingLows.slice(-2), Infinity);
    if (Number.isFinite(top) && lastC.c > top) score += 15;
    if (Number.isFinite(bot) && lastC.c < bot) score -= 15;
  }

  if (lastC) {
    const nearestDemand = demandZones.length ? demandZones[demandZones.length - 1][1] : undefined;
    const nearestSupply = supplyZones.length ? supplyZones[0][0] : undefined;
    if (nearestDemand !== undefined && Math.abs(lastC.c - nearestDemand) / lastC.c <= 0.012) {
      score += 10;
      notes.push(`Sitting on demand zone ${nearestDemand.toFixed(5)} — defendable bid support.`);
    }
    if (nearestSupply !== undefined && Math.abs(lastC.c - nearestSupply) / lastC.c <= 0.012) {
      score -= 10;
      notes.push(`Capped by supply zone ${nearestSupply.toFixed(5)} — offer pressure above.`);
    }
  }
  if (stopHunts.length) {
    notes.push(`Sweeps: ${stopHunts.length} stop-hunt${stopHunts.length > 1 ? 's' : ''} near swing extremes.`);
  }

  score = clamp(score, -100, 100);
  const bias: SMC['bias'] = score >= 18 ? 'long' : score <= -18 ? 'short' : 'neutral';

  if (lastBOS) notes.push(`Last Break of Structure ${lastBOS.direction === 'up' ? '↑' : '↓'} @ ${lastBOS.price.toFixed(5)}.`);
  if (lastCHoCH) notes.push(`Last Change of Character ${lastCHoCH.direction === 'up' ? '↑' : '↓'} @ ${lastCHoCH.price.toFixed(5)} — momentum shift.`);
  if (regime === 'bullish' && !lastCHoCH) notes.push('Buyers in control; structure intact above.');
  if (regime === 'bearish' && !lastCHoCH) notes.push('Sellers in control; structure intact below.');

  return {
    trend,
    bias,
    score: Math.round(score),
    trendLabel: label,
    lastBOS,
    lastCHoCH,
    swingHighs,
    swingLows,
    orderBlocks: blocks,
    demandZones,
    supplyZones,
    liquidity,
    stopHunts,
    notes
  };
}