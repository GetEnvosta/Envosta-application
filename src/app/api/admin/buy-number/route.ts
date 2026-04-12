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

  const { phoneNumber, siteId } = await req.json();
  if (!phoneNumber || !siteId) return NextResponse.json({ error: 'phoneNumber and siteId required' }, { status: 400 });

  // Verify site exists
  const { data: site } = await supabase.from('sites').select('id, label, user_id, twilio_phone_number').eq('id', siteId).single();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  if (site.twilio_phone_number) return NextResponse.json({ error: 'Site already has a phone number' }, { status: 409 });

  try {
    const result = await purchasePhoneNumber(phoneNumber, siteId);

    // Log
    await supabase.from('logs').insert({
      user_id: user.id,
      site_id: siteId,
      action: 'admin.number_purchased',
      details: `Admin purchased ${phoneNumber} for site "${site.label}"`,
      level: 'info',
      metadata: { phone_number: phoneNumber, site_owner: site.user_id },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
