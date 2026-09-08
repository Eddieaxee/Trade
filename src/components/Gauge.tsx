/** Semi-circular buy/sell speedometer (pure SVG, no chart libs). */
export default function Gauge({
  score,
  label,
  sub
}: {
  score: number; // -100..100
  label?: string;
  sub?: string;
}) {
  const clamped = Math.max(-100, Math.min(100, score));
  // Map -100..100 → 180°..0° (left = strong sell, right = strong buy).
  const angle = (90 + ((clamped + 100) / 200) * 180) * (Math.PI / 180);
  const cx = 120;
  const cy = 108;
  const r = 88;
  const nx = cx + r * Math.cos(angle);
  const ny = cy - r * Math.sin(angle);
  const color = clamped >= 25 ? 'var(--up)' : clamped <= -25 ? 'var(--down)' : 'var(--warn)';
  const tone = clamped >= 25 ? 'Strong Buy' : clamped >= 10 ? 'Buy' : clamped <= -25 ? 'Strong Sell' : clamped <= -10 ? 'Sell' : 'Neutral';

  // Arc segments: sell (red), neutral (gray), buy (green) — 60° each side of top.
  const arc = (a0: number, a1: number, fill: string) => {
    const rad = (a: number) => ((180 - a) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(rad(a0));
    const y0 = cy - r * Math.sin(rad(a0));
    const x1 = cx + r * Math.cos(rad(a1));
    const y1 = cy - r * Math.sin(rad(a1));
    return (
      <path
        key={`${a0}-${a1}`}
        d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
        stroke={fill}
        strokeWidth="16"
        fill="none"
        strokeLinecap="butt"
      />
    );
  };

  return (
    <div className="gauge-wrap">
      <svg width="240" height="132" viewBox="0 0 240 132" role="img" aria-label={`Gauge ${tone} ${clamped}`}>
        {arc(0, 60, 'rgba(240, 80, 106, 0.75)')}
        {arc(60, 120, 'rgba(125, 135, 152, 0.5)')}
        {arc(120, 180, 'rgba(38, 194, 129, 0.75)')}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6.5" fill="var(--panel)" stroke={color} strokeWidth="2.5" />
        <text x={cx} y={cy - 26} textAnchor="middle" fill="var(--text)" fontSize="24" fontWeight="800" fontFamily="var(--mono)">
          {clamped > 0 ? '+' : ''}{Math.round(clamped)}
        </text>
        <text x={cx} y={cy - 10} textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="var(--mono)">
          {tone}
        </text>
      </svg>
      <div className="gauge-zone-labels">
        <span>Strong Sell</span>
        <span>Neutral</span>
        <span>Strong Buy</span>
      </div>
      {label && (
        <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700 }}>
          {label}
        </div>
      )}
      {sub && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}