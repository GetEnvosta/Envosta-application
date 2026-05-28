import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { recordAudit } from '@/lib/audit';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Verify caller is admin
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Admin or staff access required' }, { status: 403 });
  }

  try {
    const { siteId } = await req.json();
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    // Get the site
    const { data: site } = await sb.from('sites').select('*').eq('id', siteId).single();
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    // Vercel internal route — calls wp.cloud directly from Vercel
    // static IPs (whitelisted).
    const origin = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : new URL(req.url).origin;
    const internalHeaders = {
      'Content-Type': 'application/json',
      'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
    };

    // Step 1: Delete the existing wp.cloud site (if it exists)
    if (site.wp_cloud_site_id) {
      try {
        const res = await fetch(`${origin}/api/internal/wpcloud/site-info`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({
            action: 'hard-delete-site',
            siteId: site.id,
            actorId: user.id,
          }),
        });
        const deleteResult = await res.json();
        console.log('wp.cloud delete result:', deleteResult);
      } catch (e) {
        console.error('wp.cloud delete error (continuing):', e);
      }
    }

    // Step 2: Reset the site record — clear wp.cloud data but keep subscription + domains + addons
    await sb.from('sites').update({
      wp_cloud_site_id: null,
      wp_cloud_url: null,
      status: 'provisioning',
      config: null,
      metadata: {
        ...(site.metadata || {}),
        reinstalled_at: new Date().toISOString(),
        reinstalled_by: user.id,
        previous_wp_cloud_site_id: site.wp_cloud_site_id,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', siteId);

    // Step 3: Re-provision on wp.cloud via the Vercel internal route.
    // The internal provision-site route looks up the account subscription
    // via the user — we don't pass subscriptionId anymore (account-centric).
    const provisionRes = await fetch(`${origin}/api/internal/wpcloud/provision-site`, {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify({
        siteId,
        serviceId: siteId,
        userId: site.user_id,
      }),
    });

    const provisionData = await provisionRes.json();

    if (!provisionRes.ok) {
      return NextResponse.json({
        error: `Site deleted but re-provision failed: ${provisionData?.error || 'Unknown'}. Use the "Provision on wp.cloud" button to retry.`,
        partial: true,
      }, { status: 207 });
    }

    // Log the action
    await recordAudit({
      actorId: user.id,
      actorType: 'admin',
      action: 'site.reinstall',
      resourceType: 'site',
      resourceId: siteId,
      before: { wp_cloud_site_id: site.wp_cloud_site_id },
      after: { wp_cloud_site_id: null, status: 'provisioning' },
      metadata: {
        level: 'info',
        details: `Fresh WordPress install deployed. Previous wp.cloud ID: ${site.wp_cloud_site_id}`,
        previous_wp_cloud_site_id: site.wp_cloud_site_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Site reinstalled with fresh WordPress. Previous site has been deleted from wp.cloud.',
    });
  } catch (e: any) {
    console.error('Reinstall error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
