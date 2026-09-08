// ── Static configuration: currencies, watchlist, intervals, TTLs ─────────────

import type { Granularity, Pair } from '@/lib/types';

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];

export const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  NZD: 'New Zealand Dollar'
};

function mkPair(symbol: string): Pair {
  return { symbol, base: symbol.slice(0, 3), quote: symbol.slice(3) };
}

/** Default watchlist analysed by the dashboard. */
export const WATCHLIST: Pair[] = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY',
  'EURCHF', 'EURCAD'
].map(mkPair);

export const DEFAULT_INTERVAL: Granularity = '1h';
export const INTERVALS: Granularity[] = ['15m', '1h', '4h', '1d'];

export const GRAN_MINUTES: Record<Granularity, number> = {
  '15m': 15,
  '1h': 60,
  '4h': 240,
  '1d': 1440
};

/** Yahoo chart v8 interval / range per granularity (4h is aggregated locally). */
export const YAHOO_INTERVALS: Record<Granularity, string> = {
  '15m': '15m',
  '1h': '60m',
  '4h': '60m',
  '1d': '1d'
};
export const YAHOO_RANGES: Record<Granularity, string> = {
  '15m': '5d',
  '1h': '1mo',
  '4h': '1mo',
  '1d': '3mo'
};

/** Twelve Data interval names per granularity. */
export const TD_INTERVALS: Record<Granularity, string> = {
  '15m': '15min',
  '1h': '1h',
  '4h': '4h',
  '1d': '1day'
};

export const MAX_CANDLES = 340;

// ── Environment-driven TTLs (seconds) ────────────────────────────────────────

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const TTL_CANDLE_INTRADAY = intEnv('TTL_CANDLE_INTRADAY', 180);
export const TTL_CANDLE_DAILY = intEnv('TTL_CANDLE_DAILY', 3600);
export const TTL_ANALYSIS_INTRADAY = intEnv('TTL_ANALYSIS_INTRADAY', 180);
export const TTL_ANALYSIS_DAILY = intEnv('TTL_ANALYSIS_DAILY', 900);
export const TTL_SNAPSHOT = intEnv('TTL_SNAPSHOT', 900);

export const TWELVEDATA_API_KEY = (process.env.TWELVEDATA_API_KEY || '').trim();
export const UPSTASH_REDIS_REST_URL = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
export const UPSTASH_REDIS_REST_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
export const CRON_SECRET = process.env.CRON_SECRET || '';

/** Scrolling window (bars) used to classify candle range percentiles. */
export const CRT_LOOKBACK = 40;
/** Arms used for swing (fractal) detection. */
export const SWING_ARMS = 2;