import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

  const { siteId, phoneNumberId, previousPhoneNumberId } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  // Unlink previous number from this site
  if (previousPhoneNumberId) {
    await supabase.from('phone_numbers').update({ site_id: null }).eq('id', previousPhoneNumberId);
    // Clear denormalized column on sites
    await supabase.from('sites').update({
      twilio_phone_number: null,
      receptionist_enabled: false,
    }).eq('id', siteId);
  }

  // Link new number to this site
  if (phoneNumberId) {
    const { data: phoneRecord } = await supabase
      .from('phone_numbers')
      .select('id, phone_number, user_id, site_id')
      .eq('id', phoneNumberId)
      .single();

    if (!phoneRecord) return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });

    // Make sure it's not already linked to a different site
    if (phoneRecord.site_id && phoneRecord.site_id !== siteId) {
      return NextResponse.json({ error: 'Number is already linked to another site' }, { status: 409 });
    }

    // Update phone_numbers table
    await supabase.from('phone_numbers').update({ site_id: siteId }).eq('id', phoneNumberId);

    // Set denormalized column on sites (for webhook routing)
    await supabase.from('sites').update({
      twilio_phone_number: phoneRecord.phone_number,
      receptionist_enabled: true,
    }).eq('id', siteId);
  }

  return NextResponse.json({ success: true });
}
