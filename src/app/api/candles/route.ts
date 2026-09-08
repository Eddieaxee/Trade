// GET /api/candles?pair=EURUSD&interval=1h
// Raw OHLC candles from the provider chain (Twelve Data → Yahoo).

import { NextResponse } from 'next/server';
import type { Granularity } from '@/lib/types';
import { CURRENCIES, INTERVALS } from '@/lib/constants';
import { getCandlesCached } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const sym = (sp.get('pair') || '').trim().toUpperCase();
    if (sym.length !== 6 || !CURRENCIES.includes(sym.slice(0, 3)) || !CURRENCIES.includes(sym.slice(3))) {
      return NextResponse.json({ error: 'Valid ?pair=CCYCCY required' }, { status: 400 });
    }
    const rawInterval = (sp.get('interval') || '').toLowerCase();
    const interval: Granularity = INTERVALS.includes(rawInterval as Granularity)
      ? (rawInterval as Granularity)
      : '1h';

    const { source, candles } = await getCandlesCached({ symbol: sym, base: sym.slice(0, 3), quote: sym.slice(3) }, interval);
    return NextResponse.json(
      { pair: sym, interval, source, count: candles.length, generatedAt: Date.now() / 1000, candles },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'candles failed' },
      { status: 502 }
    );
  }
}