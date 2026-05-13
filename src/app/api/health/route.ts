import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Required env vars — must be set under exactly these names.
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'OPENSRS_USERNAME', 'OPENSRS_API_KEY',
  ];
  const missing = required.filter(k => !process.env[k]).length;

  return NextResponse.json({ status: missing === 0 ? 'ok' : 'degraded' });
}
