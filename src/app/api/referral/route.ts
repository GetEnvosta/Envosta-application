import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET — Look up a referral code (public, used by get-started page)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const sb = getSb();
  const { data: affiliate } = await sb
    .from('users')
    .select('id, full_name, referral_code')
    .eq('referral_code', code.toLowerCase())
    .single();

  if (!affiliate) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });

  return NextResponse.json({ valid: true, affiliateName: affiliate.full_name });
}

// POST — Track a referral click (public, called when someone lands on ?ref=xxx)
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`ref-click:${ip}`, 20, 60_000);
  if (!allowed) return NextResponse.json({ ok: true }); // silent rate limit

  try {
    const { code, userAgent } = await req.json();
    if (!code) return NextResponse.json({ ok: true });

    const sb = getSb();
    const { data: affiliate } = await sb
      .from('users')
      .select('id')
      .eq('referral_code', code.toLowerCase())
      .single();

    if (!affiliate) return NextResponse.json({ ok: true });

    await sb.from('logs').insert({
      user_id: affiliate.id,
      action: 'referral.click',
      details: `Referral click for code: ${code.toLowerCase()}`,
      level: 'info',
      ip_address: ip,
      metadata: { referral_code: code.toLowerCase(), user_agent: userAgent || null, converted: false },
    });

    return NextResponse.json({ ok: true, affiliateId: affiliate.id });
  } catch {
    return NextResponse.json({ ok: true }); // never fail the user's page load
  }
}
