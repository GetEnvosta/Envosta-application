import { createClient } from '@/lib/supabase-server';

// ── Email helper (Resend) ──────────────────────────────────

async function sendCreditEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Envosta <noreply@email.envosta.com>', to, subject, html }),
    });
  } catch (e) {
    console.error('Credit email error (non-fatal):', e);
  }
}

function creditEmailTemplate(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}.wrap{max-width:560px;margin:0 auto;padding:40px 20px}.card{background:#fff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:22px;font-weight:600;color:#111;margin:0 0 16px}p{font-size:15px;color:#555;line-height:1.7;margin:0 0 16px}.btn{display:inline-block;background:#111;color:#fff!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;margin:8px 0 24px}.detail{background:#f8f9fb;border-radius:8px;padding:16px 20px;margin:16px 0}.detail-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}.detail-label{color:#888}.detail-value{color:#111;font-weight:500}.footer{text-align:center;padding:24px 0;font-size:12px;color:#aaa}</style></head><body><div class="wrap"><div class="card">${content}</div><div class="footer"><p>Envosta Inc. · Calgary, Alberta, Canada</p></div></div></body></html>`;
}

// ── Balance ────────────────────────────────────────────────

export async function getCreditBalance(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('subscription_credits, purchased_credits, subscription_credits_expire_at')
    .eq('id', userId)
    .single();

  const sub = data?.subscription_credits ?? 0;
  const pur = data?.purchased_credits ?? 0;

  return {
    subscription_credits: sub,
    purchased_credits: pur,
    total: sub + pur,
    expires_at: data?.subscription_credits_expire_at ?? null,
  };
}

// ── Transactions (from logs table, action starts with 'credit.') ──

export async function getCreditTransactions(
  userId: string,
  limit = 50,
  offset = 0,
) {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from('logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .like('action', 'credit.%')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Map logs to transaction-like shape for the UI
  const transactions = (data ?? []).map((log: any) => {
    const meta = (log.metadata as any) ?? {};
    return {
      id: log.id,
      type: log.action.replace('credit.', ''),
      amount: meta.amount ?? 0,
      subscription_balance_after: meta.subscription_balance_after ?? 0,
      purchased_balance_after: meta.purchased_balance_after ?? 0,
      description: log.details,
      service_type: meta.service_type ?? null,
      created_at: log.created_at,
    };
  });

  return { transactions, total: count ?? 0 };
}

// ── Usage Breakdown ────────────────────────────────────────

export async function getUsageBreakdown(
  userId: string,
  startDate?: string,
  endDate?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from('logs')
    .select('metadata')
    .eq('user_id', userId)
    .eq('action', 'credit.deduction');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data } = await query;

  const breakdown: Record<string, number> = {};
  for (const row of data ?? []) {
    const meta = (row.metadata as any) ?? {};
    const svc = meta.service_type ?? 'other';
    breakdown[svc] = (breakdown[svc] ?? 0) + Math.abs(meta.amount ?? 0);
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

  await supabase.rpc('fn_expire_subscription_credits', { p_user_id: userId });

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

  if (result) {
    const total = (result.subscription_credits ?? 0) + (result.purchased_credits ?? 0);

    // Send credit notification emails
    const supabase2 = await createClient();
    const { data: user } = await supabase2.from('users').select('email, full_name, auto_refill_enabled').eq('id', userId).single();

    if (user?.email) {
      if (total < 0) {
        // Negative balance alert
        await sendCreditEmail(user.email, `Action needed — negative credit balance`,
          creditEmailTemplate(`<h1>Your account has a negative balance</h1><p>Hey ${user.full_name ?? 'there'}, your credit balance is <strong style="color:#dc2626;">${total} credits</strong>. Your services are still running, but please add credits.</p><a href="https://my.envosta.com/dashboard/billing" class="btn">Add Credits Now</a>`)
        );
      } else if (total <= 10 && total > 0 && !user.auto_refill_enabled) {
        // Low balance warning (only if auto-refill is off)
        await sendCreditEmail(user.email, `Low credit balance — ${total} credits remaining`,
          creditEmailTemplate(`<h1>Your credits are running low</h1><p>Hey ${user.full_name ?? 'there'}, you have <strong>${total} credits</strong> remaining. Consider enabling auto-refill or purchasing credits.</p><a href="https://my.envosta.com/dashboard/billing" class="btn">Buy Credits</a>`)
        );
      }
    }

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
    .from('users')
    .select('auto_refill_enabled, auto_refill_threshold, auto_refill_amount')
    .eq('id', userId)
    .single();

  return {
    enabled: data?.auto_refill_enabled ?? false,
    threshold: data?.auto_refill_threshold ?? 10,
    refill_amount: data?.auto_refill_amount ?? 50,
  };
}

export async function updateAutoRefillSettings(
  userId: string,
  settings: { enabled: boolean; threshold: number; refill_amount: number },
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .update({
      auto_refill_enabled: settings.enabled,
      auto_refill_threshold: settings.threshold,
      auto_refill_amount: settings.refill_amount,
    })
    .eq('id', userId)
    .select('auto_refill_enabled, auto_refill_threshold, auto_refill_amount')
    .single();

  return {
    enabled: data?.auto_refill_enabled ?? false,
    threshold: data?.auto_refill_threshold ?? 10,
    refill_amount: data?.auto_refill_amount ?? 50,
  };
}

async function checkAndTriggerAutoRefill(userId: string, currentTotal: number) {
  const settings = await getAutoRefillSettings(userId);
  if (!settings.enabled || currentTotal >= settings.threshold) return;

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
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers/${user.stripe_customer_id}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const customer = await custRes.json();
    const pmId = customer.invoice_settings?.default_payment_method;
    if (!pmId) return;

    const params = new URLSearchParams({
      amount: String(settings.refill_amount * 100),
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
      const result = await depositPurchasedCredits(userId, settings.refill_amount, pi.id);
      const newBalance = result ? (result.subscription_credits + result.purchased_credits) : settings.refill_amount;

      // Send auto-refill notification email
      const supabase3 = await createClient();
      const { data: usr } = await supabase3.from('users').select('email, full_name').eq('id', userId).single();
      if (usr?.email) {
        await sendCreditEmail(usr.email, `Auto-refill: ${settings.refill_amount} credits added`,
          creditEmailTemplate(`<h1>Credits auto-refilled</h1><p>Hey ${usr.full_name ?? 'there'}, we added <strong>${settings.refill_amount} credits</strong> to your account.</p><div class="detail"><div class="detail-row"><span class="detail-label">Credits Added</span><span class="detail-value">${settings.refill_amount}</span></div><div class="detail-row"><span class="detail-label">Charged</span><span class="detail-value">$${settings.refill_amount}.00 CAD</span></div><div class="detail-row"><span class="detail-label">New Balance</span><span class="detail-value">${newBalance} credits</span></div></div><a href="https://my.envosta.com/dashboard/billing" class="btn">View Billing</a><p style="font-size:13px;color:#888;">Adjust auto-refill settings anytime from your billing dashboard.</p>`)
        );
      }
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
    { data: deposits },
    { data: deductions },
    { data: negativeUsers },
  ] = await Promise.all([
    supabase
      .from('logs')
      .select('metadata')
      .eq('action', 'credit.deposit_purchase'),
    supabase
      .from('logs')
      .select('metadata')
      .eq('action', 'credit.deduction')
      .gte('created_at', monthStart),
    supabase
      .from('users')
      .select('id, full_name, email, subscription_credits, purchased_credits')
      .or('subscription_credits.lt.0,purchased_credits.lt.0'),
  ]);

  const totalCreditsSold = (deposits ?? []).reduce(
    (sum: number, t: any) => sum + ((t.metadata as any)?.amount ?? 0),
    0,
  );
  const totalConsumedThisMonth = (deductions ?? []).reduce(
    (sum: number, t: any) => sum + Math.abs((t.metadata as any)?.amount ?? 0),
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
