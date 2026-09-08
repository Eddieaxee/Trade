# FX Pulse — Forex Market Intelligence

A serverless-ready Next.js platform that turns public, keyless market data into
**analysis dashboards** — it never routes or executes orders. It provides:

- **Currency-strength board** — relative 1d/7d decomposition over the full
  8-currency cross matrix (28 pairs), z-scored across pairs to strip out the
  common forex drift.
- **Smart Money Concepts (SMC)** — swing structure, Break of Structure and
  Change of Character, order blocks, demand/supply zones, clustered liquidity
  pools and stop-hunt sweeps.
- **Candle Range Theory (CRT)** — range modes (micro/small/normal/tall),
  expansion/contraction, body dominance, wick imbalance and Fair Value Gaps.
- **Technical confluence** — weighted agreement of strength, structure,
  momentum, CRT state and order-block proximity into a -100…100 score with a
  human label.

## Stack

- Next.js 14 (App Router, server components + client dashboard widgets)
- TypeScript (strict)
- Zero charting dependencies — a hand-rolled SVG sparkline keeps bundles tiny
- Optional Upstash Redis REST shared cache for serverless warm-ups
- `vercel.json` cron: refreshes all intervals every 15 minutes

## Data providers (all keyless by default)

| Concern | Primary | Fallback |
| --- | --- | --- |
| OHLC candles (1m…1w) | Yahoo Finance chart v8 | Twelve Data (requires `TWELVEDATA_API_KEY`) |
| Reference rates (EUR-based) | Frankfurter (ECB daily) | ER-API latest |
| Real-time bid/ask (optional) | Twelve Data `TWELVEDATA_API_KEY` | — |

The 4h timeframe is aggregated locally from 1h bars.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional keys; none required
npm run dev                  # http://localhost:3000
```

Production build: `npm run build && npm start`. Type check: `npm run typecheck`.

## Env vars

| Variable | Purpose |
| --- | --- |
| `TWELVEDATA_API_KEY` | enables Twelve Data candle/quote priority + live ticks |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | shared snapshot cache across serverless instances |
| `CRON_SECRET` | Bearer/query secret for `/api/cron/refresh` |
| `TTL_*` | cache TTL overrides (seconds) |

All settings are optional — the dashboard works with none of them set.

## API surface

- `GET /api/analysis/summary?interval=1h&compact=1` — full watchlist snapshot
- `GET /api/analysis/pair?pair=EURUSD&interval=1h` — per-pair analysis bundle
- `GET /api/candles?pair=EURUSD&interval=1h` — raw OHLC
- `GET /api/rates` — EUR-based reference-rate series
- `GET /api/cron/refresh` — scheduled warm-up (auth: `Bearer <CRON_SECRET>`)

## Methodology notes

Currency strength: EUR-based rates → cross matrix → per-pair % change over
1d/7d → z-scores **across pairs** (common-drift removal) → each currency is the
mean of its signed pair z-scores; EUR is the implicit residual, so the board
sums to ≈ 0 (relative strength).

Confluence weights: strength 0.30, SMC 0.30, momentum 0.15, CRT 0.15,
order-block proximity 0.10.

All outputs are sentiment-style analytics over historical candles. **Not
investment advice.** This platform never places, routes, or recommends orders.

## Disclaimer

Financial analysis dashboards are for research and education. Market data has
latency and gaps; act at your own risk.