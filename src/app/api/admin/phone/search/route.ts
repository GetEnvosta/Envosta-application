import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { searchAvailableNumbers } from '@/services/twilio-admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? true : null;
}

export async function GET(req: Request) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const areaCode = searchParams.get('areaCode') ?? '';
  const country = searchParams.get('country') ?? 'CA';

  if (!areaCode || areaCode.length < 3) {
    return NextResponse.json({ error: 'Area code required' }, { status: 400 });
  }

  try {
    const numbers = await searchAvailableNumbers(country, areaCode);
    return NextResponse.json(numbers);
  } catch (e: any) {
    console.error('Twilio number search error:', e);
    return NextResponse.json({ error: e.message ?? 'Search failed' }, { status: 500 });
  }
}
