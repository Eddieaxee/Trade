'use client';

import { useMemo } from 'react';
import type { Candle } from '@/lib/types';

/** Minimal SVG sparkline of close prices — no charting dependency. */
export default function Sparkline({ candles, width = 96, height = 26 }: { candles: Candle[]; width?: number; height?: number }) {
  const points = useMemo(() => {
    if (!candles.length) return '';
    const closes = candles.map((c) => c.c);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const step = width / Math.max(closes.length - 1, 1);
    return closes
      .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / span) * (height - 2) - 1).toFixed(2)}`)
      .join(' ');
  }, [candles, width, height]);

  const up = candles.length >= 2 && candles[candles.length - 1].c >= candles[candles.length - 2].c;

  if (!points) return <svg className="spark" width={width} height={height} aria-hidden="true" />;

  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={up ? 'var(--up)' : 'var(--down)'}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}