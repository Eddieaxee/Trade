// ── Shared domain types for the FX market-intelligence platform ──────────────

export type Granularity = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

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

/** Swing with fractal classification vs the previous same-kind swing. */
export interface SwingLabel extends Swing {
  label: 'HH' | 'HL' | 'LH' | 'LL';
  strength: 'strong' | 'moderate' | 'weak';
}

export interface StructureEvent {
  t: number;
  price: number;
  direction: Direction;
  kind: 'bos' | 'choch' | 'mss';
  label: string;
}

export interface OrderBlock {
  t: number;
  price: number;
  side: 'buy' | 'sell';
  removed: boolean;
}

/** Order block that failed and flipped polarity (breaker / mitigation block). */
export interface BreakerBlock {
  t: number;
  price: number;
  side: 'buy' | 'sell';
  origin: 'bullish-ob' | 'bearish-ob';
}

export interface LiquidityZone {
  price: number;
  weight: number;
  side: 'above' | 'below';
  label: string;
}

/** Equal highs / lows pool with touch count. */
export interface EqualLevel {
  price: number;
  touches: number;
  kind: 'EQH' | 'EQL';
  side: 'above' | 'below'; // relative to current price
}

export interface StopHunt {
  t: number;
  price: number;
  side: 'high' | 'low';
}

/** Displacement candle: outsized body leaving a level. */
export interface Displacement {
  t: number;
  direction: Direction;
  bodyPct: number;  // body / range
  sizePct: number;  // body / price
}

/** Premium / discount decomposition of the active dealing range. */
export interface PremiumDiscount {
  high: number;
  low: number;
  eq: number;
  posPct: number; // 0..1 where price sits between low(0) and high(1)
  zone: 'premium' | 'discount' | 'equilibrium';
}

export interface PrevHL {
  label: 'PDH' | 'PDL' | 'PWH' | 'PWL';
  price: number;
  t: number;
}

export interface SMC {
  trend: 'bullish' | 'bearish' | 'ranging';
  bias: 'long' | 'short' | 'neutral';
  score: number; // -100..100
  trendLabel: string;
  lastBOS: StructureEvent | null;
  lastCHoCH: StructureEvent | null;
  lastMSS: StructureEvent | null;
  swingHighs: number[];
  swingLows: number[];
  swingLabels: SwingLabel[];
  orderBlocks: OrderBlock[];
  breakers: BreakerBlock[];
  demandZones: Array<[number, number]>;
  supplyZones: Array<[number, number]>;
  liquidity: LiquidityZone[];
  equalHighs: EqualLevel[];
  equalLows: EqualLevel[];
  stopHunts: StopHunt[];
  displacement: Displacement[];
  pd: PremiumDiscount | null;
  prevHL: PrevHL[];
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
  /** Condensed phase-model state (embedded in snapshot/pair payloads). */
  phase?: {
    status: CRTStatus;
    direction: 'bullish' | 'bearish' | 'neutral';
    manipulation: boolean;
    sweep: 'high' | 'low' | null;
    reclaim: boolean;
    displacement: boolean;
    confirmation: boolean;
    score: number;
  };
}

export type CRTStatus = 'developing' | 'confirming' | 'confirmed' | 'invalidated';

/** Candle-range-theory phase model over the last completed range + current bar. */
export interface CRTPhase {
  status: CRTStatus;
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100..100
  rangeHigh: number | null;
  rangeLow: number | null;
  rangeMid: number | null;
  manipulation: boolean;
  sweep: 'high' | 'low' | null;
  reclaim: boolean;
  displacement: boolean;
  confirmation: boolean;
  invalidated: boolean;
  notes: string[];
}

export type IndicatorSignal = 'buy' | 'sell' | 'neutral';

export interface IndicatorReading {
  key: string;
  name: string;
  value: string;
  signal: IndicatorSignal;
  strength: number; // 0..1 conviction
  note: string;
}

export interface IndicatorBundle {
  score: number; // -100..100
  label: string;
  bull: number;
  bear: number;
  neutral: number;
  readings: IndicatorReading[];
  drivers: string[];
  atr: number | null;
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

export interface SignalTag {
  label: string;  // 'Buy' | 'Strong Buy' | 'Sell' | 'Strong Sell' | 'Neutral'
  score: number;  // -100..100
}

export interface MTFRow {
  tf: Granularity;
  indicators: SignalTag;
  smc: SignalTag;
  crt: SignalTag & { status: CRTStatus };
  overall: SignalTag;
}

export interface PairMTF {
  pair: Pair;
  rows: MTFRow[];
  overall: SignalTag;
  generatedAt: number;
}

/** One timeframe column of the multi-TF currency-strength matrix. */
export interface StrengthTFColumn {
  tf: string;
  scores: Record<string, number | null>; // currency code → -100..100
  deltas: Record<string, number | null>; // momentum vs previous window
}

export interface StrengthMatrix {
  updatedAt: number;
  sources: string[];
  tfs: StrengthTFColumn[];
  notes: string[];
}

export interface PairAnalysis {
  pair: Pair;
  interval: Granularity;
  candles: Candle[];
  price: number;
  change1h: number | null;
  change24h: number | null;
  atr: number | null;
  spread: number | null;
  volatility: 'low' | 'normal' | 'high';
  source: string;
  smc: SMC;
  crt: CRT;
  crtPhase: CRTPhase;
  confluence: Confluence;
  indicators: IndicatorBundle;
  tradePlan: TradePlan | null;
  error: string | null;
}

/** Suggested trade plan — informational only, derived from ATR + structure levels. */
export interface TradePlan {
  direction: 'long' | 'short' | 'none';
  confidence: number;          // 0..100 from |confluence|
  entry: number;               // live price
  entryZoneLow: number;        // retest zone (confluence support/resistance aware)
  entryZoneHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rr1: number;                 // reward:risk at each TP
  rr2: number;
  rr3: number;
  basis: string;               // short human explanation of the numbers
}

export interface MarketSnapshot {
  generatedAt: number;
  interval: Granularity;
  strength: StrengthResult | null;
  pairs: PairAnalysis[];
  warnings: string[];
}