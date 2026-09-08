'use client';

import { useEffect, useState } from 'react';

/**
 * Mini cartoon face that follows the mouse (desktop only).
 * Drawn with CSS/SVG — eyes track the cursor, expression shifts subtly.
 */
export default function CartoonFace() {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [smooth, setSmooth] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    // Only enable on non-touch / desktop
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('pointermove', onMove);

    let raf = 0;
    const tick = () => {
      setSmooth((s) => ({
        x: s.x + (pos.x - s.x) * 0.08,
        y: s.y + (pos.y - s.y) * 0.08
      }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [pos]);

  // Eye offset based on cursor (-1..1)
  const ex = (smooth.x - 0.5) * 8;
  const ey = (smooth.y - 0.5) * 5;

  // Subtle blink every few seconds
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cartoon-face" aria-hidden="true">
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        {/* Head */}
        <defs>
          <radialGradient id="faceGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#1a2030" />
            <stop offset="100%" stopColor="#0d1018" />
          </radialGradient>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3aa5ff" />
            <stop offset="100%" stopColor="#26c281" />
          </linearGradient>
        </defs>

        {/* Glow ring */}
        <circle cx="60" cy="60" r="56" fill="none" stroke="url(#ringGrad)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="60" cy="60" r="50" fill="url(#faceGrad)" stroke="#1f2737" strokeWidth="1" />

        {/* Left eye */}
        <g transform={`translate(${ex}, ${ey})`}>
          <ellipse cx="42" cy="52" rx="9" ry={blink ? 1 : 10} fill="#0b0e14" stroke="#3aa5ff" strokeWidth="1.2" />
          {!blink && <circle cx={42 + ex * 0.3} cy={52 + ey * 0.3} r="4" fill="#3aa5ff" />}
          {!blink && <circle cx={43 + ex * 0.3} cy={50 + ey * 0.3} r="1.5" fill="#fff" />}
        </g>

        {/* Right eye */}
        <g transform={`translate(${ex}, ${ey})`}>
          <ellipse cx="78" cy="52" rx="9" ry={blink ? 1 : 10} fill="#0b0e14" stroke="#3aa5ff" strokeWidth="1.2" />
          {!blink && <circle cx={78 + ex * 0.3} cy={52 + ey * 0.3} r="4" fill="#3aa5ff" />}
          {!blink && <circle cx={79 + ex * 0.3} cy={50 + ey * 0.3} r="1.5" fill="#fff" />}
        </g>

        {/* Mouth — subtle smile that widens when looking down, frowns when looking up */}
        <path
          d={smooth.y > 0.6
            ? 'M 42 78 Q 60 88 78 78'
            : smooth.y < 0.4
              ? 'M 42 82 Q 60 74 78 82'
              : 'M 44 80 Q 60 86 76 80'
          }
          fill="none"
          stroke="#3aa5ff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Antenna / data fin */}
        <line x1="60" y1="10" x2="60" y2="0" stroke="#3aa5ff" strokeWidth="1.5" opacity="0.6" />
        <circle cx="60" cy="-2" r="3" fill="#3aa5ff" opacity="0.7" />
      </svg>
    </div>
  );
}