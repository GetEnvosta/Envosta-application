import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Verify admin
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
  if (!['admin', 'studio'].includes(profile?.role)) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const { subscriptionId, userId, planId, label } = await req.json();
  if (!subscriptionId || !userId) return NextResponse.json({ error: 'subscriptionId and userId required' }, { status: 400 });

  // Check subscription exists and is active
  const { data: sub } = await supabase.from('subscriptions').select('*').eq('id', subscriptionId).single();
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  if (!['active', 'trialing'].includes(sub.status)) {
    return NextResponse.json({ error: `Subscription is ${sub.status}, must be active or trialing` }, { status: 400 });
  }

  // Check no site already exists for this subscription
  const { data: existing } = await supabase.from('sites').select('id').eq('subscription_id', subscriptionId).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Site already exists for this subscription', siteId: existing.id }, { status: 409 });

  // Get user info for label
  const { data: userProfile } = await supabase.from('users').select('full_name, email').eq('id', userId).single();
  const name = label || userProfile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'my-site';

  // Create site record
  const effectivePlanId = planId || sub.product_id;
  const { data: site, error: siteErr } = await supabase.from('sites').insert({
    user_id: userId,
    subscription_id: subscriptionId,
    product_id: effectivePlanId,
    label: `${name}-site`,
    status: 'provisioning',
    server_region: 'dca',
    metadata: { manual_provision: true, provisioned_by: user.id },
  }).select('id').single();

  if (siteErr) return NextResponse.json({ error: siteErr.message }, { status: 500 });

  // Trigger wp.cloud provisioning via Edge Function
  try {
    const provRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        serviceId: site.id,
        label: `${name}-site`,
        region: 'dca',
        phpVersion: '8.4',
        planId: effectivePlanId,
        userId,
      }),
    });
    const provData = await provRes.json();

    if (provRes.ok) {
      return NextResponse.json({ success: true, siteId: site.id, provisioning: provData });
    } else {
      return NextResponse.json({
        success: true,
        siteId: site.id,
        warning: 'Site created but provisioning failed — can retry from admin',
        provisionError: provData.error,
      });
    }
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      siteId: site.id,
      warning: 'Site created but provisioning failed — can retry from admin',
      provisionError: e.message,
    });
  }
}
