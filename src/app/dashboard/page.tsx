'use client';

import { useEffect, useState } from 'react';
import type { Granularity, MarketSnapshot } from '@/lib/types';
import { INTERVALS } from '@/lib/constants';
import { fmtAgo, fmtClock } from '@/lib/utils';
import StrengthBoard from '@/components/StrengthBoard';
import PairTable from '@/components/PairTable';
import SMCCard from '@/components/SMCCard';
import CRTCard from '@/components/CRTCard';
import ConfluenceCard from '@/components/ConfluenceCard';

export default function Dashboard() {
  const [interval, setInterval] = useState<Granularity>('1h');
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  async function load(iv: Granularity, silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/summary?interval=${iv}&compact=1`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as MarketSnapshot;
      setSnapshot(data);
      if (!selected && data.pairs.length) setSelected(data.pairs[0].pair.symbol);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(interval);
    const timer = window.setInterval(() => {
      void load(interval, true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [interval]);

  const sel = snapshot?.pairs.find((p) => p.pair.symbol === selected) ?? snapshot?.pairs[0];
  return (
    <div className="page">
      <div className="dashboard-header">
        <div className="dashboard-title-row">
          <h1 className="page-title">Dashboard</h1>
          <span className="page-sub">Market overview — strongest currencies, top pairs, system bias</span>
        </div>
        <div className="dashboard-controls">
          <div className="interval-nav" role="tablist" aria-label="Chart interval">
            {INTERVALS.map((iv) => (
              <button key={iv} role="tab" aria-selected={interval === iv} className={interval === iv ? 'active' : ''} onClick={() => setInterval(iv)}>
                {iv}
              </button>
            ))}
          </div>
          <div className="header-right">
            {loading && <span className="spinner" aria-label="Loading" />}
            {snapshot && !loading && (
              <span className="pill">{fmtAgo(snapshot.generatedAt)} ago · {snapshot.pairs.length} pairs</span>
            )}
            {snapshot && <span className="pill">{fmtClock(snapshot.generatedAt)}</span>}
            <button onClick={() => void load(interval, true)} className="refresh-btn">Refresh</button>
          </div>
        </div>
      </div>

      {error && <div className="status-bar"><span className="err">⚠ {error}</span></div>}
      {snapshot?.warnings.map((w, i) => <div className="status-bar" key={i}><span className="err">! {w}</span></div>)}

      {!snapshot && !error && (
        <div className="status-bar" style={{ padding: '28px 0' }}>
          <span className="spinner" /> <span>Fetching market data from keyless providers…</span>
        </div>
      )}

      {snapshot && (
        <>
          <div className="panel" style={{ marginBottom: 12 }}>
            <h3>Currency strength — relative 1d/7d decomposition (EUR-based rates)</h3>
            <StrengthBoard strength={snapshot.strength} />
          </div>
          <PairTable snapshot={snapshot} />
          {sel && (
            <div style={{ marginTop: 14 }}>
              <h3 className="section-label">
                {sel.pair.symbol} · {sel.source} · {sel.interval}{sel.confluence.support || sel.confluence.resistance ? ` · S ${sel.confluence.support ?? '—'} / R ${sel.confluence.resistance ?? '—'}` : ''}
              </h3>
              <div className="cards-4">
                <SMCCard analysis={sel} />
                <CRTCard analysis={sel} />
                <ConfluenceCard analysis={sel} />
                <div className="panel">
                  <h3>Market snapshot</h3>
                  <div className="snapshot-grid">
                    <span>Session</span><span className="pill">{sel.interval}</span>
                    <span>Source</span><span className="pill">{sel.source}</span>
                    <span>SMC</span><b>{sel.smc.score > 0 ? '+' : ''}{sel.smc.score}</b>
                    <span>CRT</span><b>{sel.crt.score > 0 ? '+' : ''}{sel.crt.score}</b>
                    <span>Confluence</span><b className={sel.confluence.score >= 0 ? 'up-text' : 'down-text'}>{sel.confluence.score > 0 ? '+' : ''}{sel.confluence.score}</b>
                    <span>Generated</span><b>{fmtAgo(snapshot.generatedAt)} ago</b>
                  </div>
                  <p className="disclaimer">Sentiment-style analytics over historical candles. Not investment advice; this dashboard never routes or executes orders.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}