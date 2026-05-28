import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createOpenSrsClient } from '@/lib/integrations/opensrs';

export const dynamic = 'force-dynamic';

/**
 * Domain availability check — calls OpenSRS directly from a Vercel
 * static IP (whitelisted). Phase 2D replaced the legacy register-domain
 * edge function fallback with a direct OpenSRS lookup.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`domain-check:${ip}`, 15, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const cleanDomain = domain.toLowerCase().trim();
    if (cleanDomain.length > 253 || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    const opensrs = createOpenSrsClient();
    const result = await opensrs.checkAvailability(cleanDomain);
    // Don't log the full upstream payload — only the boolean we return.
    console.log('Domain check result:', cleanDomain, result.available);

    return NextResponse.json({ domain: cleanDomain, available: result.available });
  } catch (e: any) {
    console.error('Domain check error:', e);
    return NextResponse.json({ error: e?.message ?? 'Domain lookup failed' }, { status: 502 });
  }
}
