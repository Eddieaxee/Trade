// ── Shared domain types for the FX market-intelligence platform ──────────────

export type Granularity = '15m' | '1h' | '4h' | '1d';

export interface Candle {
  t: number; // unix seconds (bar open time)
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export interface Pair {
  symbol: string; // e.g. "EURUSD"
  base: string;   // e.g. "EUR"
  quote: string;  // e.g. "USD"
}

export type Direction = 'up' | 'down';

export interface Swing {
  t: number;
  price: number;
  kind: 'high' | 'low';
  index: number;
}

export interface StructureEvent {
  t: number;
  price: number;
  direction: Direction;
  kind: 'bos' | 'choch';
  label: string;
}

export interface OrderBlock {
  t: number;
  price: number;
  side: 'buy' | 'sell';
  removed: boolean;
}

export interface LiquidityZone {
  price: number;
  weight: number;
  side: 'above' | 'below';
  label: string;
}

export interface StopHunt {
  t: number;
  price: number;
  side: 'high' | 'low';
}

export interface SMC {
  trend: 'bullish' | 'bearish' | 'ranging';
  bias: 'long' | 'short' | 'neutral';
  score: number; // -100..100
  trendLabel: string;
  lastBOS: StructureEvent | null;
  lastCHoCH: StructureEvent | null;
  swingHighs: number[];
  swingLows: number[];
  orderBlocks: OrderBlock[];
  demandZones: Array<[number, number]>;
  supplyZones: Array<[number, number]>;
  liquidity: LiquidityZone[];
  stopHunts: StopHunt[];
  notes: string[];
}

export interface FVG {
  t: number;
  top: number;
  bottom: number;
  side: Direction;
}

export interface CRT {
  rangeMode: 'micro' | 'small' | 'normal' | 'tall';
  expansion: boolean;
  contraction: boolean;
  expansionRatio: number;
  bodyStrength: number;   // 0..1
  wickImbalance: number;  // -1..1 (+ upper wick dominance)
  lastFVG: FVG | null;
  fvgs: FVG[];
  bias: 'long' | 'short' | 'neutral';
  score: number;          // -100..100
  notes: string[];
}

export interface ConfluenceFactor {
  key: string;
  label: string;
  score: number; // -1..1
  weight: number;
  note: string;
}

export interface Confluence {
  score: number; // -100..100
  label: string;
  factors: ConfluenceFactor[];
  support: number | null;
  resistance: number | null;
}

export interface RatePoint {
  t: number;
  rates: Record<string, number>; // crosses relative to the series base
}

export interface CurrencyStrength {
  code: string;
  score: number; // -42..42 display scale
  delta1d: number;
  delta7d: number;
}

export interface StrengthResult {
  updatedAt: number;
  source: string;
  currencies: CurrencyStrength[];
  notes: string[];
}

export interface PairAnalysis {
  pair: Pair;
  interval: Granularity;
  candles: Candle[];
  price: number;
  change1h: number | null;
  change24h: number | null;
  source: string;
  smc: SMC;
  crt: CRT;
  confluence: Confluence;
  error: string | null;
}

export interface MarketSnapshot {
  generatedAt: number;
  interval: Granularity;
  strength: StrengthResult | null;
  pairs: PairAnalysis[];
  warnings: string[];
}