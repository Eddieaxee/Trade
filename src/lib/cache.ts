// ── Cache layer: in-process memory + optional Upstash Redis REST ─────────────
// Analysis snapshots and provider payloads are cached by TTL. When Upstash env
// vars are set, values also propagate to the shared REST cache so serverless
// instances see warm snapshots (used by /api/cron/refresh).

import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from '@/lib/constants';
import { fetchJson } from '@/lib/utils';

interface MemEntry {
  v: string;
  exp: number; // unix seconds
}

const mem = new Map<string, MemEntry>();

export function cacheKey(...parts: Array<string | number>): string {
  return ['fx', ...parts.map(String)].join(':');
}

function memGet(key: string): string | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp > 0 && e.exp < Date.now() / 1000) {
    mem.delete(key);
    return null;
  }
  return e.v;
}

function memSet(key: string, value: string, ttl: number): void {
  mem.set(key, { v: value, exp: ttl > 0 ? Date.now() / 1000 + ttl : 0 });
}

// ── Upstash REST helpers ─────────────────────────────────────────────────────

function upstashConfigured(): boolean {
  return UPSTASH_REDIS_REST_URL.length > 0 && UPSTASH_REDIS_REST_TOKEN.length > 0;
}

function upstashUrl(cmd: string, key: string, extra = ''): string {
  return `${UPSTASH_REDIS_REST_URL}/${cmd}/${encodeURIComponent(key)}${extra}`;
}

async function upstashGet(key: string): Promise<string | null> {
  if (!upstashConfigured()) return null;
  try {
    const res = await fetchJson<{ result: string | null }>(upstashUrl('get', key), {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
    }, 3000);
    return res && typeof res.result === 'string' ? res.result : null;
  } catch {
    return null;
  }
}

async function upstashSet(key: string, value: string, ttl: number): Promise<void> {
  if (!upstashConfigured() || ttl <= 0) return;
  try {
    await fetchJson<{ result: string }>(upstashUrl('set', key, `?EX=${Math.floor(ttl)}`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
      body: value
    }, 3000);
  } catch {
    // shared cache is best-effort
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const local = memGet(key);
  if (local !== null) {
    try {
      return JSON.parse(local) as T;
    } catch {
      return null;
    }
  }
  if (upstashConfigured()) {
    const remote = await upstashGet(key);
    if (remote !== null) {
      memSet(key, remote, 60); // re-seed in-process briefly
      try {
        return JSON.parse(remote) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return;
  }
  memSet(key, raw, ttl);
  await upstashSet(key, raw, ttl);
}

export async function cacheDelete(key: string): Promise<void> {
  mem.delete(key);
  if (upstashConfigured()) {
    try {
      await fetchJson(upstashUrl('del', key), {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
      }, 3000);
    } catch {
      // best-effort
    }
  }
}