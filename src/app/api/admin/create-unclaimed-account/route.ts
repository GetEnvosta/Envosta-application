import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
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
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`create-unclaimed:${ip}`, 10, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  // Verify caller is admin or staff
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: callerProfile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(callerProfile?.role)) {
    return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
  }

  const { name, email, phone, company, siteLabel, productId, expiresInDays, comp, couponCode } = await req.json();
  if (!name || !email) return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
  if (siteLabel && !productId) {
    return NextResponse.json({ error: 'productId is required when creating a site' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // If we're creating a site, validate the plan exists.
  let plan: { id: string; slug: string; name: string } | null = null;
  if (siteLabel && productId) {
    const { data: planRow } = await sb
      .from('products')
      .select('id, slug, name, type, is_active')
      .eq('id', productId)
      .maybeSingle();
    if (!planRow || planRow.type !== 'hosting_plan' || !planRow.is_active) {
      return NextResponse.json({ error: 'Invalid or inactive hosting plan' }, { status: 400 });
    }
    plan = { id: planRow.id, slug: planRow.slug, name: planRow.name };
  }

  // Check if email already exists
  const { data: existing } = await sb.from('users').select('id, claimed').eq('email', email).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  // Generate claim token
  const claimToken = crypto.randomUUID();
  const expireDays = Math.min(expiresInDays ?? 30, 90); // max 90 days
  const claimExpiresAt = new Date(Date.now() + expireDays * 86400000).toISOString();

  try {
    // Create Supabase auth user with a random password (customer will set their own on claim)
    const tempPassword = crypto.randomUUID() + '!Aa1'; // meets complexity requirements
    const { data: authUser, error: authError } = await sb.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // skip email verification — staff is vouching
      user_metadata: { full_name: name },
    });

    if (authError || !authUser.user) {
      return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 500 });
    }

    const userId = authUser.user.id;

    // Create user profile. Plan + coupon are baked into the pre-created
    // Stripe subscription below, so we don't stamp them on user.metadata.
    const userMetadata: Record<string, any> = {
      signup_source: 'admin_unclaimed',
    };
    if (comp === true) userMetadata.comp = true;

    await sb.from('users').upsert({
      id: userId,
      email,
      full_name: name,
      phone: phone ?? null,
      company_name: company ?? null,
      role: 'customer',
      claimed: false,
      claim_token: claimToken,
      claim_expires_at: claimExpiresAt,
      created_by: user.id,
      metadata: userMetadata,
    }, { onConflict: 'id' });

    // Create a site if label provided
    let siteId = null;
    let subscriptionWarning: string | undefined;
    if (siteLabel && plan) {
      const { data: site } = await sb.from('sites').insert({
        user_id: userId,
        product_id: plan.id,
        label: siteLabel,
        status: 'provisioning',
        server_region: 'dca',
        config: { php_workers: 2, storage_gb: 25, php_memory_mb: 512 },
        bursting_enabled: false,
        max_php_workers: 2,
        max_ssd_gb: 25,
        metadata: {
          unclaimed: true,
          created_by_admin: user.id,
          ...(comp === true ? { comp: true } : {}),
        },
      }).select('id').single();
      siteId = site?.id ?? null;

      // Pre-create Stripe sub (skip for comped sites — they have no Stripe billing)
      if (siteId && comp !== true) {
        const subResult = await preCreateAdminSubscription({
          sb,
          userId,
          userEmail: email,
          userFullName: name,
          productId: plan.id,
          siteId,
          callerUserId: user.id,
          signupSource: 'admin_unclaimed',
          couponCode: couponCode ?? null,
        });
        if (!subResult.ok) {
          subscriptionWarning = subResult.warning ?? 'Subscription pre-creation failed';
        } else if (subResult.warning) {
          subscriptionWarning = subResult.warning;
        }
      }

      // Fire wp.cloud provisioning via Vercel internal route.
      // Best-effort — if it fails, retry-stuck-provisions picks it up.
      if (siteId) {
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
              siteId,
              serviceId: siteId,
              label: siteLabel,
              region: 'dca',
              phpVersion: '8.4',
              planId: plan.id,
              userId,
            }),
          });
        } catch (e) {
          console.error('create-unclaimed: provision-hosting fire failed (will retry via cron)', e);
        }
      }
    }

    // Build claim URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://my.envosta.com';
    const claimUrl = `${appUrl}/auth/claim?token=${claimToken}`;

    // Send claim email
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Envosta <hello@email.envosta.com>',
          to: email,
          subject: `Your website is ready — claim your Envosta account`,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}.wrap{max-width:560px;margin:0 auto;padding:40px 20px}.card{background:#fff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:22px;font-weight:600;color:#111;margin:0 0 16px}p{font-size:15px;color:#555;line-height:1.7;margin:0 0 16px}.btn{display:inline-block;background:#111;color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;margin:8px 0 24px}.detail{background:#f8f9fb;border-radius:8px;padding:16px 20px;margin:16px 0}.detail-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}.detail-label{color:#888}.detail-value{color:#111;font-weight:500}.footer{text-align:center;padding:24px 0;font-size:12px;color:#aaa}</style></head><body><div class="wrap"><div class="card"><h1>Your website is ready!</h1><p>Hey ${name}, great news — your Envosta account has been set up and your website is being built.</p><p>Click below to claim your account, set your password, and add billing to go live.</p><a href="${claimUrl}" class="btn">Claim Your Account</a><div class="detail"><div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${email}</span></div>${siteLabel ? `<div class="detail-row"><span class="detail-label">Site</span><span class="detail-value">${siteLabel}</span></div>` : ''}<div class="detail-row"><span class="detail-label">Expires</span><span class="detail-value">${expireDays} days</span></div></div><p style="font-size:13px;color:#888;">If you didn't expect this email, you can safely ignore it. The account will be deleted automatically after ${expireDays} days if not claimed.</p></div><div class="footer"><p>Envosta Inc. · Calgary, Alberta, Canada</p></div></div></body></html>`,
        }),
      });
    }

    // Log it
    await recordAudit({
      actorId: user.id,
      actorType: 'admin',
      action: 'account.unclaimed_created',
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        level: 'info',
        details: `Unclaimed account created for ${name} (${email})`,
        customer_id: userId,
        site_id: siteId,
        claim_token: claimToken,
        expires_at: claimExpiresAt,
      },
    });

    return NextResponse.json({
      userId,
      siteId,
      claimUrl,
      claimToken,
      expiresAt: claimExpiresAt,
      ...(subscriptionWarning ? { subscriptionWarning } : {}),
    });
  } catch (e: any) {
    console.error('Create unclaimed account error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to create account' }, { status: 500 });
  }
}
