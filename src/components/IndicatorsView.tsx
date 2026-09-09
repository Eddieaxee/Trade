'use client';

import Link from 'next/link';
import type { IndicatorBundle, IndicatorReading, PairAnalysis } from '@/lib/types';
import { fmtAgo, fmtPrice } from '@/lib/utils';
import ScoreBar from '@/components/ScoreBar';
import Gauge from '@/components/Gauge';

const sigTone = (s: IndicatorReading['signal']) =>
  s === 'buy' ? 'tone-up' : s === 'sell' ? 'tone-down' : 'tone-muted';
const sigChip = (s: IndicatorReading['signal']) =>
  s === 'buy' ? <span className="chip green">BUY</span> : s === 'sell' ? <span className="chip red">SELL</span> : <span className="chip gray">NEUT</span>;

export function IndicatorTable({ ind }: { ind: IndicatorBundle }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="grid-table">
        <thead>
          <tr><th>Indicator</th><th>Value</th><th>Signal</th><th>Strength</th><th>Note</th></tr>
        </thead>
        <tbody>
          {ind.readings.map((r) => (
            <tr key={r.key}>
              <td>{r.name}</td>
              <td style={{ fontFamily: 'var(--mono)' }}>{r.value}</td>
              <td>{sigChip(r.signal)}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 50 }}><ScoreBar score={r.signal === 'buy' ? r.strength * 100 : r.signal === 'sell' ? -r.strength * 100 : 0} /></div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{Math.round(r.strength * 100)}%</span>
                </div>
              </td>
              <td className="tone-muted" style={{ fontSize: 11.5 }}>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IndicatorSummary({ ind }: { ind: IndicatorBundle }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      <div className="strong-card">
        <div className="code">Bullish</div>
        <div className="strong-delta tone-up">{ind.bull} signals</div>
      </div>
      <div className="strong-card">
        <div className="code">Bearish</div>
        <div className="strong-delta tone-down">{ind.bear} signals</div>
      </div>
      <div className="strong-card">
        <div className="code">Neutral</div>
        <div className="strong-delta tone-muted">{ind.neutral} signals</div>
      </div>
      <div className="strong-card">
        <div className="code">ATR</div>
        <div className="strong-delta">{ind.atr !== null ? fmtPrice(ind.atr) : '—'}</div>
      </div>
    </div>
  );
}

export default function IndicatorsView({ a }: { a: PairAnalysis }) {
  const { indicators: ind } = a;
  return (
    <>
      <div className="panel">
        <h3>Buy / Sell speedometer</h3>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Gauge score={ind.score} label="Overall technical bias" sub={`${ind.bull} bull · ${ind.bear} bear · ${ind.neutral} neutral`} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <span className={`chip ${ind.score >= 25 ? 'green' : ind.score <= -25 ? 'red' : 'gray'}`}>{ind.label}</span>
        </div>
      </div>

      <div className="panel">
        <h3>Signal histogram</h3>
        <div className="hbar">
          <div className="row">
            <span className="lb">Bullish</span>
            <span className="track"><span className="mid" /><span className="f" style={{ left: '50%', width: `${Math.min(50, (ind.bull / Math.max(1, ind.readings.length)) * 50)}%`, background: 'var(--up)' }} /></span>
            <span className="vl tone-up">{ind.bull}</span>
          </div>
          <div className="row">
            <span className="lb">Bearish</span>
            <span className="track"><span className="mid" /><span className="f" style={{ right: '50%', width: `${Math.min(50, (ind.bear / Math.max(1, ind.readings.length)) * 50)}%`, background: 'var(--down)' }} /></span>
            <span className="vl tone-down">{ind.bear}</span>
          </div>
          <div className="row">
            <span className="lb">Neutral</span>
            <span className="track"><span className="mid" /><span className="f" style={{ left: '50%', width: `${Math.min(50, (ind.neutral / Math.max(1, ind.readings.length)) * 50)}%`, background: 'var(--muted)' }} /></span>
            <span className="vl tone-muted">{ind.neutral}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>All indicators</h3>
        <IndicatorTable ind={ind} />
      </div>

      <div className="panel">
        <h3>Engine read-out</h3>
        <IndicatorSummary ind={ind} />
        <ul className="note-list" style={{ marginTop: 10 }}>
          {ind.drivers.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
        <div style={{ marginTop: 10 }}>
          <Link className="chip blue" href={`/pair/${a.pair.symbol}`}>Full pair dashboard →</Link>
        </div>
      </div>
    </>
  );
}