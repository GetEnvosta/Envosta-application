import { supabaseAdmin, supabaseForUser, wpcloudPost, wpcloudGet, WPCLOUD_CLIENT, cors, json, error, log } from "../_shared/deps.ts";

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
    const { action, siteId, domain } = await req.json();

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

      // Delete a site via wp.cloud
      case "delete-site": {
        if (!siteId) return error("siteId is required");

        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("services")
          .select("id, wp_cloud_site_id, wp_cloud_url, user_id")
          .eq("id", siteId).single();

        if (!svc || svc.user_id !== user.id) return error("Site not found", 404);

        // Call wp.cloud delete if we have a site ID
        if (svc.wp_cloud_site_id) {
          const result = await wpcloudPost(`/api/v1.0/delete-site/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}`);
          console.log("Delete site result:", result.status, JSON.stringify(result.data));
          await log({
            userId: user.id, serviceId: svc.id,
            action: "hosting.delete",
            message: svc.wp_cloud_url ?? svc.wp_cloud_site_id,
            res: result.data,
          });
        }

        // Update service status
        await sb.from("services").update({
          status: "cancelled",
          metadata: { deleted_at: new Date().toISOString() },
        }).eq("id", siteId);

        // Unlink any connected domains
        await sb.from("domains")
          .update({ service_id: null })
          .eq("service_id", siteId);

        return json({ deleted: true });
      }

      // Get available PHP versions
      case "php-versions": {
        const result = await wpcloudGet(`/api/v1.0/get-php-versions/${WPCLOUD_CLIENT}/verbose`);
        return json(result.data);
      }

      default:
        return error(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    console.error("Site info error:", e);
    return error(String(e), 500);
  }
});
