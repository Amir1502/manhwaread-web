import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { BROWSER_UA } from '@/lib/sources/http';

export async function GET() {
  const cookieMap = new Map<string, string>();
  const logs: string[] = [];

  const cookieStr = () => Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  const saveCookies = (res: Response) => {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter((c): c is string => Boolean(c));
    for (const c of raw) {
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      if (k && v) cookieMap.set(k.trim(), v.trim());
    }
  };

  try {
    // 1. Initial request to /
    const r1 = await fetch('https://com-x.life/', {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    saveCookies(r1);
    const t1 = await r1.text();
    logs.push(`1. GET / -> status: ${r1.status}, length: ${t1.length}, hasToken: ${t1.includes('token:')}`);

    // If challenge
    const tokenMatch = t1.match(/token:\s*["']([^"']+)["']/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      let nonce = 0;
      let hashHex = '';
      while (true) {
        const hash = crypto.createHash('sha256').update(token + ':' + nonce).digest('hex');
        if (hash.startsWith('00')) {
          hashHex = hash;
          break;
        }
        nonce++;
      }

      const params = new URLSearchParams();
      params.set('token', token);
      params.set('mode', 'modern');
      params.set('workTime', '50');
      params.set('iterations', String(nonce + 1));
      params.set('hasCrypto', '1');
      params.set('pow_nonce', String(nonce));
      params.set('pow_hash', hashHex);
      params.set('webdriver', '0');
      params.set('touch', '0');
      params.set('screen_w', '1920');
      params.set('screen_h', '1080');
      params.set('screen_cd', '24');
      params.set('tz', '0');
      params.set('dpr', '1');
      params.set('cdp', '0');
      params.set('cdpf', '');

      const r2 = await fetch('https://com-x.life/_v', {
        method: 'POST',
        headers: {
          'User-Agent': BROWSER_UA,
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookieStr(),
          Referer: 'https://com-x.life/',
        },
        body: params.toString(),
      });
      saveCookies(r2);
      logs.push(`2. POST /_v -> status: ${r2.status}, cookies: ${Array.from(cookieMap.keys()).join(', ')}`);
    }

    // 3. Request / with cookies
    const rHome = await fetch('https://com-x.life/', {
      headers: {
        'User-Agent': BROWSER_UA,
        Cookie: cookieStr(),
        Referer: 'https://com-x.life/',
      },
    });
    saveCookies(rHome);
    const tHome = await rHome.text();
    const titleHome = tHome.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    logs.push(`3. GET / (with cookies) -> status: ${rHome.status}, title: "${titleHome}", len: ${tHome.length}`);

    // 4. Request /comix-read/
    const rCat = await fetch('https://com-x.life/comix-read/', {
      headers: {
        'User-Agent': BROWSER_UA,
        Cookie: cookieStr(),
        Referer: 'https://com-x.life/',
      },
    });
    saveCookies(rCat);
    const tCat = await rCat.text();
    const titleCat = tCat.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    logs.push(`4. GET /comix-read/ -> status: ${rCat.status}, title: "${titleCat}", len: ${tCat.length}`);

    // 5. Check body snippet of 401 if present
    const gateText = tCat.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

    return NextResponse.json({
      logs,
      cookies: Array.from(cookieMap.entries()),
      gateText,
      rawCatSnippet: tCat.slice(0, 1500),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack, logs }, { status: 500 });
  }
}
