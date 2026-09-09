import NewsRoom from "@/components/NewsRoom";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NewsPage() {
  return (
    <div className="page">
      <div className="page-title">
        <h1>FX News Room</h1>
        <p>Live forex news aggregation from major sources — headlines classified by market impact with probable short-term action signals. Auto-refreshes every 60 seconds.</p>
      </div>
      <NewsRoom />
      <div style={{ marginTop: 18 }}>
        <Link className="chip blue" href="/dashboard">← Back to dashboard</Link>
      </div>
    </div>
  );
}

