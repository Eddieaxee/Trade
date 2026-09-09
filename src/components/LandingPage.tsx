'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/Logo';

/** 3D cartoon currency scene — client-only (WebGL). */
const HeroCanvas3D = dynamic(() => import('@/components/HeroCanvas3D'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%' }} />
});

/**
 * Landing page — futuristic, minimalist, single-screen hero with:
 * - true 3D cartoon currency scene (EUR vs USD standoff, orbiting coins)
 * - coins with eyes that follow the mouse (desktop)
 * - start button → dashboard
 * - no login, no auth, no friction
 */
export default function LandingPage() {
  const [entered, setEntered] = useState(false);

  return (
    <div className="landing">
      {/* 3D hero background */}
      <div className="hero-bg">
        <HeroCanvas3D />
      </div>

      {/* Vignette overlay */}
      <div className="hero-vignette" />

      {/* Hero content */}
      <div className="hero-content">
        <div className="hero-logo-row">
          <Logo height={32} />
        </div>

        <h1 className="hero-title">
          Forex Market<br />
          <span className="hero-title-accent">Intelligence Platform</span>
        </h1>

        <p className="hero-sub">
          Dedicated Currency Strength, Smart Money Concepts, Indicators and Candle Range Theory analysis —
          built from real market data. No sign-up. No auth. Just analysis.
        </p>

        <div className="hero-actions">
          <Link href="/dashboard?ref=hero" className="start-btn" onClick={() => setEntered(true)}>
            <span className="start-btn-label">Start Analyzing</span>
            <span className="start-btn-arrow">→</span>
          </Link>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <span className="stat-num">8</span>
            <span className="stat-label">Currencies</span>
          </div>
          <div className="stat">
            <span className="stat-num">28</span>
            <span className="stat-label">Pairs</span>
          </div>
          <div className="stat">
            <span className="stat-num">16</span>
            <span className="stat-label">Indicators</span>
          </div>
          <div className="stat">
            <span className="stat-num">4</span>
            <span className="stat-label">Analysis Systems</span>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="scroll-hint">
        <span>Scroll to explore</span>
        <div className="scroll-dot" />
      </div>
    </div>
  );
}