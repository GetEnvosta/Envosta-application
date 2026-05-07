/**
 * POST /api/admin/add-site-for-customer
 *
 * Adds an additional site (paid or comped) to an existing customer's
 * account and fires wp.cloud provisioning. Comped sites get
 * metadata.comp = true so cleanup crons skip them; for paid sites with
 * a coupon, the code is stamped on the user's metadata so the
 * post-checkout flow can apply it.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';

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

  const { data: callerProfile } = await supabase.from('users').select('id, role').eq('id', user.id).single();

  const { customerId, label, productId, comp, couponCode } = await req.json();
  if (!customerId || !label || !productId) {
    return NextResponse.json({ error: 'customerId, label, and productId are required' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Verify target customer + permissions: staff/admin always allowed; partner allowed if it's their customer
  const { data: customer } = await sb
    .from('users')
    .select('id, partner_id, metadata')
    .eq('id', customerId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const isStaff = isStaffRole(callerProfile?.role);
  const isOwnPartner = callerProfile?.role === 'partner' && customer.partner_id === user.id;
  if (!isStaff && !isOwnPartner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate plan
  const { data: plan } = await sb
    .from('products')
    .select('id, slug, name, type, is_active')
    .eq('id', productId)
    .maybeSingle();
  if (!plan || plan.type !== 'hosting_plan' || !plan.is_active) {
    return NextResponse.json({ error: 'Invalid or inactive hosting plan' }, { status: 400 });
  }

  // Sanitize label
  const siteLabel = String(label).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40);

  // Insert site
  const siteMeta: Record<string, any> = { created_by_admin: user.id };
  if (comp === true) siteMeta.comp = true;

  const { data: site, error: siteErr } = await sb.from('sites').insert({
    user_id: customerId,
    product_id: plan.id,
    label: siteLabel,
    status: 'provisioning',
    server_region: 'dca',
    config: { php_workers: 2, storage_gb: 25, php_memory_mb: 512 },
    bursting_enabled: false,
    max_php_workers: 2,
    max_ssd_gb: 25,
    metadata: siteMeta,
  }).select('id').single();

  if (siteErr || !site) {
    return NextResponse.json({ error: siteErr?.message ?? 'Failed to create site row' }, { status: 500 });
  }

  // If paid + coupon provided, stamp on user metadata
  if (comp !== true && couponCode) {
    const existingMeta = (customer.metadata as any) ?? {};
    await sb.from('users').update({
      metadata: { ...existingMeta, preselected_coupon_code: couponCode },
    }).eq('id', customerId);
  }

  // Fire provisioning (best-effort)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        serviceId: site.id,
        label: siteLabel,
        region: 'dca',
        phpVersion: '8.4',
        planId: plan.id,
        userId: customerId,
      }),
    });
  } catch (e) {
    console.error('add-site-for-customer: provision-hosting fire failed (will retry via cron)', e);
  }

  await sb.from('logs').insert({
    user_id: user.id,
    site_id: site.id,
    action: comp === true ? 'admin.site_added_comped' : 'admin.site_added',
    details: `Admin added ${comp === true ? 'comped ' : ''}site "${siteLabel}" for customer ${customerId}`,
    level: 'info',
    metadata: { target_user: customerId, plan_id: plan.id, comp: comp === true, coupon_code: couponCode ?? null },
  });

  return NextResponse.json({ siteId: site.id });
}
