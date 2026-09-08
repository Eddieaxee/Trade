// GET /api/rates
// Reference-rate series (EUR based) powering the strength decomposition.

import { NextResponse } from 'next/server';
import { getRatesCached } from '@/lib/analysis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { source, series, notes } = await getRatesCached();
    return NextResponse.json(
      { source, notes, generatedAt: Date.now() / 1000, points: series.length, series },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'rates failed' },
      { status: 502 }
    );
  }
}