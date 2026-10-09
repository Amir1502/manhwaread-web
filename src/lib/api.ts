import { NextResponse } from 'next/server';
import { SourceError } from './sources/http';

export function jsonOk(body: Record<string, unknown>, cacheSeconds = 0) {
  return NextResponse.json(
    { success: true, ...body },
    {
      headers: cacheSeconds
        ? { 'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 4}` }
        : { 'Cache-Control': 'no-store' },
    },
  );
}

export function jsonError(err: unknown, statusOverride?: number) {
  const upstream = err instanceof SourceError ? err.status : undefined;
  const status = statusOverride ?? (upstream && upstream >= 400 && upstream < 500 ? upstream : 502);
  const message = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Unknown error';
  if (status >= 500) console.error('[api]', message);
  return NextResponse.json({ success: false, error: message }, { status });
}

