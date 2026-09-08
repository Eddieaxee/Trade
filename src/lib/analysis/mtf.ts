// ── Multi-timeframe pair table: Indicators / SMC / CRT / Overall per TF ──────

import type { Granularity, Pair, PairMTF, SignalTag } from '@/lib/types';
import { MTF_TFS, TTL_MTF } from '@/lib/constants';
import { cacheGet, cacheKey, cacheSet } from '@/lib/cache';
import { getCandlesCached } from '@/lib/providers';
import { analyzeSMC } from '@/lib/analysis/smc';
import { analyzeCRTPhase } from '@/lib/analysis/crt';
import { buildIndicators } from '@/lib/analysis/indicators';
import { clamp } from '@/lib/utils';

export function tagFromScore(score: number): SignalTag {
  return {
    label: score >= 60 ? 'Strong Buy' : score >= 25 ? 'Buy' : score <= -60 ? 'Strong Sell' : score <= -25 ? 'Sell' : 'Neutral',
    score: clamp(Math.round(score), -100, 100)
  };
}

/** Weighted blend of the three systems for a single timeframe. */
function blendTF(ind: number, smc: number, crt: number): number {
  return ind * 0.34 + smc * 0.33 + crt * 0.33;
}

const TF_WEIGHTS: Partial<Record<Granularity, number>> = {
  '15m': 0.1,
  '30m': 0.15,
  '1h': 0.25,
  '4h': 0.25,
  '1d': 0.25
};

export async function buildPairMTF(pair: Pair): Promise<PairMTF> {
  const settled = await Promise.allSettled(
    MTF_TFS.map(async (tf) => {
      const { candles } = await getCandlesCached(pair, tf);
      if (candles.length < 12) throw new Error(`${tf}: too few candles`);
      const smc = analyzeSMC(candles);
      const crtPhase = analyzeCRTPhase(candles);
      const ind = buildIndicators(candles);
      const raw = blendTF(ind.score, smc.score, crtPhase.score);
      return {
        tf,
        indicators: tagFromScore(ind.score),
        smc: tagFromScore(smc.score),
        crt: { ...tagFromScore(crtPhase.score), status: crtPhase.status },
        raw
      };
    })
  );

  const rows = [];
  let totalW = 0;
  let blended = 0;
  for (const s of settled) {
    if (s.status === 'fulfilled') {
      const { tf, indicators, smc, crt, raw } = s.value;
      rows.push({ tf, indicators, smc, crt, overall: tagFromScore(raw) });
      const w = TF_WEIGHTS[tf] ?? 0.2;
      totalW += w;
      blended += raw * w;
    }
  }
  if (!rows.length) throw new Error('all timeframes failed for MTF table');

  return {
    pair,
    rows,
    overall: tagFromScore(blended / (totalW || 1)),
    generatedAt: Date.now() / 1000
  };
}

const MTF_KEY = (symbol: string): string => cacheKey('mtf', 'v1', symbol);

export async function getPairMTFCached(pair: Pair): Promise<PairMTF> {
  const key = MTF_KEY(pair.symbol);
  const hit = await cacheGet<PairMTF>(key);
  if (hit && hit.rows && hit.rows.length) return hit;
  const fresh = await buildPairMTF(pair);
  await cacheSet(key, fresh, TTL_MTF);
  return fresh;
}