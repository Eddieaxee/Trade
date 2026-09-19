'use client';

import { useEffect, useRef, useState } from 'react';
import { useMTF } from '@/components/useMTF';

const TFS = ['15m', '1h', '4h'] as const;

function chip(score: number) {
  const tone = score >= 25 ? 'green' : score <= -25 ? 'red' : 'gray';
  const label = score >= 60 ? 'SB' : score >= 25 ? 'B' : score <= -60 ? 'SS' : score <= -25 ? 'S' : 'N';
  return <span className={`chip ${tone}`}>{label}</span>;
}

/** Compact 15m/1h/4h indicator alignment strip — fetches only when visible. */
export default function MTFMini({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const { mtf } = useMTF(visible ? symbol : null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setVisible(true); });
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!mtf) return <div ref={ref} className="mtf-cell"><span className="tone-muted">…</span></div>;

  return (
    <div ref={ref} className="mtf-cell">
      {TFS.map((tf) => {
        const row = mtf.rows.find((r) => r.tf === tf);
        const sc = row ? row.overall.score : 0;
        return (
          <span key={tf} className="mtf-mini" title={`${tf} overall`}>
            {tf}<b style={{ marginLeft: 2 }}>{chip(sc)}</b>
          </span>
        );
      })}
    </div>
  );
}
