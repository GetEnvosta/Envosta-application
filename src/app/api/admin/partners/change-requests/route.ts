import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { getPartnerChangeRequests, resolvePartnerChangeRequest } from '@/services/partners';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const requests = await getPartnerChangeRequests(status);
  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const { requestId, action, newPartnerId, adminNotes } = await req.json();
  if (!requestId || !['approve', 'deny'].includes(action)) {
    return NextResponse.json({ error: 'requestId and valid action required' }, { status: 400 });
  }

  const result = await resolvePartnerChangeRequest(requestId, action, newPartnerId, adminNotes);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
