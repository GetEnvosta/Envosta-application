import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Caller must be a partner
  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (caller?.role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, email, companyName } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!email?.trim() || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Check for existing user
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  // Generate a temporary password — client can reset via email
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  });

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const clientId = authData.user.id;

  // Create profile row, linked to this partner
  await admin.from('users').upsert({
    id: clientId,
    email: email.toLowerCase().trim(),
    full_name: name.trim(),
    company_name: companyName?.trim() || null,
    role: 'customer',
    partner_id: user.id,
  }, { onConflict: 'id' });

  return NextResponse.json({
    success: true,
    client: { id: clientId, email: email.toLowerCase().trim(), full_name: name.trim() },
  });
}
