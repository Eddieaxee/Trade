/** Dual-sided score bar (-100…100) with center line. */
export default function ScoreBar({ score }: { score: number }) {
  const s = Math.max(-100, Math.min(100, score));
  const cls = s >= 0 ? 'pos' : 'neg';
  const pct = (Math.abs(s) / 100) * 50;
  return (
    <div className={`score-bar ${cls}`} title={`${s >= 0 ? '+' : ''}${Math.round(s)}`}>
      <div className="fill" style={{ width: `${pct}%` }} />
    </div>
  );
}