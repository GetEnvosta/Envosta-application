/**
 * POST /api/admin/custom-invoice
 *
 * Admin-only: create + send a one-off Stripe invoice to a customer for
 * custom work (consulting, migration, ad-hoc charges).
 *
 * Body: {
 *   stripeCustomerId?: string   // when quick mode (customer is fixed)
 *   targetCustomerId?: string   // when full mode (admin picked customer)
 *   amount: number              // CENTS
 *   description: string
 * }
 *
 * Flow (Stripe):
 *   1. Create InvoiceItem on the customer
 *   2. Create Invoice (collection_method='send_invoice')
 *   3. Finalize → makes it visible + payment_url
 *   4. Send → Stripe emails the hosted invoice link to the customer
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { recordAudit } from '@/lib/audit';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

export async function POST(req: Request) {
  // ── Auth: admin only ─────────────────────────────────────
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user: caller } } = await supabaseAuth.auth.getUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await sb.from('users').select('role').eq('id', caller.id).maybeSingle();
  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // ── Body parsing ─────────────────────────────────────────
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const stripeCustomerId = typeof body.stripeCustomerId === 'string' && body.stripeCustomerId.startsWith('cus_')
    ? body.stripeCustomerId
    : (typeof body.targetCustomerId === 'string' && body.targetCustomerId.startsWith('cus_')
      ? body.targetCustomerId
      : '');
  const amountCents = Number(body.amount);
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'Valid Stripe customer ID is required' }, { status: 400 });
  }
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    return NextResponse.json({ error: 'Amount must be at least $0.50 (50 cents)' }, { status: 400 });
  }
  if (!description || description.length > 500) {
    return NextResponse.json({ error: 'Description required (max 500 chars)' }, { status: 400 });
  }

  // ── Stripe: create invoice item → invoice → finalize → send ─
  const stripe = getStripe();

  try {
    // 1. Create the invoice item for this customer.
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: amountCents,
      currency: 'cad',
      description,
      metadata: {
        envosta_custom_invoice: 'true',
        envosta_admin_id: caller.id,
      },
    });

    // 2. Create the invoice (auto-attaches the pending item above).
    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 14,
      auto_advance: false, // we'll finalize+send explicitly below
      metadata: {
        envosta_custom_invoice: 'true',
        envosta_admin_id: caller.id,
        envosta_description: description.slice(0, 200),
      },
    });

    if (!invoice.id) {
      return NextResponse.json({ error: 'Stripe did not return an invoice ID' }, { status: 502 });
    }

    // 3. Finalize so it gets a hosted URL + can be paid.
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    // 4. Send — Stripe emails the customer with the hosted invoice link.
    await stripe.invoices.sendInvoice(invoice.id);

    // Find our internal user_id from the stripe customer for audit.
    const { data: targetUser } = await sb
      .from('users').select('id, email').eq('stripe_customer_id', stripeCustomerId).maybeSingle();

    await recordAudit({
      actorId: caller.id,
      actorType: 'admin',
      action: 'admin.custom_invoice.sent',
      resourceType: 'user',
      resourceId: targetUser?.id ?? undefined,
      metadata: {
        stripe_customer_id: stripeCustomerId,
        stripe_invoice_id: finalized.id,
        amount_cents: amountCents,
        currency: 'cad',
        description,
        recipient_email: targetUser?.email ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      invoiceId: finalized.id,
      invoiceUrl: finalized.hosted_invoice_url,
      invoicePdf: finalized.invoice_pdf,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Failed to create or send invoice' },
      { status: 502 },
    );
  }
}
