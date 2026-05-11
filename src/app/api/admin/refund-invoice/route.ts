import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { invoiceId } = await req.json();
  if (!invoiceId) return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });

  // Get the invoice to find the Stripe invoice ID
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (!invoice.stripe_invoice_id) return NextResponse.json({ error: 'No Stripe invoice linked' }, { status: 400 });
  if (invoice.status !== 'paid') return NextResponse.json({ error: 'Can only refund paid invoices' }, { status: 400 });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

    // Get the Stripe invoice to find the payment intent
    const stripeInvoice = await stripe.invoices.retrieve(invoice.stripe_invoice_id) as any;
    if (!stripeInvoice.payment_intent) {
      return NextResponse.json({ error: 'No payment found for this invoice' }, { status: 400 });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: typeof stripeInvoice.payment_intent === 'string'
        ? stripeInvoice.payment_intent
        : stripeInvoice.payment_intent.id,
    });

    // Update invoice status in DB
    await supabase.from('invoices').update({
      status: 'void',
      metadata: { ...((invoice.metadata as any) ?? {}), refund_id: refund.id, refunded_at: new Date().toISOString() },
    }).eq('id', invoiceId);

    return NextResponse.json({ success: true, refundId: refund.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Refund failed' }, { status: 500 });
  }
}
