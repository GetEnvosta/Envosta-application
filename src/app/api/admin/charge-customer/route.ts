import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { recordAudit } from '@/lib/audit';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return isAdminRole(profile?.role) ? { supabase, userId: user.id } : null;
}

/**
 * POST — Charge a customer's card on file immediately.
 * Creates a Stripe invoice item + invoice, auto-finalizes and charges.
 *
 * Body: { customerId (Supabase user ID), amount (cents), description }
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { customerId, amount, description } = await req.json();

  if (!customerId) return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
  if (!amount || amount < 100) return NextResponse.json({ error: 'Amount must be at least $1.00 (100 cents)' }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 });
  if (amount > 1000000) return NextResponse.json({ error: 'Amount too high' }, { status: 400 });

  const { supabase } = auth;

  // Get customer's Stripe ID
  const { data: customer } = await supabase
    .from('users')
    .select('stripe_customer_id, full_name, email')
    .eq('id', customerId)
    .single();

  if (!customer?.stripe_customer_id) {
    return NextResponse.json({ error: 'Customer has no payment method on file' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  try {
    // Verify they have a payment method
    const stripeCustomer = await stripe.customers.retrieve(customer.stripe_customer_id);
    if ((stripeCustomer as any).deleted) {
      return NextResponse.json({ error: 'Stripe customer deleted' }, { status: 400 });
    }

    const defaultPm = (stripeCustomer as any).invoice_settings?.default_payment_method;
    if (!defaultPm) {
      return NextResponse.json({ error: 'No default payment method on file. Send an invoice instead.' }, { status: 400 });
    }

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: customer.stripe_customer_id,
      amount,
      currency: 'usd',
      description: description.trim(),
    });

    // Create, finalize, and pay invoice
    const invoice = await stripe.invoices.create({
      customer: customer.stripe_customer_id,
      auto_advance: true,
      collection_method: 'charge_automatically',
      metadata: {
        type: 'admin_charge',
        admin_user_id: auth.userId,
        customer_user_id: customerId,
      },
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    const paid = await stripe.invoices.pay(invoice.id);

    // Log
    await recordAudit({
      actorId: auth.userId,
      actorType: 'admin',
      action: 'admin.charge_customer',
      resourceType: 'user',
      resourceId: customerId,
      metadata: {
        level: 'info',
        details: `Charged ${customer.full_name ?? customer.email} $${(amount / 100).toFixed(2)}: ${description.trim()}`,
        customer_id: customerId,
        stripe_invoice_id: invoice.id,
        amount,
        description: description.trim(),
      },
    });

    return NextResponse.json({
      ok: true,
      invoice_id: paid.id,
      status: paid.status,
      amount_paid: paid.amount_paid,
      hosted_invoice_url: paid.hosted_invoice_url,
    });
  } catch (e: any) {
    console.error('Charge customer error:', e);

    // Handle payment failure specifically
    if (e.type === 'StripeCardError' || e.code === 'card_declined') {
      return NextResponse.json({ error: `Card declined: ${e.message}` }, { status: 402 });
    }

    return NextResponse.json({ error: e.message ?? 'Failed to charge' }, { status: 500 });
  }
}
