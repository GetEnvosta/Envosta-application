import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/sanitize';
import { FROM_EMAIL } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`intake:${ip}`, 10, 60_000); // 10 per minute (reps may submit several)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many submissions. Please wait a moment.' }, { status: 429 });
  }

  try {
    const {
      salesRep,
      contactName,
      email,
      phone,
      company,
      website,
      industry,
      projectType,
      budget,
      timeline,
      notes,
      plan,
      billing,
      closedOnSpot,
    } = await req.json();

    // ── Validation ──
    if (!salesRep || typeof salesRep !== 'string' || salesRep.length > 200) {
      return NextResponse.json({ error: 'Sales rep name is required' }, { status: 400 });
    }
    if (!contactName || typeof contactName !== 'string' || contactName.length > 200) {
      return NextResponse.json({ error: 'Contact name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 320) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || phone.length > 30) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    if (!company || typeof company !== 'string' || company.length > 200) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    if (!industry || typeof industry !== 'string') {
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 });
    }
    if (!projectType || typeof projectType !== 'string') {
      return NextResponse.json({ error: 'Project type is required' }, { status: 400 });
    }
    if (!budget || typeof budget !== 'string') {
      return NextResponse.json({ error: 'Budget range is required' }, { status: 400 });
    }
    if (!timeline || typeof timeline !== 'string') {
      return NextResponse.json({ error: 'Timeline is required' }, { status: 400 });
    }
    if (closedOnSpot && (!plan || !['minimum', 'growth'].includes(plan))) {
      return NextResponse.json({ error: 'Please select a hosting plan' }, { status: 400 });
    }
    if (closedOnSpot && billing && !['monthly', 'annual'].includes(billing)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // ── Create sales ticket ──
    const closedLabel = closedOnSpot ? ` [CLOSED — ${plan}, ${billing}]` : '';
    const { data: ticket, error: ticketErr } = await supabase.from('tickets').insert({
      subject: `Intake: ${company} — ${contactName}${closedLabel}`,
      type: 'onboarding',
      status: closedOnSpot ? 'approved' : 'open',
      priority: closedOnSpot ? 'high' : 'normal',
      contact_name: contactName,
      contact_email: email,
      source: 'intake',
      metadata: {
        source: 'intake_form',
        sales_rep: salesRep,
        phone,
        company,
        website: website || null,
        industry,
        project_type: projectType,
        budget,
        timeline,
        closed_on_spot: closedOnSpot || false,
        plan: closedOnSpot ? plan : null,
        billing: closedOnSpot ? (billing || 'monthly') : null,
        design_fee: closedOnSpot ? 500 : null,
        design_fee_status: closedOnSpot ? 'pending_approval' : null,
      },
    }).select('id').single();

    if (ticketErr) {
      console.error('Intake ticket creation error:', ticketErr);
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }

    // ── Add summary message ──
    if (ticket) {
      const planLine = closedOnSpot
        ? `\n---\n**CLOSED ON SPOT**\n**Plan:** ${plan} (${billing || 'monthly'})\n**Hosting:** Charged upfront\n**Design Fee:** $500 — invoiced after design approval`
        : null;

      const summary = [
        `**Sales Rep:** ${salesRep}`,
        `**Contact:** ${contactName}`,
        `**Email:** ${email}`,
        `**Phone:** ${phone}`,
        `**Company:** ${company}`,
        website ? `**Website:** ${website}` : null,
        `**Industry:** ${industry}`,
        `**Project:** ${projectType}`,
        `**Budget:** ${budget}`,
        `**Timeline:** ${timeline}`,
        planLine,
        notes ? `\n**Notes:**\n${notes}` : null,
      ].filter(Boolean).join('\n');

      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender: 'system',
        message: summary,
      });

      // ── Email notification ──
      try {
        const RESEND_KEY = process.env.RESEND_API_KEY;
        if (RESEND_KEY) {
          // All user-supplied fields must be HTML-escaped before
          // interpolating into the email body to prevent stored-HTML
          // XSS against the staff inbox.
          const e = {
            salesRep: escapeHtml(salesRep),
            contactName: escapeHtml(contactName),
            email: escapeHtml(email),
            phone: escapeHtml(phone),
            company: escapeHtml(company),
            website: escapeHtml(website),
            industry: escapeHtml(industry),
            projectType: escapeHtml(projectType),
            budget: escapeHtml(budget),
            timeline: escapeHtml(timeline),
            plan: escapeHtml(plan),
            billing: escapeHtml(billing || 'monthly'),
            notes: escapeHtml(notes),
          };
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: 'sales@envosta.com',
              subject: `${closedOnSpot ? '🔥 CLOSED DEAL' : 'New Lead'}: ${e.company} — ${e.contactName} (via ${e.salesRep})`,
              html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:20px">
                <h2 style="font-size:18px;font-weight:600;margin-bottom:16px">New Sales Intake</h2>
                <table style="font-size:14px;color:#333;line-height:1.8;border-collapse:collapse;width:100%">
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Sales Rep</td><td>${e.salesRep}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Contact</td><td>${e.contactName}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Email</td><td>${e.email}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Phone</td><td>${e.phone}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Company</td><td>${e.company}</td></tr>
                  ${e.website ? `<tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Website</td><td>${e.website}</td></tr>` : ''}
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Industry</td><td>${e.industry}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Project</td><td>${e.projectType}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Budget</td><td>${e.budget}</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Timeline</td><td>${e.timeline}</td></tr>
                  ${closedOnSpot ? `
                  <tr><td colspan="2" style="padding:12px 0 4px;border-top:2px solid #22c55e"><strong style="color:#22c55e;font-size:13px;text-transform:uppercase;letter-spacing:1px">✅ Closed on the spot</strong></td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Plan</td><td>${e.plan} (${e.billing})</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Hosting</td><td>Charge upfront</td></tr>
                  <tr><td style="font-weight:600;padding:4px 12px 4px 0;white-space:nowrap">Design Fee</td><td>$500 — invoice after approval</td></tr>
                  ` : ''}
                </table>
                ${e.notes ? `<div style="background:#f8f9fb;border-radius:8px;padding:16px;font-size:14px;color:#333;line-height:1.6;margin-top:16px;white-space:pre-wrap"><strong>Notes:</strong>\n${e.notes}</div>` : ''}
                <p style="margin-top:16px;font-size:13px"><a href="https://my.envosta.com/admin/tickets/${ticket.id}" style="color:#2563EB">View ticket →</a></p>
              </div>`,
            }),
          });
        }
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({ success: true, ticketId: ticket?.id });
  } catch (e: any) {
    console.error('Intake form error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
