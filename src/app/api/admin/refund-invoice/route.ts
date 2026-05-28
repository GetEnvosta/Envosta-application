import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/refund-invoice
 *
 * Refunds a paid invoice. Now reads from `stripe.invoices` (the Sync
 * Engine mirror) instead of the dropped `public.invoices` table.
 *
 * Body accepts either:
 *   - `stripeInvoiceId` (preferred — e.g. "in_xxx")
 *   - `invoiceId` (legacy alias; treated identically to stripeInvoiceId
 *     since both now point to the Stripe ID)
 *
 * The Stripe refund call is the only mutation — Sync Engine catches the
 * refund + status change on its next poll, no local write needed.
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json();
  const stripeInvoiceId: string | undefined = body.stripeInvoiceId ?? body.invoiceId;
  if (!stripeInvoiceId || !stripeInvoiceId.startsWith('in_')) {
    return NextResponse.json({ error: 'stripeInvoiceId (in_...) required' }, { status: 400 });
  }

  // Verify the invoice exists + is paid via stripe.* mirror.
  const { data: mirroredInv } = await (supabase.schema('stripe' as any) as any)
    .from('invoices')
    .select('id, status')
    .eq('id', stripeInvoiceId)
    .maybeSingle();
  if (mirroredInv && mirroredInv.status !== 'paid') {
    return NextResponse.json({ error: 'Can only refund paid invoices' }, { status: 400 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

    // Get the Stripe invoice to find the payment intent
    const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId) as any;
    if (!stripeInvoice.payment_intent) {
      return NextResponse.json({ error: 'No payment found for this invoice' }, { status: 400 });
    }
    if (stripeInvoice.status !== 'paid') {
      return NextResponse.json({ error: 'Can only refund paid invoices' }, { status: 400 });
    }

    // Create refund — Sync Engine catches the resulting state change
    const refund = await stripe.refunds.create({
      payment_intent: typeof stripeInvoice.payment_intent === 'string'
        ? stripeInvoice.payment_intent
        : stripeInvoice.payment_intent.id,
    });

    return NextResponse.json({ success: true, refundId: refund.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Refund failed' }, { status: 500 });
  }
}
