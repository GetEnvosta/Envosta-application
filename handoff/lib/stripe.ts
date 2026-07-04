// lib/stripe.ts — Stripe client + checkout + mirror sync
// Pricing truth: `plans` table (seeded from CLAUDE.md §2). This module never
// hardcodes amounts; it reads Stripe price IDs stored on the plans row.
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
);

type PlanRow = {
  key: "minimum" | "basic" | "business" | "growth";
  name: string;
  stripe_price_monthly_id: string | null;
  stripe_price_setup_id: string | null;
  stripe_price_annual_id: string | null;
};

async function getPlan(key: PlanRow["key"]): Promise<PlanRow> {
  const { data, error } = await supabase.from("plans").select("*").eq("key", key).single();
  if (error || !data) throw new Error(`Plan not found: ${key}`);
  return data as PlanRow;
}

/** Create (or reuse) the Stripe customer for a client row. */
export async function ensureStripeCustomer(clientId: string) {
  const { data: client, error } = await supabase
    .from("clients").select("id,business_name,contact_name,email,stripe_customer_id")
    .eq("id", clientId).single();
  if (error || !client) throw new Error(`Client not found: ${clientId}`);
  if (client.stripe_customer_id) return client.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: client.email,
    name: client.business_name,
    metadata: { client_id: client.id },
  });
  await supabase.from("clients").update({ stripe_customer_id: customer.id }).eq("id", clientId);
  await supabase.from("stripe_customers").upsert({
    id: customer.id, client_id: clientId, email: client.email,
    raw: customer as unknown as Record<string, unknown>, synced_at: new Date().toISOString(),
  });
  return customer.id;
}

/**
 * Checkout for a plan: monthly subscription + one-time setup fee in one session.
 * `annual: true` uses the 13-months-for-12 price (bonus month, never a discount).
 * Used by the rep-assisted flow now; the same function powers self-serve at Gate 3.
 */
export async function createPlanCheckout(opts: {
  clientId: string;
  planKey: PlanRow["key"];
  annual?: boolean;
}) {
  const plan = await getPlan(opts.planKey);
  const customerId = await ensureStripeCustomer(opts.clientId);

  const recurringPrice = opts.annual ? plan.stripe_price_annual_id : plan.stripe_price_monthly_id;
  if (!recurringPrice) throw new Error(`Missing Stripe price on plan ${opts.planKey} — run the price bootstrap (brief Phase 6).`);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: recurringPrice, quantity: 1 },
  ];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: lineItems,
    // Setup fee rides the first invoice as a one-time item (never discounted —
    // client-financed acquisition per ENVOSTA_OFFER_SPEC.md Call 2).
    subscription_data: plan.stripe_price_setup_id
      ? { add_invoice_items: [{ price: plan.stripe_price_setup_id }], metadata: { client_id: opts.clientId, plan_key: opts.planKey } }
      : { metadata: { client_id: opts.clientId, plan_key: opts.planKey } },
    success_url: `${process.env.APP_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/plans`,
    metadata: { client_id: opts.clientId, plan_key: opts.planKey },
  });

  return { url: session.url, sessionId: session.id };
}

// --- Mirror sync helpers (called from the webhook route) ---------------------

export async function syncSubscription(sub: Stripe.Subscription) {
  const clientId = (sub.metadata?.client_id as string) ?? null;
  await supabase.from("stripe_subscriptions").upsert({
    id: sub.id,
    client_id: clientId,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    plan_key: (sub.metadata?.plan_key as PlanRow["key"]) ?? null,
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    raw: sub as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  });

  // Client lifecycle: active sub -> active client; canceled -> churn pipeline
  if (clientId) {
    if (sub.status === "active") {
      await supabase.from("clients").update({ status: "active" }).eq("id", clientId).eq("status", "onboarding");
    }
    if (sub.status === "canceled") {
      await supabase.from("clients").update({ status: "churned" }).eq("id", clientId);
    }
  }
}

export async function syncInvoice(inv: Stripe.Invoice) {
  const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id ?? null;
  let clientId: string | null = (inv.metadata?.client_id as string) ?? null;
  if (!clientId && subId) {
    const { data } = await supabase.from("stripe_subscriptions").select("client_id").eq("id", subId).single();
    clientId = data?.client_id ?? null;
  }
  await supabase.from("stripe_invoices").upsert({
    id: inv.id,
    client_id: clientId,
    subscription_id: subId,
    status: inv.status,
    amount_due_cents: inv.amount_due,
    amount_paid_cents: inv.amount_paid,
    hosted_invoice_url: inv.hosted_invoice_url,
    raw: inv as unknown as Record<string, unknown>,
    created_at: new Date(inv.created * 1000).toISOString(),
    synced_at: new Date().toISOString(),
  });
}

export async function syncCustomer(cus: Stripe.Customer) {
  await supabase.from("stripe_customers").upsert({
    id: cus.id,
    client_id: (cus.metadata?.client_id as string) ?? null,
    email: cus.email,
    raw: cus as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  });
}
