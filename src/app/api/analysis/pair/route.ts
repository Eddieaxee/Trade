// GET /api/analysis/pair?pair=EURUSD&interval=1h
// Single-pair analysis bundle (candles + SMC + CRT + confluence).

import { NextResponse } from 'next/server';
import type { Granularity, Pair } from '@/lib/types';
import { CURRENCIES, TF_ALL, DEFAULT_INTERVAL } from '@/lib/constants';
import { getStrengthCached, analyzePair } from '@/lib/analysis';

export const dynamic = 'force-dynamic';

function parsePair(raw: string): Pair | null {
  const sym = (raw || '').trim().toUpperCase();
  if (sym.length !== 6) return null;
  const base = sym.slice(0, 3);
  const quote = sym.slice(3);
  if (!CURRENCIES.includes(base) || !CURRENCIES.includes(quote)) return null;
  return { symbol: sym, base, quote };
}

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const pair = parsePair(sp.get('pair') || '');
    if (!pair) {
      return NextResponse.json({ error: 'Valid ?pair=CCYCCY required' }, { status: 400 });
    }
    const rawInterval = (sp.get('interval') || '').toLowerCase();
    // Accept EVERY provider-supported timeframe (1m…1w). Validating against the
    // legacy INTERVALS list here silently downgraded 1m/5m/30m/1w to 1h — the
    // reason SMC/indicator values "didn't change" with the timeframe selector.
    const interval: Granularity = TF_ALL.includes(rawInterval as Granularity)
      ? (rawInterval as Granularity)
      : DEFAULT_INTERVAL;

    const strength = await getStrengthCached();
    const analysis = await analyzePair(pair, interval, strength);
    return NextResponse.json(analysis, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'pair analysis failed' },
      { status: 502 }
    );
  }
}