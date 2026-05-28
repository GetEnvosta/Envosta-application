import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { ALL_ROLES, isAdminRole, type UserRole } from '@/lib/roles';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`create-user:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
  }

  // Verify caller is admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const { name, email, password, role, phone, companyName } = await req.json();

    // Validation
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 320) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 1 || name.length > 200) {
      return NextResponse.json({ error: 'Name is required (max 200 characters)' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be 8–128 characters' }, { status: 400 });
    }
    if (!role || !ALL_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authErr) {
      if (authErr.message?.includes('already been registered')) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
      }
      console.error('Create user auth error:', authErr);
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    const userId = authData.user.id;

    // Create profile row with chosen role
    await supabaseAdmin.from('users').upsert({
      id: userId,
      email,
      full_name: name,
      phone: phone || null,
      company_name: companyName || null,
      role,
    }, { onConflict: 'id' });

    return NextResponse.json({
      success: true,
      user: { id: userId, email, full_name: name, role },
    });
  } catch (err: any) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
