import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { purchasePhoneNumber } from '@/services/twilio';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { phoneNumber, userId } = await req.json();
  if (!phoneNumber || !userId) return NextResponse.json({ error: 'phoneNumber and userId required' }, { status: 400 });

  // Verify user exists
  const { data: targetUser } = await supabase.from('users').select('id, full_name, email').eq('id', userId).single();
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Find user's first active site to attach the number to (webhook needs it on a site)
  const { data: userSite } = await supabase
    .from('sites')
    .select('id, label, twilio_phone_number')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('twilio_phone_number', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!userSite) {
    return NextResponse.json({
      error: 'User has no active site without a phone number. Create a site first or free up an existing number.',
    }, { status: 400 });
  }

  try {
    const result = await purchasePhoneNumber(phoneNumber, userSite.id);

    // Log
    await supabase.from('logs').insert({
      user_id: user.id,
      site_id: userSite.id,
      action: 'admin.number_purchased',
      details: `Admin purchased ${phoneNumber} for ${targetUser.full_name || targetUser.email} (site: ${userSite.label})`,
      level: 'info',
      metadata: { phone_number: phoneNumber, target_user: userId, site_id: userSite.id },
    });

    return NextResponse.json({ success: true, siteId: userSite.id, siteLabel: userSite.label, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
