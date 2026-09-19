'use client';

import { useEffect, useState } from 'react';
import type { PairMTF } from '@/lib/types';

const cache = new Map<string, { data: PairMTF; ts: number }>();
const inFlight = new Set<string>();
const TTL = 290_000; // just under the server MTF TTL

function listen(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('mtf-updated', cb);
  return () => window.removeEventListener('mtf-updated', cb);
}

function notify(symbol: string) {
  window.dispatchEvent(new CustomEvent('mtf-updated'));
}

/** Fetch multi-timeframe table for a pair — module-level cache + in-flight dedup
 *  so the 28-row watchlist never fires duplicate requests while scrolling. */
export function useMTF(symbol: string | null) {
  const [mtf, setMtf] = useState<PairMTF | null>(() => (symbol ? cache.get(symbol)?.data ?? null : null));
  const [loaded, setLoaded] = useState<boolean>(() => !!(symbol && cache.get(symbol)));

  useEffect(() => {
    if (!symbol) return;
    const existing = cache.get(symbol);
    if (existing && Date.now() - existing.ts < TTL) {
      setMtf(existing.data);
      setLoaded(true);
      return;
    }
    if (inFlight.has(symbol)) {
      const off = listen(() => {
        const hit = cache.get(symbol);
        if (hit) { setMtf(hit.data); setLoaded(true); }
      });
      return off;
    }
    inFlight.add(symbol);
    fetch(`/api/analysis/mtf?pair=${symbol}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PairMTF | null) => {
        if (data) { cache.set(symbol, { data, ts: Date.now() }); notify(symbol); }
      })
      .finally(() => { inFlight.delete(symbol); setMtf(cache.get(symbol)?.data ?? null); setLoaded(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return { mtf, loaded };
}
