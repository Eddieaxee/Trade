// ── Frankfurter (ECB reference rates) provider ───────────────────────────────
// Single daily snapshot per day, EUR-based. Free, keyless, no rate limits.

import type { RatePoint } from '@/lib/types';
import { fetchJson } from '@/lib/utils';

export const SOURCE = 'frankfurter';

export const FRANKFURTER_CCY = ['AUD', 'CAD', 'CHF', 'GBP', 'JPY', 'NZD', 'USD'];

interface FrankfurterSeries {
  rates?: Record<string, Record<string, number>>;
  start_date?: string;
  end_date?: string;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchFrankfurterSeries(days = 45): Promise<RatePoint[]> {
  const end = new Date();
  const start = new Date(Date.now() - days * 86400_000);
  const url =
    `https://api.frankfurter.app/${iso(start)}..${iso(end)}` +
    `?from=EUR&to=${FRANKFURTER_CCY.join(',')}`;

  const data = await fetchJson<FrankfurterSeries>(url, {
    headers: { Accept: 'application/json' }
  });

  const rates = data?.rates;
  if (!rates) throw new Error('Frankfurter: missing rates payload');
  const entries = Object.entries(rates).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const points: RatePoint[] = [];
  for (const [date, row] of entries) {
    const ms = Date.parse(`${date}T12:00:00Z`);
    if (Number.isNaN(ms)) continue;
    const clean: Record<string, number> = { EUR: 1 };
    for (const ccy of FRANKFURTER_CCY) {
      const v = row[ccy];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) clean[ccy] = v;
    }
    if (Object.keys(clean).length >= 4) points.push({ t: ms / 1000, rates: clean });
  }
  if (points.length < 2) throw new Error('Frankfurter: insufficient series');
  return points;
}