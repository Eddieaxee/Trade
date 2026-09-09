/** Dual-sided score bar (-100…100) with center line. Never overflows its box. */
export default function ScoreBar({ score }: { score: number }) {
  const s = Math.max(-100, Math.min(100, Number.isFinite(score) ? score : 0));
  const pct = (Math.abs(s) / 100) * 50;
  return (
    <div
      className="score-bar"
      title={`${s > 0 ? '+' : ''}${Math.round(s)}`}
      style={{ position: 'relative', height: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden', width: '100%' }}
    >
      {s >= 0
        ? <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: `${pct}%`, background: 'var(--up)' }} />
        : <div style={{ position: 'absolute', top: 0, bottom: 0, right: '50%', width: `${pct}%`, background: 'var(--down)' }} />}
    </div>
  );
}