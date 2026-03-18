import { supabaseAdmin, stripe, STRIPE_WEBHOOK_SECRET, cors, json, error, log, Stripe } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const s = stripe();
  const sb = supabaseAdmin();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return error("Missing stripe-signature", 400);

  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return error("Invalid signature", 401);
  }

  // Idempotency: skip already-processed events
  const { data: existing } = await sb.from("logs")
    .select("id").eq("action", `stripe.${event.type}`).eq("message", event.id).limit(1);
  if (existing && existing.length > 0) return json({ received: true, skipped: true });

  try {
    switch (event.type) {
      case "customer.created": {
        const c = event.data.object as Stripe.Customer;
        const userId = c.metadata?.supabase_user_id;
        if (!userId) break;
        await sb.from("customers").upsert({
          user_id: userId, stripe_customer_id: c.id,
          billing_email: c.email, billing_name: c.name,
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const custId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const { data: cust } = await sb.from("customers")
          .select("id,user_id").eq("stripe_customer_id", custId).single();
        if (!cust) break;

        // Match plan by stripe_price_id
        const priceId = sub.items.data[0]?.price?.id ?? "";
        const { data: plan } = await sb.from("plans")
          .select("id").or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`).single();

        await sb.from("subscriptions").upsert({
          customer_id: cust.id,
          plan_id: plan?.id ?? null,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          status: sub.status,
          quantity: sub.items.data[0]?.quantity ?? 1,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          cancelled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        }, { onConflict: "stripe_subscription_id" });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await sb.from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.created": {
        const inv = event.data.object as Stripe.Invoice;
        const custStripeId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const { data: cust } = await sb.from("customers")
          .select("id").eq("stripe_customer_id", custStripeId).single();
        if (!cust) break;

        await sb.from("invoices").upsert({
          customer_id: cust.id,
          stripe_invoice_id: inv.id,
          status: inv.status === "paid" ? "paid" : inv.status === "open" ? "open" : "draft",
          amount_due: inv.amount_due,
          amount_paid: inv.amount_paid,
          currency: inv.currency,
          description: inv.description ?? `Invoice ${inv.number}`,
          invoice_url: inv.hosted_invoice_url,
          invoice_pdf: inv.invoice_pdf,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          paid_at: inv.status === "paid" ? new Date().toISOString() : null,
        }, { onConflict: "stripe_invoice_id" });
        break;
      }
    }

    await log({ action: `stripe.${event.type}`, message: event.id });
  } catch (e) {
    await log({ level: "error", action: "stripe.webhook.error", message: String(e) });
    return error("Processing failed", 500);
  }

  return json({ received: true });
});
