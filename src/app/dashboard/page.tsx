'use client';

import { useEffect, useState } from 'react';
import type { Granularity, MarketSnapshot } from '@/lib/types';
import { INTERVALS } from '@/lib/constants';
import { fmtAgo, fmtClock, fmtPct, fmtPrice } from '@/lib/utils';
import StrengthBoard from '@/components/StrengthBoard';
import PairTable from '@/components/PairTable';
import SMCCard from '@/components/SMCCard';
import CRTCard from '@/components/CRTCard';
import IndicatorsCard from '@/components/IndicatorsCard';
import { getSessions } from '@/components/MarketSessions';
import ScoreBar from '@/components/ScoreBar';

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
  const sessions = getSessions(new Date());

  return (
    <div className="page">
      <div className="dashboard-header">
        <div className="dashboard-title-row">
          <h1 className="page-title">Market Overview</h1>
          <span className="page-sub">Strongest currencies, watchlist, sessions — the whole market at a glance.</span>
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
          <div className="panel" style={{ marginBottom: 10 }}>
            <h3>Market sessions — live</h3>
            <div className="session-panel">
              {sessions.map((s) => (
                <div key={s.city} className={`session-card ${s.status}`}>
                  <div className="sc-city">{s.flag} {s.name}</div>
                  <div className="sc-time">{s.localTime}</div>
                  <div className="sc-range">
                    {s.status === 'open' ? '● Open' : s.status === 'opening-soon' ? '◐ Opening soon' : s.status === 'closing-soon' ? '◑ Closing soon' : '○ Closed'}
                    {' '}· {s.open}:00–{s.close}h UTC
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 12 }}>
            <h3>Currency strength — relative 1d/7d decomposition (EUR-based rates)</h3>
            <StrengthBoard strength={snapshot.strength} />
          </div>

          <PairTable snapshot={snapshot} />
          {sel && (
            <div style={{ marginTop: 14 }}>
              <div className="inspect-head">
                <div className="inspect-id">
                  <h3 className="section-label" style={{ margin: 0, fontSize: 18 }}>{sel.pair.symbol}</h3>
                  <span className="chip gray">{sel.interval}</span>
                  <span className="chip blue">{sel.price !== null ? fmtPrice(sel.price) : '—'}</span>
                  <span className={`chip ${sel.change1h !== null && sel.change1h >= 0 ? 'green' : 'red'}`}>{fmtPct(sel.change1h)} 1h</span>
                </div>
                <div className="inspect-right">
                  <span className="pill" title="Data source">{sel.source}</span>
                  <select
                    className="pair-select"
                    value={selected ?? sel.pair.symbol}
                    onChange={(e) => setSelected(e.target.value)}
                    aria-label="Pick a pair to inspect"
                  >
                    {snapshot.pairs.map((p) => (
                      <option key={p.pair.symbol} value={p.pair.symbol}>{p.pair.symbol}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="inspect-stats">
                <div className="strong-card"><div className="code">Support</div><div className="strong-delta">{sel.confluence.support ? fmtPrice(sel.confluence.support) : '—'}</div></div>
                <div className="strong-card"><div className="code">Resistance</div><div className="strong-delta">{sel.confluence.resistance ? fmtPrice(sel.confluence.resistance) : '—'}</div></div>
                <div className="strong-card"><div className="code">SMC</div><div className="strong-delta">{sel.smc.score > 0 ? '+' : ''}{sel.smc.score}</div></div>
                <div className="strong-card"><div className="code">CRT</div><div className="strong-delta">{sel.crt.score > 0 ? '+' : ''}{sel.crt.score}</div></div>
                <div className="strong-card"><div className="code">Indicators</div><div className={`strong-delta ${sel.indicators.score >= 0 ? 'tone-up' : 'tone-down'}`}>{sel.indicators.score > 0 ? '+' : ''}{sel.indicators.score}</div></div>
                <div className="strong-card"><div className="code">Updated</div><div className="strong-delta">{fmtAgo(snapshot.generatedAt)} ago</div></div>
              </div>
              <div className="cards-4">
                <SMCCard analysis={sel} />
                <CRTCard analysis={sel} />
                <IndicatorsCard analysis={sel} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}