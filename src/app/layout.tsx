import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FX Pulse — Forex Market Intelligence',
  description:
    'Currency-strength, Smart Money Concepts, Candle Range Theory and technical-confluence dashboards for the FX market. Analysis only — not a trading terminal.',
  metadataBase: new URL('https://forex-intelligence.example'),
  openGraph: {
    title: 'FX Pulse',
    description: 'SMC · CRT · Currency Strength · Confluence dashboards'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}