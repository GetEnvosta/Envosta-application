import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return ['admin', 'sales', 'studio'].includes(profile?.role) ? supabase : null;
}

export async function PUT(req: Request) {
  const supabase = await verifyAdmin();
  if (!supabase) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });

  const { error } = await supabase.from('tickets').update(fields).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const supabase = await verifyAdmin();
  if (!supabase) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });

  await supabase.from('ticket_messages').delete().eq('ticket_id', id);
  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
