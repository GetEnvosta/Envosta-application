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

    // Recalculate mandatory monthly credits (phone removed = -2 cr/mo)
    const { data: allSites } = await supabase.from('sites').select('config, bursting_enabled, twilio_phone_number').eq('user_id', userId).in('status', ['active', 'provisioning']);
    let mandatory = 0;
    for (const s of allSites ?? []) { const c = (s.config as any) ?? {}; mandatory += (c.php_workers ?? 2) * 8 + (c.storage_gb ?? 25) * 0.8 + (s.bursting_enabled ? 10 : 0) + (s.twilio_phone_number ? 2 : 0); }
    await supabase.from('users').update({ mandatory_monthly_credits: Math.round(mandatory * 100) / 100 }).eq('id', userId);

    return NextResponse.json({ released: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
