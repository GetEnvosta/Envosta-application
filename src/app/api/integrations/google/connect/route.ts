import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_CALENDAR_PROVIDER_ID = 'a1b2c3d4-0001-0001-0001-000000000001';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL!));

  const state = randomBytes(32).toString('hex');

  // Store state in DB for CSRF verification
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  await admin.from('oauth_states').insert({
    state,
    user_id: user.id,
    provider_id: GOOGLE_CALENDAR_PROVIDER_ID,
  });

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.freebusy',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ].join(' '),
    access_type: 'offline',   // get refresh token
    prompt: 'consent',        // force refresh token even if already connected
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
