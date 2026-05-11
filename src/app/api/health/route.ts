import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Plain required env vars — must be set under exactly this name.
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL', 'STRIPE_SECRET_KEY',
    'OPENSRS_USERNAME', 'OPENSRS_API_KEY',
  ];
  // Either-or required env vars — Supabase exposes two parallel naming
  // schemes (legacy anon/service_role vs new publishable/secret). The app
  // reads with a fallback, so health is "ok" if either name is set.
  const requiredEither: [string, string][] = [
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  ];
  const missing =
    required.filter(k => !process.env[k]).length +
    requiredEither.filter(([a, b]) => !process.env[a] && !process.env[b]).length;

  return NextResponse.json({ status: missing === 0 ? 'ok' : 'degraded' });
}
