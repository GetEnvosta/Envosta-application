import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, email, subject, message, type } = await req.json();

    if (!email || !message) {
      return NextResponse.json({ error: 'Email and message are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Create as a ticket so it shows up in admin dashboard
    const { data: ticket, error: ticketErr } = await supabase.from('tickets').insert({
      subject: subject || `${type ?? 'Contact'} form submission`,
      type: type ?? 'support',
      status: 'open',
      priority: 'normal',
      metadata: { source: 'website_form', contact_name: name, contact_email: email },
    }).select('id').single();

    if (ticketErr) {
      console.error('Ticket creation error:', ticketErr);
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }

    // Add the message
    if (ticket) {
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender: 'customer',
        message: `**From:** ${name ?? 'Anonymous'} (${email})\n\n${message}`,
      });
    }

    return NextResponse.json({ success: true, ticketId: ticket?.id });
  } catch (e: any) {
    console.error('Contact form error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
