import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
  if (user?.role !== 'partner') return NextResponse.json({ error: 'Partner access required' }, { status: 403 });

  const { ticketId, message, escalate } = await req.json();
  if (!ticketId || !message) {
    return NextResponse.json({ error: 'ticketId and message are required' }, { status: 400 });
  }

  // Verify ticket belongs to this partner
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, partner_id')
    .eq('id', ticketId)
    .eq('partner_id', userId)
    .single();

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  // Insert partner reply
  await supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender: 'partner',
    message,
  });

  // Update ticket status and escalation
  const updates: any = { updated_at: new Date().toISOString() };
  if (escalate) updates.escalated_to_admin = true;

  await supabase.from('tickets').update(updates).eq('id', ticketId);

  return NextResponse.json({ success: true });
}
