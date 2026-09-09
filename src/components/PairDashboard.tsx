'use client';

import Link from 'next/link';
import type { PairAnalysis, PairMTF } from '@/lib/types';
import { fmtPct, fmtPrice } from '@/lib/utils';
import Gauge from '@/components/Gauge';
import ScoreBar from '@/components/ScoreBar';
import { StatRow } from '@/components/SMCDetails';

function BiasCard({ label, score, tone, sub }: { label: string; score: number; tone: string; sub?: string }) {
  return (
    <div className="panel">
      <h3>{label}</h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--mono)', color: tone }}>{score > 0 ? '+' : ''}{score}</span>
        <ScoreBar score={score} />
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MTFCell({ tag }: { tag: { label: string; score: number } }) {
  const color = tag.score >= 25 ? 'var(--up)' : tag.score <= -25 ? 'var(--down)' : 'var(--muted)';
  return (
    <span style={{ color, fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 11.5 }}>
      {tag.label} {tag.score > 0 ? '+' : ''}{tag.score}
    </span>
  );
}

export function MTFTable({ mtf }: { mtf: PairMTF | null }) {
  return (
    <div className="panel">
      <h3>Multi-timeframe table — Indicators / SMC / CRT / Overall</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="grid-table">
          <thead>
            <tr><th>TF</th><th>Indicators</th><th>SMC</th><th>CRT</th><th>Overall</th></tr>
          </thead>
          <tbody>
            {mtf ? mtf.rows.map((r) => (
              <tr key={r.tf}>
                <td style={{ fontWeight: 700 }}>{r.tf}</td>
                <td><MTFCell tag={r.indicators} /></td>
                <td><MTFCell tag={r.smc} /></td>
                <td><MTFCell tag={{ label: r.crt.status === 'confirmed' ? 'Confirmed' : r.crt.status === 'confirming' ? 'Confirming' : r.crt.status === 'invalidated' ? 'Invalidated' : 'Developing', score: r.crt.score }} /></td>
                <td><MTFCell tag={r.overall} /></td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="tone-muted">Multi-timeframe data loading…</td></tr>
            )}
          </tbody>
          {mtf && (
            <tfoot>
              <tr>
                <th>Overall</th>
                <td colSpan={3}></td>
                <td><MTFCell tag={mtf.overall} /></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default function PairDashboard({ a, mtf }: { a: PairAnalysis; mtf: PairMTF | null }) {
  const strengthDelta = a.confluence.factors.find((f) => f.key === 'strength');
  return (
    <>
      <div className="page-head-cards">
        <div className="panel">
          <h3>Current price</h3>
          <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--mono)' }}>{fmtPrice(a.price)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span className={`chip ${a.change24h !== null && a.change24h >= 0 ? 'green' : 'red'}`}>24H {fmtPct(a.change24h)}</span>
            <span className={`chip ${a.change1h !== null && a.change1h >= 0 ? 'green' : 'red'}`}>1H {fmtPct(a.change1h)}</span>
            <span className="chip gray">Spread {a.spread !== null ? fmtPrice(a.spread) : '—'}</span>
            <span className={`chip ${a.volatility === 'high' ? 'red' : a.volatility === 'low' ? 'gray' : 'blue'}`}>Vol {a.volatility}</span>
          </div>
        </div>
        <div className="panel">
          <h3>ATR · volatility</h3>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--mono)' }}>{a.indicators.atr !== null ? fmtPrice(a.indicators.atr) : '—'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
            {a.indicators.readings.find((r) => r.key === 'atr')?.note ?? ''}
          </div>
        </div>
        <div className="panel">
          <h3>Overall confluence</h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Gauge score={a.confluence.score} label={a.confluence.label} sub={`S ${a.confluence.support ?? '—'} · R ${a.confluence.resistance ?? '—'}`} />
          </div>
        </div>
      </div>

      <div className="page-head-cards">
        <BiasCard label={`Currency strength: ${a.pair.base} vs ${a.pair.quote}`} score={strengthDelta ? Math.round(strengthDelta.score * 40) : 0} tone={strengthDelta && strengthDelta.score > 0 ? 'var(--up)' : strengthDelta && strengthDelta.score < 0 ? 'var(--down)' : 'var(--warn)'} sub={strengthDelta?.note} />
        <BiasCard label="SMC bias" score={a.smc.score} tone={a.smc.score > 0 ? 'var(--up)' : a.smc.score < 0 ? 'var(--down)' : 'var(--warn)'} sub={a.smc.trendLabel} />
        <BiasCard label="Indicator bias" score={a.indicators.score} tone={a.indicators.score > 0 ? 'var(--up)' : a.indicators.score < 0 ? 'var(--down)' : 'var(--warn)'} sub={`${a.indicators.bull} bull · ${a.indicators.bear} bear`} />
        <BiasCard label="CRT bias" score={a.crtPhase.score} tone={a.crtPhase.score > 0 ? 'var(--up)' : a.crtPhase.score < 0 ? 'var(--down)' : 'var(--warn)'} sub={`${a.crtPhase.status} · ${a.crtPhase.direction}`} />
      </div>

      <MTFTable mtf={mtf} />

      <div className="panel">
        <h3>Why this conclusion?</h3>
        <ul className="note-list">
          {a.confluence.factors.map((f) => (
            <li key={f.key}>
              <span className={f.score > 0 ? 'tone-up' : f.score < 0 ? 'tone-down' : 'tone-muted'}>{f.label}</span> — {f.note}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <Link className="chip blue" href={`/smc?pair=${a.pair.symbol}`}>SMC details →</Link>
          <Link className="chip blue" href={`/indicators?pair=${a.pair.symbol}`}>Indicator details →</Link>
          <Link className="chip blue" href={`/crt?pair=${a.pair.symbol}`}>CRT details →</Link>
          <Link className="chip blue" href="/strength">Strength matrix →</Link>
        </div>
      </div>
    </>
  );
}