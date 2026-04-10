import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`create-unclaimed:${ip}`, 10, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  // Verify caller is admin, staff, or partner
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: callerProfile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(callerProfile?.role) && callerProfile?.role !== 'partner') {
    return NextResponse.json({ error: 'Staff or partner access required' }, { status: 403 });
  }

  const { name, email, phone, company, siteLabel, expiresInDays } = await req.json();
  if (!name || !email) return NextResponse.json({ error: 'name and email are required' }, { status: 400 });

  const sb = getSupabaseAdmin();

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
      email_confirm: true, // skip email verification — partner is vouching
      user_metadata: { full_name: name },
    });

    if (authError || !authUser.user) {
      return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 500 });
    }

    const userId = authUser.user.id;

    // Create user profile
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
      // If creator is a partner, auto-assign as partner
      partner_id: callerProfile?.role === 'partner' ? user.id : null,
      // Start with 50 subscription credits
      subscription_credits: 50,
    }, { onConflict: 'id' });

    // Create a site if label provided
    let siteId = null;
    if (siteLabel) {
      const slug = siteLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      const { data: site } = await sb.from('sites').insert({
        user_id: userId,
        label: siteLabel,
        status: 'provisioning',
        server_region: 'dca',
        config: { php_workers: 2, storage_gb: 25, php_memory_mb: 512 },
        bursting_enabled: false,
        max_php_workers: 2,
        max_ssd_gb: 25,
        metadata: { auto_provisioned: false, created_by: user.id, unclaimed: true },
      }).select('id').single();
      siteId = site?.id ?? null;
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
    await sb.from('logs').insert({
      user_id: user.id,
      action: 'account.unclaimed_created',
      details: `Unclaimed account created for ${name} (${email})`,
      level: 'info',
      metadata: { customer_id: userId, site_id: siteId, claim_token: claimToken, expires_at: claimExpiresAt },
    });

    return NextResponse.json({
      userId,
      siteId,
      claimUrl,
      claimToken,
      expiresAt: claimExpiresAt,
    });
  } catch (e: any) {
    console.error('Create unclaimed account error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to create account' }, { status: 500 });
  }
}
