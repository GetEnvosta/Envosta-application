import { supabaseAdmin, supabaseForUser, wpcloudPost, wpcloudGet, WPCLOUD_CLIENT, cors, json, error, log } from "../_shared/deps.ts";

/**
 * Site management actions via wp.cloud API (routed through static IP proxy).
 * Actions: ssl-info, datacenters, delete-site
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const { action, siteId, domain } = await req.json();

    switch (action) {
      // Get available datacenters
      case "datacenters": {
        const result = await wpcloudGet(`/wpcom/v2/atomic/site/${WPCLOUD_CLIENT}/datacenters`);
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
        const result = await wpcloudPost(`/wpcom/v2/atomic/site/${WPCLOUD_CLIENT}/ssl-info`, { domain });
        if (!result.ok) return error("Failed to get SSL info", 502);
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
          const result = await wpcloudPost(`/wpcom/v2/atomic/site/${WPCLOUD_CLIENT}/${svc.wp_cloud_site_id}/delete`);
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

      default:
        return error(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    console.error("Site info error:", e);
    return error(String(e), 500);
  }
});
