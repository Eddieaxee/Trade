'use client';

/** Polar helpers — angle in degrees where 0° = right, 180° = left, 90° = top. */
function pt(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
}

/**
 * Proper semi-circular buy/sell speedometer.
 * - 0° (right) = Strong Buy, 180° (left) = Strong Sell, 90° (top) = Neutral.
 * The needle maps score ∈ [-100,100] → [180°, 0°] linearly and never leaves
 * the arc. Zones are drawn as real path arcs (not hand-wavey "A" tricks).
 */
export default function Gauge({
  score,
  label,
  sub
}: {
  score: number;
  label?: string;
  sub?: string;
}) {
  const clamped = Math.max(-100, Math.min(100, Number.isFinite(score) ? score : 0));
  const cx = 120;
  const cy = 110;
  const r = 88;

  // Score → needle angle. -100 → 180° (left/Sell), +100 → 0° (right/Buy).
  const needleDeg = 180 - ((clamped + 100) / 200) * 180;
  const [nx, ny] = pt(cx, cy, r - 14, needleDeg);

  const color = clamped >= 25 ? 'var(--up)' : clamped <= -25 ? 'var(--down)' : 'var(--warn)';
  const tone =
    clamped >= 60 ? 'Strong Buy' :
    clamped >= 25 ? 'Buy' :
    clamped >= 10 ? 'Lean Buy' :
    clamped <= -60 ? 'Strong Sell' :
    clamped <= -25 ? 'Sell' :
    clamped <= -10 ? 'Lean Sell' : 'Neutral';

  // Zone sweeps: sell (180→110), neutral (110→70), buy (70→0).
  const zones: Array<[number, number, string]> = [
    [180, 110, 'rgba(240, 80, 106, 0.85)'],
    [110, 70, 'rgba(125, 135, 152, 0.55)'],
    [70, 0, 'rgba(38, 194, 129, 0.85)']
  ];

  // Major tick marks at 15° intervals.
  const ticks: Array<{ deg: number; major: boolean }> = [];
  for (let d = 0; d <= 180; d += 15) ticks.push({ deg: d, major: d % 45 === 0 });

  return (
    <div className="gauge-wrap">
      <svg width="240" height="150" viewBox="0 0 240 150" role="img" aria-label={`Gauge ${tone} ${clamped}`}>
        {/* Zone arcs */}
        {zones.map(([a0, a1, fill]) => {
          const [x0, y0] = pt(cx, cy, r, a0);
          const [x1, y1] = pt(cx, cy, r, a1);
          return (
            <path
              key={`${a0}-${a1}`}
              d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
              stroke={fill}
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
        {/* Neutral centre line */}
        {(() => {
          const [ux, uy] = pt(cx, cy, r + 8, 90);
          const [dx, dy] = pt(cx, cy, r - 20, 90);
          return <line x1={ux} y1={uy} x2={dx} y2={dy} stroke="rgba(125,135,152,0.5)" strokeWidth="2" strokeDasharray="4 3" />;
        })()}
        {/* Tick marks */}
        {ticks.map((t) => {
          const [x0, y0] = pt(cx, cy, r - 10, t.deg);
          const [x1, y1] = pt(cx, cy, r - (t.major ? 20 : 15), t.deg);
          return <line key={t.deg} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(125,135,152,0.6)" strokeWidth={t.major ? 2 : 1} />;
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="4" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="7" fill="var(--panel)" stroke={color} strokeWidth="3" />
        {/* Labels */}
        <text x={cx} y={cy - 34} textAnchor="middle" fill="var(--text)" fontSize="26" fontWeight="800" fontFamily="var(--mono)">
          {clamped > 0 ? '+' : ''}{Math.round(clamped)}
        </text>
        <text x={cx} y={cy - 16} textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="var(--mono)">
          {tone}
        </text>
      </svg>
      <div className="gauge-zone-labels">
        <span>Strong Sell</span>
        <span>Neutral</span>
        <span>Strong Buy</span>
      </div>
      {label && <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700 }}>{label}</div>}
      {sub && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}