import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * POST /api/partners/create-client
 *
 * Partner creates a new customer account under their organization.
 * Generates a temp password (client resets via email), inserts a users
 * row with partner_id linking back to the caller.
 *
 * Auth: caller must be authed AND have role='partner'. Uses
 * getEffectiveUserId() so admin impersonation works.
 *
 * Body: { name, email, companyName? }
 */
export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServerClient();
  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (caller?.role !== 'partner') {
    return NextResponse.json({ error: 'Partner access required' }, { status: 403 });
  }

  const { name, email, companyName } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!email?.trim() || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const cleanEmail = email.toLowerCase().trim();

  // Reject duplicate emails up front so we don't waste an auth.admin.createUser call.
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  // Random temp password — the client will set their own via the password
  // reset email triggered by Supabase auth.
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const clientId = authData.user.id;

  await admin.from('users').upsert({
    id: clientId,
    email: cleanEmail,
    full_name: name.trim(),
    company_name: companyName?.trim() || null,
    role: 'customer',
    partner_id: userId,
  }, { onConflict: 'id' });

  return NextResponse.json({
    success: true,
    client: { id: clientId, email: cleanEmail, full_name: name.trim() },
  });
}
