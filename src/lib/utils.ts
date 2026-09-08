// ── Small math / formatting / async utilities ────────────────────────────────

import type { Candle } from '@/lib/types';

export const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

export const rnd = (x: number, n = 4): number => {
  const f = 10 ** n;
  return Math.round(x * f) / f;
};

export const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export const stdev = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
};

/** z-score of x within xs (0 when not computable). */
export function zscoreIn(x: number, xs: number[]): number {
  const sd = stdev(xs);
  if (sd === 0) return 0;
  return (x - mean(xs)) / sd;
}

export function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const idx = clamp(Math.round(q * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
}

export function pctChange(a: number, b: number): number | null {
  if (!a || !b) return null;
  return (b - a) / a * 100;
}

/** Price decimals that read well for the quote's magnitude. */
export function fmtPrice(p: number): string {
  const a = Math.abs(p);
  const d = a < 10 ? 5 : a < 100 ? 4 : a >= 1000 ? 2 : 3;
  return p.toFixed(d);
}

export function fmtPct(x: number | null, signed = true): string {
  if (x === null || !Number.isFinite(x)) return '—';
  const s = signed && x > 0 ? '+' : '';
  return `${s}${x.toFixed(2)}%`;
}

export function fmtAgo(t: number, now?: number): string {
  const n = now ?? Date.now() / 1000;
  const s = Math.max(0, Math.floor(n - t));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function fmtClock(t: number): string {
  const d = new Date(t * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mo}-${dd} ${hh}:${mm} UTC`;
}

/** Bucket candles into `minutes`-wide bars (last partial bucket dropped). */
export function aggregateCandles(src: Candle[], minutes: number): Candle[] {
  if (minutes <= 0) return src;
  const step = minutes * 60;
  const byBucket = new Map<number, Candle>();
  for (const c of src) {
    const key = Math.floor(c.t / step) * step;
    const cur = byBucket.get(key);
    if (!cur) byBucket.set(key, { t: key, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v });
    else {
      cur.h = Math.max(cur.h, c.h);
      cur.l = Math.min(cur.l, c.l);
      cur.c = c.c;
      cur.v = (cur.v ?? 0) + (c.v ?? 0);
    }
  }
  return [...byBucket.values()].sort((a, b) => a.t - b.t);
}

/** fetch + JSON parse with a hard timeout + HTTP-status checking. */
export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 9000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`) as Error & { status?: number; body?: string };
      err.status = res.status;
      err.body = text.slice(0, 300);
      throw err;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      const err = new Error('Non-JSON provider response') as Error & { status?: number; body?: string };
      err.status = res.status;
      err.body = text.slice(0, 300);
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Promise.allSettled that keeps only fulfilled results. */
export async function allSettledFulfilled<T>(ps: Array<Promise<T>>): Promise<T[]> {
  const settled = await Promise.allSettled(ps);
  const out: T[] = [];
  for (const s of settled) if (s.status === 'fulfilled') out.push(s.value);
  return out;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}