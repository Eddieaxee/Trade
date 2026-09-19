import NewsRoom from "@/components/NewsRoom";
import AiSummary from "@/components/AiSummary";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NewsPage() {
  return (
    <div className="page">
      <div className="page-title">
        <h1>FX News Room</h1>
        <p>Live headlines by market impact, the economic calendar and app-generated flips. Auto-refreshes every 60s.</p>
      </div>
      <AiSummary />
      <NewsRoom />
      <div style={{ marginTop: 18 }}>
        <Link className="chip blue" href="/dashboard">← Back to dashboard</Link>
      </div>
    </div>
  );
}
