import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { purchasePhoneNumber } from '@/services/twilio';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { phoneNumber, siteId } = await req.json();
  if (!phoneNumber || !siteId) return NextResponse.json({ error: 'phoneNumber and siteId required' }, { status: 400 });

  const supabase = await createServerClient();

  // Verify user owns this site and it doesn't already have a number
  const { data: site } = await supabase
    .from('sites')
    .select('id, twilio_phone_number')
    .eq('id', siteId)
    .eq('user_id', userId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  if (site.twilio_phone_number) return NextResponse.json({ error: 'Site already has a phone number' }, { status: 409 });

  try {
    const result = await purchasePhoneNumber(phoneNumber, siteId);

    await supabase.from('logs').insert({
      user_id: userId,
      site_id: siteId,
      action: 'receptionist.number_purchased',
      details: `Phone number purchased: ${phoneNumber}`,
      level: 'info',
      metadata: { phone_number: phoneNumber, twilio_sid: result.twilioSid },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
