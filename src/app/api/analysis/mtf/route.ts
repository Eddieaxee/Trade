// GET /api/analysis/mtf?pair=EURUSD
// Multi-timeframe table: Indicators / SMC / CRT / Overall per timeframe.

import { NextResponse } from 'next/server';
import type { Pair } from '@/lib/types';
import { CURRENCIES } from '@/lib/constants';
import { getPairMTFCached } from '@/lib/analysis/mtf';

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
    const mtf = await getPairMTFCached(pair);
    return NextResponse.json(mtf, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'mtf analysis failed' },
      { status: 502 }
    );
  }
}
