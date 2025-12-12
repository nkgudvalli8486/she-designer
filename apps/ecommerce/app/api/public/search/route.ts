import { NextRequest, NextResponse } from 'next/server';
import { searchCategories } from '@/src/lib/products';
import { rateLimit } from '@/src/lib/rate-limit';

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  );
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`pub_search:${ip}`, 90, 60_000);
  if (!rl.ok) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'retry-after': String(Math.ceil((rl.retryAfterMs ?? 0) / 1000)) }
    });
  }

  const url = new URL(req.url);
  const query = (url.searchParams.get('q') || '').trim();

  if (!query || query.length < 3) {
    return NextResponse.json({ data: [], message: 'Query must be at least 3 characters' });
  }

  const categories = await searchCategories(query);
  return NextResponse.json({ data: categories });
}

