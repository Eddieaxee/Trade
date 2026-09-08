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

/** All 28 majors + minors formed from the 8 supported currencies. */
export function allPairs(): Pair[] {
  const out: Pair[] = [];
  for (let i = 0; i < CURRENCIES.length; i++) {
    for (let j = i + 1; j < CURRENCIES.length; j++) {
      out.push(mkPair(CURRENCIES[i] + CURRENCIES[j]));
    }
  }
  return out;
}

/** Default watchlist analysed in overview tables. */
export const WATCHLIST: Pair[] = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY',
  'EURCHF', 'EURCAD'
].map(mkPair);

/** Star topology used to derive every cross from 7 candle fetches. */
export const STAR_PAIRS: Pair[] = [
  'EURUSD', 'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD'
].map(mkPair);

export const DEFAULT_INTERVAL: Granularity = '1h';

/** Every timeframe the data providers can serve. */
export const TF_ALL: Granularity[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
/** Timeframes shown on the main analysis pages (selector). */
export const TF_MAIN: Granularity[] = ['5m', '15m', '30m', '1h', '4h', '1d', '1w'];
/** Legacy snapshot intervals (dashboard overview + cron). */
export const INTERVALS: Granularity[] = ['15m', '1h', '4h', '1d'];
/** Rows of the multi-timeframe pair table. */
export const MTF_TFS: Granularity[] = ['15m', '30m', '1h', '4h', '1d'];
/** Timeframes of the currency-strength matrix (30s is provider-floor limited). */
export const STRENGTH_TFS: Granularity[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

export const GRAN_MINUTES: Record<Granularity, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080
};

export const GRAN_SECONDS: Record<Granularity, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800
};

/** Yahoo chart v8 interval / range per granularity (4h is aggregated locally). */
export const YAHOO_INTERVALS: Record<Granularity, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '60m',
  '4h': '60m',
  '1d': '1d',
  '1w': '1wk'
};
export const YAHOO_RANGES: Record<Granularity, string> = {
  '1m': '5d',
  '5m': '1mo',
  '15m': '5d',
  '30m': '1mo',
  '1h': '1mo',
  '4h': '1mo',
  '1d': '3mo',
  '1w': '2y'
};

/** Twelve Data interval names per granularity. */
export const TD_INTERVALS: Record<Granularity, string> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '1h',
  '4h': '4h',
  '1d': '1day',
  '1w': '1week'
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
export const TTL_STRENGTH_MATRIX = intEnv('TTL_STRENGTH_MATRIX', 300);
export const TTL_MTF = intEnv('TTL_MTF', 300);

export const TWELVEDATA_API_KEY = (process.env.TWELVEDATA_API_KEY || '').trim();
export const UPSTASH_REDIS_REST_URL = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
export const UPSTASH_REDIS_REST_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
export const CRON_SECRET = process.env.CRON_SECRET || '';

/** Scrolling window (bars) used to classify candle range percentiles. */
export const CRT_LOOKBACK = 40;
/** Arms used for swing (fractal) detection. */
export const SWING_ARMS = 2;