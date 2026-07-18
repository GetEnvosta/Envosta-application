/**
 * POST /api/admin/add-site-for-customer
 *
 * Adds an additional site (paid or comped) to an existing customer's
 * account and fires wp.cloud provisioning. Comped sites get
 * metadata.comp = true so cleanup crons skip them.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import { preCreateAdminSubscription } from '@/lib/admin-precreate-subscription';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: callerProfile } = await supabase.from('users').select('id, role').eq('id', user.id).single();

  const { customerId, label, productId, comp } = await req.json();
  if (!customerId || !label || !productId) {
    return NextResponse.json({ error: 'customerId, label, and productId are required' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Verify target customer + permissions: staff/admin only
  const { data: customer } = await sb
    .from('users')
    .select('id, metadata')
    .eq('id', customerId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  if (!isStaffRole(callerProfile?.role)) {
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
    config: { php_workers: 3, storage_gb: 50, php_memory_mb: 512 },
    bursting_enabled: false,
    max_php_workers: 3,
    max_ssd_gb: 50,
    metadata: siteMeta,
  }).select('id').single();

  if (siteErr || !site) {
    return NextResponse.json({ error: siteErr?.message ?? 'Failed to create site row' }, { status: 500 });
  }

  // Pre-create Stripe sub (skip for comped sites).
  let subscriptionWarning: string | undefined;
  if (comp !== true) {
    const { data: targetUser } = await sb.from('users').select('email, full_name').eq('id', customerId).maybeSingle();
    if (targetUser?.email) {
      const subResult = await preCreateAdminSubscription({
        sb,
        userId: customerId,
        userEmail: targetUser.email,
        userFullName: targetUser.full_name ?? null,
        productId: plan.id,
        siteId: site.id,
        callerUserId: user.id,
        signupSource: 'admin_added',
      });
      if (!subResult.ok) {
        subscriptionWarning = subResult.warning ?? 'Subscription pre-creation failed';
      } else if (subResult.warning) {
        subscriptionWarning = subResult.warning;
      }
    } else {
      subscriptionWarning = 'Target user has no email; subscription not created';
    }
  }

  // Fire provisioning (best-effort) via Vercel internal route.
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : new URL(req.url).origin;
    await fetch(`${origin}/api/internal/wpcloud/provision-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
      },
      body: JSON.stringify({
        siteId: site.id,
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

  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: comp === true ? 'admin.site_added_comped' : 'admin.site_added',
    resourceType: 'site',
    resourceId: site.id,
    metadata: {
      level: 'info',
      details: `Admin added ${comp === true ? 'comped ' : ''}site "${siteLabel}" for customer ${customerId}`,
      target_user: customerId,
      plan_id: plan.id,
      comp: comp === true,
    },
  });

  return NextResponse.json({
    siteId: site.id,
    ...(subscriptionWarning ? { subscriptionWarning } : {}),
  });
}
