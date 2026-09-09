'use client';

import { useEffect, useRef } from 'react';

/**
 * Futuristic 3D grid floor rendered on canvas — perspective-projected
 * animated grid that recedes to the horizon, with subtle pulse waves.
 * No external dependencies; pure 2D canvas math.
 */
export default function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const horizon = () => h * 0.42;

    const draw = (t: number) => {
      const time = t * 0.0006;
      ctx.clearRect(0, 0, w, h);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#070a10');
      bg.addColorStop(0.5, '#0b0e14');
      bg.addColorStop(1, '#0d1018');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars / particles in the "sky"
      ctx.save();
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137.5) % w);
        const sy = ((i * 73.3) % horizon());
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i));
        ctx.fillStyle = `rgba(120, 180, 255, ${0.15 * tw})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8 + (i % 3) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const hy = horizon();

      // Horizon glow
      const glow = ctx.createLinearGradient(0, hy - 60, 0, hy + 40);
      glow.addColorStop(0, 'rgba(58, 165, 255, 0)');
      glow.addColorStop(0.6, 'rgba(58, 165, 255, 0.08)');
      glow.addColorStop(1, 'rgba(58, 165, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, hy - 60, w, 100);

      // Vertical grid lines (perspective)
      ctx.strokeStyle = 'rgba(58, 165, 255, 0.18)';
      ctx.lineWidth = 1;
      const cols = 28;
      for (let i = 0; i <= cols; i++) {
        const frac = (i / cols) * 2 - 1; // -1..1
        const bottomX = w / 2 + frac * w * 0.9;
        const topX = w / 2 + frac * w * 0.04;
        ctx.beginPath();
        ctx.moveTo(topX, hy);
        ctx.lineTo(bottomX, h);
        ctx.stroke();
      }

      // Horizontal grid lines (perspective, exponentially spaced)
      const rows = 18;
      for (let i = 0; i <= rows; i++) {
        const frac = i / rows;
        const p = frac * frac; // exponential depth
        const y = hy + p * (h - hy);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.strokeStyle = `rgba(58, 165, 255, ${0.05 + frac * 0.18})`;
        ctx.stroke();
      }

      // Pulse waves rising from the grid
      for (let wave = 0; wave < 3; wave++) {
        const phase = (time * 0.8 + wave * 0.33) % 1;
        const y = hy + phase * phase * (h - hy);
        const alpha = (1 - phase) * 0.12;
        ctx.strokeStyle = `rgba(58, 165, 255, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Floating data points (like market data floating in 3D space)
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const seed = i * 97.13;
        const depth = ((seed + time * 0.3) % 1);
        const p = depth * depth;
        const y = hy + p * (h - hy) * 0.85;
        const x = w * 0.15 + ((i * 173.7) % (w * 0.7));
        const size = 1.5 + (1 - depth) * 3;
        const alpha = 0.3 + (1 - depth) * 0.5;
        ctx.fillStyle = `rgba(120, 200, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Floating currency symbols drifting through the 3D space
      const symbols = ['$', '€', '£', '¥', '₣', 'A$', 'C$', '₩'];
      ctx.save();
      ctx.font = `${14}px var(--mono), monospace`;
      ctx.textAlign = 'center';
      for (let i = 0; i < symbols.length; i++) {
        const seed = i * 131.7 + 50;
        const depth = ((seed + time * 0.2 + i * 0.12) % 1);
        const p = depth * depth;
        const y = hy + 20 + p * (h - hy) * 0.8;
        const x = w * 0.1 + ((i * 197.3 + time * 12) % (w * 0.8));
        const alpha = 0.15 + (1 - depth) * 0.45;
        const size = 12 + (1 - depth) * 10;
        ctx.font = `${size}px var(--mono), monospace`;
        const colors = ['#3aa5ff', '#26c281', '#e6a23c', '#f0506a', '#9b7dff', '#3aa5ff', '#26c281', '#e6a23c'];
        ctx.fillStyle = colors[i % colors.length] + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillText(symbols[i], x, y);
      }
      ctx.restore();

      // Rotating wireframe globe (simulated 3D sphere with latitude/longitude lines)
      ctx.save();
      const globeX = w * 0.78;
      const globeY = hy - 30;
      const globeR = Math.min(w, h) * 0.08;
      const rotY = time * 0.4;
      ctx.strokeStyle = `rgba(58, 165, 255, 0.25)`;
      ctx.lineWidth = 0.8;
      // Latitude lines
      for (let lat = 0; lat < 5; lat++) {
        const angle = (lat / 4) * Math.PI - Math.PI / 2;
        const cy = Math.sin(angle) * globeR;
        const rz = Math.cos(angle) * globeR;
        ctx.beginPath();
        for (let a = 0; a <= 32; a++) {
          const theta = (a / 32) * Math.PI * 2;
          const sx = Math.cos(theta) * rz;
          const sz = Math.sin(theta) * rz;
          // Simple 3D rotation around Y axis
          const rx = sx * Math.cos(rotY) - sz * Math.sin(rotY);
          const rz2 = sx * Math.sin(rotY) + sz * Math.cos(rotY);
          const screenX = globeX + rx;
          const screenY = globeY + cy + rz2 * 0.3;
          if (a === 0) ctx.moveTo(screenX, screenY);
          else ctx.lineTo(screenX, screenY);
        }
        ctx.stroke();
      }
      // Longitude lines
      for (let lon = 0; lon < 6; lon++) {
        const phi = (lon / 6) * Math.PI * 2;
        ctx.beginPath();
        for (let a = 0; a <= 20; a++) {
          const theta = (a / 20) * Math.PI * 2;
          const sx = Math.cos(theta) * globeR * Math.cos(phi + rotY);
          const sy = Math.sin(theta) * globeR;
          const sz = Math.cos(theta) * globeR * Math.sin(phi + rotY);
          const screenX = globeX + sx;
          const screenY = globeY + sy + sz * 0.3;
          if (a === 0) ctx.moveTo(screenX, screenY);
          else ctx.lineTo(screenX, screenY);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Cartoon currency characters interacting in the background
      const characters = [
        { sym: '$', color: '#26c281', size: 28 },
        { sym: '€', color: '#3aa5ff', size: 26 },
        { sym: '£', color: '#e6a23c', size: 24 },
        { sym: '¥', color: '#f0506a', size: 24 }
      ];
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < characters.length; i++) {
        const ch = characters[i];
        const speed = 0.3 + i * 0.05;
        const bob = Math.sin(time * 1.2 + i * 1.5) * 15;
        const phase = time * speed + i * (Math.PI * 2 / characters.length);
        const orbitR = 80 + i * 30;
        const cx = globeX + Math.cos(phase) * orbitR * 0.4;
        const cy = globeY + bob + Math.sin(phase * 0.7) * 25;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, ch.size * 1.5);
        grd.addColorStop(0, ch.color + '30');
        grd.addColorStop(1, ch.color + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, ch.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `bold ${ch.size}px var(--mono), monospace`;
        ctx.fillStyle = ch.color + 'cc';
        ctx.fillText(ch.sym, cx, cy);
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true" />;
}