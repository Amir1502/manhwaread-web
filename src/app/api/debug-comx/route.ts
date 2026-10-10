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

    // 4. Request /comix-read/ with normal UA
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
    logs.push(`4. GET /comix-read/ (normal UA) -> status: ${rCat.status}, title: "${titleCat}", len: ${tCat.length}`);

    // Experiment A: With Googlebot UA
    const rBot = await fetch('https://com-x.life/comix-read/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Cookie: cookieStr(),
      },
    });
    const tBot = await rBot.text();
    const titleBot = tBot.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    logs.push(`4a. GET /comix-read/ (Googlebot UA) -> status: ${rBot.status}, title: "${titleBot}", len: ${tBot.length}`);

    // Experiment B: With YandexBot UA
    const rYandex = await fetch('https://com-x.life/comix-read/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
        Cookie: cookieStr(),
      },
    });
    const tYandex = await rYandex.text();
    const titleYandex = tYandex.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    logs.push(`4b. GET /comix-read/ (YandexBot UA) -> status: ${rYandex.status}, title: "${titleYandex}", len: ${tYandex.length}`);

    // Find all links in tYandex
    const allHrefs = Array.from(tYandex.matchAll(/href=["']([^"']+)["']/gi)).map(m => m[1]);
    const comicHrefs = allHrefs.filter(h => /\/[0-9]+-[^"']+\.html/i.test(h));
    const dleContentSnippet = tYandex.match(/id=["']dle-content["'][\s\S]*?<\/div>/i)?.[0] || '';

    logs.push(`5a. total hrefs: ${allHrefs.length}`);
    logs.push(`5b. sample hrefs: ${allHrefs.slice(0, 15).join(', ')}`);
    logs.push(`5c. comic-like hrefs (${comicHrefs.length}): ${comicHrefs.slice(0, 5).join(', ')}`);

    const realLink = comicHrefs.find(h => !h.includes('rising-quiver') && !h.includes('relic') && !h.includes('honeypot') && !h.includes('flint') && !h.includes('river')) || comicHrefs[0];
    let tDetails = '';
    let hasData = false;
    let readerUrl = '';
    let tReader = '';
    let imagesMatch: RegExpMatchArray | null = null;

    // Test detail variations on https://com-x.life/34079-unylye-budni-juuko.html
    const targetUrl = 'https://com-x.life/34079-unylye-budni-juuko.html';

    const testUas = [
      { name: 'BrowserUA + Referer', ua: BROWSER_UA, referer: 'https://com-x.life/comix-read/' },
      { name: 'YandexBot + Referer', ua: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)', referer: 'https://com-x.life/comix-read/' },
      { name: 'Googlebot + Referer', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', referer: 'https://com-x.life/comix-read/' },
      { name: 'Chrome Ru', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', referer: 'https://com-x.life/comix-read/' },
    ];

    for (const t of testUas) {
      try {
        const r = await fetch(targetUrl, {
          headers: {
            'User-Agent': t.ua,
            Cookie: cookieStr(),
            Referer: t.referer,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
          },
        });
        const text = await r.text();
        const title = text.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
        logs.push(`Test [${t.name}]: status ${r.status}, title "${title}", len ${text.length}, has__DATA__: ${text.includes('window.__DATA__')}`);
      } catch (e: any) {
        logs.push(`Test [${t.name}] error: ${e.message}`);
      }
    }

    return NextResponse.json({
      logs,
      realLink,
      readerUrl,
      dleContentSnippet: dleContentSnippet.slice(0, 500),
      detailsSnippet: tDetails.slice(0, 500),
      imagesSnippet: imagesMatch?.[1]?.slice(0, 300),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack, logs }, { status: 500 });
  }
}
