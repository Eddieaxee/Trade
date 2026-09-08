// GET /api/cron/refresh — Vercel scheduled warm-up of shared snapshot caches.
// Auth: Authorization: Bearer <CRON_SECRET>  (or ?secret=<CRON_SECRET>).
// Without a configured secret this endpoint refuses to run.

import { NextResponse } from 'next/server';
import { CRON_SECRET, INTERVALS, TTL_SNAPSHOT } from '@/lib/constants';
import { getSnapshotCached } from '@/lib/analysis';

export const dynamic = 'force-dynamic';

function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorized(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const header = req.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const query = new URL(req.url).searchParams.get('secret') || '';
  return (bearer.length > 0 && timingSafeEqual(bearer, CRON_SECRET)) ||
    (query.length > 0 && timingSafeEqual(query, CRON_SECRET));
}

export async function GET(req: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 503 }
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const jobs = await Promise.allSettled(
    INTERVALS.map(async (interval) => {
      const t0 = Date.now();
      const snap = await getSnapshotCached(interval);
      return { interval, ok: true, msec: Date.now() - t0, points: snap.pairs.length, cached: snap.cached };
    })
  );

  const results = jobs.map((j) =>
    j.status === 'fulfilled'
      ? j.value
      : { interval: '?', ok: false, msec: -1, error: j.reason instanceof Error ? j.reason.message : String(j.reason) }
  );

  return NextResponse.json(
    {
      ok: results.every((r) => r.ok),
      at: Date.now() / 1000,
      elapsedMs: Date.now() - started,
      ttl: TTL_SNAPSHOT,
      jobs: results
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}