// ── exchange-rate-api (ER-API) provider ─────────────────────────────────────
// Keyless open rates; supplies a fallback *current* reference point when
// Frankfurter is unreachable. No history on the free tier.

import type { RatePoint } from '@/lib/types';
import { fetchJson } from '@/lib/utils';

export const SOURCE = 'erapi';

interface ErapiResponse {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
  time_last_update_unix?: number;
}

export const ERAPI_CCY = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'];

export async function fetchERAPILatest(): Promise<RatePoint[]> {
  const url = 'https://open.er-api.com/v6/latest/EUR';
  const data = await fetchJson<ErapiResponse>(url, {
    headers: { Accept: 'application/json' }
  });
  if (data?.result !== 'success' || !data.rates) {
    throw new Error('ER-API: unexpected response shape');
  }
  const rates: Record<string, number> = {};
  for (const ccy of ERAPI_CCY) {
    const v = data.rates[ccy];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) rates[ccy] = v;
  }
  if (!rates.EUR) throw new Error('ER-API: missing EUR rate');
  // Normalise to EUR base (1 EUR = x CCY).
  for (const ccy of ERAPI_CCY) if (ccy !== 'EUR' && rates[ccy]) rates[ccy] = rates[ccy] / rates.EUR;
  rates.EUR = 1;
  const t = data.time_last_update_unix ?? Date.now() / 1000;
  if (Object.keys(rates).length < 4) throw new Error('ER-API: insufficient rates');
  return [{ t, rates }];
}