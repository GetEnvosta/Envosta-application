import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { recordAudit } from '@/lib/audit';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Verify admin
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { userId, label, region } = await req.json();
  if (!userId || !label) return NextResponse.json({ error: 'userId and label required' }, { status: 400 });

  // Verify target user exists
  const { data: targetUser } = await supabase.from('users').select('id, full_name').eq('id', userId).single();
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Create site record
  const siteLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40);
  const { data: site, error: siteErr } = await supabase.from('sites').insert({
    user_id: userId,
    label: siteLabel,
    status: 'provisioning',
    server_region: region || 'dca',
    metadata: { admin_created: true, created_by: user.id },
  }).select('id').single();

  if (siteErr) return NextResponse.json({ error: siteErr.message }, { status: 500 });

  // Trigger wp.cloud provisioning via Vercel internal route
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : new URL(req.url).origin;
    const provRes = await fetch(`${origin}/api/internal/wpcloud/provision-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
      },
      body: JSON.stringify({
        siteId: site.id,
        serviceId: site.id,
        label: siteLabel,
        region: region || 'dca',
        phpVersion: '8.4',
        userId,
      }),
    });
    const provData = await provRes.json();

    // Log
    await recordAudit({
      actorId: user.id,
      actorType: 'admin',
      action: 'admin.site_created',
      resourceType: 'site',
      resourceId: site.id,
      metadata: {
        level: 'info',
        details: `Admin created site "${siteLabel}" for user ${targetUser.full_name || userId}`,
        target_user: userId,
        region,
        provisioned: provRes.ok,
      },
    });

    return NextResponse.json({
      success: true,
      siteId: site.id,
      provisioning: provRes.ok ? provData : undefined,
      warning: provRes.ok ? undefined : 'Site created but provisioning may need retry',
    });
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      siteId: site.id,
      warning: 'Site created but provisioning failed — can retry from admin',
    });
  }
}
