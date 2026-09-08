// ── Technical indicators: 16 standard studies computed from OHLC candles ─────
// Oscillators (RSI/Stoch/StochRSI/CCI/Williams %R) use mean-reversion extremes;
// trend studies (MAs, MACD, ADX, Ichimoku, AO) follow direction. Conviction
// (strength 0..1) reflects distance from the neutral zone, never invented data.

import type { Candle, IndicatorBundle, IndicatorReading, IndicatorSignal } from '@/lib/types';
import { clamp, mean, stdev } from '@/lib/utils';

const C = (cs: Candle[]): number[] => cs.map((c) => c.c);
const H = (cs: Candle[]): number[] => cs.map((c) => c.h);
const L = (cs: Candle[]): number[] => cs.map((c) => c.l);

function sma(xs: number[], n: number): number | null {
  if (xs.length < n) return null;
  return mean(xs.slice(-n));
}

/** Full EMA series aligned with xs (values before the seed are null). */
function emaSeries(xs: number[], n: number): Array<number | null> {
  const out: Array<number | null> = xs.map(() => null);
  if (xs.length < n) return out;
  let e = mean(xs.slice(0, n));
  out[n - 1] = e;
  const k = 2 / (n + 1);
  for (let i = n; i < xs.length; i++) {
    e = xs[i] * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

function ema(xs: number[], n: number): number | null {
  const s = emaSeries(xs, n);
  return s[s.length - 1] ?? null;
}

/** Wilder RSI (smoothed). */
export function rsi(xs: number[], n = 14): number | null {
  if (xs.length < n + 1) return null;
  let g = 0;
  let l = 0;
  for (let i = 1; i <= n; i++) {
    const d = xs[i] - xs[i - 1];
    if (d > 0) g += d;
    else l -= d;
  }
  let ag = g / n;
  let al = l / n;
  for (let i = n + 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    ag = (ag * (n - 1) + Math.max(d, 0)) / n;
    al = (al * (n - 1) + Math.max(-d, 0)) / n;
  }
  if (al === 0) return ag === 0 ? 50 : 100;
  return 100 - 100 / (1 + ag / al);
}

/** RSI series over the trailing `count` windows (for Stoch RSI). */
function rsiSeries(xs: number[], count: number, n = 14): number[] {
  const out: number[] = [];
  for (let i = Math.max(n, xs.length - count); i <= xs.length; i++) {
    const v = rsi(xs.slice(0, i), n);
    if (v !== null) out.push(v);
  }
  return out;
}

function trueRanges(cs: Candle[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < cs.length; i++) {
    out.push(Math.max(cs[i].h - cs[i].l, Math.abs(cs[i].h - cs[i - 1].c), Math.abs(cs[i].l - cs[i - 1].c)));
  }
  return out;
}

export function atr(cs: Candle[], n = 14): number | null {
  const tr = trueRanges(cs);
  if (tr.length < n) return null;
  return mean(tr.slice(-n));
}

function macd(xs: number[]): { line: number | null; signal: number | null; hist: number | null } {
  const f = emaSeries(xs, 12);
  const s = emaSeries(xs, 26);
  const line: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    if (f[i] !== null && s[i] !== null) line.push((f[i] as number) - (s[i] as number));
  }
  if (line.length < 10) return { line: null, signal: null, hist: null };
  const sig = ema(line, 9);
  const l = line[line.length - 1];
  return { line: l, signal: sig, hist: sig === null ? null : l - sig };
}

function stochastic(cs: Candle[], n = 14): { k: number | null; d: number | null } {
  if (cs.length < n + 3) return { k: null, d: null };
  const ks: number[] = [];
  for (let i = n; i < cs.length; i++) {
    const win = cs.slice(i - n, i + 1);
    const hh = Math.max(...win.map((c) => c.h));
    const ll = Math.min(...win.map((c) => c.l));
    ks.push(hh === ll ? 50 : ((cs[i].c - ll) / (hh - ll)) * 100);
  }
  const k = ks[ks.length - 1];
  const d = ks.length >= 3 ? mean(ks.slice(-3)) : null;
  return { k, d };
}

function stochRsi(xs: number[]): { k: number | null; d: number | null } {
  const series = rsiSeries(xs, 16);
  if (series.length < 15) return { k: null, d: null };
  const win = series.slice(-14);
  const hi = Math.max(...win);
  const lo = Math.min(...win);
  const k = hi === lo ? 50 : ((series[series.length - 1] - lo) / (hi - lo)) * 100;
  const d = mean(win.slice(-3));
  return { k, d };
}

function cci(cs: Candle[], n = 20): number | null {
  if (cs.length < n) return null;
  const tp = cs.map((c) => (c.h + c.l + c.c) / 3);
  const win = tp.slice(-n);
  const m = mean(win);
  const md = mean(win.map((v) => Math.abs(v - m)));
  if (md === 0) return 0;
  return (win[win.length - 1] - m) / (0.015 * md);
}

/** Wilder ADX with +DI / -DI. */
function adx(cs: Candle[], n = 14): { adx: number | null; plusDI: number | null; minusDI: number | null } {
  if (cs.length < 2 * n + 2) return { adx: null, plusDI: null, minusDI: null };
  const tr: number[] = [];
  const pdm: number[] = [];
  const mdm: number[] = [];
  for (let i = 1; i < cs.length; i++) {
    tr.push(Math.max(cs[i].h - cs[i].l, Math.abs(cs[i].h - cs[i - 1].c), Math.abs(cs[i].l - cs[i - 1].c)));
    const up = cs[i].h - cs[i - 1].h;
    const dn = cs[i - 1].l - cs[i].l;
    pdm.push(up > dn && up > 0 ? up : 0);
    mdm.push(dn > up && dn > 0 ? dn : 0);
  }
  const wilder = (xs: number[]): number[] => {
    const out: number[] = [];
    let acc = mean(xs.slice(0, n));
    out.push(acc);
    for (let i = n; i < xs.length; i++) {
      acc = acc - acc / n + xs[i];
      out.push(acc);
    }
    return out;
  };
  const trS = wilder(tr);
  const pS = wilder(pdm);
  const mS = wilder(mdm);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    if (!trS[i]) continue;
    const pdi = (100 * pS[i]) / trS[i];
    const mdi = (100 * mS[i]) / trS[i];
    dx.push(pdi + mdi === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / (pdi + mdi));
  }
  if (dx.length < n) return { adx: null, plusDI: null, minusDI: null };
  const lastTr = trS[trS.length - 1];
  const pdi = (100 * pS[pS.length - 1]) / lastTr;
  const mdi = (100 * mS[mS.length - 1]) / lastTr;
  return { adx: mean(dx.slice(-n)), plusDI: pdi, minusDI: mdi };
}

// __PART2__

function bollinger(xs: number[], n = 20): { upper: number | null; mid: number | null; lower: number | null; pctB: number | null } {
  if (xs.length < n) return { upper: null, mid: null, lower: null, pctB: null };
  const win = xs.slice(-n);
  const m = mean(win);
  const sd = stdev(win);
  const upper = m + 2 * sd;
  const lower = m - 2 * sd;
  const pctB = upper === lower ? 0.5 : (xs[xs.length - 1] - lower) / (upper - lower);
  return { upper, mid: m, lower, pctB };
}

function williamsR(cs: Candle[], n = 14): number | null {
  if (cs.length < n) return null;
  const win = cs.slice(-n);
  const hh = Math.max(...win.map((c) => c.h));
  const ll = Math.min(...win.map((c) => c.l));
  if (hh === ll) return -50;
  return (-100 * (hh - cs[cs.length - 1].c)) / (hh - ll);
}

function ichimoku(cs: Candle[]): {
  tenkan: number | null; kijun: number | null; cloudTop: number | null; cloudBot: number | null;
  above: boolean | null; tkCross: 'bull' | 'bear' | null;
} {
  const mid = (arr: Candle[]): number | null =>
    arr.length ? (Math.max(...arr.map((c) => c.h)) + Math.min(...arr.map((c) => c.l))) / 2 : null;
  if (cs.length < 52) return { tenkan: null, kijun: null, cloudTop: null, cloudBot: null, above: null, tkCross: null };
  const tenkan = mid(cs.slice(-9));
  const kijun = mid(cs.slice(-26));
  if (tenkan === null || kijun === null) return { tenkan, kijun, cloudTop: null, cloudBot: null, above: null, tkCross: null };
  const spanA = (tenkan + kijun) / 2;
  const spanB = mid(cs.slice(-52)) as number;
  const cloudTop = Math.max(spanA, spanB);
  const cloudBot = Math.min(spanA, spanB);
  const c = cs[cs.length - 1].c;
  const above = c > cloudTop ? true : c < cloudBot ? false : null;
  const tPrev = mid(cs.slice(-10, -1));
  const kPrev = mid(cs.slice(-27, -1));
  let tkCross: 'bull' | 'bear' | null = null;
  if (tPrev !== null && kPrev !== null) {
    if (tenkan > kijun && tPrev <= kPrev) tkCross = 'bull';
    if (tenkan < kijun && tPrev >= kPrev) tkCross = 'bear';
  }
  return { tenkan, kijun, cloudTop, cloudBot, above, tkCross };
}

function awesome(cs: Candle[]): number | null {
  if (cs.length < 34) return null;
  const med = (arr: Candle[]): number[] => arr.map((c) => (c.h + c.l) / 2);
  return mean(med(cs.slice(-5))) - mean(med(cs.slice(-34)));
}

function fmt5(v: number): string {
  const a = Math.abs(v);
  return v.toFixed(a < 10 ? 5 : a < 100 ? 4 : a >= 1000 ? 2 : 3);
}

// __PART3__

const mkReading = (
  key: string, name: string, value: string, signal: IndicatorSignal, strength: number, note: string
): IndicatorReading => ({ key, name, value, signal, strength: clamp(strength, 0, 1), note });

/** Build the full 16-indicator bundle for a candle series. */
export function buildIndicators(candles: Candle[]): IndicatorBundle {
  const xs = C(candles);
  const readings: IndicatorReading[] = [];
  const last = xs[xs.length - 1] ?? 0;

  // ── Moving averages (trend-following: price vs MA) ─────────────────────────
  const maRow = (key: string, name: string, v: number | null): void => {
    if (v === null) return;
    const diff = (last - v) / (v || 1);
    const sig: IndicatorSignal = diff > 0.0002 ? 'buy' : diff < -0.0002 ? 'sell' : 'neutral';
    readings.push(mkReading(
      key, name, fmt5(v), sig, Math.min(1, Math.abs(diff) / 0.004),
      `price ${diff > 0 ? 'above' : 'below'} the ${key.slice(0, 3).toUpperCase()} — ${sig === 'buy' ? 'bullish' : sig === 'sell' ? 'bearish' : 'flat'}`
    ));
  };
  maRow('sma20', 'SMA 20', sma(xs, 20));
  maRow('sma50', 'SMA 50', sma(xs, 50));
  maRow('ema20', 'EMA 20', ema(xs, 20));
  maRow('ema50', 'EMA 50', ema(xs, 50));

  // ── RSI (overbought/oversold with momentum lean) ───────────────────────────
  const r = rsi(xs);
  if (r !== null) {
    let sig: IndicatorSignal = 'neutral';
    let note = 'mid-range — no edge';
    if (r <= 30) { sig = 'buy'; note = 'oversold — reversal watch'; }
    else if (r >= 70) { sig = 'sell'; note = 'overbought — fade risk'; }
    else if (r > 55) { sig = 'buy'; note = 'bullish momentum zone'; }
    else if (r < 45) { sig = 'sell'; note = 'bearish momentum zone'; }
    readings.push(mkReading('rsi', 'RSI 14', r.toFixed(1), sig, clamp(Math.abs(r - 50) / 50, 0, 1), note));
  }

  // ── MACD (crossover trend-following) ───────────────────────────────────────
  const m = macd(xs);
  if (m.line !== null && m.signal !== null && m.hist !== null) {
    const sig: IndicatorSignal = m.hist > 0 ? 'buy' : m.hist < 0 ? 'sell' : 'neutral';
    const strength = clamp(Math.abs(m.hist) / ((Math.abs(m.line) + Math.abs(m.signal)) / 2 || 1e-9), 0, 1);
    const hv = Math.abs(m.hist) < 0.001 ? m.hist.toExponential(1) : m.hist.toFixed(5);
    readings.push(mkReading('macd', 'MACD 12/26/9', `${m.hist > 0 ? '+' : ''}${hv}`, sig, strength, `MACD ${m.line > m.signal ? 'above' : 'below'} signal line — ${sig === 'buy' ? 'bullish' : 'bearish'} crossover state`));
  }

  // ── Stochastic ─────────────────────────────────────────────────────────────
  const st = stochastic(candles);
  if (st.k !== null) {
    let sig: IndicatorSignal = 'neutral';
    let note = 'mid-range';
    if (st.k <= 20) { sig = 'buy'; note = 'oversold'; }
    else if (st.k >= 80) { sig = 'sell'; note = 'overbought'; }
    else if (st.k > 55) { sig = 'buy'; note = 'rising — bullish'; }
    else if (st.k < 45) { sig = 'sell'; note = 'falling — bearish'; }
    readings.push(mkReading('stoch', 'Stoch %K/%D 14/3', `${st.k.toFixed(0)}/${st.d !== null ? st.d.toFixed(0) : '—'}`, sig, clamp(Math.abs(st.k - 50) / 50, 0, 1), note));
  }

  // ── Stoch RSI ──────────────────────────────────────────────────────────────
  const sr = stochRsi(xs);
  if (sr.k !== null) {
    let sig: IndicatorSignal = 'neutral';
    let note = 'mid-range';
    if (sr.k <= 20) { sig = 'buy'; note = 'RSI stretched low'; }
    else if (sr.k >= 80) { sig = 'sell'; note = 'RSI stretched high'; }
    else if (sr.k > 55) { sig = 'buy'; note = 'RSI momentum rising'; }
    else if (sr.k < 45) { sig = 'sell'; note = 'RSI momentum falling'; }
    readings.push(mkReading('stochrsi', 'Stoch RSI 14', sr.k.toFixed(0), sig, clamp(Math.abs(sr.k - 50) / 50, 0, 1), note));
  }

// __PART4__

  // ── CCI ────────────────────────────────────────────────────────────────────
  const cc = cci(candles);
  if (cc !== null) {
    let sig: IndicatorSignal = 'neutral';
    let note = 'neutral band';
    if (cc <= -100) { sig = 'buy'; note = 'deeply oversold'; }
    else if (cc >= 100) { sig = 'sell'; note = 'deeply overbought'; }
    else if (cc > 0) { sig = 'buy'; note = 'above zero — bullish tilt'; }
    else { sig = 'sell'; note = 'below zero — bearish tilt'; }
    readings.push(mkReading('cci', 'CCI 20', cc.toFixed(0), sig, clamp(Math.abs(cc) / 200, 0, 1), note));
  }

  // ── ADX / DI (trend strength; direction from DI spread) ────────────────────
  const ad = adx(candles);
  if (ad.adx !== null && ad.plusDI !== null && ad.minusDI !== null) {
    const dirSig: IndicatorSignal = ad.plusDI > ad.minusDI ? 'buy' : 'sell';
    const sig: IndicatorSignal = ad.adx < 20 ? 'neutral' : dirSig;
    readings.push(mkReading('adx', 'ADX 14 (+DI/−DI)', `${ad.adx.toFixed(0)} (+${ad.plusDI.toFixed(0)}/−${ad.minusDI.toFixed(0)})`, sig, clamp((ad.adx - 15) / 35, 0, 1), ad.adx < 20 ? 'weak trend — range regime' : `${ad.plusDI > ad.minusDI ? 'buyers' : 'sellers'} dominate — trending`));
  }

  // ── ATR (volatility, direction-neutral) ────────────────────────────────────
  const at = atr(candles);
  if (at !== null) {
    readings.push(mkReading('atr', 'ATR 14', fmt5(at), 'neutral', 0, `average bar range ≈ ${((at / (last || 1)) * 100).toFixed(3)}% of price`));
  }

  // ── Bollinger %B ───────────────────────────────────────────────────────────
  const bb = bollinger(xs);
  if (bb.pctB !== null) {
    let sig: IndicatorSignal = 'neutral';
    let note = 'inside bands';
    if (bb.pctB <= 0) { sig = 'buy'; note = 'below lower band — stretch low'; }
    else if (bb.pctB >= 1) { sig = 'sell'; note = 'above upper band — stretch high'; }
    else if (bb.pctB > 0.6) { sig = 'buy'; note = 'upper half — bullish pressure'; }
    else if (bb.pctB < 0.4) { sig = 'sell'; note = 'lower half — bearish pressure'; }
    readings.push(mkReading('bb', 'Bollinger %B 20', `${(bb.pctB * 100).toFixed(0)}%`, sig, clamp(Math.abs(bb.pctB - 0.5) * 2, 0, 1), note));
  }

  // ── Momentum (10-bar ROC) ──────────────────────────────────────────────────
  if (xs.length >= 11) {
    const mom = last - xs[xs.length - 11];
    const momPct = (mom / (xs[xs.length - 11] || 1)) * 100;
    const sig: IndicatorSignal = momPct > 0.02 ? 'buy' : momPct < -0.02 ? 'sell' : 'neutral';
    readings.push(mkReading('momentum', 'Momentum 10', `${mom > 0 ? '+' : ''}${mom.toFixed(5)}`, sig, clamp(Math.abs(momPct) / 0.3, 0, 1), `${momPct > 0 ? '+' : ''}${momPct.toFixed(2)}% over 10 bars`));
  }

  // ── Williams %R ────────────────────────────────────────────────────────────
  const wr = williamsR(candles);
  if (wr !== null) {
    let sig: IndicatorSignal = 'neutral';
    let note = 'mid-range';
    if (wr <= -80) { sig = 'buy'; note = 'oversold'; }
    else if (wr >= -20) { sig = 'sell'; note = 'overbought'; }
    else if (wr > -40) { sig = 'buy'; note = 'upper range — bullish'; }
    else if (wr < -60) { sig = 'sell'; note = 'lower range — bearish'; }
    readings.push(mkReading('willr', 'Williams %R 14', wr.toFixed(0), sig, clamp(Math.abs(wr + 50) / 50, 0, 1), note));
  }

  // ── Ichimoku ───────────────────────────────────────────────────────────────
  const ich = ichimoku(candles);
  if (ich.tenkan !== null && ich.kijun !== null) {
    let sig: IndicatorSignal = 'neutral';
    let note = 'price inside the Kumo cloud — undecided';
    if (ich.above === true) { sig = 'buy'; note = 'price above Kumo — bullish regime'; }
    else if (ich.above === false) { sig = 'sell'; note = 'price below Kumo — bearish regime'; }
    if (ich.tkCross === 'bull') note += ' · fresh Tenkan/Kijun bullish cross';
    if (ich.tkCross === 'bear') note += ' · fresh Tenkan/Kijun bearish cross';
    readings.push(mkReading('ichimoku', 'Ichimoku 9/26/52', `T ${fmt5(ich.tenkan)} · K ${fmt5(ich.kijun)}`, sig, ich.above === null ? 0.2 : 0.75, note));
  }

  // ── Awesome Oscillator ─────────────────────────────────────────────────────
  const ao = awesome(candles);
  if (ao !== null) {
    const sig: IndicatorSignal = ao > 0 ? 'buy' : 'sell';
    const av = Math.abs(ao) < 1 ? ao.toExponential(1) : ao.toFixed(5);
    readings.push(mkReading('ao', 'Awesome Osc 5/34', `${ao > 0 ? '+' : ''}${av}`, sig, clamp(Math.abs(ao) / ((at || 1) * 1.2), 0, 1), ao > 0 ? 'median price momentum above zero — bullish' : 'median price momentum below zero — bearish'));
  }

  // ── Aggregate: strength-weighted directional score ─────────────────────────
  const weighted = readings.filter((rd) => rd.signal !== 'neutral');
  const totalW = weighted.reduce((a, rd) => a + Math.max(0.15, rd.strength), 0);
  const raw = totalW
    ? weighted.reduce((a, rd) => a + (rd.signal === 'buy' ? 1 : -1) * Math.max(0.15, rd.strength), 0) / totalW
    : 0;
  const score = clamp(Math.round(raw * 100), -100, 100);
  const bull = readings.filter((rd) => rd.signal === 'buy').length;
  const bear = readings.filter((rd) => rd.signal === 'sell').length;
  const label = score >= 60 ? 'Strong Buy' : score >= 25 ? 'Buy' : score <= -60 ? 'Strong Sell' : score <= -25 ? 'Sell' : 'Neutral';
  const drivers = [...weighted]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4)
    .map((rd) => `${rd.signal === 'buy' ? '▲' : '▼'} ${rd.name}: ${rd.note}`);

  return {
    score,
    label,
    bull,
    bear,
    neutral: readings.length - bull - bear,
    readings,
    drivers,
    atr: at ? Math.round(at * 1e5) / 1e5 : null
  };
}


