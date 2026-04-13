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

      // Email notification to sales
      try {
        const RESEND_KEY = process.env.RESEND_API_KEY;
        if (RESEND_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Envosta <noreply@email.envosta.com>',
              to: 'sales@envosta.com',
              subject: `New ${type ?? 'contact'} form: ${subject || 'Website inquiry'}`,
              html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:20px">
                <h2 style="font-size:18px;font-weight:600;margin-bottom:16px">New ${type ?? 'Contact'} Submission</h2>
                <p style="font-size:14px;color:#555;margin-bottom:4px"><strong>${name ?? 'Anonymous'}</strong> (${email})</p>
                ${subject ? `<p style="font-size:14px;color:#555;margin-bottom:12px"><strong>Subject:</strong> ${subject}</p>` : ''}
                <div style="background:#f8f9fb;border-radius:8px;padding:16px;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap">${message}</div>
                <p style="margin-top:16px;font-size:13px"><a href="https://my.envosta.com/admin/tickets/${ticket.id}" style="color:#2563EB">View ticket →</a></p>
              </div>`,
            }),
          });
        }
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({ success: true, ticketId: ticket?.id });
  } catch (e: any) {
    console.error('Contact form error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
