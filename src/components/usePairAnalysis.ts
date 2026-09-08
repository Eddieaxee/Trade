'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PairAnalysis, PairMTF } from '@/lib/types';

export interface PairAnalysisState {
  data: PairAnalysis | null;
  mtf: PairMTF | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number;
  reload: () => void;
}

/**
 * Fetch a single pair analysis + its multi-timeframe table. A
 * monotonically-increasing `nonce` is appended so the Refresh button always
 * produces a genuine re-fetch even when the server-side cache is still warm.
 */
export function usePairAnalysis(pair: string | null, tf: string): PairAnalysisState {
  const [data, setData] = useState<PairAnalysis | null>(null);
  const [mtf, setMtf] = useState<PairMTF | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!pair) return;
    let alive = true;
    setLoading(true);
    setError(null);
    const pairObj = { symbol: pair, base: pair.slice(0, 3), quote: pair.slice(3) };
    Promise.all([
      fetch(`/api/analysis/pair?pair=${pair}&interval=${tf}&n=${nonce}`, { cache: 'no-store' }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
        return body as PairAnalysis;
      }),
      fetch(`/api/analysis/mtf?pair=${pair}&n=${nonce}`, { cache: 'no-store' }).then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as PairMTF;
      })
    ])
      .then(([analysis, mtfData]) => {
        if (!alive) return;
        setData(analysis);
        setMtf(mtfData);
        setFetchedAt(Date.now());
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Load failed');
          setData(null);
          setMtf(null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [pair, tf, nonce]);

  return { data, mtf, loading, error, fetchedAt, reload };
}