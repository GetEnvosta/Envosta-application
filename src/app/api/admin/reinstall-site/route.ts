import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Verify admin or studio
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  if (!['admin', 'studio'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Admin or studio access required' }, { status: 403 });
  }

  try {
    const { siteId } = await req.json();
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    // Get the site
    const { data: site } = await sb.from('sites').select('*').eq('id', siteId).single();
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    // Step 1: Delete the existing wp.cloud site (if it exists)
    if (site.wp_cloud_site_id) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const res = await fetch(`${supabaseUrl}/functions/v1/site-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          },
          body: JSON.stringify({
            action: 'hard-delete-site',
            siteId: site.id,
          }),
        });
        // Log but don't fail if wp.cloud delete fails (site might already be gone)
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

    // Step 3: Re-provision on wp.cloud
    const provisionRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        serviceId: siteId,
        userId: site.user_id,
        subscriptionId: site.subscription_id,
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
    await sb.from('logs').insert({
      user_id: user.id,
      site_id: siteId,
      action: 'site.reinstall',
      level: 'info',
      message: `Fresh WordPress install deployed. Previous wp.cloud ID: ${site.wp_cloud_site_id}`,
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
