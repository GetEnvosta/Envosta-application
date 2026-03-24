import { supabaseAdmin, getStripe, getCryptoProvider, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, json, error } from "../_shared/deps.ts";

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

      // Auto-create service record for active subscriptions with a hosting plan
      // Skip domain-only subscriptions (type: "domain_renewal" in metadata)
      const isDomainRenewal = sub.metadata?.type === "domain_renewal";
      if (sub.status === "active" && dbSub && plan?.id && !isDomainRenewal) {
        const { data: existing } = await sb.from("services").select("id").eq("subscription_id", dbSub.id).maybeSingle();
        if (!existing) {
          const { data: profile } = await sb.from("users").select("full_name").eq("id", cust.user_id).maybeSingle();
          const name = profile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";
          // Get onboarding type from plan
          let onboardingType = "standard";
          if (plan?.id) {
            const { data: planData } = await sb.from("plans").select("onboarding_type").eq("id", plan.id).maybeSingle();
            if (planData?.onboarding_type) onboardingType = planData.onboarding_type;
          }

          const domainFromMeta = sub.metadata?.domain_name ?? null;

          const { data: svc, error: svcErr } = await sb.from("services").insert({
            user_id: cust.user_id,
            subscription_id: dbSub.id,
            plan_id: plan?.id ?? null,
            type: "hosting",
            label: `${name}-site`,
            status: "provisioning",
            server_region: "dca",
            php_version: "8.4",
            onboarding_status: "not_started",
            onboarding_type: onboardingType,
            metadata: { auto_provisioned: true, plan_slug: plan?.slug ?? "minimum", domain_name: domainFromMeta },
          }).select("id").single();
          console.log("Service created:", svc?.id, "err:", svcErr?.message);

          // Auto-register domain at OpenSRS if domain was purchased with the plan
          if (domainFromMeta && svc) {
            const { data: existingDomain } = await sb.from("domains")
              .select("id, status").eq("domain_name", domainFromMeta).eq("user_id", cust.user_id).maybeSingle();

            if (!existingDomain) {
              // Call register-domain Edge Function to register at OpenSRS
              // Uses service role key to bypass auth (webhook has no user session)
              try {
                console.log("Auto-registering domain:", domainFromMeta);
                const regRes = await fetch(`${SUPABASE_URL}/functions/v1/register-domain`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    action: "register",
                    domainName: domainFromMeta,
                    serviceId: svc.id,
                    years: 1,
                    userId: cust.user_id,
                  }),
                });
                const regData = await regRes.json();
                console.log("Domain registration result:", regRes.status, JSON.stringify(regData));

                if (regRes.ok) {
                  // Link domain to service
                  await sb.from("domains")
                    .update({ service_id: svc.id })
                    .eq("domain_name", domainFromMeta)
                    .eq("user_id", cust.user_id);

                  // Create yearly renewal subscription — first year free (already paid at checkout)
                  // trial_end = 1 year from now, then Stripe auto-charges yearly
                  try {
                    const tld = domainFromMeta.split(".").pop()?.toLowerCase() ?? "";
                    const { data: tldPricing } = await sb.from("domain_pricing")
                      .select("stripe_price_id_yearly")
                      .eq("tld", tld).maybeSingle();

                    if (tldPricing?.stripe_price_id_yearly) {
                      const stripe = getStripe();
                      const oneYearFromNow = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
                      await stripe.subscriptions.create({
                        customer: custStripeId,
                        items: [{ price: tldPricing.stripe_price_id_yearly }],
                        trial_end: oneYearFromNow,
                        metadata: {
                          supabase_user_id: cust.user_id,
                          domain_name: domainFromMeta,
                          type: "domain_renewal",
                        },
                      });
                      console.log("Domain renewal subscription created for:", domainFromMeta, "trial until:", new Date(oneYearFromNow * 1000).toISOString());
                    }
                  } catch (renewErr) {
                    console.error("Domain renewal subscription failed (non-fatal):", renewErr);
                  }
                } else {
                  // Registration failed but don't fail the whole webhook
                  // Create a pending record so admin can retry
                  await sb.from("domains").insert({
                    user_id: cust.user_id,
                    domain_name: domainFromMeta,
                    service_id: svc.id,
                    status: "pending_registration",
                    registrar: "opensrs",
                    metadata: { registration_error: regData.error ?? "Unknown error" },
                  });
                  console.error("Domain registration failed:", domainFromMeta, regData.error);
                }
              } catch (regErr) {
                console.error("Domain registration error (non-fatal):", regErr);
                await sb.from("domains").insert({
                  user_id: cust.user_id,
                  domain_name: domainFromMeta,
                  service_id: svc.id,
                  status: "pending_registration",
                  registrar: "opensrs",
                  metadata: { registration_error: String(regErr) },
                });
              }
            } else {
              // Link existing domain to the new service
              await sb.from("domains").update({ service_id: svc.id }).eq("id", existingDomain.id);
              console.log("Existing domain linked:", domainFromMeta, "→", svc.id);
            }
          }
          // Auto-provision wp.cloud site
          if (svc) {
            try {
              console.log("Auto-provisioning site:", svc.id);
              const provRes = await fetch(`${SUPABASE_URL}/functions/v1/provision-hosting`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  serviceId: svc.id,
                  label: `${name}-site`,
                  region: "dca",
                  phpVersion: "8.4",
                  planId: plan?.id ?? null,
                  userId: cust.user_id,
                  ...(domainFromMeta && { domainName: domainFromMeta }),
                }),
              });
              const provData = await provRes.json();
              console.log("Auto-provision result:", provRes.status, JSON.stringify(provData).substring(0, 300));

              if (!provRes.ok) {
                console.error("Auto-provision failed (admin can retry):", provData.error);
              }
            } catch (provErr) {
              // Non-fatal — admin can retry via Provision button
              console.error("Auto-provision error (non-fatal):", provErr);
            }
          }
        } else {
          console.log("Service already exists:", existing.id);
        }
      }
    }

    // Handle checkout.session.completed for one-time payments (studio requests, domain purchases)
    else if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata ?? {};

      if (metadata.type === "studio_request") {
        const userId = metadata.supabase_user_id;
        if (userId) {
          // Create as a ticket with type 'studio'
          const { data: ticket } = await sb.from("tickets").insert({
            user_id: userId,
            subject: metadata.studio_subject ?? "Studio Request",
            type: "studio",
            status: "open",
            priority: "normal",
            metadata: {
              stripe_payment_id: session.payment_intent ?? session.id,
              amount_cad: session.amount_total ?? 25000,
            },
          }).select("id").single();

          if (ticket && metadata.studio_message) {
            await sb.from("ticket_messages").insert({
              ticket_id: ticket.id,
              sender: "customer",
              message: metadata.studio_message,
            });
          }
          console.log("Studio ticket created:", ticket?.id, "for user:", userId);
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

        // Handle domain renewal — when yearly domain subscription charges
        if (event.type === "invoice.paid" && inv.subscription) {
          const subStripeId2 = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
          // Check if this is a domain renewal subscription (by metadata)
          try {
            const stripe = getStripe();
            const stripeSub = await stripe.subscriptions.retrieve(subStripeId2);
            if (stripeSub.metadata?.type === "domain_renewal" && stripeSub.metadata?.domain_name) {
              const domainToRenew = stripeSub.metadata.domain_name;
              console.log("Domain renewal invoice paid:", domainToRenew);

              // Renew at OpenSRS (auto_renew should handle this, but update expiry in our DB)
              await sb.from("domains")
                .update({
                  expiry_date: new Date(Date.now() + 365.25 * 86400000).toISOString(),
                  metadata: { last_renewal: new Date().toISOString(), renewal_invoice: inv.id },
                })
                .eq("domain_name", domainToRenew)
                .eq("user_id", cust.user_id);

              console.log("Domain expiry updated:", domainToRenew);
            }
          } catch (renewErr) {
            console.error("Domain renewal processing error (non-fatal):", renewErr);
          }
        }

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
