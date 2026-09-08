// ── Twelve Data provider (optional bid/ask/live candle source on 8 req/min) ──

import type { Candle, Granularity } from '@/lib/types';
import { MAX_CANDLES, TD_INTERVALS, TWELVEDATA_API_KEY } from '@/lib/constants';
import { fetchJson } from '@/lib/utils';

export const SOURCE = 'twelvedata';

export function tdSymbol(pairSymbol: string): string {
  return `${pairSymbol.slice(0, 3)}/${pairSymbol.slice(3)}`;
}

interface TdValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

interface TdResponse {
  status?: string;
  values?: TdValue[];
  message?: string;
}

const NUM = (s: string | undefined): number | null => {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export async function fetchTwelveDataCandles(pairSymbol: string, interval: Granularity): Promise<Candle[]> {
  const symbol = tdSymbol(pairSymbol);
  const intraday = interval !== '1d';
  const url =
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${TD_INTERVALS[interval]}&outputsize=${intraday ? 300 : 200}&timezone=UTC&apikey=${TWELVEDATA_API_KEY}`;

  const data = await fetchJson<TdResponse>(url, { headers: { Accept: 'application/json' } });
  if (data?.status !== 'ok' || !data.values) {
    throw new Error(`Twelve Data: ${data?.message ?? 'request failed'}`);
  }
  const out: Candle[] = [];
  for (const v of data.values) {
    const o = NUM(v.open);
    const h = NUM(v.high);
    const l = NUM(v.low);
    const c = NUM(v.close);
    if (o === null || h === null || l === null || c === null) continue;
    if (h < l) continue;
    const ms = Date.parse(`${v.datetime.replace(' ', 'T')}Z`);
    if (Number.isNaN(ms)) continue;
    out.push({ t: ms / 1000, o, h, l, c, v: NUM(v.volume) ?? undefined });
  }
  out.sort((a, b) => a.t - b.t);
  if (!out.length) throw new Error('Twelve Data: empty series');
  if (out.length > MAX_CANDLES) {
    out.splice(0, out.length - MAX_CANDLES);
  }
  return out;
}