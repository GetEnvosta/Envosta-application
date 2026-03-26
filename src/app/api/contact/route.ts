import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`contact:${ip}`, 5, 60_000); // 5 submissions per minute
  if (!allowed) {
    return NextResponse.json({ error: 'Too many submissions. Please wait a moment.' }, { status: 429 });
  }

  try {
    const { name, email, subject, message, type } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 320) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.length > 5000) {
      return NextResponse.json({ error: 'Message is required (max 5000 characters)' }, { status: 400 });
    }
    if (name && typeof name === 'string' && name.length > 200) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 });
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
