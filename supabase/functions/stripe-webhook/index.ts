import { supabaseAdmin, getStripe, getCryptoProvider, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, json, error, log } from "../_shared/deps.ts";
import { sendEmail, welcomeEmail, invoicePaidEmail } from "../_shared/email.ts";
import { opensrsRequest, parseResponse } from "../_shared/opensrs.ts";

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

  // ── Idempotency: skip already-processed events ──
  const { data: existing } = await sb.from("webhook_events").select("id").eq("id", event.id).maybeSingle();
  if (existing) {
    console.log("Duplicate event, skipping:", event.id);
    return json({ received: true, duplicate: true });
  }
  try { await sb.from("webhook_events").insert({ id: event.id, event_type: event.type }); } catch { /* ignore duplicate */ }

  try {
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const custStripeId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      // Get our customer record
      const { data: cust } = await sb.from("users").select("id, full_name, email").eq("stripe_customer_id", custStripeId).single();
      if (!cust) { console.log("No customer for", custStripeId); return json({ received: true }); }

      // Match price to plan — check all price ID columns including 2yr/3yr
      const priceId = sub.items?.data?.[0]?.price?.id ?? "";
      let plan: any = null;
      if (priceId) {
        const { data: p } = await sb.from("products").select("id,slug,metadata")
          .or(`stripe_price_id.eq.${priceId},stripe_price_id_yearly.eq.${priceId},stripe_price_id_2yr.eq.${priceId},stripe_price_id_3yr.eq.${priceId}`)
          .maybeSingle();
        plan = p;
      }

      // Determine billing period from Stripe interval
      const interval = sub.items?.data?.[0]?.price?.recurring?.interval;
      const intervalCount = sub.items?.data?.[0]?.price?.recurring?.interval_count ?? 1;
      let billingPeriod = "monthly";
      if (interval === "year") billingPeriod = intervalCount >= 3 ? "3yr" : intervalCount >= 2 ? "2yr" : "yearly";

      // Upsert subscription — merge metadata with existing
      const { data: existingSub } = await sb.from("subscriptions").select("metadata").eq("stripe_subscription_id", sub.id).maybeSingle();
      const existingMeta = (existingSub?.metadata as any) ?? {};

      const { data: dbSub } = await sb.from("subscriptions").upsert({
        user_id: cust.id,
        product_id: plan?.id ?? null,
        stripe_subscription_id: sub.id,
        status: sub.status,
        billing_period: billingPeriod,
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
        current_period_end: (sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null)
          ?? (sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null),
        metadata: {
          ...existingMeta,
          stripe_price_id: priceId,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          quantity: sub.items?.data?.[0]?.quantity ?? 1,
        },
      }, { onConflict: "stripe_subscription_id" }).select("id").single();

      console.log("Subscription upserted:", dbSub?.id, "status:", sub.status);

      // ── Initialize credit balance for new subscriptions ──
      const isNewActiveSub = sub.status === "active" || (sub.status === "trialing" && !!sub.default_payment_method);
      if (event.type === "customer.subscription.created" && isNewActiveSub && plan?.type === "hosting_plan") {
        try {
          // Credits now stored directly on users table — no separate row needed

          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

          await sb.rpc("fn_deposit_credits", {
            p_user_id: cust.id,
            p_amount: 50,
            p_type: "deposit_subscription",
            p_pool: "subscription",
            p_description: "Initial subscription deposit: 50 credits",
            p_service_type: "subscription",
            p_reference_id: null,
            p_expires_at: periodEnd,
          });
          console.log("Initial credits deposited for new subscriber:", cust.id);
        } catch (credErr) {
          console.error("Initial credit deposit error (non-fatal):", credErr);
        }
      }

      // Auto-create site for active subscriptions with a hosting plan
      const isDomainRenewal = sub.metadata?.type === "domain_renewal";
      const isDomainPurchase = sub.metadata?.is_domain_purchase === "true";
      const isDomainTld = plan?.type === "domain_tld";
      // Only provision when payment is confirmed:
      // - "active" = paid subscription
      // - "trialing" with a default_payment_method = card collected (SetupIntent succeeded)
      const hasPaymentMethod = !!sub.default_payment_method;
      const shouldProvision = (sub.status === "active" || (sub.status === "trialing" && hasPaymentMethod));

      // Set the subscription's payment method as the customer's default (for future charges)
      if (hasPaymentMethod && custStripeId) {
        try {
          const pmId = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method?.id;
          if (pmId) {
            await stripe.customers.update(custStripeId, {
              invoice_settings: { default_payment_method: pmId },
            });
            console.log("Set customer default payment method:", pmId);
          }
        } catch (pmErr) {
          console.error("Failed to set default PM (non-fatal):", pmErr);
        }
      }

      if (shouldProvision && dbSub && plan?.id && !isDomainRenewal && !isDomainPurchase && !isDomainTld) {
        const { data: existing } = await sb.from("sites").select("id").eq("subscription_id", dbSub.id).maybeSingle();
        if (!existing) {
          const { data: profile } = await sb.from("users").select("full_name").eq("id", cust.id).maybeSingle();
          const name = profile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";

          const domainFromMeta = sub.metadata?.domain_name ?? null;
          const planMeta = plan?.metadata as any ?? {};

          // Insert site with base config defaults (2 workers, 25GB, 512MB, no bursting)
          const { data: svc, error: svcErr } = await sb.from("sites").insert({
            user_id: cust.id,
            subscription_id: dbSub.id,
            product_id: plan?.id ?? null,
            label: `${name}-site`,
            status: "provisioning",
            server_region: "dca",
            domain_name: domainFromMeta,
            config: {
              php_workers: 2,
              storage_gb: 25,
              php_memory_mb: 512,
            },
            bursting_enabled: false,
            max_php_workers: 2,
            max_ssd_gb: 25,
            metadata: {
              auto_provisioned: true,
              plan_slug: plan?.slug ?? "minimum",
              onboarding_type: planMeta.onboarding_type ?? "standard",
            },
          }).select("id").single();
          console.log("Site created:", svc?.id, "err:", svcErr?.message);

          // Send welcome email
          if (svc && !svcErr) {
            const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", cust.id).maybeSingle();
            if (userProfile?.email) {
              const planName = plan?.slug ? plan.slug.charAt(0).toUpperCase() + plan.slug.slice(1) : "Hosting";
              const email = welcomeEmail(userProfile.full_name ?? "there", planName, "https://my.envosta.com/dashboard");
              await sendEmail({ to: userProfile.email, ...email });
            }
          }

          // Auto-register domain at OpenSRS
          if (domainFromMeta && svc) {
            const { data: existingDomain } = await sb.from("domains")
              .select("id, status").eq("domain_name", domainFromMeta).eq("user_id", cust.id).maybeSingle();

            if (!existingDomain) {
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
                    userId: cust.id,
                  }),
                });
                const regData = await regRes.json();
                console.log("Domain registration result:", regRes.status, JSON.stringify(regData));

                if (regRes.ok) {
                  await sb.from("domains")
                    .update({ site_id: svc.id })
                    .eq("domain_name", domainFromMeta)
                    .eq("user_id", cust.id);

                  // Create yearly domain renewal subscription
                  try {
                    const tld = domainFromMeta.split(".").pop()?.toLowerCase() ?? "";
                    const { data: tldProduct } = await sb.from("products")
                      .select("stripe_price_id, price_cad")
                      .eq("type", "domain_tld")
                      .eq("slug", `tld-${tld}`).maybeSingle();

                    if (tldProduct?.stripe_price_id) {
                      // Domain is a separate paid product — charges immediately
                      const renewalSub = await stripe.subscriptions.create({
                        customer: custStripeId,
                        items: [{ price: tldProduct.stripe_price_id }],
                        metadata: {
                          supabase_user_id: cust.id,
                          domain_name: domainFromMeta,
                          type: "domain_renewal",
                        },
                      });

                      const { data: domRec } = await sb.from("domains").select("metadata").eq("domain_name", domainFromMeta).eq("user_id", cust.id).maybeSingle();
                      await sb.from("domains")
                        .update({ metadata: { ...((domRec?.metadata as any) ?? {}), renewal_stripe_subscription_id: renewalSub.id, dns_setup: "pending" } })
                        .eq("domain_name", domainFromMeta)
                        .eq("user_id", cust.id);

                      console.log("Domain renewal subscription created:", renewalSub.id);
                    }
                  } catch (renewErr) {
                    console.error("Domain renewal subscription failed (non-fatal):", renewErr);
                  }
                } else {
                  // Registration failed — create pending record
                  await sb.from("domains").insert({
                    user_id: cust.id,
                    domain_name: domainFromMeta,
                    site_id: svc.id,
                    status: "pending",
                    registrar: "opensrs",
                    metadata: { registration_error: regData.error ?? "Unknown error" },
                  });
                  console.error("Domain registration failed:", domainFromMeta, regData.error);
                }
              } catch (regErr) {
                console.error("Domain registration error (non-fatal):", regErr);
                await sb.from("domains").insert({
                  user_id: cust.id,
                  domain_name: domainFromMeta,
                  site_id: svc.id,
                  status: "pending",
                  registrar: "opensrs",
                  metadata: { registration_error: String(regErr) },
                });
              }
            } else {
              await sb.from("domains").update({ site_id: svc.id }).eq("id", existingDomain.id);
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
                  userId: cust.id,
                  ...(domainFromMeta && { domainName: domainFromMeta }),
                }),
              });
              const provData = await provRes.json();
              console.log("Auto-provision result:", provRes.status, JSON.stringify(provData).substring(0, 300));
              if (!provRes.ok) console.error("Auto-provision failed (admin can retry):", provData.error);
            } catch (provErr) {
              console.error("Auto-provision error (non-fatal):", provErr);
            }
          }
        } else {
          console.log("Site already exists:", existing.id);
        }
      }

      // Handle standalone domain purchases (no site creation, just register the domain)
      if ((isDomainPurchase || isDomainTld) && dbSub && (sub.status === "active" || sub.status === "trialing")) {
        const domainFromMeta = sub.metadata?.domain_name ?? null;
        if (domainFromMeta) {
          const { data: existingDomain } = await sb.from("domains")
            .select("id").eq("domain_name", domainFromMeta).eq("user_id", cust.id).maybeSingle();

          if (!existingDomain) {
            try {
              console.log("Domain purchase — registering:", domainFromMeta);
              const regRes = await fetch(`${SUPABASE_URL}/functions/v1/register-domain`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  action: "register",
                  domainName: domainFromMeta,
                  years: 1,
                  userId: cust.id,
                }),
              });
              const regData = await regRes.json();
              console.log("Domain purchase registration result:", regRes.status, JSON.stringify(regData));

              // Store the subscription ID on the domain for renewal tracking
              if (regRes.ok) {
                await sb.from("domains").update({
                  metadata: { renewal_stripe_subscription_id: sub.id },
                }).eq("domain_name", domainFromMeta).eq("user_id", cust.id);
              }
            } catch (regErr) {
              console.error("Domain purchase registration error:", regErr);
              await sb.from("domains").insert({
                user_id: cust.id,
                domain_name: domainFromMeta,
                tld: domainFromMeta.split(".").pop() ?? "",
                status: "pending",
                registrar: "opensrs",
                metadata: { registration_error: String(regErr), renewal_stripe_subscription_id: sub.id },
              });
            }
          } else {
            console.log("Domain already exists for user:", domainFromMeta);
          }
        }
      }
    }

    // Handle checkout.session.completed for one-time payments
    else if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata ?? {};

      if (metadata.type === "studio_request") {
        const userId = metadata.supabase_user_id;
        if (userId) {
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
          console.log("Studio ticket created:", ticket?.id);
        }
      }

      // ── Credit Purchase ──
      if (metadata.type === "credit_purchase") {
        const userId = metadata.supabase_user_id;
        const quantity = parseInt(metadata.quantity ?? "0", 10);
        if (userId && quantity > 0) {
          try {
            await sb.rpc("fn_deposit_credits", {
              p_user_id: userId,
              p_amount: quantity,
              p_type: "deposit_purchase",
              p_pool: "purchased",
              p_description: `Purchased ${quantity} credits`,
              p_service_type: "purchase",
              p_reference_id: null,
              p_expires_at: null,
            });
            console.log("Credits deposited:", quantity, "for user:", userId);
          } catch (credErr) {
            console.error("Credit deposit error:", credErr);
          }
        }
      }
    }

    // ── Auto-refill payment success ──
    else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const metadata = pi.metadata ?? {};

      if (metadata.type === "auto_refill") {
        const userId = metadata.user_id;
        const quantity = parseInt(metadata.quantity ?? "0", 10);
        if (userId && quantity > 0) {
          try {
            await sb.rpc("fn_deposit_credits", {
              p_user_id: userId,
              p_amount: quantity,
              p_type: "deposit_purchase",
              p_pool: "purchased",
              p_description: `Auto-refill: ${quantity} credits`,
              p_service_type: "purchase",
              p_reference_id: null,
              p_expires_at: null,
            });
            console.log("Auto-refill credits deposited:", quantity, "for user:", userId);
          } catch (credErr) {
            console.error("Auto-refill credit deposit error:", credErr);
          }
        }
      }
    }

    else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;

      // 1. Mark subscription as cancelled
      const { data: existSubDel } = await sb.from("subscriptions").select("id, metadata").eq("stripe_subscription_id", sub.id).maybeSingle();
      const { data: dbSub } = await sb.from("subscriptions").update({
        status: "cancelled",
        metadata: { ...((existSubDel?.metadata as any) ?? {}), cancelled_at: new Date().toISOString() },
      }).eq("stripe_subscription_id", sub.id).select("id").maybeSingle();
      console.log("Subscription cancelled:", sub.id);

      // 2. Cancel the linked site (soft-delete: mark cancelled, keep wp.cloud alive 30 days)
      if (dbSub) {
        const { data: site } = await sb.from("sites")
          .select("id, label, status")
          .eq("subscription_id", dbSub.id)
          .in("status", ["active", "provisioning"])
          .maybeSingle();

        if (site) {
          await sb.from("sites").update({
            status: "cancelled",
            metadata: { cancelled_at: new Date().toISOString(), cancelled_via: "stripe_portal", recovery_until: new Date(Date.now() + 30 * 86400000).toISOString() },
          }).eq("id", site.id);

          // Unlink domains (don't delete them, just remove site_id)
          await sb.from("domains").update({ site_id: null }).eq("site_id", site.id);

          console.log("Site cancelled via Stripe portal:", site.label);
          await log({ serviceId: site.id, action: "site.cancelled_via_stripe", message: `${site.label} cancelled from Stripe billing portal` });
        }
      }

      // 3. If this was a domain renewal subscription, disable auto-renew at OpenSRS too
      const domainMeta = sub.metadata;
      if (domainMeta?.type === "domain_renewal" && domainMeta?.domain_name) {
        await sb.from("domains").update({ auto_renew: false }).eq("domain_name", domainMeta.domain_name);
        // Tell OpenSRS to let the domain expire
        try {
          const domainName = domainMeta.domain_name;
          const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body><data_block><dt_assoc>
    <item key="protocol">XCP</item>
    <item key="object">domain</item>
    <item key="action">modify</item>
    <item key="domain">${domainName}</item>
    <item key="attributes"><dt_assoc>
      <item key="affect_domains">0</item>
      <item key="data">expire_action</item>
      <item key="auto_renew">0</item>
      <item key="let_expire">1</item>
    </dt_assoc></item>
  </dt_assoc></data_block></body>
</OPS_envelope>`;
          const resXml = await opensrsRequest(xml);
          const parsed = parseResponse(resXml);
          console.log("OpenSRS auto-renew disabled for", domainName, parsed.responseText);
        } catch (e) {
          console.error("OpenSRS auto-renew disable failed (non-fatal):", e);
        }
        console.log("Domain renewal cancelled via Stripe:", domainMeta.domain_name);
      }
    }

    else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed" || event.type === "invoice.created") {
      const inv = event.data.object;
      const custStripeId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      const { data: cust } = await sb.from("users").select("id, full_name, email").eq("stripe_customer_id", custStripeId).maybeSingle();
      if (cust) {
        // Upsert invoice — match actual table columns
        const invStatus = inv.status === "paid" ? "paid" : inv.status === "open" ? "open" : inv.status === "void" ? "void" : inv.status === "uncollectible" ? "uncollectible" : "draft";
        await sb.from("invoices").upsert({
          user_id: cust.id,
          stripe_invoice_id: inv.id,
          status: invStatus,
          amount_cad: inv.amount_paid ?? inv.amount_due ?? 0,
          description: inv.description || `Invoice ${inv.number ?? ""}`,
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          metadata: {
            currency: inv.currency ?? "cad",
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            invoice_pdf: inv.invoice_pdf,
            period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
            period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
            paid_at: inv.status === "paid" ? new Date().toISOString() : null,
          },
        }, { onConflict: "stripe_invoice_id" });
        console.log("Invoice:", inv.id, invStatus);

        // Send invoice receipt email (idempotent)
        if (event.type === "invoice.paid" && inv.amount_paid > 0) {
          const { data: existingInv } = await sb.from("invoices").select("metadata").eq("stripe_invoice_id", inv.id).maybeSingle();
          const alreadySent = (existingInv?.metadata as any)?.email_sent;

          if (!alreadySent) {
            const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", cust.id).maybeSingle();
            if (userProfile?.email) {
              const amount = `$${(inv.amount_paid / 100).toFixed(2)} CAD`;
              const desc = inv.description ?? `Invoice ${inv.number ?? ""}`;
              const email = invoicePaidEmail(userProfile.full_name ?? "there", amount, desc, inv.hosted_invoice_url ?? null);
              await sendEmail({ to: userProfile.email, ...email });

              await sb.from("invoices").update({
                metadata: { ...(existingInv?.metadata as any ?? {}), email_sent: true },
              }).eq("stripe_invoice_id", inv.id);
            }
          }
        }

        // Domain renewal handling
        if (event.type === "invoice.paid" && inv.subscription) {
          const subStripeId2 = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
          try {
            const stripeSub = await stripe.subscriptions.retrieve(subStripeId2);
            if (stripeSub.metadata?.type === "domain_renewal" && stripeSub.metadata?.domain_name) {
              const domainToRenew = stripeSub.metadata.domain_name;
              console.log("Domain renewal invoice paid:", domainToRenew);

              const { data: domainRecord } = await sb.from("domains")
                .select("id, status, expires_at")
                .eq("domain_name", domainToRenew)
                .eq("user_id", cust.id)
                .maybeSingle();

              if (!domainRecord) {
                console.log("Domain no longer exists, cancelling renewal:", domainToRenew);
                await stripe.subscriptions.cancel(stripeSub.id);
              } else {
                const currentExpiry = domainRecord.expires_at ? new Date(domainRecord.expires_at).getTime() : Date.now();
                const newExpiry = new Date(Math.max(currentExpiry, Date.now()) + 365.25 * 86400000).toISOString();

                await sb.from("domains").update({
                  expires_at: newExpiry,
                  metadata: { last_renewal: new Date().toISOString(), renewal_invoice: inv.id },
                }).eq("id", domainRecord.id);
                console.log("Domain expiry updated:", domainToRenew);
              }
            }
          } catch (renewErr) {
            console.error("Domain renewal processing error (non-fatal):", renewErr);
          }
        }

        // ── Credit deposit on base plan renewal ──
        if (event.type === "invoice.paid" && inv.subscription) {
          const subStripeIdCredit = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
          try {
            const stripeSub = await stripe.subscriptions.retrieve(subStripeIdCredit);
            // Check if this is a base plan (hosting_plan type, not domain_renewal)
            if (stripeSub.metadata?.type !== "domain_renewal") {
              const priceId = stripeSub.items?.data?.[0]?.price?.id ?? "";
              const { data: planProduct } = await sb.from("products")
                .select("type, slug")
                .or(`stripe_price_id.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
                .maybeSingle();

              if (planProduct?.type === "hosting_plan") {
                // Credits stored directly on users table — no separate row needed

                // Expire old subscription credits and deposit new ones
                await sb.rpc("fn_expire_subscription_credits", { p_user_id: cust.id });

                const periodEnd = stripeSub.current_period_end
                  ? new Date(stripeSub.current_period_end * 1000).toISOString()
                  : null;

                await sb.rpc("fn_deposit_credits", {
                  p_user_id: cust.id,
                  p_amount: 50,
                  p_type: "deposit_subscription",
                  p_pool: "subscription",
                  p_description: "Monthly subscription deposit: 50 credits",
                  p_service_type: "subscription",
                  p_reference_id: null,
                  p_expires_at: periodEnd,
                });
                console.log("Subscription credits deposited: 50 for user:", cust.id);
              }
            }
          } catch (credErr) {
            console.error("Credit deposit on renewal error (non-fatal):", credErr);
          }
        }

        // Fallback: create site if invoice.paid and no site exists yet
        if (event.type === "invoice.paid" && inv.subscription) {
          const subStripeId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
          const { data: dbSub } = await sb.from("subscriptions").select("id,product_id").eq("stripe_subscription_id", subStripeId).maybeSingle();
          if (dbSub) {
            const { data: existing } = await sb.from("sites").select("id").eq("subscription_id", dbSub.id).maybeSingle();
            if (!existing) {
              const { data: profile } = await sb.from("users").select("full_name").eq("id", cust.id).maybeSingle();
              const name = profile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";
              const planSlug = dbSub.product_id ? (await sb.from("products").select("slug").eq("id", dbSub.product_id).maybeSingle())?.data?.slug : "minimum";
              await sb.from("sites").insert({
                user_id: cust.id, subscription_id: dbSub.id, product_id: dbSub.product_id,
                label: `${name}-site`, status: "provisioning",
                server_region: "dca",
                config: { php_workers: 2, storage_gb: 25, php_memory_mb: 512 },
                bursting_enabled: false,
                max_php_workers: 2,
                max_ssd_gb: 25,
                metadata: { auto_provisioned: true, plan_slug: planSlug ?? "minimum", via: "invoice.paid" },
              });
              console.log("Site created via invoice.paid fallback");
            }
          }
        }
      }
    }

    else if (event.type === "customer.created") {
      const c = event.data.object;
      const userId = c.metadata?.supabase_user_id;
      if (userId) {
        await sb.from("users").update({ stripe_customer_id: c.id }).eq("id", userId);
        console.log("User stripe_customer_id updated:", c.id);
      }
    }

  } catch (e) {
    console.error("Webhook error:", e);
    return error("Processing failed", 500);
  }

  return json({ received: true });
});
