import { supabaseAdmin, getStripe, getCryptoProvider, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SECRET_KEY, json, error, log } from "../_shared/deps.ts";
import { sendEmail, welcomeEmail, invoicePaidEmail, paymentFailedEmail, sitesPausedEmail } from "../_shared/email.ts";
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

      // ── Multi-item subscription: match ALL items to plans ──
      const items = sub.items?.data ?? [];
      const firstItem = items[0];
      const firstPriceId = firstItem?.price?.id ?? "";

      // Match the first item's price to a plan (for backward compat and subscription-level product_id)
      let primaryPlan: any = null;
      if (firstPriceId) {
        const { data: p } = await sb.from("products").select("id,slug,type,metadata")
          .or(`stripe_price_id.eq.${firstPriceId},stripe_price_id_yearly.eq.${firstPriceId},stripe_price_id_cad.eq.${firstPriceId},stripe_price_id_yearly_cad.eq.${firstPriceId}`)
          .maybeSingle();
        primaryPlan = p;
      }

      // Determine billing period from first item
      const interval = firstItem?.price?.recurring?.interval;
      let billingPeriod = "monthly";
      if (interval === "year") billingPeriod = "yearly";

      // Upsert subscription
      const { data: existingSub } = await sb.from("subscriptions").select("metadata").eq("stripe_subscription_id", sub.id).maybeSingle();
      const existingMeta = (existingSub?.metadata as any) ?? {};

      const { data: dbSub } = await sb.from("subscriptions").upsert({
        user_id: cust.id,
        product_id: primaryPlan?.id ?? null,
        stripe_subscription_id: sub.id,
        status: sub.status,
        billing_period: billingPeriod,
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
        current_period_end: (sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null)
          ?? (sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null),
        metadata: {
          ...existingMeta,
          stripe_price_id: firstPriceId,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          item_count: items.length,
        },
      }, { onConflict: "stripe_subscription_id" }).select("id").single();

      console.log("Subscription upserted:", dbSub?.id, "status:", sub.status, "items:", items.length);

      // ── Promote user to active whenever ANY of their subscriptions is
      //    active. Belt-and-braces safety net for the invoice.paid handler
      //    below — catches cases like a trialing sub with no invoice yet,
      //    admin-created subs, or webhook delivery ordering issues.
      //    Idempotent — if already active, this short-circuits.
      const subActive = sub.status === "active" || sub.status === "trialing";
      if (subActive && dbSub) {
        const { data: profileForActive } = await sb.from("users")
          .select("metadata").eq("id", cust.id).maybeSingle();
        const pmeta = (profileForActive?.metadata as any) ?? {};
        if (pmeta.signup_status && pmeta.signup_status !== "active") {
          await sb.from("users").update({
            metadata: {
              ...pmeta,
              signup_status: "active",
              payment_confirmed_at: pmeta.payment_confirmed_at ?? new Date().toISOString(),
            },
          }).eq("id", cust.id);
          try {
            const adminClient: any = (sb as any).auth?.admin;
            if (adminClient?.updateUserById) {
              await adminClient.updateUserById(cust.id, { email_confirm: true });
            }
          } catch (e) {
            console.error("auth email_confirm flip failed (non-fatal):", e);
          }
        }
      }

      // ── Sync line items to sites ──
      // For each Stripe item, check if a site exists with that item ID.
      // If an item was upgraded (price changed), update the site's product_id.
      for (const item of items) {
        const itemPriceId = item.price?.id ?? "";
        const siteId = item.metadata?.envosta_site_id;

        if (!itemPriceId) continue;

        // Match this item's price to a plan
        let itemPlan: any = null;
        if (itemPriceId) {
          const { data: p } = await sb.from("products").select("id,slug,type")
            .or(`stripe_price_id.eq.${itemPriceId},stripe_price_id_yearly.eq.${itemPriceId},stripe_price_id_cad.eq.${itemPriceId}`)
            .maybeSingle();
          itemPlan = p;
        }

        // Find existing site by stripe_subscription_item_id
        const { data: existingSite } = await sb.from("sites")
          .select("id, product_id")
          .eq("stripe_subscription_item_id", item.id)
          .maybeSingle();

        if (existingSite) {
          // Site exists — update product_id if price changed (upgrade/downgrade)
          if (itemPlan && existingSite.product_id !== itemPlan.id) {
            await sb.from("sites").update({ product_id: itemPlan.id }).eq("id", existingSite.id);
            console.log("Site plan updated:", existingSite.id, "→", itemPlan.slug);
          }
        } else if (siteId) {
          // Item has a site_id in metadata but site doesn't have the item ID — link them
          await sb.from("sites").update({
            stripe_subscription_item_id: item.id,
            product_id: itemPlan?.id ?? null,
          }).eq("id", siteId);
          console.log("Site linked to item:", siteId, "→", item.id);
        }
      }

      // ── Auto-create site for FIRST signup (subscription.created with hosting plan) ──
      const isDomainRenewal = sub.metadata?.type === "domain_renewal";
      const isDomainPurchase = sub.metadata?.is_domain_purchase === "true";
      const isDomainTld = primaryPlan?.type === "domain_tld";
      const hasPaymentMethod = !!sub.default_payment_method;
      const shouldProvision = (sub.status === "active" || (sub.status === "trialing" && hasPaymentMethod));

      // Set the subscription's payment method as the customer's default
      if (hasPaymentMethod && custStripeId) {
        try {
          const pmId = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method?.id;
          if (pmId) {
            await stripe.customers.update(custStripeId, {
              invoice_settings: { default_payment_method: pmId },
            });
          }
        } catch (pmErr) {
          console.error("Failed to set default PM (non-fatal):", pmErr);
        }
      }

      // Run the resolve-site + provision block on BOTH created and updated.
      // The downstream guards (envosta_site_id pre-link, subscription_id
      // existing-site lookup, and the !svc.wp_cloud_site_id idempotency
      // check) make repeat invocations safe — admin-pre-created subs that
      // flip incomplete -> trialing via subscription.updated will hit the
      // pre-link path, attach to the existing site, and skip provisioning
      // since wp_cloud_site_id is already set.
      if (shouldProvision && dbSub && primaryPlan?.type === "hosting_plan" && !isDomainRenewal && !isDomainPurchase && !isDomainTld) {
        const { data: profile } = await sb.from("users").select("full_name").eq("id", cust.id).maybeSingle();
        const name = profile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";
        const domainFromMeta = sub.metadata?.domain_name ?? null;
        const planMeta = primaryPlan?.metadata as any ?? {};

        // svc holds the site we should provision/operate on. May come from
        // (1) pre-linked admin-created site via metadata.envosta_site_id,
        // (2) site already linked to this subscription, or
        // (3) a brand-new INSERT (first-payment signup, the original path).
        let svc: { id: string; wp_cloud_site_id: string | null; label?: string | null } | null = null;
        let wasNewlyInserted = false;

        // ─── Pre-linked site path ──────────────────────────────────
        const preLinkedSiteId = sub.metadata?.envosta_site_id;
        if (preLinkedSiteId) {
          const { data: pre } = await sb.from("sites")
            .select("id, wp_cloud_site_id, label, user_id")
            .eq("id", preLinkedSiteId)
            .maybeSingle();
          if (pre && pre.user_id === cust.id) {
            await sb.from("sites").update({
              subscription_id: dbSub.id,
              stripe_subscription_item_id: firstItem?.id ?? null,
              product_id: primaryPlan?.id ?? null,
            }).eq("id", pre.id);
            svc = { id: pre.id, wp_cloud_site_id: pre.wp_cloud_site_id, label: pre.label };
            console.log("Pre-linked admin-created site attached:", pre.id);
          } else {
            console.warn("envosta_site_id stamped but site not found or wrong user:", preLinkedSiteId);
          }
        }

        // ─── Existing site by subscription_id ──────────────────────
        if (!svc) {
          const { data: existing } = await sb.from("sites")
            .select("id, wp_cloud_site_id, label")
            .eq("subscription_id", dbSub.id)
            .limit(1);
          if (existing?.length) {
            svc = existing[0] as any;
            console.log("Site already linked to this subscription:", svc!.id);
          }
        }

        // ─── Insert new site (original signup path) ────────────────
        if (!svc) {
          const { data: inserted, error: svcErr } = await sb.from("sites").insert({
            user_id: cust.id,
            subscription_id: dbSub.id,
            product_id: primaryPlan?.id ?? null,
            stripe_subscription_item_id: firstItem?.id ?? null,
            label: `${name}-site`,
            status: "provisioning",
            server_region: "dca",
            domain_name: domainFromMeta,
            config: {
              php_workers: planMeta.php_workers_default ?? 2,
              storage_gb: planMeta.storage_gb ?? 25,
              php_memory_mb: planMeta.php_memory_mb ?? 512,
            },
            metadata: {
              auto_provisioned: true,
              plan_slug: primaryPlan?.slug ?? "minimum",
              onboarding_type: planMeta.onboarding_type ?? "standard",
            },
          }).select("id, wp_cloud_site_id, label").single();
          console.log("Site created:", inserted?.id, "err:", svcErr?.message);
          if (inserted && !svcErr) {
            svc = inserted as any;
            wasNewlyInserted = true;
          }
        }

        if (svc) {
          // Update the Stripe item with our site ID for future reconciliation
          if (firstItem?.id) {
            try {
              await stripe.subscriptionItems.update(firstItem.id, {
                metadata: { envosta_site_id: svc.id },
              });
            } catch { /* non-fatal */ }
          }

          // Send welcome email — only on brand-new insert. For admin-pre-created
          // sites, admin already sent a claim email.
          if (wasNewlyInserted) {
            const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", cust.id).maybeSingle();
            if (userProfile?.email) {
              const planName = primaryPlan?.slug ? primaryPlan.slug.charAt(0).toUpperCase() + primaryPlan.slug.slice(1) : "Hosting";
              const email = welcomeEmail(userProfile.full_name ?? "there", planName, "https://my.envosta.com/dashboard");
              await sendEmail({ to: userProfile.email, ...email });
            }
          }

          // Auto-register domain at OpenSRS — only on brand-new insert
          if (wasNewlyInserted && domainFromMeta) {
            const { data: existingDomain } = await sb.from("domains")
              .select("id, status").eq("domain_name", domainFromMeta).eq("user_id", cust.id).maybeSingle();

            if (!existingDomain) {
              try {
                console.log("Auto-registering domain:", domainFromMeta);
                const regRes = await fetch(`${SUPABASE_URL}/functions/v1/register-domain`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`,
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

                  // Create yearly domain renewal subscription (separate from hosting)
                  try {
                    const tld = domainFromMeta.split(".").pop()?.toLowerCase() ?? "";
                    const { data: tldProduct } = await sb.from("products")
                      .select("stripe_price_id, price_cad")
                      .eq("type", "domain_tld")
                      .eq("slug", `tld-${tld}`).maybeSingle();

                    if (tldProduct?.stripe_price_id) {
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

          // ─── Idempotent wp.cloud provisioning ─────────────────────
          // Only fire provision-hosting when the site doesn't yet have a
          // wp.cloud install. Admin-pre-created sites already provisioned
          // at admin-create time, so this is a no-op for them.
          if (!svc.wp_cloud_site_id) {
            try {
              console.log("Auto-provisioning site:", svc.id);
              const provRes = await fetch(`${SUPABASE_URL}/functions/v1/provision-hosting`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`,
                },
                body: JSON.stringify({
                  serviceId: svc.id,
                  label: svc.label ?? `${name}-site`,
                  region: "dca",
                  phpVersion: "8.4",
                  planId: primaryPlan?.id ?? null,
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
          } else {
            console.log("Site already provisioned on wp.cloud, skipping:", svc.id, svc.wp_cloud_site_id);
          }
        } else {
          console.log("No site resolved for subscription (insert failed?):", dbSub.id);
        }
      }

      // ── Subscription paused / resumed → cascade to attached sites ──
      // Policy: subscriptions are NEVER fully deleted, only paused. When a
      // sub pauses (status='paused' OR pause_collection set), every attached
      // site is flagged for deletion at current_period_end. When the sub
      // resumes, the flag is cleared.
      if (event.type === "customer.subscription.updated" && dbSub) {
        const isPaused = sub.status === "paused"
          || (sub.pause_collection && sub.pause_collection.behavior);
        const periodEndIso = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        if (isPaused) {
          const { data: sitesToFlag } = await sb.from("sites")
            .select("id, label, status, metadata, user_id")
            .eq("subscription_id", dbSub.id)
            .in("status", ["active", "provisioning", "paused"]);

          let flagged = 0;
          let ownerEmail: { email: string; full_name: string | null } | null = null;
          for (const site of sitesToFlag ?? []) {
            const meta = (site.metadata as any) ?? {};
            // Don't reset deadline if already flagged (idempotent on repeated webhooks).
            if (site.status === "cancelled" && meta.recovery_deadline) continue;

            await sb.from("sites").update({
              status: "cancelled",
              paused_at: new Date().toISOString(),
              flag_reason: "subscription_paused",
              metadata: {
                ...meta,
                recovery_deadline: periodEndIso,
                cancelled_at: new Date().toISOString(),
              },
            }).eq("id", site.id);

            await log({ serviceId: site.id, action: "site.flagged_for_deletion",
              message: `${site.label} flagged for deletion at ${periodEndIso} (subscription paused)` });
            flagged++;

            if (!ownerEmail && site.user_id) {
              const { data: u } = await sb.from("users").select("email, full_name").eq("id", site.user_id).maybeSingle();
              if (u) ownerEmail = u as any;
            }
          }

          if (flagged > 0 && ownerEmail?.email) {
            try {
              const email = sitesPausedEmail(ownerEmail.full_name ?? "there", flagged);
              await sendEmail({ to: ownerEmail.email, ...email });
            } catch (e) { console.error("pause email failed (non-fatal):", e); }
          }
          console.log(`Subscription paused: ${sub.id}, flagged ${flagged} site(s) for deletion at ${periodEndIso}`);
        } else if (sub.status === "active" && !sub.pause_collection) {
          // Sub resumed — restore any sites we flagged with reason='subscription_paused'.
          const { data: flagged } = await sb.from("sites")
            .select("id, label, metadata")
            .eq("subscription_id", dbSub.id)
            .eq("status", "cancelled")
            .eq("flag_reason", "subscription_paused");

          for (const site of flagged ?? []) {
            const meta = (site.metadata as any) ?? {};
            const { recovery_deadline, cancelled_at, ...keptMeta } = meta;
            await sb.from("sites").update({
              status: "active",
              paused_at: null,
              flag_reason: null,
              metadata: { ...keptMeta, restored_at: new Date().toISOString() },
            }).eq("id", site.id);
            await log({ serviceId: site.id, action: "site.restored", message: `${site.label} restored after subscription resumed` });
          }
          if ((flagged ?? []).length > 0) {
            console.log(`Subscription resumed: ${sub.id}, restored ${flagged?.length} site(s)`);
          }
        }
      }

      // Handle standalone domain purchases (no site creation)
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
                  "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`,
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
    }

    else if (event.type === "payment_intent.succeeded") {
      console.log("Payment intent succeeded:", event.data.object.id);
    }

    else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;

      // 1. Mark subscription as cancelled in our DB.
      const { data: existSubDel } = await sb.from("subscriptions").select("id, metadata").eq("stripe_subscription_id", sub.id).maybeSingle();
      const { data: dbSub } = await sb.from("subscriptions").update({
        status: "cancelled",
        metadata: { ...((existSubDel?.metadata as any) ?? {}), cancelled_at: new Date().toISOString() },
      }).eq("stripe_subscription_id", sub.id).select("id").maybeSingle();
      console.log("Subscription cancelled:", sub.id);

      // 2. Sites stay 'paused' (NOT 'cancelled') so the admin can review before purge.
      //    Stripe drives the timing — by the time this fires, dunning has already failed,
      //    or the customer cancelled from the portal. Either way, sites get paused
      //    (still live on wp.cloud) and a notification email is sent.
      let pausedSiteCount = 0;
      let ownerEmail: { id: string; email: string; full_name: string | null } | null = null;
      if (dbSub) {
        const { data: sites } = await sb.from("sites")
          .select("id, label, status, user_id")
          .eq("subscription_id", dbSub.id)
          .in("status", ["active", "provisioning"]);

        for (const site of sites ?? []) {
          await sb.from("sites").update({
            status: "paused",
            paused_at: new Date().toISOString(),
            flag_reason: "subscription_cancelled_via_stripe",
          }).eq("id", site.id);

          await log({ serviceId: site.id, action: "site.paused_via_stripe", message: `${site.label} paused after subscription cancelled in Stripe portal` });
          pausedSiteCount++;
          if (!ownerEmail && site.user_id) {
            const { data: u } = await sb.from("users").select("id, email, full_name").eq("id", site.user_id).maybeSingle();
            if (u) ownerEmail = u as any;
          }
        }
      }

      if (pausedSiteCount > 0 && ownerEmail?.email) {
        const email = sitesPausedEmail(ownerEmail.full_name ?? "there", pausedSiteCount);
        await sendEmail({ to: ownerEmail.email, ...email });
      }

      // 3. If domain renewal subscription, disable auto-renew at OpenSRS
      const domainMeta = sub.metadata;
      if (domainMeta?.type === "domain_renewal" && domainMeta?.domain_name) {
        await sb.from("domains").update({ auto_renew: false }).eq("domain_name", domainMeta.domain_name);
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
      }
    }

    else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed" || event.type === "invoice.created") {
      const inv = event.data.object;
      const custStripeId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      const { data: cust } = await sb.from("users").select("id, full_name, email").eq("stripe_customer_id", custStripeId).maybeSingle();
      if (cust) {
        // Resolve the underlying subscription so we can categorize the invoice
        // (domain renewal vs hosting) when rendering on the customer page.
        const stripeSubId = typeof inv.subscription === "string" ? inv.subscription : (inv.subscription as any)?.id ?? null;
        let subscriptionId: string | null = null;
        let productType: string | null = null;
        if (stripeSubId) {
          const { data: linkedSub } = await sb
            .from("subscriptions")
            .select("id, products(type)")
            .eq("stripe_subscription_id", stripeSubId)
            .maybeSingle();
          if (linkedSub) {
            subscriptionId = linkedSub.id;
            productType = (linkedSub.products as any)?.type ?? null;
          }
        }

        // Upsert invoice
        const invStatus = inv.status === "paid" ? "paid" : inv.status === "open" ? "open" : inv.status === "void" ? "void" : inv.status === "uncollectible" ? "uncollectible" : "draft";
        await sb.from("invoices").upsert({
          user_id: cust.id,
          subscription_id: subscriptionId,
          stripe_invoice_id: inv.id,
          status: invStatus,
          amount_cad: inv.amount_paid ?? inv.amount_due ?? 0,
          description: inv.description || `Invoice ${inv.number ?? ""}`,
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          metadata: {
            currency: inv.currency ?? "usd",
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            invoice_pdf: inv.invoice_pdf,
            stripe_subscription_id: stripeSubId,
            product_type: productType,
            period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
            period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
            paid_at: inv.status === "paid" ? new Date().toISOString() : null,
          },
        }, { onConflict: "stripe_invoice_id" });
        console.log("Invoice:", inv.id, invStatus, productType ? `(${productType})` : "");

        // Send invoice receipt email (idempotent)
        if (event.type === "invoice.paid" && inv.amount_paid > 0) {
          const { data: existingInv } = await sb.from("invoices").select("metadata").eq("stripe_invoice_id", inv.id).maybeSingle();
          const alreadySent = (existingInv?.metadata as any)?.email_sent;

          // Promote awaiting_payment signup to fully active on first paid
          // invoice. /api/create-subscription tags new signups with
          // metadata.signup_status: 'awaiting_payment' and email_confirm:
          // false; here we flip both once Stripe confirms the payment.
          const { data: pendingProfile } = await sb.from("users")
            .select("metadata").eq("id", cust.id).maybeSingle();
          const meta = (pendingProfile?.metadata as any) ?? {};
          if (meta.signup_status === "awaiting_payment" || meta.signup_status === "payment_failed") {
            await sb.from("users").update({
              metadata: {
                ...meta,
                signup_status: "active",
                payment_confirmed_at: new Date().toISOString(),
              },
            }).eq("id", cust.id);
            try {
              const adminClient: any = (sb as any).auth?.admin;
              if (adminClient?.updateUserById) {
                await adminClient.updateUserById(cust.id, { email_confirm: true });
              }
            } catch (e) {
              console.error("auth email_confirm flip failed (non-fatal):", e);
            }
          }

          if (!alreadySent) {
            const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", cust.id).maybeSingle();
            if (userProfile?.email) {
              const amount = `$${(inv.amount_paid / 100).toFixed(2)} USD`;
              const desc = inv.description ?? `Invoice ${inv.number ?? ""}`;
              const email = invoicePaidEmail(userProfile.full_name ?? "there", amount, desc, inv.hosted_invoice_url ?? null);
              await sendEmail({ to: userProfile.email, ...email });

              await sb.from("invoices").update({
                metadata: { ...(existingInv?.metadata as any ?? {}), email_sent: true },
              }).eq("stripe_invoice_id", inv.id);
            }
          }
        }

        // Payment failed during signup → flip awaiting_payment user to
        // signup_status: 'payment_failed' so it's distinguishable from a
        // fresh awaiting_payment row when the cleanup cron + re-engagement
        // emails decide what to do.
        if (event.type === "invoice.payment_failed") {
          const { data: failingProfile } = await sb.from("users")
            .select("metadata").eq("id", cust.id).maybeSingle();
          const fmeta = (failingProfile?.metadata as any) ?? {};
          if (fmeta.signup_status === "awaiting_payment") {
            await sb.from("users").update({
              metadata: { ...fmeta, signup_status: "payment_failed", last_payment_failure_at: new Date().toISOString() },
            }).eq("id", cust.id);
          }
        }

        // Payment failed → notify customer (idempotent — once per invoice)
        if (event.type === "invoice.payment_failed" && inv.amount_due > 0) {
          const { data: existingInv } = await sb.from("invoices").select("metadata").eq("stripe_invoice_id", inv.id).maybeSingle();
          const alreadySent = (existingInv?.metadata as any)?.failure_email_sent;

          if (!alreadySent) {
            const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", cust.id).maybeSingle();
            if (userProfile?.email) {
              const amount = `$${(inv.amount_due / 100).toFixed(2)} ${(inv.currency ?? "USD").toUpperCase()}`;
              const email = paymentFailedEmail(userProfile.full_name ?? "there", amount);
              await sendEmail({ to: userProfile.email, ...email });
              await sb.from("invoices").update({
                metadata: { ...(existingInv?.metadata as any ?? {}), failure_email_sent: true },
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

        // On invoice.paid — clear payment status and reset grace period
        if (event.type === "invoice.paid" && inv.subscription) {
          await sb.from("users").update({
            payment_status: "current",
            payment_failed_at: null,
            suspended_at: null,
            pre_suspension_state: null,
          }).eq("id", cust.id);
        }

        // Fallback: create site if invoice.paid and no site exists yet
        if (event.type === "invoice.paid" && inv.subscription) {
          const subStripeId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription.id;
          const { data: dbSub } = await sb.from("subscriptions").select("id,product_id").eq("stripe_subscription_id", subStripeId).maybeSingle();
          if (dbSub) {
            const { data: existingSites } = await sb.from("sites").select("id").eq("subscription_id", dbSub.id).limit(1);
            if (!existingSites?.length && dbSub.product_id) {
              const { data: planCheck } = await sb.from("products").select("type,slug,metadata").eq("id", dbSub.product_id).maybeSingle();
              if (planCheck?.type === "hosting_plan") {
                const { data: profile } = await sb.from("users").select("full_name").eq("id", cust.id).maybeSingle();
                const name = profile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) ?? "my-site";
                const planMeta = planCheck.metadata as any ?? {};

                // Get the Stripe subscription to find the first item
                try {
                  const stripeSub = await stripe.subscriptions.retrieve(subStripeId);
                  const firstItemId = stripeSub.items?.data?.[0]?.id ?? null;

                  await sb.from("sites").insert({
                    user_id: cust.id, subscription_id: dbSub.id, product_id: dbSub.product_id,
                    stripe_subscription_item_id: firstItemId,
                    label: `${name}-site`, status: "provisioning",
                    server_region: "dca",
                    config: {
                      php_workers: planMeta.php_workers_default ?? 2,
                      storage_gb: planMeta.storage_gb ?? 25,
                      php_memory_mb: planMeta.php_memory_mb ?? 512,
                    },
                    metadata: { auto_provisioned: true, plan_slug: planCheck.slug ?? "minimum", via: "invoice.paid" },
                  });
                  console.log("Site created via invoice.paid fallback");
                } catch (e) {
                  console.error("Fallback site creation error:", e);
                }
              }
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
