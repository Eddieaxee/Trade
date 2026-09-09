import { NextResponse } from 'next/server';
import { getStrengthMatrixCached } from '@/lib/analysis/matrix';

export const dynamic = 'force-dynamic';

/** Live currency-strength matrix for client-side polling. */
export async function GET() {
  try {
    const matrix = await getStrengthMatrixCached();
    return NextResponse.json(matrix, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'matrix unavailable' },
      { status: 503 }
    );
  }
}
