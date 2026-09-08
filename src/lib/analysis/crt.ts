// ── CRT analysis: range modes, expansion/contraction, FVGs, wick imbalance ──

import type { Candle, CRT, FVG } from '@/lib/types';
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