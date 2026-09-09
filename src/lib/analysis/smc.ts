// ── SMC analysis: swings, BOS / CHoCH, order blocks, liquidity, stop hunts ──

import type {
  BreakerBlock, Candle, Displacement, EqualLevel, LiquidityZone, OrderBlock,
  PremiumDiscount, PrevHL, SMC, StopHunt, StructureEvent, Swing, SwingLabel
} from '@/lib/types';
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

/** Fractal classification: HH / HL / LH / LL vs the previous same-kind swing. */
export function labelSwings(swings: Swing[], ranges?: number[]): SwingLabel[] {
  const out: SwingLabel[] = [];
  let prevHigh: number | null = null;
  let prevLow: number | null = null;
  const rangeScale = ranges && ranges.length ? (() => {
    const s = [...ranges].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] || 1;
  })() : null;

  const strength = (from: number | null, to: number, kind: 'high' | 'low'): 'strong' | 'moderate' | 'weak' => {
    if (from === null || !rangeScale) return 'moderate';
    const move = kind === 'high' ? to - from : from - to;
    const ratio = move / (rangeScale || 1);
    if (ratio >= 1.5) return 'strong';
    if (ratio <= 0.6) return 'weak';
    return 'moderate';
  };

  for (const s of swings) {
    if (s.kind === 'high') {
      out.push({ ...s, label: prevHigh === null ? 'HH' : s.price > prevHigh ? 'HH' : 'LH', strength: strength(prevHigh, s.price, 'high') });
      prevHigh = s.price;
    } else {
      out.push({ ...s, label: prevLow === null ? 'HL' : s.price < prevLow ? 'LL' : 'HL', strength: strength(prevLow, s.price, 'low') });
      prevLow = s.price;
    }
  }
  return out;
}

/** Equal highs / lows: swing extremes clustered within tolerance (EQH / EQL pools). */
export function equalLevels(
  swings: Swing[],
  lastPrice: number,
  tolPct = 0.0006
): { eqh: EqualLevel[]; eql: EqualLevel[] } {
  const build = (kind: 'EQH' | 'EQL'): EqualLevel[] => {
    const pts = swings.filter((s) => (kind === 'EQH' ? s.kind === 'high' : s.kind === 'low'));
    const out: EqualLevel[] = [];
    for (const p of pts) {
      const hit = out.find((e) => Math.abs(e.price - p.price) / p.price <= tolPct);
      if (hit) {
        hit.price = (hit.price * hit.touches + p.price) / (hit.touches + 1);
        hit.touches += 1;
      } else {
        out.push({ price: p.price, touches: 1, kind, side: p.price > lastPrice ? 'above' : 'below' });
      }
    }
    return out
      .filter((e) => e.touches >= 2)
      .sort((a, b) => (kind === 'EQH' ? b.price - a.price : a.price - b.price));
  };
  return { eqh: build('EQH'), eql: build('EQL') };
}

/** Displacement candles: dominant-body thrusts larger than the median range. */
export function detectDisplacement(candles: Candle[], lookback = 120): Displacement[] {
  if (candles.length < 20) return [];
  const win = candles.slice(-lookback);
  const sorted = [...win].map((c) => c.h - c.l).sort((a, b) => a - b);
  const medRange = sorted[Math.floor(sorted.length / 2)] || 1;
  const out: Displacement[] = [];
  for (const c of win) {
    const range = c.h - c.l;
    const body = Math.abs(c.c - c.o);
    if (range <= 0) continue;
    const bodyPct = body / range;
    const sizePct = body / medRange;
    if (bodyPct >= 0.7 && sizePct >= 1.8) {
      out.push({
        t: c.t,
        direction: c.c > c.o ? 'up' : 'down',
        bodyPct: Math.round(bodyPct * 100) / 100,
        sizePct: Math.round(sizePct * 10) / 10
      });
    }
  }
  return out.slice(-6);
}

/** Premium / discount split of the active dealing range. */
export function premiumDiscount(candles: Candle[], lookback = 60): PremiumDiscount | null {
  if (!candles.length) return null;
  const win = candles.slice(-lookback);
  const high = Math.max(...win.map((c) => c.h));
  const low = Math.min(...win.map((c) => c.l));
  if (high === low) return null;
  const c = candles[candles.length - 1].c;
  const pos = (c - low) / (high - low);
  return {
    high,
    low,
    eq: (high + low) / 2,
    posPct: Math.round(pos * 1000) / 1000,
    zone: pos > 0.55 ? 'premium' : pos < 0.45 ? 'discount' : 'equilibrium'
  };
}

/** Previous day / week high & low, bucketed from any candle granularity (UTC). */
export function prevDayWeek(candles: Candle[], nowT: number): PrevHL[] {
  const DAY = 86400;
  const dayKey = (t: number): number => Math.floor(t / DAY);
  // Epoch week boundary (1970-01-01 = Thursday) — consistent weekly buckets.
  const weekKey = (t: number): number => Math.floor((t + 345600) / (7 * DAY));
  const db = new Map<number, { h: number; l: number }>();
  const wb = new Map<number, { h: number; l: number }>();
  for (const c of candles) {
    const dk = dayKey(c.t);
    const d = db.get(dk);
    if (!d) db.set(dk, { h: c.h, l: c.l });
    else {
      d.h = Math.max(d.h, c.h);
      d.l = Math.min(d.l, c.l);
    }
    const wk = weekKey(c.t);
    const w = wb.get(wk);
    if (!w) wb.set(wk, { h: c.h, l: c.l });
    else {
      w.h = Math.max(w.h, c.h);
      w.l = Math.min(w.l, c.l);
    }
  }
  const out: PrevHL[] = [];
  const pd = db.get(dayKey(nowT) - 1);
  if (pd) {
    out.push({ label: 'PDH', price: pd.h, t: 0 }, { label: 'PDL', price: pd.l, t: 0 });
  }
  const pw = wb.get(weekKey(nowT) - 1);
  if (pw) {
    out.push({ label: 'PWH', price: pw.h, t: 0 }, { label: 'PWL', price: pw.l, t: 0 });
  }
  return out;
}

/** Market Structure Shift: full-body close through the most recent opposing swing. */
export function detectMSS(
  candles: Candle[],
  swings: Swing[],
  regime: 'bullish' | 'bearish'
): StructureEvent | null {
  let last: StructureEvent | null = null;
  let refHigh: Swing | null = null;
  let refLow: Swing | null = null;
  let si = 0;
  for (let i = 0; i < candles.length; i++) {
    while (si < swings.length && swings[si].index <= i) {
      const s = swings[si++];
      if (s.kind === 'high') refHigh = s;
      else refLow = s;
    }
    const c = candles[i];
    if (regime === 'bullish' && refLow && c.c < refLow.price) {
      last = { t: c.t, price: refLow.price, direction: 'down', kind: 'mss', label: 'MSS ↓' };
    } else if (regime === 'bearish' && refHigh && c.c > refHigh.price) {
      last = { t: c.t, price: refHigh.price, direction: 'up', kind: 'mss', label: 'MSS ↑' };
    }
  }
  return last;
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
  const swingLabels = labelSwings(swings, candles.map((c) => c.h - c.l));
  const { eqh, eql } = equalLevels(swings, lastC?.c ?? 0);
  const lastMSS = detectMSS(candles, swings, regime);
  const displacement = detectDisplacement(candles);
  const pd = premiumDiscount(candles);
  const prevHL = candles.length >= 30 ? prevDayWeek(candles, lastT) : [];

  // Breaker / mitigation blocks: invalidated order blocks flip polarity.
  const breakers: BreakerBlock[] = blocks
    .filter((b) => b.removed)
    .slice(-4)
    .map((b) => ({
      t: b.t,
      price: b.price,
      side: (b.side === 'buy' ? 'sell' : 'buy') as 'buy' | 'sell',
      origin: (b.side === 'buy' ? 'bullish-ob' : 'bearish-ob') as 'bullish-ob' | 'bearish-ob'
    }));

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
  if (lastMSS) {
    const w = 14 * decay(Math.max(0, lastT - lastMSS.t), 36);
    score += lastMSS.direction === 'down' ? -w : w;
  }

  const lastDisp = displacement.length ? displacement[displacement.length - 1] : null;
  if (lastDisp && lastT - lastDisp.t <= 4 * 3600) {
    score += lastDisp.direction === 'up' ? 10 : -10;
  }

  if (lastC) {
    const top = Math.max(...swingHighs.slice(-2), -Infinity);
    const bot = Math.min(...swingLows.slice(-2), Infinity);
    if (Number.isFinite(top) && lastC.c > top) score += 15;
    if (Number.isFinite(bot) && lastC.c < bot) score -= 15;
  }

  if (lastC && pd) {
    if (pd.zone === 'discount' && trend === 'bullish') score += 8;
    if (pd.zone === 'premium' && trend === 'bearish') score -= 8;
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
  if (lastMSS) notes.push(`Market Structure Shift ${lastMSS.direction === 'up' ? '↑' : '↓'} confirmed by close through ${lastMSS.price.toFixed(5)}.`);
  if (regime === 'bullish' && !lastCHoCH) notes.push('Buyers in control; structure intact above.');
  if (regime === 'bearish' && !lastCHoCH) notes.push('Sellers in control; structure intact below.');
  if (eqh.length) notes.push(`Equal highs (EQH) at ${eqh[0].price.toFixed(5)} ×${eqh[0].touches} — buy-side liquidity resting above.`);
  if (eql.length) notes.push(`Equal lows (EQL) at ${eql[0].price.toFixed(5)} ×${eql[0].touches} — sell-side liquidity resting below.`);
  if (pd) notes.push(`Price in ${pd.zone} of the dealing range (${Math.round(pd.posPct * 100)}% between ${pd.low.toFixed(5)} and ${pd.high.toFixed(5)}).`);
  if (lastDisp) notes.push(`Displacement ${lastDisp.direction === 'up' ? '↑' : '↓'} — body ${Math.round(lastDisp.bodyPct * 100)}% of a ${lastDisp.sizePct}× median-range candle.`);
  if (breakers.length) notes.push(`${breakers.length} breaker/mitigation block${breakers.length > 1 ? 's' : ''} from invalidated order blocks.`);
  for (const h of prevHL) notes.push(`${h.label} ${h.price.toFixed(5)}.`);

  return {
    trend,
    bias,
    score: Math.round(score),
    trendLabel: label,
    lastBOS,
    lastCHoCH,
    lastMSS,
    swingHighs,
    swingLows,
    swingLabels: swingLabels.slice(-10),
    orderBlocks: blocks.slice(-8),
    breakers,
    demandZones,
    supplyZones,
    liquidity,
    equalHighs: eqh.slice(0, 3),
    equalLows: eql.slice(0, 3),
    stopHunts,
    displacement,
    pd,
    prevHL,
    notes
  };
}