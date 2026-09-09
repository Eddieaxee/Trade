// ── News Room: live FX news + probable-action engine ────────────────────────
// Sources are keyless public RSS feeds (FXStreet, ForexLive, Investing.com,
// Yahoo Finance). Each headline is scored for currency impact with a curated
// keyword lexicon (hawkish/dovish/CPI/NFP/risk flows). The strongest opposing
// currency pair becomes the "probable action" with a horizon estimate.
// Combined with LIVE technical alerts computed from real candles — nothing
// is invented; when a feed fails it is skipped and noted.

import type { Granularity, Pair } from "@/lib/types";
import { getCandlesCached } from "@/lib/providers";
import { cacheGet, cacheKey, cacheSet } from "@/lib/cache";
import { buildIndicators } from "@/lib/analysis/indicators";

export interface NewsAction {
  pair: string;
  bias: "long" | "short";
  confidence: number; // 0-100
}
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: number; // unix seconds
  summary: string;
  currencies: Array<{ ccy: string; delta: number }>;
  actions: NewsAction[];
  horizon: string;
  impact: "high" | "medium" | "low";
  tags: string[];
}
export interface TechAlert {
  pair: string;
  tf: Granularity;
  kind: string;
  direction: "up" | "down" | "neutral";
  detail: string;
  urgency: number;
}
export interface NewsRoom {
  updatedAt: number;
  items: NewsItem[];
  alerts: TechAlert[];
  notes: string[];
}

const FEEDS: Array<{ name: string; url: string }> = [
  { name: "FXStreet", url: "https://www.fxstreet.com/rss/news" },
  { name: "ForexLive", url: "https://www.forexlive.com/feed/news" },
  { name: "Investing.com", url: "https://www.investing.com/rss/news_1.rss" },
  {
    name: "Yahoo Finance",
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=EURUSD=X&region=US&lang=en-US",
  },
];

async function fetchText(
  url: string,
  timeoutMs = 7000,
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FXPulse/1.0)" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRSS(
  xml: string,
): Array<{ title: string; link: string; date: number; summary: string }> {
  const out: Array<{
    title: string;
    link: string;
    date: number;
    summary: string;
  }> = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  for (const b of blocks.slice(0, 14)) {
    const title = decode(
      (b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "",
    );
    if (!title) continue;
    let link = (b.match(/<link[^>]*href="([^"]+)"/i) ?? [])[1] ?? "";
    if (!link)
      link = decode((b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ?? [])[1] ?? "");
    const dateStr =
      (b.match(/<(pubDate|published|updated)[^>]*>([\s\S]*?)<\//i) ?? [])[2] ??
      "";
    const date = dateStr
      ? Math.floor(new Date(dateStr).getTime() / 1000) || 0
      : 0;
    const summary = decode(
      (b.match(/<(description|summary|content)[^>]*>([\s\S]*?)<\//i) ??
        [])[2] ?? "",
    ).slice(0, 240);
    out.push({ title, link, date, summary });
  }
  return out;
}
// ── Impact lexicon: positive w → bullish for the currency it attaches to ────
interface Rule {
  re: RegExp;
  w: number;
  tag: string;
  horizon: string;
  impact: "high" | "medium" | "low";
}

const RULES: Rule[] = [
  {
    re: /\b(hawkish|rate hike|raises? rates|hikes?|tighten\w*|higher for longer)\b/i,
    w: 0.8,
    tag: "policy",
    horizon: "next 1–4h",
    impact: "high",
  },
  {
    re: /\b(dovish|rate cut|cuts? rates|easing|stimulus|lower rates)\b/i,
    w: -0.8,
    tag: "policy",
    horizon: "next 1–4h",
    impact: "high",
  },
  {
    re: /\b(cpi|inflation)\b[\s\S]{0,40}\b(hot|hotter|above|beats?|accelerat\w+|surge\w*|sticky)\b/i,
    w: 0.7,
    tag: "inflation",
    horizon: "next 15–60m",
    impact: "high",
  },
  {
    re: /\b(cpi|inflation)\b[\s\S]{0,40}\b(cool\w*|below|miss\w*|softer|slows?|eases?)\b/i,
    w: -0.7,
    tag: "inflation",
    horizon: "next 15–60m",
    impact: "high",
  },
  {
    re: /\b(nfp|non-?farm|payrolls?|jobs report)\b[\s\S]{0,40}\b(beat|strong\w*|above|hot)\b/i,
    w: 0.7,
    tag: "labour",
    horizon: "next 15–60m",
    impact: "high",
  },
  {
    re: /\b(nfp|non-?farm|payrolls?|jobs report)\b[\s\S]{0,40}\b(miss\w*|weak\w*|below|slow\w*)\b/i,
    w: -0.7,
    tag: "labour",
    horizon: "next 15–60m",
    impact: "high",
  },
  {
    re: /\b(gdp|pmi|retail sales)\b[\s\S]{0,40}\b(beat|above|strong\w*|surge\w*|expands?)\b/i,
    w: 0.5,
    tag: "growth",
    horizon: "next 1–4h",
    impact: "medium",
  },
  {
    re: /\b(gdp|pmi|retail sales)\b[\s\S]{0,40}\b(miss\w*|below|weak\w*|contract\w*|slow\w*)\b/i,
    w: -0.5,
    tag: "growth",
    horizon: "next 1–4h",
    impact: "medium",
  },
  {
    re: /\b(recession|crisis|default|contagion|escalat\w+|safe haven)\b/i,
    w: -0.6,
    tag: "risk-off",
    horizon: "next 4–24h",
    impact: "high",
  },
  {
    re: /\b(risk-?on|optimism|rally|recovers?|rebound)\b/i,
    w: 0.3,
    tag: "risk-on",
    horizon: "next 1–4h",
    impact: "low",
  },
  {
    re: /\b(intervention|jawbon\w+)\b/i,
    w: 0.6,
    tag: "intervention",
    horizon: "next 15–60m",
    impact: "high",
  },
  {
    re: /\b(holds? rates|unchanged|as expected|in line)\b/i,
    w: 0.1,
    tag: "no-change",
    horizon: "next 1–4h",
    impact: "low",
  },
];

const CCY_WORDS: Array<[string, RegExp]> = [
  ["USD", /\b(usd|dollar|greenback|fed|fomc|powell|federal reserve)\b/i],
  ["EUR", /\b(eur\b|euro\b|ecb|lagarde|eurozone|euro area)\b/i],
  ["GBP", /\b(gbp|pound|sterling|boe|bank of england|bailey)\b/i],
  ["JPY", /\b(jpy|yen|boj|bank of japan|ueda)\b/i],
  ["CHF", /\b(chf|franc|snb|swiss national bank)\b/i],
  ["AUD", /\b(aud|aussie|rba|reserve bank of australia)\b/i],
  ["CAD", /\b(cad|loonie|boc|bank of canada)\b/i],
  ["NZD", /\b(nzd|kiwi|rbnz)\b/i],
];

function scoreHeadline(
  title: string,
  summary: string,
): {
  currencies: Array<{ ccy: string; delta: number }>;
  tags: string[];
  horizon: string;
  impact: "high" | "medium" | "low";
} {
  const text = `${title} ${summary}`;
  const tags: string[] = [];
  let horizon = "next 4–24h";
  let impact: "high" | "medium" | "low" = "low";
  let dir = 0;
  for (const r of RULES) {
    if (r.re.test(text)) {
      dir += r.w;
      tags.push(r.tag);
      if (r.impact === "high") {
        impact = "high";
        horizon = r.horizon;
      } else if (r.impact === "medium" && impact !== "high") {
        impact = "medium";
        horizon = r.horizon;
      }
    }
  }
  const deltas: Array<{ ccy: string; delta: number }> = [];
  for (const [ccy, re] of CCY_WORDS) {
    if (re.test(text)) deltas.push({ ccy, delta: dir });
  }
  if (tags.includes("risk-off")) {
    for (const d of deltas) {
      if (d.ccy === "JPY" || d.ccy === "CHF") d.delta = Math.max(d.delta, 0.5);
      if (d.ccy === "AUD" || d.ccy === "NZD") d.delta = Math.min(d.delta, -0.5);
    }
  }
  if (tags.includes("risk-on")) {
    for (const d of deltas) {
      if (d.ccy === "AUD" || d.ccy === "NZD") d.delta = Math.max(d.delta, 0.4);
      if (d.ccy === "JPY" || d.ccy === "CHF") d.delta = Math.min(d.delta, -0.3);
    }
  }
  return {
    currencies: deltas,
    tags,
    horizon,
    impact,
  };
}

const PAIR_CCYS: Record<string, [string, string]> = {
  EURUSD: ["EUR", "USD"],
  GBPUSD: ["GBP", "USD"],
  USDJPY: ["USD", "JPY"],
  USDCHF: ["USD", "CHF"],
  AUDUSD: ["AUD", "USD"],
  USDCAD: ["USD", "CAD"],
  NZDUSD: ["NZD", "USD"],
  EURGBP: ["EUR", "GBP"],
  EURJPY: ["EUR", "JPY"],
  EURCHF: ["EUR", "CHF"],
  EURAUD: ["EUR", "AUD"],
  EURCAD: ["EUR", "CAD"],
  EURNZD: ["EUR", "NZD"],
  GBPJPY: ["GBP", "JPY"],
  GBPCHF: ["GBP", "CHF"],
  GBPAUD: ["GBP", "AUD"],
  GBPCAD: ["GBP", "CAD"],
  GBPNZD: ["GBP", "NZD"],
  AUDJPY: ["AUD", "JPY"],
  AUDCHF: ["AUD", "CHF"],
  AUDCAD: ["AUD", "CAD"],
  AUDNZD: ["AUD", "NZD"],
  NZDJPY: ["NZD", "JPY"],
  NZDCHF: ["NZD", "CHF"],
  NZDCAD: ["NZD", "CAD"],
  CADJPY: ["CAD", "JPY"],
  CADCHF: ["CAD", "CHF"],
  CHFJPY: ["CHF", "JPY"],
};

function actionsFromDeltas(
  deltas: Array<{ ccy: string; delta: number }>,
): NewsAction[] {
  if (!deltas.length) return [];
  const byCcy = new Map(deltas.map((d) => [d.ccy, d.delta]));
  const out: NewsAction[] = [];
  for (const [pair, [a, b]] of Object.entries(PAIR_CCYS)) {
    const net = (byCcy.get(a) ?? 0) - (byCcy.get(b) ?? 0);
    if (Math.abs(net) < 0.25) continue;
    out.push({
      pair,
      bias: net > 0 ? "long" : "short",
      confidence: Math.min(95, Math.round(Math.abs(net) * 100)),
    });
  }
  return out.sort((x, y) => y.confidence - x.confidence).slice(0, 4);
}

async function fetchFeeds(): Promise<{ items: NewsItem[]; notes: string[] }> {
  const settled = await Promise.allSettled(
    FEEDS.map(async (f) => ({ name: f.name, xml: await fetchText(f.url) })),
  );
  const raw: Array<{
    title: string;
    link: string;
    date: number;
    summary: string;
    source: string;
  }> = [];
  const notes: string[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled" && s.value.xml) {
      for (const it of parseRSS(s.value.xml))
        raw.push({ ...it, source: s.value.name });
    } else {
      const name = s.status === "fulfilled" ? s.value.name : "A feed";
      notes.push(`${name} feed unavailable — skipped.`);
    }
  }
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const r of raw) {
    const key = r.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    const scored = scoreHeadline(r.title, r.summary);
    if (!scored.currencies.length) continue;
    const actions = actionsFromDeltas(scored.currencies);
    if (!actions.length && Math.abs(scored.currencies[0].delta) < 0.15)
      continue;
    items.push({
      id: `${r.source}-${r.date}-${key.slice(0, 20)}`,
      title: r.title,
      source: r.source,
      url: r.link,
      publishedAt: r.date,
      summary: r.summary,
      currencies: scored.currencies,
      actions,
      horizon: scored.horizon,
      impact: scored.impact,
      tags: scored.tags,
    });
    if (items.length >= 30) break;
  }
  items.sort((a, b) => b.publishedAt - a.publishedAt);
  return { items, notes };
}

/** LIVE technical alerts from real candles — momentum spikes, RSI extremes, MACD crosses. */
async function fetchAlerts(): Promise<TechAlert[]> {
  const watch = [
    ["EURUSD", "15m"],
    ["GBPUSD", "15m"],
    ["USDJPY", "15m"],
    ["AUDUSD", "15m"],
    ["GBPJPY", "1h"],
    ["EURJPY", "1h"],
  ] as unknown as Array<[Pair, Granularity]>;
  const alerts: TechAlert[] = [];
  await Promise.allSettled(
    watch.map(async ([p, tf]) => {
      try {
        const r = await getCandlesCached(p, tf);
        const cs = r.candles;
        if (cs.length < 25) return;
        const ind = buildIndicators(cs);
        const last = cs[cs.length - 1];
        const range = last.h - last.l;
        const avgRange =
          cs.slice(-20).reduce((s, c) => s + (c.h - c.l), 0) / 20;
        if (avgRange > 0 && range > avgRange * 1.8) {
          alerts.push({
            pair: p.symbol,
            tf,
            kind: "Momentum spike",
            direction: last.c >= last.o ? "up" : "down",
            detail: `Candle range ${(range / avgRange).toFixed(1)}× the 20-bar average — volatility expansion in progress`,
            urgency: Math.min(95, Math.round((range / avgRange) * 40)),
          });
        }
        const rsiR = ind.readings.find((x) => x.key === "rsi");
        if (rsiR) {
          const v = parseFloat(rsiR.value);
          if (Number.isFinite(v) && v >= 72) {
            alerts.push({
              pair: p.symbol,
              tf,
              kind: "RSI extreme",
              direction: "down",
              detail: `RSI ${v.toFixed(0)} — overbought on ${tf} (${rsiR.note})`,
              urgency: Math.min(90, Math.round(v)),
            });
          } else if (Number.isFinite(v) && v <= 28) {
            alerts.push({
              pair: p.symbol,
              tf,
              kind: "RSI extreme",
              direction: "up",
              detail: `RSI ${v.toFixed(0)} — oversold on ${tf} (${rsiR.note})`,
              urgency: Math.min(90, Math.round(100 - v)),
            });
          }
        }
        const macdR = ind.readings.find((x) => x.key === "macd");
        if (macdR && macdR.signal !== "neutral" && macdR.strength >= 0.6) {
          alerts.push({
            pair: p.symbol,
            tf,
            kind: "MACD cross",
            direction: macdR.signal === "buy" ? "up" : "down",
            detail: `MACD ${macdR.signal === "buy" ? "bullish" : "bearish"} cross on ${tf} (hist ${macdR.value}) — ${macdR.note}`,
            urgency: Math.min(85, 40 + Math.round(macdR.strength * 45)),
          });
        }
        if (ind.score >= 55 || ind.score <= -55) {
          alerts.push({
            pair: p.symbol,
            tf,
            kind: "Technical alignment",
            direction: ind.score > 0 ? "up" : "down",
            detail: `${ind.bull} bull vs ${ind.bear} bear readings on ${tf} — score ${ind.score > 0 ? "+" : ""}${ind.score} (${ind.label})`,
            urgency: Math.min(92, 35 + Math.abs(Math.round(ind.score)) / 2),
          });
        }
      } catch {
        /* single pair failing must not kill the room */
      }
    }),
  );
  return alerts.sort((a, b) => b.urgency - a.urgency).slice(0, 10);
}

const TTL = 180; // 3 minutes — a newsroom should breathe

export async function getNewsRoom(): Promise<NewsRoom> {
  const key = cacheKey("newsroom");
  const hit = await cacheGet<NewsRoom>(key);
  if (hit) return hit;
  const [feedRes, alerts] = await Promise.all([fetchFeeds(), fetchAlerts()]);
  const room: NewsRoom = {
    updatedAt: Math.floor(Date.now() / 1000),
    items: feedRes.items.slice(0, 24),
    alerts,
    notes: feedRes.notes,
  };
  cacheSet(key, room, TTL);
  return room;
}
