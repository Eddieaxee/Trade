import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'FX Pulse — Forex Market Intelligence',
  description:
    'Dedicated Currency Strength, Smart Money Concepts, Indicators and Candle Range Theory analysis for FX. Multi-timeframe, real market data — analysis only, never a trading terminal.',
  metadataBase: new URL('https://forex-intelligence.example'),
  openGraph: {
    title: 'FX Pulse',
    description: 'Currency Strength · SMC · Indicators · CRT — dedicated analysis pages'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="brand">
            <Link href="/" style={{ color: 'inherit' }}>
              <span className="fx">FX</span> Pulse
            </Link>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
              {' '}· forex intelligence platform
            </span>
          </div>
          <NavBar />
        </header>
        {children}
        <footer
          style={{
            borderTop: '1px solid var(--border)',
            marginTop: 32,
            padding: '14px 22px 20px',
            fontSize: 11,
            color: 'var(--muted)'
          }}
        >
          FX Pulse · analysis built from real keyless market data (Yahoo Finance OHLC · Frankfurter/ECB · ER-API).
          Research tooling only — not investment advice; no orders are routed or executed.
        </footer>
      </body>
    </html>
  );
}
