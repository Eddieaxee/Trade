import Link from "next/link";

export const dynamic = "force-dynamic";

export default function GuidePage() {
  return (
    <div className="page">
      <div className="page-title">
        <h1>FX Pulse — User Guide</h1>
        <p>Everything you need to know to use FX Pulse effectively. This guide explains every page, every indicator, and every score so you can make the most of the analysis.</p>
      </div>

      <div className="panel guide-downloads">
        <h3>📥 Quick-start download</h3>
        <p style={{ margin: "8px 0" }}>Download a printable PDF-style guide for offline reference:</p>
        <a className="btn-primary" href="#overview">Read full guide below ↓</a>
      </div>

      <div className="panel">
        <h3 id="overview">1. Overview</h3>
        <p>FX Pulse is a multi-page forex market intelligence platform. It pulls real OHLC market data from keyless providers (Yahoo Finance, Frankfurter/ECB) and computes proprietary analysis across four dedicated systems: <strong>Currency Strength</strong>, <strong>Smart Money Concepts (SMC)</strong>, <strong>Technical Indicators</strong>, and <strong>Candle Range Theory (CRT)</strong>.</p>
        <p style={{ marginTop: 8 }}>No login, no sign-up, no API keys required. Everything works out of the box.</p>
      </div>

      <div className="guide-sections">
        <div className="panel guide-section">
          <h3>2. Dashboard</h3>
          <p>The dashboard is your market overview. It shows strongest/weakest currencies, top pairs by confluence, a watchlist of all 28 pairs with live prices and biases, and current market trading sessions (Tokyo, London, New York, Sydney).</p>
          <p style={{ marginTop: 6 }}><strong>Tip:</strong> Click any pair to open its full pair dashboard.</p>
        </div>

        <div className="panel guide-section">
          <h3>3. Currency Strength</h3>
          <p>Shows relative strength across 8 currencies (USD, EUR, GBP, JPY, CHF, AUD, CAD, NZD) over 9 timeframes from 30 seconds to 1 week. The matrix uses star-pair decomposition — each currency return vs EUR is isolated and z-scored.</p>
          <p style={{ marginTop: 6 }}><strong>Heatmap:</strong> Green = strong, Red = white = neutral.</p>
          <p><strong>30S†:</strong> Derived from the freshest 1m candle since keyless providers floor at 1-minute granularity.</p>
        </div>

        <div className="panel guide-section">
          <h3>4. SMC (Smart Money Concepts)</h3>
          <p>Dedicated Smart Money page showing structure (HH/HL/LH/LL), break of structure (BOS), change of character (CHoCH), liquidity sweeps, equal highs/lows, fair value gaps, order blocks, breaker blocks, displacement, premium/discount positioning, and previous day/week highs & lows.</p>
          <p style={{ marginTop: 6 }}><strong>Timeframe matters:</strong> Changing the timeframe recalculates everything live — swings, blocks, sweeps all update immediately.</p>
        </div>

        <div className="panel guide-section">
          <h3>5. Technical Indicators</h3>
          <p>16 standard indicators per pair and timeframe: SMA (10/20/50), EMA (10/20/50), RSI, MACD, Stochastic, Stoch RSI, CCI, ADX, ATR, Bollinger Bands, Momentum, Williams %R, Ichimoku, Awesome Oscillator, OBV, VWAP.</p>
          <p style={{ marginTop: 6 }}><strong>Speedometer:</strong> Shows overall buy/sell conviction from -100 (strong sell) to +100 (strong buy).</p>
          <p><strong>Histogram:</strong> Green bars = buy signals, Red = sell, Gray = neutral. Bar width shows strength.</p>
        </div>

        <div className="panel guide-section">
          <h3>6. CRT (Candle Range Theory)</h3>
          <p>Phase model tracking: Developing → Confirming → Confirmed → Invalidated. Analyzes manipulation wicks, liquidity sweeps (high/low), reclaim, displacement, and confirmation. Includes range high/low/mid and a visual phase stepper.</p>
          <p style={{ marginTop: 6 }}><strong>Status:</strong> Confirmed means all 5 conditions met. Invalidated means the setup failed.</p>
        </div>

        <div className="panel guide-section">
          <h3>7. Pair Dashboard</h3>
          <p>Full analysis for one pair: price, spread, ATR, volatility, 24H/1H change, currency strength delta, SMC bias, indicator bias, CRT bias, multi-timeframe table (15m–1d), and a suggested trade plan with entry, stop loss, and 3 take-profit levels.</p>
          <p style={{ marginTop: 6 }}><strong>Trade plan:</strong> Based on ATR multiples. TP1 = 1.5R, TP2 = 2.5R, TP3 = 4R. Not financial advice.</p>
        </div>

        <div className="panel guide-section">
          <h3>8. News Room</h3>
          <p>Live forex news aggregated from FXStreet, DailyFX, ForexLive, Investing.com, Reuters. Headlines classified by market impact (high/medium/low) with probable short-term action signals. Auto-refreshes every 60 seconds.</p>
        </div>

        <div className="panel guide-section">
          <h3>9. Market Sessions</h3>
          <p>Always visible at the top. Shows live clocks for Tokyo, London, New York, Sydney with session status (open/closing soon/closed). Market open/close influences volatility expectations across the entire app.</p>
        </div>

        <div className="panel guide-section">
          <h3>10. Glossary</h3>
          <div className="glossary-grid">
            <div><strong>BOS</strong> — Break of Structure: price breaks a prior swing high/low, confirming trend.</div>
            <div><strong>CHoCH</strong> — Change of Character: price breaks structure in the opposite direction, signaling reversal.</div>
            <div><strong>HH/HL</strong> — Higher High / Higher Low: bullish structure.</div>
            <div><strong>LH/LL</strong> — Lower High / Lower Low: bearish structure.</div>
            <div><strong>FVG</strong> — Fair Value Gap: 3-candle imbalance, potential support/resistance.</div>
            <div><strong>Order Block</strong> — Last opposite candle before a strong move; institutional supply/demand zone.</div>
            <div><strong>Breaker</strong> — Order block that was swept and broken; now acts as opposite-side zone.</div>
            <div><strong>EQH/EQL</strong> — Equal Highs / Equal Lows: liquidity pools where stops cluster.</div>
            <div><strong>PDH/PDL</strong> — Previous Day High / Low: key intraday liquidity targets.</div>
            <div><strong>Premium/Discount</strong> — Price above/below the dealing range mid; where imbalances are tradeable.</div>
            <div><strong>Confluence</strong> — When multiple analysis systems agree, the confidence score rises.</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn primary" href="/dashboard">← Back to Dashboard</Link>
        <Link className="btn" href="/news">News Room →</Link>
      </div>
    </div>
  );
}

