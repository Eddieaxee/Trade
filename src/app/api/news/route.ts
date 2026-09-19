import { NextResponse } from 'next/server';
import { getNewsRoom } from '@/lib/news';

export const dynamic = 'force-dynamic';

/** Aggregated macro feed + live technical alerts + economic calendar. */
export async function GET() {
  try {
    const room = await getNewsRoom();
    return NextResponse.json(room, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'newsroom unavailable';
    return NextResponse.json(
      { error: msg, items: [], alerts: [], calendar: [], notes: [msg] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
