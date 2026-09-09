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
 * Fetch a single pair analysis + its multi-timeframe table.
 * - `nonce` makes the Refresh button a genuine re-fetch (cache-busting).
 * - Auto-polls every 30s so values stay live without manual refresh.
 * - Clears old data instantly when pair/tf changes so the page never shows
 *   stale numbers from the previous timeframe.
 */
const POLL_MS = 30_000;

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
    // Immediate clear on pair/tf switch — no stale values from the old TF.
    setData(null);
    setMtf(null);
    setLoading(true);
    setError(null);
    const load = () => {
      Promise.all([
        fetch(`/api/analysis/pair?pair=${pair}&interval=${tf}&n=${Date.now()}`, { cache: 'no-store' }).then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
          return body as PairAnalysis;
        }),
        fetch(`/api/analysis/mtf?pair=${pair}&n=${Date.now()}`, { cache: 'no-store' }).then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as PairMTF;
        })
      ])
        .then(([analysis, mtfData]) => {
          if (!alive) return;
          setData(analysis);
          setMtf(mtfData);
          setFetchedAt(Date.now());
          setError(null);
        })
        .catch((e: unknown) => {
          if (!alive) return;
          // Keep previous data visible on a background poll failure; only
          // hard-fail the UI when we have nothing to show.
          setData((prev) => {
            if (prev === null) {
              setError(e instanceof Error ? e.message : 'Load failed');
              setMtf(null);
            }
            return prev;
          });
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, tf, nonce]);

  return { data, mtf, loading, error, fetchedAt, reload };
}