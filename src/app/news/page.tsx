'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NewsRoom } from '@/lib/news';
import { fmtAgo } from '@/lib/utils';

function impactChip(impact: string) {
  if (impact === 'high') return <span className="chip red">HIGH IMPACT</span>;
  if (impact === 'medium') return <span className="chip blue">MEDIUM</span>;
  return <span className="chip gray">LOW</span>;
}

function dirIcon(d: string) {
  return d === 'up' ? <span className="tone-up">▲</span> : d === 'down' ? <span className="tone-down">▼</span> : <span className="tone-muted">•</span>;
}

function NewsRoomInner() {
  const [room, setRoom] = useState<NewsRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [tab, setTab] = useState<'actions' | 'alerts'>('actions');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/news', { cache: 'no-store' });
      if (!r.ok) throw new Error(`newsroom ${r.status}`);
      const data: NewsRoom = await r.json();
      setRoom(data);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load newsroom');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000); // live refresh every 60s
    return () => clearInterval(id);
  }, [load]);

  const actions = (room?.items ?? []).slice(0, 10);
  const alerts = room?.alerts ?? [];

  return (
    <div className="page">
      <div className="page-title">
        <h1>News Room</h1>
        <p>Live macro headlines cross-referenced against live technical readings — top probable actions for the next minutes to hours, plus real-time price-movement warnings.</p>
      </div>

      <div className="status-bar">
        <button className="chip blue" style={{ cursor: 'pointer', background: 'transparent' }} onClick={() => void load()}>
          ↻ Refresh now
        </button>
        {updatedAt > 0 && <span className="pill">updated {fmtAgo(updatedAt / 1000)} ago · auto-refresh 60s</span>}
        {error && <span className="err">⚠ {error}</span>}
        {room?.notes?.length ? <span className="pill">{room.notes[0]}</span> : null}
      </div>

      <div className="tab-row">
        <button className={`tab ${tab === 'actions' ? 'active' : ''}`} onClick={() => setTab('actions')}>
          Top 10 probable actions
        </button>
        <button className={`tab ${tab === 'alerts' ? 'active' : ''}`} onClick={() => setTab('alerts')}>
          Live movement warnings {alerts.length ? `(${alerts.length})` : ''}
        </button>
      </div>

      {tab === 'actions' && (
        <div className="news-list">
          {!room && !error && <div className="status-bar"><span className="spinner" /> Fetching live feeds…</div>}
          {actions.map((n, i) => (
            <a key={n.id} className="news-card" href={n.url} target="_blank" rel="noopener noreferrer">
              <div className="news-rank">#{i + 1}</div>
              <div className="news-main">
                <div className="news-headline">{n.title}</div>
                <div className="news-meta">
                  <span className="chip gray">{n.source}</span>
                  {impactChip(n.impact)}
                  <span className="chip blue">horizon {n.horizon}</span>
                  <span className="tone-muted">{fmtAgo(n.publishedAt)} ago</span>
                </div>
                {n.summary && <div className="news-summary">{n.summary.slice(0, 180)}{n.summary.length > 180 ? '…' : ''}</div>}
                <div className="news-actions">
                  {n.actions.slice(0, 3).map((act, j) => (
                    <span key={j} className={`chip ${act.bias === 'long' ? 'green' : 'red'}`}>
                      {act.bias === 'long' ? '▲' : '▼'} {act.pair}: {act.bias === 'long' ? 'LONG' : 'SHORT'} ({act.confidence}%)
                    </span>
                  ))}
                  {n.tags.slice(0, 3).map((t) => <span key={t} className="chip gray">#{t}</span>)}
                </div>
              </div>
            </a>
          ))}
          {room && !actions.length && (
            <div className="panel">No high-conviction macro actions right now — headlines are being scored continuously.</div>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="news-list">
          {alerts.map((al, i) => (
            <div key={i} className="news-card">
              <div className="news-rank">⚡</div>
              <div className="news-main">
                <div className="news-headline">
                  {dirIcon(al.direction)} <strong>{al.pair}</strong> · {al.kind} <span className="chip gray">{al.tf}</span>
                </div>
                <div className="news-summary">{al.detail}</div>
                <div className="news-meta">
                  <span className={`chip ${al.urgency >= 70 ? 'red' : al.urgency >= 45 ? 'blue' : 'gray'}`}>
                    urgency {Math.round(al.urgency)}/100
                  </span>
                  <span className="tone-muted">live candle reading — watch the next few {al.tf === '15m' ? 'minutes' : 'hours'}</span>
                </div>
              </div>
            </div>
          ))}
          {!alerts.length && !error && (
            <div className="panel">No live technical warnings at this moment — momentum is orderly across the watched pairs.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewsPage() {
  return <NewsRoomInner />;
}
