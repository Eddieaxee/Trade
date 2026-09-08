// GET /api/analysis/summary?interval=1h
// Full market snapshot: currency strength + per-pair SMC / CRT / confluence.
// Shared cache across instances via Upstash when configured.

import { NextResponse } from 'next/server';
import type { Granularity, MarketSnapshot } from '@/lib/types';
import { INTERVALS } from '@/lib/constants';
import { getSnapshotCached } from '@/lib/analysis';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const rawInterval = (sp.get('interval') || '').toLowerCase();
    const interval: Granularity = INTERVALS.includes(rawInterval as Granularity)
      ? (rawInterval as Granularity)
      : '1h';

    const snap = await getSnapshotCached(interval);

    // Trim heavy candle arrays when a `compact` flag is passed (dashboard uses it).
    const compact = sp.get('compact') === '1';
    const payload: MarketSnapshot = compact
      ? {
          generatedAt: snap.generatedAt,
          interval: snap.interval,
          strength: snap.strength,
          warnings: snap.warnings,
          pairs: snap.pairs.map((p) => ({
            ...p,
            candles: p.candles.slice(-48)
          }))
        }
      : snap;

    return NextResponse.json(
      { ...payload, cached: snap.cached, ttl: snap.ttl },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'summary failed' },
      { status: 502 }
    );
  }
}