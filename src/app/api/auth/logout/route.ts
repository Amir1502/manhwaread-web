import { NextRequest } from 'next/server';
import { jsonOk } from '@/lib/api';

export async function POST(_req: NextRequest) {
  const res = jsonOk({ ok: true });
  res.cookies.set('mr_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return res;
}
