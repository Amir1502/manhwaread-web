import { NextRequest, NextResponse } from 'next/server';
import { isAllowedImageHost } from '@/lib/sources';
import { BROWSER_UA } from '@/lib/sources/http';

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const sourceId = request.nextUrl.searchParams.get('src') || '';
  if (!url) return new NextResponse('Missing url parameter', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Malformed URL', { status: 400 });
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return new NextResponse('Invalid protocol', { status: 400 });
  }
  // Allow-list per source: the proxy must not become an open relay (SSRF).
  const source = isAllowedImageHost(sourceId, parsed.hostname);
  if (!source) return new NextResponse('Host not allowed', { status: 403 });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        ...(source.imageReferer ? { Referer: source.imageReferer } : {}),
      },
    }).finally(() => clearTimeout(timer));

    if (!upstream.ok || !upstream.body) {
      return new NextResponse(`Upstream error ${upstream.status}`, { status: upstream.status === 404 ? 404 : 502 });
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      return new NextResponse('Not an image', { status: 502 });
    }
    const length = Number(upstream.headers.get('content-length') || 0);
    if (length > MAX_BYTES) return new NextResponse('Image too large', { status: 413 });

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(length ? { 'Content-Length': String(length) } : {}),
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error proxying image';
    return new NextResponse(msg, { status: 502 });
  }
}
