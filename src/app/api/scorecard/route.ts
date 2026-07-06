/**
 * POST /api/scorecard — Local Domination Scorecard lead capture.
 *
 * Validates the opt-in payload, verifies Cloudflare Turnstile server-side
 * when TURNSTILE_SECRET_KEY is configured (never trusts the client), and
 * lands the lead where a human sees it: a `tickets` row (type='scorecard')
 * + notification email to sales. Rate-limited per IP.
 *
 * Phase 6 moves storage to the `leads` table; the request contract stays.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/sanitize';
import { FROM_EMAIL } from '@/lib/email';
import { verifyTurnstile } from '@/lib/turnstile';
import { getIndustry } from '@/config/industries';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`scorecard:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many submissions. Please wait a moment.' }, { status: 429 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
  const business = typeof body.business === 'string' ? body.business.trim().slice(0, 200) : '';
  const industrySlug = typeof body.industry === 'string' ? body.industry.trim().slice(0, 60) : '';
  const city = typeof body.city === 'string' ? body.city.trim().slice(0, 120) : '';
  const website = typeof body.website === 'string' ? body.website.trim().slice(0, 300) : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';
  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';

  if (!name || !business || !industrySlug || !city || !phone) {
    return NextResponse.json({ error: 'Name, business, industry, city, and phone are required.' }, { status: 400 });
  }

  const human = await verifyTurnstile(turnstileToken, ip);
  if (!human) {
    return NextResponse.json({ error: 'Verification failed — please retry the challenge.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const industryName = getIndustry(industrySlug)?.name ?? industrySlug;
  const summary = [
    `Business: ${business}`,
    `Industry: ${industryName}`,
    `City: ${city}`,
    `Website: ${website || '(none provided)'}`,
    `Phone: ${phone}`,
  ].join('\n');

  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .insert({
      subject: `Scorecard: ${business} — ${industryName} / ${city}`,
      type: 'scorecard',
      status: 'open',
      priority: 'high',
      metadata: {
        source: 'scorecard_funnel',
        contact_name: name,
        contact_phone: phone,
        business,
        industry: industrySlug,
        city,
        website: website || null,
      },
    })
    .select('id')
    .single();

  if (ticketErr || !ticket) {
    console.error('scorecard: ticket insert failed', ticketErr);
    return NextResponse.json({ error: 'Failed to submit — please try again.' }, { status: 500 });
  }

  await supabase.from('ticket_messages').insert({
    ticket_id: ticket.id,
    sender: 'customer',
    message: `**Scorecard request from:** ${name} (${phone})\n\n${summary}`,
  });

  // Notify sales (non-blocking).
  try {
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      const safe = (s: string) => escapeHtml(s);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: 'sales@envosta.com',
          subject: `Scorecard lead: ${safe(business)} — ${safe(industryName)} / ${safe(city)}`,
          html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:20px">
            <h2 style="font-size:18px;font-weight:600;margin-bottom:16px">New Scorecard Lead</h2>
            <p style="font-size:14px;color:#555"><strong>${safe(name)}</strong> · ${safe(phone)}</p>
            <div style="background:#f8f9fb;border-radius:8px;padding:16px;font-size:14px;color:#333;line-height:1.7;white-space:pre-wrap">${safe(summary)}</div>
            <p style="margin-top:16px;font-size:13px"><a href="https://my.envosta.com/admin/tickets/${ticket.id}" style="color:#2563EB">Open ticket →</a></p>
          </div>`,
        }),
      });
    }
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
