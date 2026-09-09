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

function fmtAgo(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function generateOutlook(items: NewsItem[]): { summary: string; risks: string[]; topPairs: string[] } {
  const high = items.filter((i) => i.impact === "high");
  const allCcys = items.flatMap((i) => i.currencies);
  const ccyCount: Record<string, number> = {};
  for (const c of allCcys) ccyCount[c] = (ccyCount[c] || 0) + 1;
  const topCcys = Object.entries(ccyCount).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  // Build summary from top headlines
  const headlineTexts = items.slice(0, 5).map((i) => i.title.toLowerCase());
  const isPositive = ["surge", "rally", "strong", "beat", "growth", "recovery", "hawkish", "rate hike"].some((w) =>
    headlineTexts.some((t) => t.includes(w))
  );
  const isNegative = ["crash", "slump", "weak", "miss", "recession", "crisis", "dovish", "rate cut"].some((w) =>
    headlineTexts.some((t) => t.includes(w))
  );

  let summary = "";
  if (high.length > 0) {
    const main = high[0];
    summary = `High-impact headlines (${high.length}) dominate — led by "${main.title}". `;
    if (isPositive) summary += "Net sentiment leans bullish for the affected currencies over the next 1–4 hours.";
    else if (isNegative) summary += "Net sentiment leans bearish for the affected currencies over the next 1–4 hours.";
    else summary += "Mixed signals — price action confirmation required before taking directional bias.";
  } else if (items.length > 0) {
    summary = `${items.length} headlines tracked. No high-impact events — expect range-bound price action unless technical levels break.`;
  } else {
    summary = "No live headlines available — awaiting feed connection.";
  }

  const risks: string[] = [];
  if (high.length >= 2) risks.push("Multiple high-impact events — volatility spike likely");
  if (headlineTexts.some((t) => t.includes("fed") || t.includes("ecb"))) risks.push("Central bank headlines in play");
  if (headlineTexts.some((t) => t.includes("geopolitical") || t.includes("war") || t.includes("tariff")))
    risks.push("Geopolitical risk premium active");
  if (risks.length === 0) risks.push("Low headline risk — technicals driving price");

  const topPairs: string[] = [];
  const priorityCcys = ["USD", "EUR", "GBP", "JPY"];
  const c1 = topCcys.find((c) => priorityCcys.includes(c));
  if (c1) {
    for (const c2 of priorityCcys) {
      if (c2 !== c1 && topPairs.length < 3) topPairs.push(`${c1}${c2}`);
    }
  }
  if (topPairs.length === 0) topPairs.push("EUR/USD", "GBP/USD");

  return { summary, risks, topPairs };
}

export default function AiSummary() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(0);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/news?n=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems((data.items || []) as NewsItem[]);
      setGeneratedAt(Date.now());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, []);

  const outlook = generateOutlook(items);

  return (
    <div className="panel ai-summary" style={{ marginBottom: 18 }}>
      <h3>🤖 AI Market Summary — generated from live headlines</h3>
      <div className="ai-content">
        <p className="ai-narrative">{loading ? "Generating market outlook…" : outlook.summary}</p>
        <div className="ai-risks">
          {outlook.risks.map((r, i) => (
            <span key={i} className="ai-risk-tag">⚠ {r}</span>
          ))}
        </div>
        <div className="ai-pairs">
          <span className="ai-label">Most affected pairs:</span>
          {outlook.topPairs.map((p) => (
            <span key={p} className="chip blue">{p}</span>
          ))}
        </div>
        <div className="ai-timestamp">
          🔄 AI summary refreshes every 60s · last update: {generatedAt ? fmtAgo((Date.now() - generatedAt) / 1000) + " ago" : "—"}
        </div>
      </div>
    </div>
  );
}
