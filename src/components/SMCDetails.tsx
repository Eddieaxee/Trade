'use client';

import type { PairAnalysis } from '@/lib/types';
import { fmtAgo, fmtPrice } from '@/lib/utils';
import ScoreBar from '@/components/ScoreBar';

export function StatRow({ k, v, tone }: { k: string; v: React.ReactNode; tone?: string }) {
  return (
    <div className="zone-row">
      <span>{k}</span>
      <span className={tone ?? ''}>{v}</span>
    </div>
  );
}

/** Full SMC breakdown panels for an analysed pair (column 1). */
export default function SMCDetails({ a }: { a: PairAnalysis }) {
  const { smc } = a;
  const dir = (d?: string) => (d === 'up' ? '↑' : d === 'down' ? '↓' : '');
  return (
    <>
      <div className="panel">
        <h3>Market structure — swing classification</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr><th>#</th><th>Swing</th><th>Label</th><th>Price</th><th>Time</th></tr>
            </thead>
            <tbody>
              {smc.swingLabels.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{s.kind === 'high' ? 'Swing High' : 'Swing Low'}</td>
                  <td>
                    <span className={`chip ${s.label === 'HH' || s.label === 'HL' ? 'green' : 'red'}`}>{s.label}</span>
                  </td>
                  <td>{fmtPrice(s.price)}</td>
                  <td className="tone-muted">{fmtAgo(s.t)} ago</td>
                </tr>
              ))}
              {!smc.swingLabels.length && (
                <tr><td colSpan={5} className="tone-muted">Not enough swings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <StatRow k="Structure trend" v={smc.trendLabel} tone={smc.trend === 'bullish' ? 'tone-up' : smc.trend === 'bearish' ? 'tone-down' : ''} />
      </div>

      <div className="panel">
        <h3>Breaks &amp; shifts</h3>
        <StatRow k="Last BOS" v={smc.lastBOS ? `${dir(smc.lastBOS.direction)} ${fmtPrice(smc.lastBOS.price)} · ${fmtAgo(smc.lastBOS.t)} ago` : '—'} tone={smc.lastBOS?.direction === 'up' ? 'tone-up' : 'tone-down'} />
        <StatRow k="Last CHoCH" v={smc.lastCHoCH ? `${dir(smc.lastCHoCH.direction)} ${fmtPrice(smc.lastCHoCH.price)} · ${fmtAgo(smc.lastCHoCH.t)} ago` : '—'} tone={smc.lastCHoCH?.direction === 'up' ? 'tone-up' : 'tone-down'} />
        <StatRow k="Last MSS" v={smc.lastMSS ? `${dir(smc.lastMSS.direction)} ${fmtPrice(smc.lastMSS.price)} (close-confirmed) · ${fmtAgo(smc.lastMSS.t)} ago` : '—'} tone={smc.lastMSS?.direction === 'up' ? 'tone-up' : 'tone-down'} />
      </div>

      <div className="panel">
        <h3>Liquidity map — buy-side vs sell-side</h3>
        {smc.equalHighs.map((e, i) => (
          <StatRow key={`h${i}`} k={`EQH ×${e.touches} (buy-side pool)`} v={`↑ ${fmtPrice(e.price)}`} tone="tone-down" />
        ))}
        {smc.equalLows.map((e, i) => (
          <StatRow key={`l${i}`} k={`EQL ×${e.touches} (sell-side pool)`} v={`↓ ${fmtPrice(e.price)}`} tone="tone-up" />
        ))}
        {!smc.equalHighs.length && !smc.equalLows.length && (
          <p className="tone-muted" style={{ fontSize: 12 }}>No equal-high/low pools in the window.</p>
        )}
        <div className="hbar" style={{ marginTop: 10 }}>
          {smc.liquidity.slice(0, 6).map((l, i) => (
            <div className="row" key={i}>
              <span className="lb">{l.label}</span>
              <span className="track">
                <span className="mid" />
                <span className="f" style={{ left: l.side === 'above' ? '50%' : `${50 - Math.min(50, l.weight * 16)}%`, width: `${Math.min(50, l.weight * 16)}%`, background: l.side === 'above' ? 'var(--down)' : 'var(--up)' }} />
              </span>
              <span className="vl">{fmtPrice(l.price)}</span>
            </div>
          ))}
        </div>
        <StatRow k="Stop hunts (sweeps)" v={smc.stopHunts.length ? `${smc.stopHunts.length} recent — ${smc.stopHunts.map((h) => h.side).join(', ')}` : 'none detected'} />
      </div>
    </>
  );
}

function chip(v: boolean, yes: string, no: string): JSX.Element {
  return v ? <span className="chip green">{yes}</span> : <span className="chip gray">{no}</span>;
}

/** Blocks / displacement / premium-discount / read-out panels (column 2). */
export function SMCBlocksAndZones({ a }: { a: PairAnalysis }) {
  const { smc } = a;
  return (
    <>
      <div className="panel">
        <h3>Order blocks · breakers · displacement</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr><th>Type</th><th>Side</th><th>Price</th><th>State</th><th>Age</th></tr>
            </thead>
            <tbody>
              {smc.orderBlocks.map((b, i) => (
                <tr key={`ob${i}`}>
                  <td>Order block</td>
                  <td>{b.side === 'buy' ? <span className="chip green">BUY</span> : <span className="chip red">SELL</span>}</td>
                  <td>{fmtPrice(b.price)}</td>
                  <td>{chip(!b.removed, 'fresh', 'mitigated')}</td>
                  <td className="tone-muted">{fmtAgo(b.t)} ago</td>
                </tr>
              ))}
              {smc.breakers.map((b, i) => (
                <tr key={`br${i}`}>
                  <td>Breaker / mitigation</td>
                  <td>{b.side === 'buy' ? <span className="chip green">BUY</span> : <span className="chip red">SELL</span>}</td>
                  <td>{fmtPrice(b.price)}</td>
                  <td><span className="chip blue">polarity flipped</span></td>
                  <td className="tone-muted">{fmtAgo(b.t)} ago</td>
                </tr>
              ))}
              {!smc.orderBlocks.length && !smc.breakers.length && (
                <tr><td colSpan={5} className="tone-muted">No blocks in window.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <StatRow
          k="Latest displacement"
          v={smc.displacement.length
            ? `${smc.displacement[smc.displacement.length - 1].direction === 'up' ? '↑ bullish' : '↓ bearish'} · body ${Math.round(smc.displacement[smc.displacement.length - 1].bodyPct * 100)}% · ${smc.displacement[smc.displacement.length - 1].sizePct}× median range`
            : 'none'}
        />
        <StatRow k="Demand (nearest)" v={smc.demandZones.length ? `${fmtPrice(smc.demandZones[smc.demandZones.length - 1][0])} – ${fmtPrice(smc.demandZones[smc.demandZones.length - 1][1])}` : '—'} tone="tone-up" />
        <StatRow k="Supply (nearest)" v={smc.supplyZones.length ? `${fmtPrice(smc.supplyZones[0][0])} – ${fmtPrice(smc.supplyZones[0][1])}` : '—'} tone="tone-down" />
      </div>

      <div className="panel">
        <h3>Premium / discount &amp; previous highs-lows</h3>
        {smc.pd && (
          <>
            <div className="pd-track">
              <div className="pd-marker" style={{ left: `${smc.pd.posPct * 100}%` }} />
            </div>
            <div className="gauge-zone-labels" style={{ marginTop: 2 }}>
              <span>Discount {fmtPrice(smc.pd.low)}</span>
              <span>EQ {fmtPrice(smc.pd.eq)} · {smc.pd.zone.toUpperCase()}</span>
              <span>Premium {fmtPrice(smc.pd.high)}</span>
            </div>
          </>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6, marginTop: 10 }}>
          {smc.prevHL.map((h) => (
            <div className="strong-card" key={h.label}>
              <div className="code">{h.label}</div>
              <div className="strong-delta">{fmtPrice(h.price)} · {fmtAgo(h.t)} ago</div>
            </div>
          ))}
          {!smc.prevHL.length && <span className="tone-muted" style={{ fontSize: 12 }}>Daily/weekly references unavailable for this timeframe.</span>}
        </div>
      </div>

      <div className="panel">
        <h3>Engine read-out</h3>
        <div style={{ marginBottom: 8 }}><ScoreBar score={smc.score} /></div>
        <ul className="note-list">
          {smc.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </>
  );
}