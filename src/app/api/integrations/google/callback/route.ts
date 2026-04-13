import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens, getGoogleUserInfo, listCalendars } from '@/lib/google-calendar';
import { storeSecret } from '@/lib/vault';

export const dynamic = 'force-dynamic';

const GOOGLE_CALENDAR_PROVIDER_ID = 'a1b2c3d4-0001-0001-0001-000000000001';
const DASHBOARD_URL = '/dashboard/integrations';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL!;

  if (error) {
    return NextResponse.redirect(`${redirectBase}${DASHBOARD_URL}?error=access_denied`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}${DASHBOARD_URL}?error=invalid_request`);
  }

  const admin = getAdmin();

  // Verify CSRF state
  const { data: stateRow } = await admin
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!stateRow) {
    return NextResponse.redirect(`${redirectBase}${DASHBOARD_URL}?error=invalid_state`);
  }

  const userId = stateRow.user_id;

  // Clean up state immediately
  await admin.from('oauth_states').delete().eq('state', state);

  try {
    const redirectUri = `${redirectBase}/api/integrations/google/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get Google user info
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // Get list of calendars to store as metadata
    let calendars: { id: string; summary: string; primary?: boolean }[] = [];
    try {
      calendars = await listCalendars(tokens.access_token);
    } catch {
      // Non-fatal — continue without calendar list
    }

    const primaryCalendar = calendars.find(c => c.primary) ?? calendars[0];

    // Store tokens in Supabase Vault
    const vaultId = await storeSecret(tokens, `integration-${userId}-google_calendar-${userInfo.sub}`);

    // Upsert the integration row
    const { error: dbErr } = await admin
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider_id: GOOGLE_CALENDAR_PROVIDER_ID,
        provider_account_id: userInfo.sub,
        provider_email: userInfo.email,
        credentials_vault_id: vaultId,
        expires_at: new Date(tokens.expires_at).toISOString(),
        scopes_granted: tokens.scope.split(' '),
        status: 'active',
        refresh_attempts: 0,
        refresh_exhausted: false,
        connection_config: {
          calendars,
          selected_calendar_id: primaryCalendar?.id ?? 'primary',
          selected_calendar_name: primaryCalendar?.summary ?? 'Primary',
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider_id,provider_account_id',
      });

    if (dbErr) throw new Error(dbErr.message);

    return NextResponse.redirect(`${redirectBase}${DASHBOARD_URL}?success=google_calendar`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${redirectBase}${DASHBOARD_URL}?error=token_exchange_failed`);
  }
}
