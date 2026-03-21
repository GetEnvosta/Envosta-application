import { supabaseAdmin, getStripe, getCryptoProvider, STRIPE_WEBHOOK_SECRET, json, error, log } from "../_shared/deps.ts";

/**
 * Stripe webhook handler.
 * Auto-provisioning: creates a service record with status "provisioning".
 * The actual wp.cloud API call is triggered separately (admin action or cron)
 * to avoid webhook timeouts.
 */

Deno.serve(async (req) => {
  const stripe = getStripe();
  const cryptoProvider = getCryptoProvider();

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return error("Missing Stripe-Signature", 400);

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return error(err.message, 400);
  }

  console.log("Event received:", event.id, event.type);

  const sb = supabaseAdmin();

  // Idempotency check
  const { data: existing } = await sb.from("logs")
    .select("id").eq("action", `stripe.${event.type}`).eq("message", event.id).limit(1);
  if (existing && existing.length > 0) return json({ received: true, skipped: true });

  try {
    switch (event.type) {
      case "customer.created": {
        const c = event.data.object;
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
        const sub = event.data.object;
        const custId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const { data: cust } = await sb.from("customers")
          .select("id,user_id").eq("stripe_customer_id", custId).single();
        if (!cust) break;

        const priceId = sub.items?.data?.[0]?.price?.id ?? "";
        const { data: plan } = await sb.from("plans")
          .select("id").or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`).single();

        const { data: upsertedSub } = await sb.from("subscriptions").upsert({
          customer_id: cust.id,
          plan_id: plan?.id ?? null,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          status: sub.status,
          quantity: sub.items?.data?.[0]?.quantity ?? 1,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          cancelled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        }, { onConflict: "stripe_subscription_id" }).select("id").single();

        // Auto-provision: create a service record immediately (fast DB insert),
        // then trigger the actual wp.cloud provisioning asynchronously via Edge Function call.
        if (event.type === "customer.subscription.created" && sub.status === "active" && upsertedSub) {
          try {
            // Get user info for site label
            const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", cust.user_id).single();
            const siteName = userProfile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";
            let planSlug = "minimum";
            if (plan?.id) {
              const { data: planData } = await sb.from("plans").select("slug").eq("id", plan.id).single();
              if (planData) planSlug = planData.slug;
            }

            // Create service record (provisioning) — this is a fast DB insert
            await sb.from("services").insert({
              user_id: cust.user_id,
              subscription_id: upsertedSub.id,
              plan_id: plan?.id ?? null,
              type: "hosting",
              label: `${siteName}-site`,
              status: "provisioning",
              server_region: "dca",
              php_version: "8.4",
              metadata: { auto_provisioned: true, plan_slug: planSlug },
            });

            await log({ userId: cust.user_id, action: "hosting.auto_provision.queued", message: `${siteName}-site (${planSlug})` });
            console.log("Service record created, provisioning will be triggered separately");
          } catch (provErr) {
            console.error("Failed to create service record:", provErr);
            await log({ userId: cust.user_id, level: "error", action: "hosting.auto_provision.queue_failed", message: String(provErr) });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await sb.from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object;
        const custStripeId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const { data: cust } = await sb.from("customers")
          .select("id,user_id").eq("stripe_customer_id", custStripeId).single();
        if (!cust) break;

        await sb.from("invoices").upsert({
          customer_id: cust.id,
          stripe_invoice_id: inv.id,
          status: "paid",
          amount_due: inv.amount_due ?? 0,
          amount_paid: inv.amount_paid ?? 0,
          currency: inv.currency ?? "usd",
          description: inv.description ?? `Invoice ${inv.number ?? ""}`,
          invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf: inv.invoice_pdf ?? null,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          paid_at: new Date().toISOString(),
        }, { onConflict: "stripe_invoice_id" });

        // If this is the first invoice for a subscription that started as incomplete,
        // create a service record now (same lightweight approach as subscription.created)
        if (inv.subscription) {
          const subStripeId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
          const { data: dbSub } = await sb.from("subscriptions")
            .select("id, plan_id").eq("stripe_subscription_id", subStripeId).single();
          if (dbSub) {
            // Check if service already exists for this subscription
            const { data: existingSvc } = await sb.from("services")
              .select("id").eq("subscription_id", dbSub.id).maybeSingle();
            if (!existingSvc) {
              const { data: userProfile } = await sb.from("users").select("full_name").eq("id", cust.user_id).single();
              const siteName = userProfile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";
              let planSlug = "minimum";
              if (dbSub.plan_id) {
                const { data: planData } = await sb.from("plans").select("slug").eq("id", dbSub.plan_id).single();
                if (planData) planSlug = planData.slug;
              }
              await sb.from("services").insert({
                user_id: cust.user_id, subscription_id: dbSub.id, plan_id: dbSub.plan_id,
                type: "hosting", label: `${siteName}-site`, status: "provisioning",
                server_region: "dca", php_version: "8.4",
                metadata: { auto_provisioned: true, plan_slug: planSlug },
              });
              await log({ userId: cust.user_id, action: "hosting.auto_provision.queued", message: `via invoice.paid` });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed":
      case "invoice.created": {
        const inv = event.data.object;
        const custStripeId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const { data: cust } = await sb.from("customers")
          .select("id").eq("stripe_customer_id", custStripeId).single();
        if (!cust) break;

        await sb.from("invoices").upsert({
          customer_id: cust.id,
          stripe_invoice_id: inv.id,
          status: inv.status === "paid" ? "paid" : inv.status === "open" ? "open" : "draft",
          amount_due: inv.amount_due ?? 0,
          amount_paid: inv.amount_paid ?? 0,
          currency: inv.currency ?? "usd",
          description: inv.description ?? `Invoice ${inv.number ?? ""}`,
          invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf: inv.invoice_pdf ?? null,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          paid_at: null,
        }, { onConflict: "stripe_invoice_id" });
        break;
      }
    }

    await log({ action: `stripe.${event.type}`, message: event.id });
  } catch (e) {
    console.error("Webhook processing error:", e);
    await log({ level: "error", action: "stripe.webhook.error", message: String(e) });
    return error("Processing failed", 500);
  }

  return json({ received: true });
});
