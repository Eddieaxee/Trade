'use client';

import Link from 'next/link';
import type { CRT, CRTPhase, CRTStatus, PairAnalysis } from '@/lib/types';
import { fmtAgo, fmtPrice } from '@/lib/utils';
import ScoreBar from '@/components/ScoreBar';

const statusChip = (s: CRTStatus) =>
  s === 'confirmed' ? <span className="chip green">CONFIRMED</span>
  : s === 'confirming' ? <span className="chip blue">CONFIRMING</span>
  : s === 'invalidated' ? <span className="chip red">INVALIDATED</span>
  : <span className="chip gray">DEVELOPING</span>;

const dirChip = (d: string) =>
  d === 'bullish' ? <span className="chip green">BULLISH</span>
  : d === 'bearish' ? <span className="chip red">BEARISH</span>
  : <span className="chip gray">NEUTRAL</span>;

function BoolRow({ k, v }: { k: string; v: boolean }) {
  return (
    <div className="zone-row">
      <span>{k}</span>
      <span>{v ? <span className="chip green">YES</span> : <span className="chip gray">no</span>}</span>
    </div>
  );
}

function CRTPhaseDiagram({ phase }: { phase: CRTPhase }) {
  const hi = phase.rangeHigh;
  const lo = phase.rangeLow;
  if (hi === null || lo === null) return null;
  const rng = hi - lo || 1;
  const midPct = phase.rangeMid !== null ? ((phase.rangeMid - lo) / rng) * 100 : 50;
  const sweepPct = phase.sweep === 'high' ? 100 : phase.sweep === 'low' ? 0 : null;
  return (
    <div>
      <div className="pd-track">
        <div className="pd-marker" style={{ left: `${midPct}%` }} />
        {sweepPct !== null && <div className="pd-marker" style={{ left: `${sweepPct}%`, background: 'var(--down)' }} />}
      </div>
      <div className="gauge-zone-labels" style={{ marginTop: 2 }}>
        <span>Range low {fmtPrice(lo)}</span>
        <span>Mid {phase.rangeMid !== null ? fmtPrice(phase.rangeMid) : '—'}</span>
        <span>Range high {fmtPrice(hi)}</span>
      </div>
    </div>
  );
}

function CRTPhaseView({ phase }: { phase: CRTPhase }) {
  return (
    <>
      <div className="panel">
        <h3>CRT phase model</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          {statusChip(phase.status)}
          {dirChip(phase.direction)}
          <span style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 700 }}>
            {phase.score > 0 ? '+' : ''}{phase.score}
          </span>
        </div>
        <ScoreBar score={phase.score} />
        <CRTPhaseDiagram phase={phase} />
        <div style={{ marginTop: 10 }}>
          <BoolRow k="Manipulation wick" v={phase.manipulation} />
          <BoolRow k="Liquidity sweep" v={phase.sweep !== null} />
          <BoolRow k="Reclaim" v={phase.reclaim} />
          <BoolRow k="Displacement" v={phase.displacement} />
          <BoolRow k="Confirmation" v={phase.confirmation} />
          <BoolRow k="Invalidated" v={phase.invalidated} />
        </div>
      </div>

      <div className="panel">
        <h3>Phase read-out</h3>
        <ul className="note-list">
          {phase.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </>
  );
}

function CRTStatsView({ crt }: { crt: CRT }) {
  return (
    <>
      <div className="panel">
        <h3>Range &amp; body analysis</h3>
        <div className="zone-row"><span>Range mode</span><span className="chip blue">{crt.rangeMode.toUpperCase()}</span></div>
        <div className="zone-row"><span>Expansion</span><span>{crt.expansion ? <span className="chip green">EXPANDING {crt.expansionRatio}×</span> : <span className="chip gray">no</span>}</span></div>
        <div className="zone-row"><span>Contraction</span><span>{crt.contraction ? <span className="chip red">CONTRACTING {crt.expansionRatio}×</span> : <span className="chip gray">no</span>}</span></div>
        <div className="zone-row"><span>Body strength</span><b>{Math.round(crt.bodyStrength * 100)}%</b></div>
        <div className="zone-row"><span>Wick imbalance</span><b className={crt.wickImbalance >= 0 ? 'tone-up' : 'tone-down'}>{crt.wickImbalance > 0 ? '+' : ''}{(crt.wickImbalance * 100).toFixed(0)}%</b></div>
        <div className="zone-row"><span>Open FVGs</span><b>{crt.fvgs.length}</b></div>
        <div className="zone-row"><span>Last FVG</span><b>{crt.lastFVG ? `${crt.lastFVG.side === 'up' ? '↑' : '↓'} ${fmtPrice(crt.lastFVG.bottom)}–${fmtPrice(crt.lastFVG.top)}` : 'none'}</b></div>
      </div>

      <div className="panel">
        <h3>Engine read-out</h3>
        <div style={{ marginBottom: 8 }}><ScoreBar score={crt.score} /></div>
        <ul className="note-list">
          {crt.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </>
  );
}

export default function CRTView({ a }: { a: PairAnalysis }) {
  return (
    <>
      <CRTPhaseView phase={a.crtPhase} />
      <CRTStatsView crt={a.crt} />
      <div className="panel">
        <div style={{ marginTop: 10 }}>
          <Link className="chip blue" href={`/pair/${a.pair.symbol}`}>Full pair dashboard →</Link>
        </div>
      </div>
    </>
  );
}