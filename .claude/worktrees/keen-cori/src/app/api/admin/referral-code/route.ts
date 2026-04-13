import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// GET — Get referral stats for the current user
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: profile } = await sb.from('users').select('referral_code, role').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Get stats
  const [
    { count: clickCount },
    { count: signupCount },
    { data: commissions },
  ] = await Promise.all([
    sb.from('referral_clicks').select('id', { count: 'exact', head: true }).eq('affiliate_id', user.id),
    sb.from('referral_clicks').select('id', { count: 'exact', head: true }).eq('affiliate_id', user.id).eq('converted', true),
    sb.from('commissions').select('amount_cad, status').eq('earner_id', user.id),
  ]);

  const totalEarned = (commissions ?? []).reduce((sum, c) => sum + c.amount_cad, 0);
  const pendingAmount = (commissions ?? []).filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount_cad, 0);

  return NextResponse.json({
    referralCode: profile.referral_code,
    clicks: clickCount ?? 0,
    signups: signupCount ?? 0,
    totalEarned,
    pendingAmount,
    commissionCount: commissions?.length ?? 0,
  });
}

// POST — Generate or update referral code
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: profile } = await sb.from('users').select('role, full_name').eq('id', user.id).single();
  if (!isStaffRole(profile?.role) && profile?.role !== 'customer') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const { code } = await req.json();

  // Generate code from name if not provided
  let referralCode = code?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!referralCode) {
    referralCode = (profile?.full_name || 'partner')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
    // Add random suffix to avoid collisions
    referralCode += '-' + Math.random().toString(36).slice(2, 6);
  }

  // Check uniqueness
  const { data: existing } = await sb.from('users').select('id').eq('referral_code', referralCode).neq('id', user.id).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Code already taken' }, { status: 409 });
  }

  await sb.from('users').update({ referral_code: referralCode }).eq('id', user.id);

  return NextResponse.json({ referralCode });
}
