import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const cleanDomain = domain.toLowerCase().trim();
    if (cleanDomain.length > 253 || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // Call the register-domain Edge Function with service role key
    // Service role key is a valid JWT that passes Supabase's gateway auth
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-domain`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ action: 'check', domainName: cleanDomain }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Edge function error:', res.status, data);
      return NextResponse.json({ error: data.error ?? 'Domain lookup failed' }, { status: 502 });
    }

    return NextResponse.json({ domain: cleanDomain, available: data.available });
  } catch (e: any) {
    console.error('Domain check error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
