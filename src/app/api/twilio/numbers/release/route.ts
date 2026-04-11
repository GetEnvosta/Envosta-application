import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { releasePhoneNumber } from '@/services/twilio';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { siteId } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const supabase = await createServerClient();

  const { data: site } = await supabase
    .from('sites')
    .select('id, twilio_phone_number')
    .eq('id', siteId)
    .eq('user_id', userId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  if (!site.twilio_phone_number) return NextResponse.json({ error: 'No phone number to release' }, { status: 400 });

  try {
    await releasePhoneNumber(siteId);

    await supabase.from('logs').insert({
      user_id: userId,
      site_id: siteId,
      action: 'receptionist.number_released',
      details: `Phone number released: ${site.twilio_phone_number}`,
      level: 'info',
    });

    return NextResponse.json({ released: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
