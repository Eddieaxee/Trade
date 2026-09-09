'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Mini cartoon face that follows the mouse (desktop only).
 * Uses window listeners + refs (not per-frame state churn) so the eyes
 * track the cursor smoothly. On touch devices the face simply floats.
 */
export default function CartoonFace() {
  const target = useRef({ x: 0.5, y: 0.5 });
  const cur = useRef({ x: 0.5, y: 0.5 });
  const [smooth, setSmooth] = useState({ x: 0.5, y: 0.5 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    // Coarse-pointer (touch) detection — never assume matchMedia exists.
    let coarse = false;
    try {
      coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    } catch {
      coarse = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    }
    if (coarse) return;

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('pointermove', onMove as EventListener, { passive: true });
    window.addEventListener('mousemove', onMove as EventListener, { passive: true });

    let raf = 0;
    const tick = () => {
      const c = cur.current;
      const tgt = target.current;
      const nx = c.x + (tgt.x - c.x) * 0.08;
      const ny = c.y + (tgt.y - c.y) * 0.08;
      if (Math.abs(nx - c.x) > 0.0002 || Math.abs(ny - c.y) > 0.0002) {
        cur.current = { x: nx, y: ny };
        setSmooth({ x: nx, y: ny });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove as EventListener);
      window.removeEventListener('mousemove', onMove as EventListener);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Blink every 3.5–5.5s.
  useEffect(() => {
    let close: number;
    const interval = window.setInterval(() => {
      setBlink(true);
      close = window.setTimeout(() => setBlink(false), 150);
    }, 3500 + Math.random() * 2000);
    return () => {
      window.clearInterval(interval);
      if (close) window.clearTimeout(close);
    };
  }, []);

  const ex = (smooth.x - 0.5) * 7;
  const ey = (smooth.y - 0.5) * 4;

  return (
    <div className="cartoon-face" aria-hidden="true">
      <svg viewBox="0 0 120 120" width="100%" height="100%">
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
        <circle cx="60" cy="60" r="56" fill="none" stroke="url(#ringGrad)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="60" cy="60" r="50" fill="url(#faceGrad)" stroke="#1f2737" strokeWidth="1" />

        {/* Left eye */}
        <g transform={`translate(${ex}, ${ey})`}>
          <ellipse cx="42" cy="52" rx="9" ry={blink ? 1 : 10} fill="#0b0e14" stroke="#3aa5ff" strokeWidth="1.2" />
          {!blink && <circle cx={42 + ex * 0.35} cy={52 + ey * 0.35} r="4" fill="#3aa5ff" />}
          {!blink && <circle cx={43 + ex * 0.35} cy={50 + ey * 0.35} r="1.5" fill="#fff" />}
        </g>

        {/* Right eye */}
        <g transform={`translate(${ex}, ${ey})`}>
          <ellipse cx="78" cy="52" rx="9" ry={blink ? 1 : 10} fill="#0b0e14" stroke="#3aa5ff" strokeWidth="1.2" />
          {!blink && <circle cx={78 + ex * 0.35} cy={52 + ey * 0.35} r="4" fill="#3aa5ff" />}
          {!blink && <circle cx={79 + ex * 0.35} cy={50 + ey * 0.35} r="1.5" fill="#fff" />}
        </g>

        {/* Mouth — smiles when looking down, frowns when looking up */}
        <path
          d={smooth.y > 0.6
            ? 'M 42 78 Q 60 88 78 78'
            : smooth.y < 0.4
              ? 'M 42 82 Q 60 74 78 82'
              : 'M 44 80 Q 60 86 76 80'}
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