import { supabaseAdmin, getStripe, getCryptoProvider, STRIPE_WEBHOOK_SECRET, json, error } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  const stripe = getStripe();
  const cryptoProvider = getCryptoProvider();

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return error("Missing Stripe-Signature", 400);

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (err) {
    console.error("Sig error:", err.message);
    return error(err.message, 400);
  }

  console.log("Event:", event.type, event.id);
  const sb = supabaseAdmin();

  try {
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const custStripeId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      // Get our customer record
      const { data: cust } = await sb.from("customers").select("id,user_id").eq("stripe_customer_id", custStripeId).single();
      if (!cust) { console.log("No customer for", custStripeId); return json({ received: true }); }

      // Match price to plan
      const priceId = sub.items?.data?.[0]?.price?.id ?? "";
      const { data: plan } = await sb.from("plans").select("id,slug").or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`).maybeSingle();

      // Upsert subscription
      const { data: dbSub } = await sb.from("subscriptions").upsert({
        customer_id: cust.id,
        plan_id: plan?.id ?? null,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        status: sub.status,
        quantity: sub.items?.data?.[0]?.quantity ?? 1,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      }, { onConflict: "stripe_subscription_id" }).select("id").single();

      console.log("Subscription upserted:", dbSub?.id, "status:", sub.status);

      // Auto-create service record for NEW active subscriptions
      if (event.type === "customer.subscription.created" && sub.status === "active" && dbSub) {
        const { data: existing } = await sb.from("services").select("id").eq("subscription_id", dbSub.id).maybeSingle();
        if (!existing) {
          const { data: profile } = await sb.from("users").select("full_name").eq("id", cust.user_id).maybeSingle();
          const name = profile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";
          const { data: svc, error: svcErr } = await sb.from("services").insert({
            user_id: cust.user_id,
            subscription_id: dbSub.id,
            plan_id: plan?.id ?? null,
            type: "hosting",
            label: `${name}-site`,
            status: "provisioning",
            server_region: "dca",
            php_version: "8.4",
            metadata: { auto_provisioned: true, plan_slug: plan?.slug ?? "minimum" },
          }).select("id").single();
          console.log("Service created:", svc?.id, "err:", svcErr?.message);
        } else {
          console.log("Service already exists:", existing.id);
        }
      }
    }

    else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await sb.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("stripe_subscription_id", sub.id);
      console.log("Subscription cancelled:", sub.id);
    }

    else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed" || event.type === "invoice.created") {
      const inv = event.data.object;
      const custStripeId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      const { data: cust } = await sb.from("customers").select("id,user_id").eq("stripe_customer_id", custStripeId).maybeSingle();
      if (cust) {
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
          paid_at: inv.status === "paid" ? new Date().toISOString() : null,
        }, { onConflict: "stripe_invoice_id" });
        console.log("Invoice:", inv.id, inv.status);

        // Fallback: create service if invoice.paid and no service exists yet
        if (event.type === "invoice.paid" && inv.subscription) {
          const subStripeId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
          const { data: dbSub } = await sb.from("subscriptions").select("id,plan_id").eq("stripe_subscription_id", subStripeId).maybeSingle();
          if (dbSub) {
            const { data: existing } = await sb.from("services").select("id").eq("subscription_id", dbSub.id).maybeSingle();
            if (!existing) {
              const { data: profile } = await sb.from("users").select("full_name").eq("id", cust.user_id).maybeSingle();
              const name = profile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";
              const planSlug = dbSub.plan_id ? (await sb.from("plans").select("slug").eq("id", dbSub.plan_id).maybeSingle())?.data?.slug : "minimum";
              await sb.from("services").insert({
                user_id: cust.user_id, subscription_id: dbSub.id, plan_id: dbSub.plan_id,
                type: "hosting", label: `${name}-site`, status: "provisioning",
                server_region: "dca", php_version: "8.4",
                metadata: { auto_provisioned: true, plan_slug: planSlug ?? "minimum", via: "invoice.paid" },
              });
              console.log("Service created via invoice.paid fallback");
            }
          }
        }
      }
    }

    else if (event.type === "customer.created") {
      const c = event.data.object;
      const userId = c.metadata?.supabase_user_id;
      if (userId) {
        await sb.from("customers").upsert({
          user_id: userId, stripe_customer_id: c.id,
          billing_email: c.email, billing_name: c.name,
        }, { onConflict: "user_id" });
        console.log("Customer upserted:", c.id);
      }
    }

  } catch (e) {
    console.error("Webhook error:", e);
    return error("Processing failed", 500);
  }

  return json({ received: true });
});
