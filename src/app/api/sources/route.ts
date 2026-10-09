import { NextRequest } from 'next/server';
import { jsonOk } from '@/lib/api';
import { listSources } from '@/lib/sources';

export async function GET(request: NextRequest) {
  const adult = request.nextUrl.searchParams.get('adult') === '1';
  return jsonOk({ sources: listSources(adult) }, 3600);
}
