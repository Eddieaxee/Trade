import { NextResponse } from 'next/server';
import { buildStrengthHistory } from '@/lib/analysis/matrix';

export const dynamic = 'force-dynamic';

/** GET /api/analysis/strength-history?range=1w|1m
 *  Date-anchored cumulative all-against-all % move per currency —
 *  the data behind the MarketMilk-style lines chart. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get('range') === '1m' ? '1m' : '1w';
  const days = range === '1m' ? 31 : 8;
  try {
    const data = await buildStrengthHistory(days);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'strength history unavailable' },
      { status: 502 }
    );
  }
}
