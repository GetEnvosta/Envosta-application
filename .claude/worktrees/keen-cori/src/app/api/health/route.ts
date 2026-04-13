import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'OPENSRS_USERNAME', 'OPENSRS_API_KEY',
  ];
  const missing = required.filter(k => !process.env[k]).length;

  return NextResponse.json({ status: missing === 0 ? 'ok' : 'degraded' });
}
