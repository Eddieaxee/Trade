import { NextResponse } from 'next/server';
import { getNewsRoom } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const room = await getNewsRoom();
    return NextResponse.json(room, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'newsroom unavailable' },
      { status: 503 }
    );
  }
}
