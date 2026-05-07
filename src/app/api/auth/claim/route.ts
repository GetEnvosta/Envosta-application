import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { token, password } = await req.json();

  if (!token || !password) return NextResponse.json({ error: 'token and password required' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Look up the unclaimed account
  const { data: user } = await sb
    .from('users')
    .select('id, email, full_name, claimed, claim_expires_at, metadata')
    .eq('claim_token', token)
    .eq('claimed', false)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: 'Invalid or already claimed token' }, { status: 404 });

  if (user.claim_expires_at && new Date(user.claim_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This claim link has expired' }, { status: 410 });
  }

  // Update the auth user's password
  const { error: updateError } = await sb.auth.admin.updateUserById(user.id, {
    password,
  });

  if (updateError) {
    console.error('Password update error:', updateError);
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }

  // Mark account as claimed
  await sb.from('users').update({
    claimed: true,
    claim_token: null,
    claim_expires_at: null,
  }).eq('id', user.id);

  // Log it
  await sb.from('logs').insert({
    user_id: user.id,
    action: 'account.claimed',
    details: `Account claimed by ${user.full_name} (${user.email})`,
    level: 'info',
  });

  const meta = (user.metadata as any) ?? {};
  const isComp = meta.comp === true;
  const pendingSubscriptionId = meta.pending_subscription_id ?? null;
  const pendingSetupClientSecret = meta.pending_setup_intent_client_secret ?? null;

  return NextResponse.json({
    success: true,
    email: user.email,
    comp: isComp,
    pendingSubscriptionId,
    pendingSetupClientSecret,
  });
}
