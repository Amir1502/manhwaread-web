import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Validate URL protocol
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return new NextResponse('Invalid protocol', { status: 400 });
    }
  } catch {
    return new NextResponse('Malformed URL', { status: 400 });
  }

  try {
    const imageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://mangadex.org/',
      },
    });

    if (!imageRes.ok) {
      return new NextResponse(`Failed to fetch image: ${imageRes.statusText}`, { status: imageRes.status });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imageRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error proxying image';
    return new NextResponse(msg, { status: 502 });
  }
}
