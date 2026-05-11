import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

async function verifyStaff() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await supabase.from('users').select('id, role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role) || !profile) return null;
  return { supabase, profile };
}

// ── GET: List commissions ──
export async function GET(req: Request) {
  const result = await verifyStaff();
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { supabase, profile } = result;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  let query = supabase
    .from('commissions')
    .select('*, earner:users!commissions_earner_id_fkey(id, full_name, email, role), customer:users!commissions_customer_id_fkey(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);

  // Non-admin staff can only see their own commissions
  if (profile.role !== 'admin') {
    query = query.eq('earner_id', profile.id);
  }

  if (type) query = query.eq('type', type);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── POST: Create commission (admin only) ──
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`commission:${ip}`, 10, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const result = await verifyStaff();
  if (!result || result.profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const { supabase, profile } = result;

  const { type, earner_id, customer_id, ticket_id, amount_cad, payout_method, notes } = await req.json();

  if (!type || !['affiliate', 'referral'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  if (!earner_id) return NextResponse.json({ error: 'earner_id required' }, { status: 400 });
  if (!amount_cad || amount_cad <= 0) return NextResponse.json({ error: 'Amount must be positive (in cents)' }, { status: 400 });

  const { data, error } = await supabase.from('commissions').insert({
    type,
    earner_id,
    customer_id: customer_id || null,
    ticket_id: ticket_id || null,
    amount_cad,
    payout_method: payout_method || null,
    notes: notes || null,
    status: 'pending',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

// ── PUT: Approve or mark paid ──
export async function PUT(req: Request) {
  const result = await verifyStaff();
  if (!result || result.profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const { supabase, profile } = result;

  const { id, action, payout_method } = await req.json();
  if (!id) return NextResponse.json({ error: 'Commission id required' }, { status: 400 });

  // Get the commission
  const { data: commission } = await supabase.from('commissions').select('*, earner:users!commissions_earner_id_fkey(stripe_customer_id)').eq('id', id).single();
  if (!commission) return NextResponse.json({ error: 'Commission not found' }, { status: 404 });

  if (action === 'approve') {
    const { error } = await supabase.from('commissions').update({
      status: 'approved',
      approved_by: profile.id,
      payout_method: payout_method || commission.payout_method,
    }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: 'approved' });
  }

  if (action === 'pay') {
    const method = payout_method || commission.payout_method;
    let stripeTxnId = null;

    // If paying via Stripe credit, create balance transaction
    if (method === 'stripe_credit') {
      const stripeCustomerId = commission.earner?.stripe_customer_id;
      if (!stripeCustomerId) {
        return NextResponse.json({ error: 'Earner does not have a Stripe customer ID. Cannot apply credit.' }, { status: 400 });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

      const res = await fetch(`https://api.stripe.com/v1/customers/${stripeCustomerId}/balance_transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: (-commission.amount_cad).toString(), // negative = credit
          currency: 'cad',
          description: `${commission.type === 'referral' ? 'Referral reward' : 'Affiliate commission'} — ${commission.notes || 'Envosta'}`,
        }),
      });

      const txn = await res.json();
      if (!res.ok) {
        return NextResponse.json({ error: `Stripe error: ${txn.error?.message || 'Unknown'}` }, { status: 500 });
      }
      stripeTxnId = txn.id;
    }

    const { error } = await supabase.from('commissions').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payout_method: method,
      approved_by: commission.approved_by || profile.id,
      stripe_txn_id: stripeTxnId,
    }).eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: 'paid', stripe_txn_id: stripeTxnId });
  }

  return NextResponse.json({ error: 'Invalid action. Use "approve" or "pay".' }, { status: 400 });
}
