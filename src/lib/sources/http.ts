export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export class SourceError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SourceError';
  }
}

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

/** fetch with timeout, browser UA and a single retry on 429/5xx. */
export async function httpGet(url: string, opts: FetchOptions = {}): Promise<Response> {
  const { headers = {}, timeoutMs = 9000, retries = 1 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8', ...headers },
        cache: 'no-store',
      });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new SourceError(`HTTP ${res.status} for ${new URL(url).host}`, res.status);
      return res;
    } catch (err) {
      lastErr = err;
      if (err instanceof SourceError) throw err;
      if (attempt >= retries) break;
    } finally {
      clearTimeout(timer);
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new SourceError(`Network error: ${msg}`);
}

export async function getJson<T = unknown>(url: string, opts?: FetchOptions): Promise<T> {
  const res = await httpGet(url, { ...opts, headers: { Accept: 'application/json', ...(opts?.headers || {}) } });
  return (await res.json()) as T;
}

export async function getText(url: string, opts?: FetchOptions): Promise<string> {
  const res = await httpGet(url, {
    ...opts,
    headers: { Accept: 'text/html,application/xhtml+xml', ...(opts?.headers || {}) },
  });
  return res.text();
}

/** Tiny in-memory TTL cache (per serverless instance). */
const cache = new Map<string, { at: number; value: Promise<unknown> }>();
export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn().catch(err => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: now, value });
  if (cache.size > 500) {
    for (const [k, v] of cache) if (now - v.at > ttlMs) cache.delete(k);
  }
  return value;
}

export function parseChapterNumber(text: string): number {
  const m = text.match(/(?:глава|chapter|ch\.?|гл\.?)\s*(\d+(?:[.,]\d+)?)/i) || text.match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : 0;
}

export function cleanText(s: string | undefined | null): string {
  return (s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function toIsoDate(d: string | number | Date | undefined | null): string | undefined {
  if (d === undefined || d === null || d === '') return undefined;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}
