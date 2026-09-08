// ── Yahoo Finance chart v8 provider (keyless OHLC candles) ───────────────────

import type { Candle, Granularity } from '@/lib/types';
import { GRAN_MINUTES, MAX_CANDLES, YAHOO_INTERVALS, YAHOO_RANGES } from '@/lib/constants';
import { aggregateCandles, fetchJson } from '@/lib/utils';

export const SOURCE = 'yahoo';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

interface YahooQuote {
  open?: Array<number | null>;
  high?: Array<number | null>;
  low?: Array<number | null>;
  close?: Array<number | null>;
  volume?: Array<number | null>;
}

interface YahooChartResult {
  meta?: Record<string, unknown>;
  timestamp?: number[];
  indicators?: { quote?: YahooQuote[] };
}

interface YahooChart {
  chart?: { result?: YahooChartResult[]; error?: string | null };
}

function urlFor(symbol: string, interval: Granularity): string {
  return (
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${YAHOO_INTERVALS[interval]}&range=${YAHOO_RANGES[interval]}&includePrePost=false`
  );
}

function parse(ts: number[] | undefined, q: YahooQuote | undefined): Candle[] {
  if (!ts || !q) return [];
  const out: Candle[] = [];
  const n = Math.min(ts.length, q.open?.length ?? 0, q.high?.length ?? 0, q.low?.length ?? 0, q.close?.length ?? 0);
  for (let i = 0; i < n; i++) {
    const t = ts[i];
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if (!t || t < 1e9 || !o || !h || !l || !c) continue;
    if (h < l || c <= 0) continue;
    out.push({ t, o, h, l, c, v: q.volume?.[i] ?? undefined });
  }
  out.sort((a, b) => a.t - b.t);
  const dedup: Candle[] = [];
  for (const c of out) {
    if (dedup.length && dedup[dedup.length - 1].t === c.t) continue;
    dedup.push(c);
  }
  return dedup;
}

export async function fetchYahooCandles(pairSymbol: string, interval: Granularity): Promise<Candle[]> {
  const attempts = [`${pairSymbol}=X`, pairSymbol];
  let lastErr: unknown = null;
  let candles: Candle[] = [];

  for (const sym of attempts) {
    try {
      const data = await fetchJson<YahooChart>(urlFor(sym, interval), {
        headers: { 'User-Agent': UA, Accept: 'application/json' }
      });
      const res = data?.chart?.result?.[0];
      if (!res) throw new Error('Yahoo: empty chart result');
      candles = parse(res.timestamp, res.indicators?.quote?.[0]);
      if (candles.length >= 2) break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (candles.length < 2) {
    const msg = lastErr instanceof Error ? lastErr.message : 'unknown failure';
    throw new Error(`Yahoo Finance: ${msg}`);
  }

  // 4h granularity is not native to Yahoo — bucket 1h bars (already fetched as 60m).
  if (interval === '4h') {
    candles = aggregateCandles(candles, GRAN_MINUTES['4h']);
  }
  if (candles.length > MAX_CANDLES) {
    candles = candles.slice(candles.length - MAX_CANDLES);
  }
  return candles;
}