import { createClient } from '@/lib/supabase-server';

// ── Balance ────────────────────────────────────────────────

export async function getCreditBalance(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('credit_balances')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const sub = data?.subscription_credits ?? 0;
  const pur = data?.purchased_credits ?? 0;

  return {
    subscription_credits: sub,
    purchased_credits: pur,
    total: sub + pur,
    expires_at: data?.subscription_credits_expire_at ?? null,
  };
}

export async function ensureCreditBalance(userId: string) {
  const supabase = await createClient();
  await supabase
    .from('credit_balances')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
}

// ── Transactions ───────────────────────────────────────────

export async function getCreditTransactions(
  userId: string,
  limit = 50,
  offset = 0,
) {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from('credit_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { transactions: data ?? [], total: count ?? 0 };
}

// ── Usage Breakdown ────────────────────────────────────────

export async function getUsageBreakdown(
  userId: string,
  startDate?: string,
  endDate?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from('credit_transactions')
    .select('service_type, amount')
    .eq('user_id', userId)
    .eq('type', 'deduction');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data } = await query;

  // Aggregate by service_type
  const breakdown: Record<string, number> = {};
  for (const row of data ?? []) {
    const svc = row.service_type ?? 'other';
    breakdown[svc] = (breakdown[svc] ?? 0) + Math.abs(row.amount);
  }

  return breakdown;
}

// ── Deposits ───────────────────────────────────────────────

export async function depositSubscriptionCredits(
  userId: string,
  amount: number,
  expiresAt: string,
) {
  const supabase = await createClient();

  // Expire old subscription credits first
  await supabase.rpc('fn_expire_subscription_credits', { p_user_id: userId });

  // Deposit new
  const { data } = await supabase.rpc('fn_deposit_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'deposit_subscription',
    p_pool: 'subscription',
    p_description: `Monthly subscription deposit: ${amount} credits`,
    p_service_type: 'subscription',
    p_reference_id: null,
    p_expires_at: expiresAt,
  });

  return data?.[0] ?? null;
}

export async function depositPurchasedCredits(
  userId: string,
  amount: number,
  stripePaymentId?: string,
) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('fn_deposit_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'deposit_purchase',
    p_pool: 'purchased',
    p_description: `Purchased ${amount} credits`,
    p_service_type: 'purchase',
    p_reference_id: null,
    p_expires_at: null,
  });

  return data?.[0] ?? null;
}

// ── Deductions ─────────────────────────────────────────────

export async function deductCredits(
  userId: string,
  amount: number,
  serviceType: string,
  description: string,
  referenceId?: string,
) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('fn_deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_service_type: serviceType,
    p_description: description,
    p_reference_id: referenceId ?? null,
  });

  const result = data?.[0] ?? null;

  // Check auto-refill after deduction
  if (result) {
    const total = (result.subscription_credits ?? 0) + (result.purchased_credits ?? 0);
    await checkAndTriggerAutoRefill(userId, total);
  }

  return result;
}

// ── Admin Adjustment ───────────────────────────────────────

export async function adjustCredits(
  userId: string,
  amount: number,
  description: string,
  adminId: string,
) {
  const supabase = await createClient();

  if (amount > 0) {
    // Positive adjustment → add to purchased pool
    const { data } = await supabase.rpc('fn_deposit_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'adjustment',
      p_pool: 'purchased',
      p_description: description,
      p_service_type: 'manual',
      p_reference_id: null,
      p_expires_at: null,
    });
    return data?.[0] ?? null;
  } else {
    // Negative adjustment → deduct
    const { data } = await supabase.rpc('fn_deduct_credits', {
      p_user_id: userId,
      p_amount: Math.abs(amount),
      p_service_type: 'manual',
      p_description: description,
      p_reference_id: null,
    });
    return data?.[0] ?? null;
  }
}

// ── Auto-Refill ────────────────────────────────────────────

export async function getAutoRefillSettings(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('auto_refill_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return data ?? { enabled: false, threshold: 10, refill_amount: 50 };
}

export async function updateAutoRefillSettings(
  userId: string,
  settings: { enabled: boolean; threshold: number; refill_amount: number },
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('auto_refill_settings')
    .upsert(
      {
        user_id: userId,
        enabled: settings.enabled,
        threshold: settings.threshold,
        refill_amount: settings.refill_amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  return data;
}

async function checkAndTriggerAutoRefill(userId: string, currentTotal: number) {
  const settings = await getAutoRefillSettings(userId);
  if (!settings.enabled || currentTotal >= settings.threshold) return;

  // Get Stripe customer ID
  const supabase = await createClient();
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!user?.stripe_customer_id) return;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return;

  try {
    // Get default payment method
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers/${user.stripe_customer_id}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const customer = await custRes.json();
    const pmId = customer.invoice_settings?.default_payment_method;
    if (!pmId) return;

    // Create off-session payment intent
    const params = new URLSearchParams({
      amount: String(settings.refill_amount * 100), // cents
      currency: 'cad',
      customer: user.stripe_customer_id,
      payment_method: typeof pmId === 'string' ? pmId : pmId.id,
      'off_session': 'true',
      confirm: 'true',
      description: `Auto-refill: ${settings.refill_amount} credits`,
      'metadata[type]': 'auto_refill',
      'metadata[user_id]': userId,
      'metadata[quantity]': String(settings.refill_amount),
    });

    const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const pi = await piRes.json();

    if (pi.status === 'succeeded') {
      // Deposit credits immediately (webhook will also fire but idempotency handles it)
      await depositPurchasedCredits(userId, settings.refill_amount, pi.id);
    } else {
      console.error('Auto-refill payment failed:', pi.status, pi.id);
    }
  } catch (e) {
    console.error('Auto-refill error:', e);
  }
}

// ── Admin Queries ──────────────────────────────────────────

export async function getAdminCreditStats() {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: totalSold },
    { data: consumedThisMonth },
    { data: negativeUsers },
  ] = await Promise.all([
    supabase
      .from('credit_transactions')
      .select('amount')
      .in('type', ['deposit_purchase']),
    supabase
      .from('credit_transactions')
      .select('amount')
      .eq('type', 'deduction')
      .gte('created_at', monthStart),
    supabase
      .from('credit_balances')
      .select('user_id, subscription_credits, purchased_credits, users(full_name, email)')
      .filter('subscription_credits', 'lt', 0)
      .or('purchased_credits.lt.0'),
  ]);

  const totalCreditsSold = (totalSold ?? []).reduce(
    (sum: number, t: any) => sum + t.amount,
    0,
  );
  const totalConsumedThisMonth = (consumedThisMonth ?? []).reduce(
    (sum: number, t: any) => sum + Math.abs(t.amount),
    0,
  );

  return {
    totalCreditsSold,
    totalConsumedThisMonth,
    usersWithNegativeBalance: negativeUsers ?? [],
  };
}

export async function getAdminUserCreditInfo(userId: string) {
  const balance = await getCreditBalance(userId);
  const { transactions } = await getCreditTransactions(userId, 20);
  return { balance, recentTransactions: transactions };
}
