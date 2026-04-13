import { supabaseAdmin, getStripe, wpcloudGet, WPCLOUD_CLIENT, cors, json, error, log } from "../_shared/deps.ts";
import { sendEmail, domainExpiryWarningEmail } from "../_shared/email.ts";
import { setDnsZone, buildWpCloudDnsRecords } from "../_shared/opensrs.ts";

/**
 * Daily health check — run via cron or manual trigger.
 *
 * Checks:
 * 1. wp.cloud site IPs — if changed, updates DNS at OpenSRS
 * 2. Domain expiry dates — flags domains expiring within 30 days
 * 3. Site status — flags any non-active provisioned sites
 *
 * Trigger via: POST /functions/v1/health-check (admin only or cron)
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sb = supabaseAdmin();
  const results: string[] = [];
  const issues: string[] = [];

  try {
    // ═══ 1. CHECK SITE IPs ═══
    // Only check sites that have a domain connected (temp domains don't need IP tracking)
    const { data: sitesWithDomains } = await sb.from("sites")
      .select("id, label, wp_cloud_site_id, wp_cloud_url, metadata, user_id, domains!inner(id, domain_name, registrar)")
      .eq("status", "active")
      .not("wp_cloud_site_id", "is", null);

    // Fallback: if inner join fails, get all active sites
    const activeSites = sitesWithDomains ?? (await sb.from("sites")
      .select("id, label, wp_cloud_site_id, wp_cloud_url, metadata, user_id")
      .eq("status", "active")
      .not("wp_cloud_site_id", "is", null)).data ?? [];

    for (const site of activeSites) {
      if (!site.wp_cloud_site_id) continue;

      try {
        const storedIp = (site.metadata as any)?.site_ip ?? null;
        const siteRef = site.wp_cloud_url?.replace("https://", "") ?? site.wp_cloud_site_id;

        const ipsResult = await wpcloudGet(`/api/v1.0/get-ips/${WPCLOUD_CLIENT}/${siteRef}`);
        const currentIp = ipsResult.data?.ip_address ?? ipsResult.data?.ipv4?.[0] ?? null;

        if (!currentIp) {
          issues.push(`${site.label}: Could not fetch IP from wp.cloud`);
          continue;
        }

        // Skip if IP hasn't changed
        if (storedIp === currentIp) {
          results.push(`${site.label}: IP ${currentIp} OK`);
          continue;
        }

        if (storedIp && currentIp !== storedIp) {
          // IP changed — update metadata
          await sb.from("sites").update({
            metadata: { ...(site.metadata as any), site_ip: currentIp, ip_updated_at: new Date().toISOString() },
          }).eq("id", site.id);

          // Find connected OpenSRS domain and update DNS (skip if client manages custom DNS)
          const { data: domain } = await sb.from("domains")
            .select("id, domain_name, registrar, metadata")
            .eq("site_id", site.id)
            .eq("registrar", "opensrs")
            .maybeSingle();

          if (domain && (domain.metadata as any)?.dns_mode === "custom") {
            issues.push(`${site.label}: IP changed ${storedIp} → ${currentIp}, skipping DNS update for ${domain.domain_name} (custom DNS mode)`);
            await log({ serviceId: site.id, action: "health.ip_changed", message: `${storedIp} → ${currentIp}, custom DNS — skipped` });
          } else if (domain) {
            // Update DNS records with new IP at OpenSRS
            const dnsRecords = buildWpCloudDnsRecords(currentIp);
            const dnsResult = await setDnsZone(domain.domain_name, dnsRecords);

            if (dnsResult.isSuccess) {
              await sb.from("domains").update({
                dns_records: dnsRecords,
                metadata: { dns_setup: "complete", site_ip: currentIp, dns_updated_at: new Date().toISOString() },
              }).eq("id", domain.id);

              issues.push(`${site.label}: IP changed ${storedIp} → ${currentIp}, DNS updated for ${domain.domain_name}`);
              await log({ serviceId: site.id, action: "health.ip_changed", message: `${storedIp} → ${currentIp}, DNS updated for ${domain.domain_name}` });
            } else {
              issues.push(`${site.label}: IP changed ${storedIp} → ${currentIp}, DNS UPDATE FAILED for ${domain.domain_name}: ${dnsResult.responseText}`);
              await log({ serviceId: site.id, level: "error", action: "health.dns_update_failed", message: `${domain.domain_name}: ${dnsResult.responseText}` });
            }
          } else {
            issues.push(`${site.label}: IP changed ${storedIp} → ${currentIp}, no OpenSRS domain to update`);
            await log({ serviceId: site.id, action: "health.ip_changed", message: `${storedIp} → ${currentIp}` });
          }
        }

        results.push(`${site.label}: IP ${currentIp} OK`);
      } catch (e) {
        issues.push(`${site.label}: Error checking IP — ${e}`);
      }
    }

    // ═══ 2. CHECK DOMAIN EXPIRY ═══
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString();
    const { data: expiringDomains } = await sb.from("domains")
      .select("id, domain_name, expiry_date, auto_renew, user_id")
      .eq("status", "registered")
      .lt("expiry_date", thirtyDaysFromNow)
      .order("expiry_date", { ascending: true });

    for (const domain of expiringDomains ?? []) {
      const daysLeft = Math.ceil((new Date(domain.expiry_date).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 0) {
        issues.push(`EXPIRED: ${domain.domain_name} expired ${Math.abs(daysLeft)} days ago${domain.auto_renew ? ' (auto-renew on)' : ' (auto-renew OFF)'}`);
      } else {
        issues.push(`EXPIRING: ${domain.domain_name} expires in ${daysLeft} days${domain.auto_renew ? '' : ' (auto-renew OFF!)'}`);

        // Send warning email at 30, 14, 7, and 1 day(s) before expiry
        if ([30, 14, 7, 1].includes(daysLeft)) {
          try {
            const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", domain.user_id).maybeSingle();
            if (userProfile?.email) {
              const email = domainExpiryWarningEmail(userProfile.full_name ?? "there", domain.domain_name, daysLeft, domain.auto_renew ?? false);
              await sendEmail({ to: userProfile.email, ...email });
            }
          } catch { /* non-fatal */ }
        }
      }
    }

    results.push(`Checked ${expiringDomains?.length ?? 0} domains expiring within 30 days`);

    // ═══ 3. CHECK STUCK SERVICES ═══
    const { data: stuckServices } = await sb.from("sites")
      .select("id, label, status, created_at")
      .eq("status", "provisioning")
      .lt("created_at", new Date(Date.now() - 3600000).toISOString()); // Stuck for > 1 hour

    for (const svc of stuckServices ?? []) {
      const hoursStuck = Math.round((Date.now() - new Date(svc.created_at).getTime()) / 3600000);
      issues.push(`STUCK: ${svc.label} has been "provisioning" for ${hoursStuck} hours`);
    }

    results.push(`Checked ${stuckServices?.length ?? 0} stuck services`);

    // ═══ 4. STRIPE RECONCILIATION — catch missed webhooks ═══
    try {
      const stripe = getStripe();
      let invoicesSynced = 0;
      let subsSynced = 0;
      let pmSynced = 0;

      // Get all customers with stripe_customer_id
      const { data: customers } = await sb.from("users")
        .select("id, stripe_customer_id")
        .not("stripe_customer_id", "is", null);

      for (const cust of customers ?? []) {
        if (!cust.stripe_customer_id) continue;

        try {
          // --- Sync recent invoices (last 48h) ---
          const recentInvoices = await stripe.invoices.list({
            customer: cust.stripe_customer_id,
            created: { gte: Math.floor((Date.now() - 48 * 3600000) / 1000) },
            limit: 20,
          });

          for (const inv of recentInvoices.data) {
            const { data: existing } = await sb.from("invoices")
              .select("id")
              .eq("stripe_invoice_id", inv.id)
              .maybeSingle();

            if (!existing) {
              await sb.from("invoices").upsert({
                user_id: cust.id,
                stripe_invoice_id: inv.id,
                status: inv.status === "paid" ? "paid" : inv.status === "open" ? "open" : inv.status === "void" ? "void" : "draft",
                amount_cad: inv.amount_paid ?? inv.amount_due ?? 0,
                description: inv.description ?? `Invoice ${inv.number ?? ""}`,
                hosted_invoice_url: inv.hosted_invoice_url ?? null,
                metadata: {
                  synced_by: "health_check",
                  currency: inv.currency ?? "cad",
                  amount_due: inv.amount_due,
                  amount_paid: inv.amount_paid,
                },
              }, { onConflict: "stripe_invoice_id" });
              invoicesSynced++;
            }
          }

          // --- Sync active subscriptions ---
          const stripeSubs = await stripe.subscriptions.list({
            customer: cust.stripe_customer_id,
            status: "all",
            limit: 10,
          });

          for (const sub of stripeSubs.data) {
            const { data: existing } = await sb.from("subscriptions")
              .select("id, status")
              .eq("stripe_subscription_id", sub.id)
              .maybeSingle();

            if (!existing) {
              // Missing subscription — create it
              const priceId = sub.items?.data?.[0]?.price?.id ?? "";
              let plan: any = null;
              if (priceId) {
                const { data: p } = await sb.from("products").select("id")
                  .or(`stripe_price_id.eq.${priceId},stripe_price_id_yearly.eq.${priceId},stripe_price_id_2yr.eq.${priceId},stripe_price_id_3yr.eq.${priceId}`)
                  .maybeSingle();
                plan = p;
              }

              await sb.from("subscriptions").upsert({
                user_id: cust.id,
                product_id: plan?.id ?? null,
                stripe_subscription_id: sub.id,
                status: sub.status,
                current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
                current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
                metadata: { synced_by: "health_check", stripe_price_id: priceId },
              }, { onConflict: "stripe_subscription_id" });
              subsSynced++;
            } else if (existing.status !== sub.status) {
              // Status drift — update
              await sb.from("subscriptions").update({
                status: sub.status,
                current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
                current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
              }).eq("id", existing.id);
              subsSynced++;
            }
          }

          // --- Sync payment method ---
          try {
            const pms = await stripe.paymentMethods.list({
              customer: cust.stripe_customer_id,
              type: "card",
              limit: 1,
            });
            const card = pms.data[0]?.card;
            if (card) {
              const { data: userRecord } = await sb.from("users").select("metadata").eq("id", cust.id).single();
              const existingMeta = (userRecord?.metadata as any) ?? {};
              const storedLast4 = existingMeta.card_last4;
              if (storedLast4 !== card.last4) {
                await sb.from("users").update({
                  metadata: {
                    ...existingMeta,
                    card_brand: card.brand,
                    card_last4: card.last4,
                    card_expiry: `${String(card.exp_month).padStart(2, "0")}/${card.exp_year}`,
                  },
                }).eq("id", cust.id);
                pmSynced++;
              }
            }
          } catch { /* non-fatal */ }
        } catch (custErr) {
          issues.push(`Stripe sync error for ${cust.stripe_customer_id}: ${custErr}`);
        }
      }

      results.push(`Stripe sync: ${invoicesSynced} invoices, ${subsSynced} subscriptions, ${pmSynced} payment methods reconciled`);
      if (invoicesSynced > 0 || subsSynced > 0) {
        await log({ action: "health.stripe_sync", message: `Reconciled ${invoicesSynced} invoices, ${subsSynced} subs, ${pmSynced} PMs` });
      }
    } catch (stripeErr) {
      issues.push(`Stripe reconciliation failed: ${stripeErr}`);
    }

    // ═══ LOG SUMMARY ═══
    await log({
      action: "health.check.complete",
      message: `Sites: ${activeSites?.length ?? 0}, Issues: ${issues.length}`,
      res: { results, issues },
    });

    return json({
      status: issues.length === 0 ? "healthy" : "issues_found",
      sites_checked: activeSites?.length ?? 0,
      issues_count: issues.length,
      results,
      issues,
      checked_at: new Date().toISOString(),
    });

  } catch (e) {
    console.error("Health check error:", e);
    return error(String(e), 500);
  }
});
