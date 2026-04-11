import { supabaseAdmin, supabaseForUser, SUPABASE_SERVICE_ROLE_KEY, wpcloudPost, wpcloudGet, WPCLOUD_CLIENT, WPCLOUD_PROXY_URL, WPCLOUD_API_KEY, WPCLOUD_PROXY_SECRET, cors, json, error, log } from "../_shared/deps.ts";

/**
 * Site management actions via wp.cloud Atomic API (routed through static IP proxy).
 *
 * API base: https://atomic-api.wordpress.com/api/v1.0
 * Auth: Auth: API_KEY header (handled by proxy)
 *
 * Actions: ssl-info, datacenters, delete-site, get-site, list-backups
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { action, siteId, domain, key, value } = await req.json();

    // All actions require auth (user JWT or service role key)
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace("Bearer ", "");
    const isServiceRole = bearerToken === SUPABASE_SERVICE_ROLE_KEY;

    // Domain verification requires auth (returns sensitive TXT records)
    if (action === "domain-verification") {
      if (!isServiceRole) {
        const userSb2 = supabaseForUser(req);
        const { data: { user: dvUser } } = await userSb2.auth.getUser();
        if (!dvUser) return error("Unauthorized", 401);
      }
      if (!domain) return error("domain is required");
      const result = await wpcloudGet(`/api/v1.0/get-domain-verification-code/${WPCLOUD_CLIENT}/${domain}`);
      console.log("Domain verification result:", result.status, JSON.stringify(result.data));
      return json(result.data);
    }

    let user: { id: string; email?: string } | null = null;
    if (isServiceRole) {
      // Service role = trusted admin API call
      user = { id: "service-role", email: "admin@envosta.com" };
    } else {
      // Decode the JWT payload directly instead of calling getUser()
      // The Supabase gateway already validated the JWT signature
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) return error("Unauthorized — no token", 401);
      try {
        const payloadB64 = token.split(".")[1];
        const payload = JSON.parse(atob(payloadB64));
        if (!payload.sub) return error("Unauthorized — invalid token", 401);
        // Check expiry
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          return error("Unauthorized — token expired", 401);
        }
        user = { id: payload.sub, email: payload.email ?? "" };
      } catch (e) {
        console.error("JWT decode error:", e);
        return error("Unauthorized — token decode failed", 401);
      }
    }

    switch (action) {
      // Get available datacenters
      case "datacenters": {
        const result = await wpcloudGet(`/api/v1.0/get-available-datacenters/${WPCLOUD_CLIENT}`);
        return json({
          raw: result.data,
          datacenters: [
            { code: "dca", label: "US East (Virginia)", available: true },
            { code: "bur", label: "US West (California)", available: true },
            { code: "dfw", label: "US Central (Texas)", available: true },
            { code: "ams", label: "EU West (Amsterdam)", available: true },
          ],
        });
      }

      // Get SSL certificate info for a domain
      case "ssl-info": {
        if (!domain) return error("domain is required");
        const result = await wpcloudPost(`/api/v1.0/ssl-info/${domain}`);
        if (!result.ok) return error("Failed to get SSL info", 502);
        return json(result.data);
      }

      // List all wp.cloud sites for this client (admin/service-role only)
      case "list-all-sites": {
        if (!isServiceRole) return error("Service role required", 403);
        const result = await wpcloudGet(`/api/v1.0/get-sites/${WPCLOUD_CLIENT}/+`);
        return json(result.data ?? []);
      }

      // Get site details from wp.cloud
      case "get-site": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites")
          .select("id, wp_cloud_site_id, user_id")
          .eq("id", siteId).single();
        if (!svc) return error("Site not found", 404);
        if (!isServiceRole && svc.user_id !== user!.id) {
          const { data: p } = await sb.from("users").select("role").eq("id", user!.id).single();
          if (p?.role !== "admin") return error("Site not found", 404);
        }
        if (!svc.wp_cloud_site_id) return error("Site has no wp.cloud ID", 400);

        const result = await wpcloudGet(`/api/v1.0/get-site/${svc.wp_cloud_site_id}/extra`);
        return json(result.data);
      }

      // List backups for a site
      case "list-backups": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites")
          .select("id, wp_cloud_site_id, user_id")
          .eq("id", siteId).single();
        if (!svc) return error("Site not found", 404);
        if (!isServiceRole && svc.user_id !== user!.id) {
          const { data: p } = await sb.from("users").select("role").eq("id", user!.id).single();
          if (p?.role !== "admin") return error("Site not found", 404);
        }
        if (!svc.wp_cloud_site_id) return error("Site has no wp.cloud ID", 400);

        const result = await wpcloudGet(`/api/v1.0/site-backups-list/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}`);
        return json(result.data);
      }

      // Customer soft-delete: cancel billing, hide from dashboard, keep site alive 30 days
      case "delete-site": {
        if (!siteId) return error("siteId is required");

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites")
          .select("id, wp_cloud_site_id, wp_cloud_url, user_id, subscription_id")
          .eq("id", siteId).single();

        if (!svc) return error("Site not found", 404);

        // Check admin or owner (service role = admin)
        const isAdmin = isServiceRole || (await (async () => {
          const { data: p } = await sb.from("users").select("role").eq("id", user!.id).single();
          return p?.role === "admin";
        })());
        if (!isAdmin && svc.user_id !== user!.id) return error("Forbidden", 403);

        // 1. Cancel the linked Stripe subscription (stops billing)
        if (svc.subscription_id) {
          const { data: sub } = await sb.from("subscriptions")
            .select("stripe_subscription_id, status")
            .eq("id", svc.subscription_id).single();

          if (sub?.stripe_subscription_id && sub.status !== "cancelled") {
            try {
              const stripe = (await import("../_shared/deps.ts")).getStripe();
              await stripe.subscriptions.cancel(sub.stripe_subscription_id);
              console.log("Stripe subscription cancelled:", sub.stripe_subscription_id);
            } catch (stripeErr) {
              console.error("Failed to cancel Stripe subscription:", stripeErr);
            }

            await sb.from("subscriptions").update({
              status: "cancelled",
              metadata: { cancelled_at: new Date().toISOString() },
            }).eq("id", svc.subscription_id);
          }
        }

        // 2. Soft-delete: mark as cancelled (hides from customer dashboard)
        // wp.cloud site stays alive for 30-day recovery window
        await sb.from("sites").update({
          status: "cancelled",
          metadata: {
            ...(svc as any).metadata,
            soft_deleted_at: new Date().toISOString(),
            soft_deleted_by: user.id,
            recovery_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }).eq("id", siteId);

        // 3. Cancel domain renewal subscriptions for domains linked to this site
        // Cancel domain renewal subscriptions using stored Stripe sub IDs
        const { data: linkedDomains } = await sb.from("domains")
          .select("domain_name, metadata")
          .eq("site_id", siteId);

        if (linkedDomains?.length) {
          try {
            const stripe = (await import("../_shared/deps.ts")).getStripe();
            for (const dom of linkedDomains) {
              const renewalSubId = (dom.metadata as any)?.renewal_stripe_subscription_id;
              if (renewalSubId) {
                try {
                  await stripe.subscriptions.cancel(renewalSubId);
                  console.log("Cancelled domain renewal:", renewalSubId, dom.domain_name);
                } catch (e: any) {
                  // Already cancelled or not found — that's fine
                  console.log("Renewal cancel skipped:", renewalSubId, e.message);
                }
              }
            }
          } catch (e) {
            console.error("Domain renewal cancellation error (non-fatal):", e);
          }
        }

        // 4. Unlink domains (but don't delete them)
        await sb.from("domains")
          .update({ site_id: null })
          .eq("site_id", siteId);

        await log({
          userId: svc.user_id, serviceId: svc.id,
          action: "hosting.soft_delete",
          message: `Site soft-deleted. wp.cloud site preserved until recovery deadline. ${svc.wp_cloud_url ?? ""}`,
        });

        console.log("Site soft-deleted:", siteId, "Recovery window: 30 days");
        return json({ deleted: true, recoverable: true, recoveryDays: 30 });
      }

      // Admin-only: permanently destroy site on wp.cloud (no recovery)
      case "hard-delete-site": {
        if (!siteId) return error("siteId is required");

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites")
          .select("id, wp_cloud_site_id, wp_cloud_url, user_id")
          .eq("id", siteId).single();

        if (!svc) return error("Site not found", 404);

        // Admin only (service role = admin)
        if (!isServiceRole) {
          const { data: adminProfile } = await sb.from("users").select("role").eq("id", user!.id).single();
          if (adminProfile?.role !== "admin") return error("Admin access required", 403);
        }

        // Delete from wp.cloud
        if (svc.wp_cloud_site_id) {
          const result = await wpcloudPost(`/api/v1.0/delete-site/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}`);
          console.log("Hard delete wp.cloud result:", result.status, JSON.stringify(result.data));
          await log({
            userId: user.id, serviceId: svc.id,
            action: "hosting.hard_delete",
            message: `Permanently deleted from wp.cloud: ${svc.wp_cloud_url ?? svc.wp_cloud_site_id}`,
            res: result.data,
          });
        }

        // Update status
        await sb.from("sites").update({
          status: "cancelled",
          wp_cloud_site_id: null,
          wp_cloud_url: null,
          metadata: {
            ...(svc as any).metadata,
            hard_deleted_at: new Date().toISOString(),
            hard_deleted_by: user.id,
          },
        }).eq("id", siteId);

        console.log("Site permanently deleted:", siteId);
        return json({ deleted: true, permanent: true });
      }

      // Get available PHP versions
      case "php-versions": {
        const result = await wpcloudGet(`/api/v1.0/get-php-versions/${WPCLOUD_CLIENT}/verbose`);
        return json(result.data);
      }

      // Update a site meta value (PHP workers, bursting, memory)
      case "update-meta": {
        if (!siteId) return error("siteId is required");
        if (!key || value === undefined) return error("key and value are required");

        const allowedKeys = ["default_php_conns", "burst_php_conns", "php_memory_limit", "jetpack_backup", "page_optimize", "jetpack_waf", "has_staging"];
        if (!allowedKeys.includes(key)) return error(`Invalid key: ${key}. Allowed: ${allowedKeys.join(", ")}`, 400);

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites")
          .select("id, wp_cloud_site_id, user_id")
          .eq("id", siteId).single();
        if (!svc) return error("Site not found", 404);
        if (!svc.wp_cloud_site_id) return error("Site has no wp.cloud ID", 400);

        // Check admin or owner (service role = admin)
        if (!isServiceRole) {
          if (svc.user_id !== user!.id) {
            const { data: profile } = await sb.from("users").select("role").eq("id", user!.id).single();
            if (profile?.role !== "admin") return error("Forbidden", 403);
          }
        }

        // POST to wp.cloud: /api/v1.0/site-meta/{wp_cloud_site_id}/{key}/update
        // Content-Type: application/x-www-form-urlencoded, body: value={value}
        const url = `${WPCLOUD_PROXY_URL}/api/v1.0/site-meta/${svc.wp_cloud_site_id}/${key}/update`;
        console.log("update-meta POST:", url, "value:", value);

        const formBody = new URLSearchParams();
        formBody.append("value", String(value));

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Auth": WPCLOUD_API_KEY,
            "X-Proxy-Secret": WPCLOUD_PROXY_SECRET,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formBody.toString(),
        });

        const rawText = await res.text();
        console.log("update-meta response:", res.status, rawText);
        let responseData;
        try { responseData = JSON.parse(rawText); } catch { responseData = { raw: rawText }; }

        await log({
          userId: user!.id, serviceId: svc.id,
          action: `hosting.update-meta.${key}`,
          message: `Set ${key}=${value}`,
          res: responseData,
        });

        if (!res.ok) return error(`wp.cloud API error: ${res.status}`, 502);
        return json(responseData);
      }

      // Update site primary domain on wp.cloud + auto-setup DNS
      case "update-domain": {
        if (!siteId || !domain) return error("siteId and domain are required");

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("*").eq("id", siteId).single();
        if (!svc) return error("Service not found", 404);
        if (!svc.wp_cloud_site_id) return error("Site not yet provisioned", 400);

        // Block connecting domains to trialing sites
        if (svc.subscription_id) {
          const { data: sub } = await sb.from("subscriptions").select("status").eq("id", svc.subscription_id).maybeSingle();
          if (sub?.status === "trialing") {
            return error("Cannot connect a domain to a site on a free trial. Upgrade to a paid plan or wait until your trial ends.", 403);
          }
        }

        // Check if domain is already connected to a different site
        const { data: existingLink } = await sb.from("domains")
          .select("site_id, domain_name")
          .eq("domain_name", domain)
          .eq("user_id", svc.user_id)
          .not("site_id", "is", null)
          .maybeSingle();

        if (existingLink && existingLink.site_id && existingLink.site_id !== siteId) {
          return error(`This domain is already connected to another site. Disconnect it first.`, 409);
        }

        const siteIp = (svc as any).metadata?.site_ip ?? null;

        // 1. Update primary domain on wp.cloud
        //    POST /update-site-domain/{service}/{identifier}/{domain}/{keep}
        //    keep=1 means keep the old domain as an alias
        const wpResult = await wpcloudPost(
          `/api/v1.0/update-site-domain/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}/${domain}/1`,
          {}
        );
        console.log("wp.cloud update-site-domain:", wpResult.status, JSON.stringify(wpResult.data));

        if (!wpResult.ok) {
          await log({ userId: user.id, serviceId: svc.id, level: "error", action: "hosting.update_domain.failed", message: `${domain}: ${wpResult.data?.message ?? wpResult.status}` });
          return error(`Failed to update domain on wp.cloud: ${wpResult.data?.message ?? "Unknown error"}`, 502);
        }

        // 2. Update service record with new URL
        await sb.from("sites").update({
          wp_cloud_url: `https://${domain}`,
          metadata: { ...(svc as any).metadata, domain_name: domain },
        }).eq("id", svc.id);

        // 3. Link domain record to this service
        await sb.from("domains")
          .update({ site_id: svc.id })
          .eq("domain_name", domain)
          .eq("user_id", svc.user_id);

        // 4. Auto-setup DNS if domain is registered through Envosta
        // If siteIp is missing, fetch it from wp.cloud
        // Resolve site IP (needed for DNS records)
        let resolvedIp = siteIp;
        if (!resolvedIp) {
          try {
            const ipsResult = await wpcloudGet(`/api/v1.0/get-ips/${WPCLOUD_CLIENT}/${domain}`);
            resolvedIp = ipsResult.data?.ip_address ?? ipsResult.data?.suggested?.[0] ?? ipsResult.data?.ipv4?.[0] ?? null;
            if (resolvedIp) {
              await sb.from("sites").update({
                metadata: { ...(svc as any).metadata, domain_name: domain, site_ip: resolvedIp },
              }).eq("id", svc.id);
            }
          } catch { /* non-fatal */ }
        }

        // Auto-configure DNS at OpenSRS if domain is ours
        let dnsSetup = null;
        if (resolvedIp) {
          const { data: domainRecord } = await sb.from("domains")
            .select("registrar, metadata")
            .eq("domain_name", domain)
            .eq("user_id", svc.user_id)
            .maybeSingle();

          if (domainRecord?.registrar === "opensrs" && (domainRecord?.metadata as any)?.dns_mode !== "custom") {
            try {
              // Import shared DNS functions
              const { setDnsZone, buildWpCloudDnsRecords } = await import("../_shared/opensrs.ts");
              const dnsRecords = buildWpCloudDnsRecords(resolvedIp);
              const dnsResult = await setDnsZone(domain, dnsRecords);

              if (dnsResult.isSuccess) {
                const existingMeta = (domainRecord.metadata as any) ?? {};
                await sb.from("domains").update({
                  metadata: { ...existingMeta, dns_records: dnsRecords, dns_setup: "complete", site_ip: resolvedIp, dns_setup_at: new Date().toISOString() },
                }).eq("domain_name", domain).eq("user_id", svc.user_id);

                dnsSetup = { siteIp: resolvedIp, records: dnsRecords.length };
                console.log("DNS auto-configured at OpenSRS for", domain, "→", resolvedIp);
              } else {
                console.error("DNS auto-setup failed:", dnsResult.responseText);
                await log({ userId: user.id, serviceId: svc.id, level: "error", action: "dns.auto_setup.failed", message: `${domain}: ${dnsResult.responseText}` });
              }
            } catch (dnsErr) {
              console.error("DNS auto-setup error (non-fatal):", dnsErr);
            }
          }
        }

        await log({ userId: user.id, serviceId: svc.id, action: "hosting.update_domain.success", message: `Domain changed to ${domain}` });
        return json({ domain, url: `https://${domain}`, dnsSetup, success: true });
      }

      // Upgrade/downgrade plan — updates Stripe subscription + wp.cloud resources
      case "change-plan": {
        const { newPlanId } = await req.clone().json().catch(() => ({}));
        if (!siteId || !newPlanId) return error("siteId and newPlanId are required");

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("*, subscriptions(id, stripe_subscription_id)").eq("id", siteId).single();
        if (!svc) return error("Service not found", 404);
        if (!svc.wp_cloud_site_id) return error("Site not yet provisioned", 400);

        // Verify ownership or admin
        if (!isServiceRole && svc.user_id !== user!.id) {
          const { data: p } = await sb.from("users").select("role").eq("id", user!.id).single();
          if (p?.role !== "admin") return error("Forbidden", 403);
        }

        const { data: newPlan } = await sb.from("products").select("*").eq("id", newPlanId).single();
        if (!newPlan) return error("Plan not found", 404);

        // 1. Update wp.cloud resources from plan metadata
        const newMeta = newPlan.metadata as any ?? {};
        const wpUpdates = [
          { key: "default_php_conns", value: newMeta.php_workers_default ?? 2 },
          { key: "php_memory_limit", value: newMeta.php_memory_mb ?? 512 },
        ];

        for (const u of wpUpdates) {
          const result = await wpcloudPost(`/api/v1.0/site-meta/${svc.wp_cloud_site_id}/${u.key}/update`, { value: u.value });
          console.log(`wp.cloud ${u.key}=${u.value}:`, result.status);
        }

        // Update storage quota
        await wpcloudPost(`/api/v1.0/site-meta/${svc.wp_cloud_site_id}/space_quota/update`, { value: `${newMeta.storage_gb ?? 25}G` });

        // Update plan features (backups, CDN, WAF)
        const featureKeys = [
          { key: "jetpack_backup", value: newMeta.has_backups !== false ? "1" : "0" },
          { key: "page_optimize", value: newMeta.has_cdn !== false ? "1" : "0" },
          { key: "jetpack_waf", value: newMeta.has_waf !== false ? "1" : "0" },
        ];
        for (const f of featureKeys) {
          try {
            await wpcloudPost(`/api/v1.0/site-meta/${svc.wp_cloud_site_id}/${f.key}/update`, { value: f.value });
          } catch { /* non-fatal */ }
        }

        // 2. Update Stripe subscription price
        const sub = (svc as any).subscriptions;
        if (sub?.stripe_subscription_id && newPlan.stripe_price_id) {
          try {
            const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
            // Get current subscription to find the item ID
            const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`, {
              headers: { Authorization: `Basic ${btoa(stripeKey + ":")}` },
            });
            const stripeSub = await subRes.json();
            const itemId = stripeSub.items?.data?.[0]?.id;

            if (itemId) {
              // Update the subscription item to the new price
              await fetch(`https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`, {
                method: "POST",
                headers: {
                  Authorization: `Basic ${btoa(stripeKey + ":")}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `items[0][id]=${itemId}&items[0][price]=${newPlan.stripe_price_id}&proration_behavior=create_prorations`,
              });
              console.log("Stripe subscription updated to:", newPlan.stripe_price_id);
            }
          } catch (stripeErr) {
            console.error("Stripe update failed (wp.cloud updated):", stripeErr);
          }
        }

        // 3. Update service + subscription records
        await sb.from("sites").update({ product_id: newPlan.id }).eq("id", svc.id);
        if (sub?.id) {
          await sb.from("subscriptions").update({ product_id: newPlan.id }).eq("id", sub.id);
        }

        await log({ userId: user.id, serviceId: svc.id, action: "hosting.plan_change", message: `Changed to ${newPlan.name} (${newPlan.slug})` });
        return json({ success: true, plan: newPlan.name, slug: newPlan.slug });
      }

      // Add addon to site — adds Stripe subscription item + wp.cloud config
      case "add-addon": {
        const { addonId } = await req.clone().json().catch(() => ({}));
        if (!siteId || !addonId) return error("siteId and addonId are required");

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("*, subscriptions(id, stripe_subscription_id)").eq("id", siteId).single();
        if (!svc) return error("Service not found", 404);

        // Verify ownership or admin
        if (!isServiceRole && svc.user_id !== user!.id) {
          const { data: p } = await sb.from("users").select("role").eq("id", user!.id).single();
          if (p?.role !== "admin") return error("Forbidden", 403);
        }

        // Addons are now managed via site config and charged through credits.
        // Toggle the feature directly on the site's config/guardrails.
        const { data: addon } = await sb.from("products").select("*").eq("id", addonId).single();
        if (!addon) return error("Addon not found", 404);

        const addonMeta = addon.metadata as any ?? {};

        // Apply wp.cloud action if configured
        if (svc.wp_cloud_site_id && addonMeta.wpcloud_key) {
          await wpcloudPost(`/api/v1.0/site-meta/${svc.wp_cloud_site_id}/${addonMeta.wpcloud_key}/update`, {
            value: addonMeta.enable_value ?? addonMeta.increment ?? 1,
          });
          console.log("wp.cloud addon applied:", addonMeta.wpcloud_key);
        }

        // Enable bursting flag on site if this is the bursting addon
        if (addon.slug === "bursting") {
          await sb.from("sites").update({ bursting_enabled: true }).eq("id", siteId);
        }

        await log({ userId: user.id, serviceId: siteId, action: "addon.enabled", message: `${addon.name} enabled` });
        return json({ success: true, addon: addon.name });
      }

      // Remove addon — reverses wp.cloud config
      case "remove-addon": {
        const { addonId: removeAddonId } = await req.clone().json().catch(() => ({}));
        if (!siteId || !removeAddonId) return error("siteId and addonId are required");

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("wp_cloud_site_id, user_id").eq("id", siteId).single();

        if (svc && !isServiceRole && svc.user_id !== user!.id) {
          const { data: p } = await sb.from("users").select("role").eq("id", user!.id).single();
          if (p?.role !== "admin") return error("Forbidden", 403);
        }

        const { data: addon } = await sb.from("products").select("*").eq("id", removeAddonId).single();
        if (!addon) return error("Addon not found", 404);

        const rmMeta = addon?.metadata as any ?? {};
        if (svc?.wp_cloud_site_id && rmMeta.wpcloud_key) {
          await wpcloudPost(`/api/v1.0/site-meta/${svc.wp_cloud_site_id}/${rmMeta.wpcloud_key}/update`, {
            value: rmMeta.disable_value ?? 0,
          });
          console.log("wp.cloud addon reversed:", rmMeta.wpcloud_key);
        }

        if (addon.slug === "bursting") {
          await sb.from("sites").update({ bursting_enabled: false }).eq("id", siteId);
        }

        await log({ userId: user.id, serviceId: siteId, action: "addon.disabled", message: `${addon?.name ?? "Addon"} disabled` });
        return json({ success: true, addon: addon?.name });
      }

      // ═══ Disconnect Domain — revert to temp domain ═══
      case "disconnect-domain": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("*").eq("id", siteId).single();
        if (!svc) return error("Site not found", 404);
        if (!svc.wp_cloud_site_id) return error("Site not yet provisioned", 400);
        if (!isServiceRole && svc.user_id !== user!.id) return error("Forbidden", 403);

        // Get original temp domain from provisioning response
        const tempDomain = (svc as any).metadata?.wp_cloud_response?.domain_name ?? null;
        if (!tempDomain) return error("No temporary domain found for this site", 400);

        // Revert wp.cloud to temp domain
        const wpResult = await wpcloudPost(
          `/api/v1.0/update-site-domain/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}/${tempDomain}/0`,
          {}
        );
        console.log("wp.cloud revert domain:", wpResult.status, JSON.stringify(wpResult.data));

        // Unlink domain from site in DB
        await sb.from("domains").update({ site_id: null }).eq("site_id", svc.id);

        // Update site URL back to temp
        await sb.from("sites").update({
          wp_cloud_url: `https://${tempDomain}`,
          metadata: { ...(svc as any).metadata, domain_name: null },
        }).eq("id", svc.id);

        await log({ userId: user!.id, serviceId: svc.id, action: "hosting.domain.disconnected", message: `Reverted to ${tempDomain}` });
        return json({ success: true, tempDomain });
      }

      // ═══ Get Site IP ═══
      case "get-ip": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, wp_cloud_url, user_id, metadata").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);

        // Return cached IP if already stored
        const cachedIp = (svc.metadata as any)?.site_ip;
        if (cachedIp) return json({ ip: cachedIp, cached: true });

        // Fetch from wp.cloud and save
        const siteRef = svc.wp_cloud_url?.replace("https://", "") ?? svc.wp_cloud_site_id;
        const result = await wpcloudGet(`/api/v1.0/get-ips/${WPCLOUD_CLIENT}/${siteRef}`);
        const ip = result.data?.ip_address ?? result.data?.suggested?.[0] ?? result.data?.ipv4?.[0] ?? null;
        if (ip) {
          await sb.from("sites").update({ metadata: { ...((svc.metadata as any) ?? {}), site_ip: ip } }).eq("id", siteId);
        }
        return json({ ip, raw: result.data });
      }

      // ═══ End Trial Early ═══
      case "end-trial": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites")
          .select("id, user_id, subscription_id")
          .eq("id", siteId).single();
        if (!svc) return error("Site not found", 404);
        if (!isServiceRole && svc.user_id !== user!.id) return error("Forbidden", 403);
        if (!svc.subscription_id) return error("No subscription linked to this site");

        const { data: sub } = await sb.from("subscriptions")
          .select("stripe_subscription_id, status")
          .eq("id", svc.subscription_id).single();
        if (!sub?.stripe_subscription_id) return error("No Stripe subscription found");
        if (sub.status !== "trialing") return error("This subscription is not on a trial");

        // End trial immediately — Stripe will charge the card and activate the subscription
        const stripe = (await import("../_shared/deps.ts")).getStripe();
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          trial_end: "now",
        });

        // Update local status
        await sb.from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", svc.subscription_id);

        await log({ userId: user!.id, serviceId: siteId, action: "trial.ended_early", message: "Customer activated plan before trial end" });
        return json({ success: true });
      }

      // ═══ Edge Cache ═══
      case "edge-cache": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, wp_cloud_url, user_id").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);
        if (!isServiceRole && svc.user_id !== user!.id) return error("Forbidden", 403);

        const { subAction, domain: cacheDomain } = await (async () => {
          const body = { subAction: key ?? "status", domain: domain ?? svc.wp_cloud_url?.replace("https://", "") ?? "" };
          return body;
        })();

        // subAction: "status", "enable", "disable", "purge"
        if (subAction === "purge") {
          const result = await wpcloudPost(`/api/v1.0/edge-cache/${svc.wp_cloud_site_id}/purge/${cacheDomain}`);
          await log({ userId: user!.id, serviceId: siteId, action: "cache.purge", message: cacheDomain });
          return json({ success: result.ok, data: result.data });
        }
        if (subAction === "enable" || subAction === "disable") {
          const result = await wpcloudPost(`/api/v1.0/edge-cache/${svc.wp_cloud_site_id}/${subAction}/${cacheDomain}`);
          await log({ userId: user!.id, serviceId: siteId, action: `cache.${subAction}`, message: cacheDomain });
          return json({ success: result.ok, data: result.data });
        }
        // status
        const result = await wpcloudGet(`/api/v1.0/edge-cache/${svc.wp_cloud_site_id}/status/${cacheDomain}`);
        return json(result.data);
      }

      // ═══ Edge Cache Defensive Mode (DDoS protection) ═══
      case "defensive-mode": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, wp_cloud_url, user_id").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);
        if (!isServiceRole && svc.user_id !== user!.id) return error("Forbidden", 403);
        const dmDomain = domain ?? svc.wp_cloud_url?.replace("https://", "") ?? "";

        if (value !== undefined) {
          // Set: value = -1 (indefinite), 0 (disable), or Unix timestamp
          const result = await wpcloudPost(`/api/v1.0/edge-cache/${svc.wp_cloud_site_id}/ddos_until/${dmDomain}`, { ddos_until: String(value) });
          await log({ userId: user!.id, serviceId: siteId, action: "cache.defensive_mode", message: `${dmDomain}: ${value}` });
          return json({ success: result.ok, data: result.data });
        }
        // Get status
        const result = await wpcloudGet(`/api/v1.0/edge-cache/${svc.wp_cloud_site_id}/ddos_until/${dmDomain}`);
        return json(result.data);
      }

      // ═══ Create On-Demand Backup ═══
      case "create-backup": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, user_id").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);
        if (!isServiceRole && svc.user_id !== user!.id) return error("Forbidden", 403);

        const backupType = value ?? "fs"; // fs = full site, db = database only
        const result = await wpcloudPost(`/api/v1.0/on-demand-backup/create/${svc.wp_cloud_site_id}/${backupType}`);
        await log({ userId: user!.id, serviceId: siteId, action: "backup.create", message: `type: ${backupType}` });
        return json({ success: result.ok, data: result.data });
      }

      // ═══ Download Backup URL ═══
      case "download-backup": {
        if (!siteId) return error("siteId is required");
        if (!value) return error("backup_id (value) is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, user_id").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);
        if (!isServiceRole && svc.user_id !== user!.id) return error("Forbidden", 403);

        const result = await wpcloudGet(`/api/v1.0/site-backup-get/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}/${value}`);
        await log({ userId: user!.id, serviceId: siteId, action: "backup.download", message: `Backup ${value}` });
        return json(result.data);
      }

      // ═══ SFTP Credentials ═══
      case "sftp-credentials": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, user_id").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);
        if (!isServiceRole && svc.user_id !== user!.id) return error("Forbidden", 403);

        const result = await wpcloudGet(`/api/v1.0/ssh-user/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}/list`);
        return json(result.data);
      }

      // ═══ Reset SFTP Password ═══
      case "reset-sftp-password": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, user_id").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);
        if (!isServiceRole && svc.user_id !== user!.id) return error("Forbidden", 403);

        const { username, password: newPass } = { username: key, password: value };
        if (!username || !newPass) return error("username (key) and password (value) required");

        const result = await wpcloudPost(`/api/v1.0/ssh-user/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}/update/${username}`, { pass: newPass });
        await log({ userId: user!.id, serviceId: siteId, action: "sftp.password_reset", message: username });
        return json({ success: result.ok, data: result.data });
      }

      // ═══ Error Logs (admin only) ═══
      case "error-logs": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, user_id").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);

        // Admin only
        if (!isServiceRole) {
          const { data: p } = await sb.from("users").select("role").eq("id", user!.id).single();
          if (p?.role !== "admin") return error("Admin only", 403);
        }

        const result = await wpcloudPost(`/api/v1.0/site-error-logs/${svc.wp_cloud_site_id}`);
        return json(result.data);
      }

      // ═══ WP-CLI Command (admin only) ═══
      case "wp-cli": {
        if (!siteId) return error("siteId is required");
        if (!value) return error("command (value) is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("sites").select("id, wp_cloud_site_id, user_id").eq("id", siteId).single();
        if (!svc?.wp_cloud_site_id) return error("Site not found or no wp.cloud ID", 404);

        if (!isServiceRole) {
          const { data: p } = await sb.from("users").select("role").eq("id", user!.id).single();
          if (!["admin", "studio"].includes(p?.role)) return error("Admin or studio access required", 403);
        }

        // wp.cloud task-create/run-wp-cli-command API:
        // - `args` (required): array of WP-CLI arguments e.g. ["user","create","name","email","--role=administrator"]
        // - `site_id`: target a specific site (undocumented but used by wp.com internally)
        // API docs: https://wp.cloud/docs/api/ — args must be top-level, NOT nested under params
        const cliArgs = (value as string).split(/\s+/).filter(Boolean);

        // Send args as PHP-style array (args[]=val) which is standard form-urlencoded array format
        const formBody = new URLSearchParams();
        formBody.append("site_id", String(svc.wp_cloud_site_id));
        formBody.append("site_count_limit", "1");
        cliArgs.forEach((arg: string) => {
          formBody.append("args[]", arg);
        });

        console.log("WP-CLI request:", {
          wp_cloud_site_id: svc.wp_cloud_site_id,
          cliArgs,
          formBody: formBody.toString(),
        });

        const wpUrl = `${WPCLOUD_PROXY_URL}/api/v1.0/task-create/${WPCLOUD_CLIENT}/run-wp-cli-command`;
        const wpRes = await fetch(wpUrl, {
          method: "POST",
          headers: {
            "Auth": Deno.env.get("WPCLOUD_API_KEY") ?? "",
            "X-Proxy-Secret": Deno.env.get("WPCLOUD_PROXY_SECRET") ?? "",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formBody.toString(),
        });
        const rawText = await wpRes.text();
        console.log("WP-CLI response:", wpRes.status, rawText);
        let result;
        try { result = JSON.parse(rawText); } catch { result = { raw: rawText }; }

        await log({ userId: user!.id, serviceId: siteId, action: "wpcli.run", message: value as string, res: result });
        return json(result);
      }

      default:
        return error(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    console.error("Site info error:", e);
    return error(String(e), 500);
  }
});
