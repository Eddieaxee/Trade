// ── CRT analysis: range modes, expansion/contraction, FVGs, wick imbalance ──

import type { Candle, CRT, CRTPhase, CRTStatus, Direction, FVG } from '@/lib/types';
import { CRT_LOOKBACK } from '@/lib/constants';
import { clamp, mean } from '@/lib/utils';

export function detectFVGs(candles: Candle[]): FVG[] {
  const out: FVG[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const cur = candles[i];
    if (cur.l > prev.h) {
      out.push({ t: cur.t, top: cur.l, bottom: prev.h, side: 'up' });
    } else if (cur.h < prev.l) {
      out.push({ t: cur.t, top: prev.l, bottom: cur.h, side: 'down' });
    }
  }
  return out;
}

export function analyzeCRT(candles: Candle[]): CRT {
  const notes: string[] = [];
  const ranges = candles.map((c) => c.h - c.l);
  const bodies = candles.map((c) => Math.abs(c.c - c.o));
  const upperWick = candles.map((c) => c.h - Math.max(c.o, c.c));
  const lowerWick = candles.map((c) => Math.min(c.o, c.c) - c.l);

  const last = candles[candles.length - 1];
  const lastRange = last.h - last.l;

  // Range mode via percentile over the trailing window.
  const window = Math.min(CRT_LOOKBACK, ranges.length - 1);
  const trail = ranges.slice(-window).sort((a, b) => a - b);
  const pct = window > 4 ? (trail.filter((r) => r <= lastRange).length) / trail.length : 0.5;
  const rangeMode: CRT['rangeMode'] =
    pct < 0.12 ? 'micro' : pct < 0.35 ? 'small' : pct < 0.75 ? 'normal' : 'tall';

  // Expansion / contraction (recent vs older range averages).
  const recent = ranges.slice(-6);
  const older = ranges.slice(-26, -6);
  const ratio = older.length ? mean(recent) / mean(older) : 1;
  const expansion = ratio >= 1.18;
  const contraction = ratio <= 0.86;

  // Body dominance (0 = pure wick, 1 = full-body candle).
  const bodyStrength = clamp(mean(bodies.slice(-8)) / mean(ranges.slice(-8)), 0, 1);

  // Wick imbalance over the last 8 bars (−1 sell rejection … +1 buy rejection).
  const uw = mean(upperWick.slice(-8));
  const lw = mean(lowerWick.slice(-8));
  const wickImbalance = clamp((uw - lw) / Math.max(uw + lw, 1e-9), -1, 1);

  const fvgs = detectFVGs(candles).slice(-8);
  const lastFVG = fvgs.length ? fvgs[fvgs.length - 1] : null;

  // ── Directional bias ───────────────────────────────────────────────────────
  const last3 = candles.slice(-3);
  const drift = last3.length >= 2 ? last3[last3.length - 1].c - last3[0].o : 0;
  const driftPct = drift / (last?.c ?? 1);

  let score = 0;
  if (lastFVG) {
    score += lastFVG.side === 'up' ? 22 : -22;
    notes.push(
      `Fair-value gap ${lastFVG.side === 'up' ? '↑' : '↓'} left open between ${lastFVG.bottom.toFixed(5)}–${lastFVG.top.toFixed(5)}.`
    );
  }
  score += clamp(driftPct / 0.0015, -1, 1) * 26;
  score += expansion ? (last.c > last.o ? 10 : -10) : contraction ? (last.c > last.o ? 6 : -6) : 0;
  score += last.c > last.o ? 8 : -8;
  score = clamp(score, -100, 100);
  const bias: CRT['bias'] = score >= 18 ? 'long' : score <= -18 ? 'short' : 'neutral';

  notes.push(
    `Range ${rangeMode.toUpperCase()} (${(pct * 100).toFixed(0)}th pct), body ${(bodyStrength * 100).toFixed(0)}%, expansion ${ratio.toFixed(2)}×.`
  );
  if (expansion) notes.push('Range EXPANDING — volatility infusion; trade range often expands after this.');
  if (contraction) notes.push('Range CONTRACTING — energy storing; expansion often follows.');
  if (wickImbalance > 0.25) notes.push(`Upper wick dominance (${(wickImbalance * 100).toFixed(0)}%) — buy-side rejection.`);
  if (wickImbalance < -0.25) notes.push(`Lower wick dominance (${(-wickImbalance * 100).toFixed(0)}%) — sell-side rejection.`);

  return {
    rangeMode,
    expansion,
    contraction,
    expansionRatio: Math.round(ratio * 100) / 100,
    bodyStrength: Math.round(bodyStrength * 100) / 100,
    wickImbalance: Math.round(wickImbalance * 100) / 100,
    lastFVG,
    fvgs,
    bias,
    score: Math.round(score),
    notes
  };
}

// ── CRT phase model: manipulation → sweep → reclaim → displacement → confirm ─

/**
 * Classify the current candle-range-theory setup on the most recent dealing
 * range (19 completed bars + the live bar). Sweep of the range high with a
 * reclaim is bearish; sweep of the low with a reclaim is bullish. Status
 * escalates Developing → Confirming → Confirmed, or Invalidated.
 */
export function analyzeCRTPhase(candles: Candle[]): CRTPhase {
  const notes: string[] = [];
  const base: CRTPhase = {
    status: 'developing',
    direction: 'neutral',
    score: 0,
    rangeHigh: null,
    rangeLow: null,
    rangeMid: null,
    manipulation: false,
    sweep: null,
    reclaim: false,
    displacement: false,
    confirmation: false,
    invalidated: false,
    notes
  };
  if (candles.length < 12) return base;

  const win = candles.slice(-22, -1);
  const rangeHigh = Math.max(...win.map((c) => c.h));
  const rangeLow = Math.min(...win.map((c) => c.l));
  if (rangeHigh === rangeLow) return base;
  const rangeMid = (rangeHigh + rangeLow) / 2;

  const recent = candles.slice(-5);
  let sweep: 'high' | 'low' | null = null;
  let sweepIdx = -1;
  let reclaim = false;
  let reclaimIdx = -1;
  let manipulation = false;
  let direction: CRTPhase['direction'] = 'neutral';

  recent.forEach((c, i) => {
    if (c.h > rangeHigh && c.c < rangeHigh) manipulation = true;
    if (c.l < rangeLow && c.c > rangeLow) manipulation = true;
    if (c.c > rangeHigh && sweep !== 'low') { sweep = 'high'; sweepIdx = i; reclaim = false; }
    if (c.c < rangeLow && sweep !== 'high') { sweep = 'low'; sweepIdx = i; reclaim = false; }
    if (sweep === 'high' && i > sweepIdx && c.c < rangeHigh) { reclaim = true; reclaimIdx = i; }
    if (sweep === 'low' && i > sweepIdx && c.c > rangeLow) { reclaim = true; reclaimIdx = i; }
  });

  if (sweep === 'high') direction = reclaim ? 'bearish' : 'bullish'; // break up = expansion; reclaim = failed breakout
  if (sweep === 'low') direction = reclaim ? 'bullish' : 'bearish';

  // Displacement candle within the window, aligned with the setup direction.
  const dispRaw = detectDisplacementIn(recent);
  const disp = dispRaw === 'up' ? 'bullish' : dispRaw === 'down' ? 'bearish' : null;
  const displacement = disp !== null && (direction === 'neutral' || disp === direction);
  if (disp !== null && direction === 'neutral') direction = disp;

  // Confirmation: close beyond the range mid in setup direction after reclaim.
  const lastC = recent[recent.length - 1];
  const afterReclaim = reclaimIdx >= 0 ? recent.slice(reclaimIdx + 1) : recent.slice(-2);
  const confirmation =
    reclaim &&
    displacement &&
    afterReclaim.some((c) => (direction === 'bullish' ? c.c > rangeMid : c.c < rangeMid));

  // Invalidated: price closed through the opposite extreme of the setup.
  const invalidated =
    (direction === 'bullish' && lastC.c < rangeLow) ||
    (direction === 'bearish' && lastC.c > rangeHigh);

  let score = 0;
  let status: CRTStatus = 'developing';
  if (invalidated) {
    status = 'invalidated';
    notes.push('Setup invalidated — price closed through the opposing range extreme.');
    score = direction === 'bullish' ? -15 : direction === 'bearish' ? 15 : 0;
  } else if (sweep === null) {
    if (manipulation) {
      const wickUp = recent.some((c) => c.h - Math.max(c.o, c.c) > (c.c > c.o ? c.c - c.o : c.o - c.c) && c.h > rangeHigh);
      direction = wickUp ? 'bearish' : 'bullish';
      score = wickUp ? -20 : 20;
      notes.push(`Manipulation wick ${wickUp ? 'above the high — sell-side intent' : 'below the low — buy-side intent'}; range still holding.`);
    } else {
      notes.push('Range intact — accumulating; no sweep yet.');
    }
  } else if (reclaim) {
    if (displacement && confirmation) {
      status = 'confirmed';
      score = direction === 'bullish' ? 72 : -72;
      notes.push(`Confirmed ${direction} CRT: ${sweep === 'high' ? 'buy-side' : 'sell-side'} liquidity swept, reclaimed, displaced and confirmed.`);
    } else {
      status = 'confirming';
      score = direction === 'bullish' ? 45 : -45;
      notes.push(`${direction === 'bullish' ? 'Bullish' : 'Bearish'} CRT forming — sweep + reclaim locked; awaiting${displacement ? ' confirmation close' : ' displacement'}.`);
    }
  } else {
    notes.push(`Range ${sweep === 'high' ? 'high' : 'low'} swept — clean expansion, no reclaim yet.`);
    score = direction === 'bullish' ? 30 : -30;
  }

  if (status !== 'invalidated' && sweep !== null) {
    notes.push(`Swept ${sweep === 'high' ? 'range high' : 'range low'} @ ${(sweep === 'high' ? rangeHigh : rangeLow).toFixed(5)}.`);
  }

  return {
    status,
    direction,
    score: clamp(Math.round(score), -100, 100),
    rangeHigh,
    rangeLow,
    rangeMid,
    manipulation,
    sweep,
    reclaim,
    displacement,
    confirmation,
    invalidated,
    notes
  };
}

/** Direction of the last displacement candle inside a small window. */
function detectDisplacementIn(win: Candle[]): Direction | null {
  if (win.length < 6) return null;
  const sorted = [...win].map((c) => c.h - c.l).sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)] || 1;
  for (let i = win.length - 1; i >= Math.max(0, win.length - 4); i--) {
    const c = win[i];
    const body = Math.abs(c.c - c.o);
    const range = c.h - c.l;
    if (range > 0 && body / range >= 0.7 && body / med >= 1.8) return c.c > c.o ? 'up' : 'down';
  }
  return null;
}