import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Auth — all site actions require a logged-in user
  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Extract a fresh access token from the auth cookie directly.
  // getSession() can return stale tokens since SSR client can't refresh cookies,
  // but the middleware refreshes the cookie on each request so the raw cookie value is fresh.
  let accessToken = '';
  const allCookies = jar.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes('auth-token')) {
      try {
        // Supabase stores auth as base64-encoded JSON chunks or a single JSON cookie
        const decoded = cookie.value.startsWith('base64-')
          ? Buffer.from(cookie.value.replace('base64-', ''), 'base64').toString()
          : cookie.value;
        const parsed = JSON.parse(decoded);
        if (parsed.access_token) {
          accessToken = parsed.access_token;
          break;
        }
      } catch {
        // Cookie might be chunked — try getSession as fallback
      }
    }
  }

  // Fallback to getSession if cookie parsing didn't work
  if (!accessToken) {
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token ?? '';
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Could not retrieve session token' }, { status: 401 });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
