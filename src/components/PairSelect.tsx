'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CURRENCIES, TF_MAIN } from '@/lib/constants';

export const ALL_PAIR_SYMBOLS: string[] = (() => {
  const out: string[] = [];
  for (let i = 0; i < CURRENCIES.length; i++) {
    for (let j = i + 1; j < CURRENCIES.length; j++) {
      out.push(CURRENCIES[i] + CURRENCIES[j]);
    }
  }
  return out;
})();

/**
 * Pair + timeframe selectors wired to URL query params (?pair=EURUSD&tf=1h).
 * Every analysis page gets its own independent pair/TF state, shareable by URL.
 */
export default function PairSelect({
  defaultPair = 'EURUSD',
  defaultTf = '1h',
  tfLabel = 'Timeframe'
}: {
  defaultPair?: string;
  defaultTf?: string;
  tfLabel?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pair = sp.get('pair') || defaultPair;
  const tf = sp.get('tf') || defaultTf;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set(key, value);
    router.push(`?${next.toString()}`, { scroll: false });
  };

  return (
    <div>
      <div className="selector-row">
        <span className="sel-label">Pair</span>
        <div className="sel-group" role="listbox" aria-label="Select pair">
          {ALL_PAIR_SYMBOLS.map((s) => (
            <button
              key={s}
              className={pair === s ? 'sel-btn active' : 'sel-btn'}
              onClick={() => setParam('pair', s)}
            >
              {s.slice(0, 3)}/{s.slice(3)}
            </button>
          ))}
        </div>
      </div>
      <div className="selector-row">
        <span className="sel-label">{tfLabel}</span>
        <div className="sel-group" role="listbox" aria-label="Select timeframe">
          {TF_MAIN.map((t) => (
            <button
              key={t}
              className={tf === t ? 'sel-btn active' : 'sel-btn'}
              onClick={() => setParam('tf', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Read the current pair/tf params with defaults (client side). */
export function readParams(
  sp: URLSearchParams,
  defaultPair = 'EURUSD',
  defaultTf = '1h'
): { pair: string; tf: string } {
  const rawPair = (sp.get('pair') || defaultPair).toUpperCase();
  const pair = ALL_PAIR_SYMBOLS.includes(rawPair) ? rawPair : defaultPair;
  const rawTf = sp.get('tf') || defaultTf;
  const tf = TF_MAIN.includes(rawTf as (typeof TF_MAIN)[number]) ? rawTf : defaultTf;
  return { pair, tf };
}