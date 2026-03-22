import { supabaseAdmin, supabaseForUser, wpcloudPost, wpcloudGet, WPCLOUD_CLIENT, WPCLOUD_PROXY_URL, WPCLOUD_API_KEY, WPCLOUD_PROXY_SECRET, cors, json, error, log } from "../_shared/deps.ts";

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

    // Domain verification doesn't need auth (one-time admin setup)
    if (action === "domain-verification") {
      if (!domain) return error("domain is required");
      const result = await wpcloudGet(`/api/v1.0/get-domain-verification-code/${WPCLOUD_CLIENT}/${domain}`);
      console.log("Domain verification result:", result.status, JSON.stringify(result.data));
      return json(result.data);
    }

    // All other actions require auth
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

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

      // Get site details from wp.cloud
      case "get-site": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("services")
          .select("id, wp_cloud_site_id, user_id")
          .eq("id", siteId).single();
        if (!svc || svc.user_id !== user.id) return error("Site not found", 404);
        if (!svc.wp_cloud_site_id) return error("Site has no wp.cloud ID", 400);

        const result = await wpcloudGet(`/api/v1.0/get-site/${svc.wp_cloud_site_id}/extra`);
        return json(result.data);
      }

      // List backups for a site
      case "list-backups": {
        if (!siteId) return error("siteId is required");
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("services")
          .select("id, wp_cloud_site_id, user_id")
          .eq("id", siteId).single();
        if (!svc || svc.user_id !== user.id) return error("Site not found", 404);
        if (!svc.wp_cloud_site_id) return error("Site has no wp.cloud ID", 400);

        const result = await wpcloudGet(`/api/v1.0/site-backups-list/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}`);
        return json(result.data);
      }

      // Customer soft-delete: cancel billing, hide from dashboard, keep site alive 30 days
      case "delete-site": {
        if (!siteId) return error("siteId is required");

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("services")
          .select("id, wp_cloud_site_id, wp_cloud_url, user_id, subscription_id")
          .eq("id", siteId).single();

        if (!svc) return error("Site not found", 404);

        // Check admin or owner
        const { data: profile } = await sb.from("users").select("role").eq("id", user.id).single();
        const isAdmin = profile?.role === "admin";
        if (!isAdmin && svc.user_id !== user.id) return error("Forbidden", 403);

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
              cancelled_at: new Date().toISOString(),
            }).eq("id", svc.subscription_id);
          }
        }

        // 2. Soft-delete: mark as cancelled (hides from customer dashboard)
        // wp.cloud site stays alive for 30-day recovery window
        await sb.from("services").update({
          status: "cancelled",
          metadata: {
            ...(svc as any).metadata,
            soft_deleted_at: new Date().toISOString(),
            soft_deleted_by: user.id,
            recovery_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }).eq("id", siteId);

        // 3. Unlink domains (but don't delete them)
        await sb.from("domains")
          .update({ service_id: null })
          .eq("service_id", siteId);

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
        const { data: svc } = await sb.from("services")
          .select("id, wp_cloud_site_id, wp_cloud_url, user_id")
          .eq("id", siteId).single();

        if (!svc) return error("Site not found", 404);

        // Admin only
        const { data: adminProfile } = await sb.from("users").select("role").eq("id", user.id).single();
        if (adminProfile?.role !== "admin") return error("Admin access required", 403);

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
        await sb.from("services").update({
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

        const allowedKeys = ["default_php_conns", "burst_php_conns", "php_memory_limit"];
        if (!allowedKeys.includes(key)) return error(`Invalid key: ${key}. Allowed: ${allowedKeys.join(", ")}`, 400);

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("services")
          .select("id, wp_cloud_site_id, user_id")
          .eq("id", siteId).single();
        if (!svc) return error("Site not found", 404);
        if (!svc.wp_cloud_site_id) return error("Site has no wp.cloud ID", 400);

        // Check admin or owner
        const userSbCheck = supabaseForUser(req);
        const { data: { user: authUser } } = await userSbCheck.auth.getUser();
        if (!authUser) return error("Unauthorized", 401);

        const { data: profile } = await sb.from("users").select("role").eq("id", authUser.id).single();
        const isAdmin = profile?.role === "admin";
        if (!isAdmin && svc.user_id !== authUser.id) return error("Forbidden", 403);

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
          userId: authUser.id, serviceId: svc.id,
          action: `hosting.update-meta.${key}`,
          message: `Set ${key}=${value}`,
          res: responseData,
        });

        if (!res.ok) return error(`wp.cloud API error: ${res.status}`, 502);
        return json(responseData);
      }

      default:
        return error(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    console.error("Site info error:", e);
    return error(String(e), 500);
  }
});
