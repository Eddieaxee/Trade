import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FEEDS = [
  { name: "FXStreet", url: "https://www.fxstreet.com/rss" },
  { name: "DailyFX", url: "https://www.dailyfx.com/rss" },
  { name: "ForexLive", url: "https://www.forexlive.com/rss" },
  { name: "Investing.com", url: "https://www.investing.com/rss/news_25.rss" },
  { name: "Reuters FX", url: "https://www.reutersagency.com/feed/?best-topics=forex&post_type=best" }
];

const IMPACT_KEYWORDS: Array<{ words: string[]; impact: string }> = [
  { words: ["rate hike", "rate cut", "interest rate", "emergency", "intervention", "crisis", "crash"], impact: "high" },
  { words: ["inflation", "cpi", "gdp", "nfp", "payroll", "unemployment", "pmi"], impact: "high" },
  { words: ["fed", "ecb", "boe", "boj", "central bank", "powell", "lagarde"], impact: "medium" },
  { words: ["geopolitical", "war", "sanctions", "tariff", "brexit"], impact: "medium" },
  { words: ["technical", "analysis", "forecast", "outlook"], impact: "low" }
];

const CURRENCY_MAP: Record<string, string[]> = {
  USD: ["dollar", "usd", "fed", "powell", "nfp", "payroll"],
  EUR: ["euro", "eur", "ecb", "lagarde", "eurozone"],
  GBP: ["pound", "sterling", "gbp", "boe", "bank of england"],
  JPY: ["yen", "jpy", "boj", "bank of japan"],
  CHF: ["franc", "chf", "snb", "swiss"],
  AUD: ["aussie", "aud", "rba", "australia"],
  CAD: ["loonie", "cad", "boc", "canada"],
  NZD: ["kiwi", "nzd", "rbnz", "new zealand"]
};

function classifyImpact(title: string): string {
  const t = title.toLowerCase();
  for (const kw of IMPACT_KEYWORDS) {
    if (kw.words.some((w) => t.includes(w))) return kw.impact;
  }
  return "low";
}

function detectCurrencies(title: string): string[] {
  const t = title.toLowerCase();
  const found: string[] = [];
  for (const [ccy, words] of Object.entries(CURRENCY_MAP)) {
    if (words.some((w) => t.includes(w))) found.push(ccy);
  }
  return found;
}

interface NewsItem {
  title: string;
  source: string;
  time: number;
  url: string;
  impact: string;
  currencies: string[];
}

function extractItems(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item[\s\S]*?<\/item>/g;
  const titleRe = /<title>([\s\S]*?)<\/title>/;
  const linkRe = /<link>([\s\S]*?)<\/link>/;
  const dateRe = /<pubDate>([\s\S]*?)<\/pubDate>/;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[0];
    const titleM = titleRe.exec(block);
    const linkM = linkRe.exec(block);
    const dateM = dateRe.exec(block);
    if (!titleM) continue;
    const title = titleM[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&[^;]+;/g, " ");
    if (title.length < 10) continue;
    const link = linkM ? linkM[1].trim() : "";
    const time = dateM ? new Date(dateM[1]).getTime() / 1000 : Date.now() / 1000;
    items.push({
      title,
      source,
      time,
      url: link,
      impact: classifyImpact(title),
      currencies: detectCurrencies(title)
    });
  }
  return items;
}

export async function GET() {
  const allItems: NewsItem[] = [];
  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FXPulse/1.0)" },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = extractItems(xml, feed.name);
      allItems.push(...items);
    } catch {
      // skip failed feeds
    }
  }
  allItems.sort((a, b) => b.time - a.time);
  const top = allItems.slice(0, 30);
  return NextResponse.json({ items: top }, { headers: { "Cache-Control": "no-store" } });
}

