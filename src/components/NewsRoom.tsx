"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  title: string;
  source: string;
  time: number;
  url: string;
  impact: "high" | "medium" | "low";
  currencies: string[];
}

const IMPACT_KEYWORDS: Array<{ words: string[]; impact: "high" | "medium" | "low" }> = [
  { words: ["rate hike", "rate cut", "interest rate", "emergency", "intervention", "crisis", "crash", "default"], impact: "high" },
  { words: ["inflation", "cpi", "ppi", "gdp", "nfp", "payroll", "unemployment", "retail sales", "pmi"], impact: "high" },
  { words: ["fed", "ecb", "boe", "boj", "rba", "boc", "rbnz", "central bank", "powell", "lagarde"], impact: "medium" },
  { words: ["geopolitical", "war", "sanctions", "tariff", "brexit", "election"], impact: "medium" },
  { words: ["technical", "analysis", "forecast", "outlook", "review"], impact: "low" }
];

function classifyImpact(title: string): "high" | "medium" | "low" {
  const t = title.toLowerCase();
  for (const kw of IMPACT_KEYWORDS) {
    if (kw.words.some((w) => t.includes(w))) return kw.impact;
  }
  return "low";
}

function detectCurrencies(title: string): string[] {
  const t = title.toLowerCase();
  const found: string[] = [];
  const map: Record<string, string[]> = {
    USD: ["dollar", "usd", "fed", "powell", "us ", "u.s.", "america", "nfp", "payroll"],
    EUR: ["euro", "eur", "ecb", "lagarde", "european", "eurozone"],
    GBP: ["pound", "sterling", "gbp", "boe", "bank of england", "uk", "britain"],
    JPY: ["yen", "jpy", "boj", "bank of japan", "japan"],
    CHF: ["franc", "chf", "snb", "swiss", "switzerland"],
    AUD: ["aussie", "aud", "rba", "australia"],
    CAD: ["loonie", "cad", "boc", "canada", "oil"],
    NZD: ["kiwi", "nzd", "rbnz", "new zealand"]
  };
  for (const [ccy, words] of Object.entries(map)) {
    if (words.some((w) => t.includes(w))) found.push(ccy);
  }
  return found;
}

function fmtAgo(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function generateProbableAction(item: NewsItem): string {
  const t = item.title.toLowerCase();
  const isPositive = ["rate hike", "hawkish", "surge", "rally", "strong", "beat", "growth", "recovery"].some((w) => t.includes(w));
  const isNegative = ["rate cut", "dovish", "crash", "slump", "weak", "miss", "recession", "crisis"].some((w) => t.includes(w));
  const ccys = item.currencies;
  if (ccys.length >= 2) {
    if (isPositive) return `${ccys[0]}/${ccys[1]} likely to strengthen in next 1-4h`;
    if (isNegative) return `${ccys[0]}/${ccys[1]} likely to weaken in next 1-4h`;
  }
  if (ccys.length === 1) {
    if (isPositive) return `${ccys[0]} pairs may see bullish pressure`;
    if (isNegative) return `${ccys[0]} pairs may see bearish pressure`;
  }
  return "Monitor price action for confirmation";
}

function NewsCard({ item }: { item: NewsItem }) {
  const action = generateProbableAction(item);
  return (
    <div className="news-card">
      <div className="news-head">
        <span className={`impact-badge ${item.impact}`}>{item.impact.toUpperCase()}</span>
        <span className="news-source">{item.source}</span>
        <span className="news-time">{fmtAgo((Date.now() - item.time * 1000) / 1000)}</span>
      </div>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-title">{item.title}</a>
      <div className="news-meta">
        {item.currencies.map((c) => <span key={c} className="chip blue">{c}</span>)}
        <span className="news-action">→ {action}</span>
      </div>
    </div>
  );
}

export default function NewsRoom() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);

  const fetchNews = async () => {
    try {
      const res = await fetch(`/api/news?n=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = (data.items || []) as NewsItem[];
      const seen = new Set<string>();
      const deduped = raw.filter((it) => {
        const key = it.title.toLowerCase().slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setItems(deduped);
      setLastUpdate(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const id = setInterval(fetchNews, 60000);
    return () => clearInterval(id);
  }, []);

  const high = items.filter((i) => i.impact === "high");
  const medium = items.filter((i) => i.impact === "medium");
  const low = items.filter((i) => i.impact === "low");

  return (
    <div>
      <div className="status-bar" style={{ marginBottom: 14 }}>
        {loading && <><span className="spinner" /> <span>Aggregating forex news…</span></>}
        {error && <span className="err">⚠ {error}</span>}
        {!loading && !error && (
          <span className="pill">📡 {items.length} headlines · updated {fmtAgo((Date.now() - lastUpdate) / 1000)} ago · auto-refreshes every 60s</span>
        )}
      </div>

      {high.length > 0 && (
        <div className="panel" style={{ marginBottom: 14, borderColor: "rgba(240, 80, 106, 0.5)" }}>
          <h3>🔴 High impact — probable immediate market action</h3>
          {high.map((item, i) => <NewsCard key={i} item={item} />)}
        </div>
      )}

      {medium.length > 0 && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <h3>🟡 Medium impact — next few hours</h3>
          {medium.map((item, i) => <NewsCard key={i} item={item} />)}
        </div>
      )}

      {low.length > 0 && (
        <div className="panel">
          <h3>🟢 Low impact — background context</h3>
          {low.map((item, i) => <NewsCard key={i} item={item} />)}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="panel"><p className="tone-muted">No headlines available right now. News feeds may be temporarily unreachable.</p></div>
      )}
    </div>
  );
}
