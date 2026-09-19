"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

interface NewsAction { pair: string; bias: "long" | "short"; confidence: number; }
interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: number;
  summary: string;
  currencies: Array<{ ccy: string; delta: number }>;
  actions: NewsAction[];
  horizon: string;
  impact: "high" | "medium" | "low";
  tags: string[];
}
interface TechAlert { pair: string; tf: string; kind: string; direction: "up" | "down" | "neutral"; detail: string; urgency: number; }
interface EconEvent {
  symbol: string; event: string; when: number; impact: "high" | "medium" | "low";
  actual: string | null; previous: string | null; forecast: string | null; direction: "past" | "future";
}

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function fmtAgo(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}
function fmtWhen(ts: number): string {
  const d = new Date(ts * 1000);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const wd = days[d.getUTCDay()];
  const mo = months[d.getUTCMonth()];
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${wd} ${dd} ${mo} ${yyyy} · ${hh}:${mm} UTC`;
}
const IMPACT_LABEL: Record<string, { label: string; tone: string }> = {
  high: { label: "HIGH", tone: "red" },
  medium: { label: "MEDIUM", tone: "warn" },
  low: { label: "LOW", tone: "green" },
};

function NewsCard({ item }: { item: NewsItem }) {
  const { label } = IMPACT_LABEL[item.impact] ?? IMPACT_LABEL.low;
  return (
    <div className="news-card">
      <div className="news-head">
        <span className="impact-badge">{label}</span>
        <span className="news-source">{item.source}</span>
        <span className="news-time">{fmtAgo((Date.now() - item.publishedAt * 1000) / 1000)}</span>
      </div>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-title">{item.title}</a>
      {item.currencies.length > 0 && (
        <div className="news-meta" style={{ marginBottom: 6 }}>
          {item.currencies.map((c) => (
            <span key={c.ccy} className={`chip ${c.delta > 0 ? 'green' : c.delta < 0 ? 'red' : 'gray'}`}>{c.ccy} {c.delta > 0 ? '+' : ''}{c.delta.toFixed(1)}</span>
          ))}
        </div>
      )}
      {item.summary && <p className="tone-muted" style={{ fontSize: 12.5, margin: '4px 0' }}>{item.summary}</p>}
      {item.actions.length > 0 && (
        <div className="news-meta">
          {item.actions.map((a) => <span key={a.pair} className={`chip ${a.bias === 'long' ? 'green' : 'red'}`}>{a.pair} → {a.bias.toUpperCase()} ({a.confidence}%)</span>)}
        </div>
      )}
    </div>
  );
}

function AlertCard({ a }: { a: TechAlert }) {
  return (
    <div className="news-card">
      <div className="news-head">
        <span className="alert-badge">{a.kind}</span>
        <span className="news-source">{a.pair} · {a.tf}</span>
        <span className="news-time">{Math.round(a.urgency)}/100 urgency</span>
      </div>
      <div className="news-title" style={{ cursor: 'default' }}>{a.detail}</div>
      <div className="news-meta">
        <span className={`chip ${a.direction === 'up' ? 'green' : a.direction === 'down' ? 'red' : 'gray'}`}>{a.direction === 'up' ? '↑ UP' : a.direction === 'down' ? '↓ DOWN' : '·'}</span>
        <span className="tone-muted">confidence {Math.round(a.urgency)}%</span>
      </div>
    </div>
  );
}

function CalendarRow({ e }: { e: EconEvent }) {
  const recent = (Date.now() / 1000) - e.when < 60 * 60 * 2;
  return (
    <tr className="calendar-row">
      <td><span className="alert-badge">{e.direction === 'past' ? 'released' : 'upcoming'}</span><span style={{ marginLeft: 6 }}>{e.symbol}</span></td>
      <td>{e.event}</td>
      <td>{fmtWhen(e.when)}</td>
      <td><span className={`chip ${e.impact === 'high' ? 'red' : e.impact === 'medium' ? 'warn' : 'green'}`}>{e.impact}</span></td>
      <td>{e.forecast ?? "—"}</td>
      <td>{e.previous ?? "—"}</td>
      <td className={recent ? "tone-up" : "tone-muted"}>{recent ? "Live now" : ""}</td>
    </tr>
  );
}

export default function NewsRoom() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [alerts, setAlerts] = useState<TechAlert[]>([]);
  const [calendar, setCalendar] = useState<EconEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [tab, setTab] = useState<"feed" | "calendar" | "alerts">("feed");

  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/news?n=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setAlerts(data.alerts || []);
      setCalendar(data.calendar || []);
      setLastUpdate(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRoom(); const id = setInterval(() => void fetchRoom(), 60_000); return () => clearInterval(id); }, []);

  const feed = [...items].sort((a, b) => (IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]) || b.publishedAt - a.publishedAt);
  // TAB 1 — strictly the latest 10 headlines, classified High → Medium → Low.
  const high = feed.slice(0, 10);
  // TAB 2 — upcoming ONLY (when >= now, future-sorted, year-accurate), high-impact first.
  const nowTs = Date.now() / 1000;
  const upcoming = calendar
    .filter((c) => c.direction === "future" && c.when >= nowTs - 60)
    .sort((a, b) => a.when - b.when)
    .slice(0, 5);
  const flips = [...alerts]
    .filter((a) => ["MACD cross", "Momentum spike", "RSI extreme", "Technical alignment"].includes(a.kind))
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 5);

  return (
    <div>
      <div className="news-tabs">
        <button className={`news-tab ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}><Icon name="news" size={14} /> Live Macro Feed</button>
        <button className={`news-tab ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")}><Icon name="calendar" size={14} /> Economic Calendar</button>
        <button className={`news-tab ${tab === "alerts" ? "active" : ""}`} onClick={() => setTab("alerts")}><Icon name="zap" size={14} /> App-Generated Flips</button>
      </div>

      <div className="status-bar" style={{ marginBottom: 14 }}>
        {loading && <><span className="spinner" /> <span>Aggregating forex news…</span></>}
        {error && <span className="err">⚠ {error}</span>}
        {!loading && !error && (
          <span className="pill">📡 {items.length} headlines · {alerts.length} tech alerts · updated {fmtAgo((Date.now() - lastUpdate) / 1000)} ago · auto-refreshes every 60s</span>
        )}
      </div>

      {tab === "feed" && (
        <>
          <div className="panel" style={{ marginBottom: 10 }}>
            <h3>Latest 10 headlines — classified by market impact</h3>
            <p className="tone-muted" style={{ fontSize: 12, margin: '0 0 4px' }}>High impact first, then Medium, then Low. Multi-source feed — no single-source blind spots.</p>
          </div>
          {high.length === 0 && !loading && <div className="panel"><p className="tone-muted">No high-impact headlines available right now.</p></div>}
          {high.map((it) => <NewsCard key={it.id} item={it} />)}
        </>
      )}

      {tab === "calendar" && (
        <>
          <div className="panel" style={{ marginBottom: 14 }}>
            <h3>Upcoming high-impact economic events (UTC)</h3>
            {upcoming.length === 0 ? (
              <p className="tone-muted">No high-impact events scheduled for the next week.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="grid-table">
                  <thead><tr><th>Currency</th><th>Event</th><th>When</th><th>Impact</th><th>Forecast</th><th>Prev</th><th></th></tr></thead>
                  <tbody>{upcoming.map((e, i) => <CalendarRow key={`up-${i}`} e={e} />)}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "alerts" && (
        <>
          {flips.length === 0 && !loading && <div className="panel"><p className="tone-muted">No significant market flips detected in the last scan.</p></div>}
          {flips.map((a, i) => <AlertCard key={`alert-${i}`} a={a} />)}
        </>
      )}
    </div>
  );
}

