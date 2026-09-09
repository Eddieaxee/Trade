'use client';

import { useCallback } from 'react';

const GUIDE = `FX PULSE — USER GUIDE
=====================
Forex intelligence platform · real keyless market data · no account needed

WHAT THIS APP IS
----------------
FX Pulse reads real OHLC market data (Yahoo Finance, Frankfurter/ECB, ER-API,
Twelve Data when a key is configured) and extracts analysis: currency strength,
Smart Money Concepts (SMC), classic technical indicators, Candle Range Theory
(CRT) and multi-timeframe confluence. It is an ANALYSIS tool — it never places
orders and is not investment advice.

NAVIGATION (top bar)
--------------------
Dashboard      - market overview: strongest/weakest currencies, top pairs,
                 trading sessions (Sydney/Tokyo/London/New York, with WAT and
                 UTC clocks), the selected pair's quick read.
Currency Strength - dedicated strength matrix for USD, EUR, GBP, JPY, CHF,
                 AUD, CAD, NZD across 9 timeframes (30S, 1M, 5M, 15M, 30M,
                 1H, 4H, 1D, 1W) with heatmap, bars, rankings and the best
                 strongest-vs-weakest pair per timeframe.
SMC            - structure & liquidity: HH/HL/LH/LL swing labels, BOS, CHoCH,
                 MSS, liquidity sweeps, equal highs/lows (EQH/EQL), buy-side
                 and sell-side liquidity, fair value gaps (FVG), order blocks,
                 breaker/mitigation blocks, displacement, premium/discount,
                 previous day/week high & low, weak vs strong highs/lows.
Indicators     - 16 classic indicators (SMA, EMA, RSI, MACD, Stochastic,
                 Stoch RSI, CCI, ADX, ATR, Bollinger Bands, Momentum,
                 Williams %R, Ichimoku, Awesome Oscillator, OBV, VWAP) each
                 with value, Buy/Sell/Neutral signal, strength and a note,
                 plus the buy/sell speedometer and a signal histogram.
CRT            - Candle Range Theory phase model: manipulation, sweep,
                 reclaim, displacement, confirmation. Setup status moves
                 Developing -> Confirming -> Confirmed (or Invalidated).
News Room      - live macro headlines from keyless RSS feeds scored for
                 currency impact, the top 10 probable actions for the next
                 minutes-to-hours, and LIVE technical movement warnings
                 (momentum spikes, RSI extremes, MACD crosses) computed from
                 real candles every minute.
Pair page      - click any pair (e.g. EURUSD) anywhere for the full dashboard:
                 price, 1H/24H change, spread, ATR, volatility, per-system
                 bias cards, multi-timeframe table and a suggested trade plan
                 (entry zone, stop, TP1/2/3 with R:R) when there is a real
                 confluence edge. Informational only.
Guide          - this document.
`;

function downloadGuide() {
  const blob = new Blob([GUIDE], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FX-Pulse-User-Guide.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function GuidePage() {
  return (
    <div className="page">
      <div className="page-title">
        <h1>User Guide</h1>
        <p>How every page, metric and term in FX Pulse works — readable online, or download the full document.</p>
      </div>
      <div className="status-bar">
        <button className="btn primary" onClick={downloadGuide}>
          ⬇ Download full guide (.txt)
        </button>
        <span className="pill">covers all pages · Dashboard · Strength · SMC · Indicators · CRT · News Room · Pair pages</span>
      </div>
      <div className="panel">
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
          {GUIDE}
        </pre>
      </div>
    </div>
  );
}
