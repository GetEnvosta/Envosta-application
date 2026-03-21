import { supabaseAdmin, supabaseForUser, WPCLOUD_API_URL, WPCLOUD_API_KEY, WPCLOUD_CLIENT, cors, json, error } from "../_shared/deps.ts";

/**
 * Get site info from wp.cloud API.
 * Actions: ssl-info, datacenters, delete-site
 */

async function wpCloudGet(path: string): Promise<{ ok: boolean; data: any; status: number }> {
  const res = await fetch(`${WPCLOUD_API_URL}${path}`, {
    method: "GET",
    headers: { "Auth": WPCLOUD_API_KEY },
  });
  const data = await res.json();
  return { ok: res.ok, data: data?.data ?? data, status: res.status };
}

async function wpCloudPost(path: string, body?: Record<string, unknown>): Promise<{ ok: boolean; data: any; status: number }> {
  const res = await fetch(`${WPCLOUD_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Auth": WPCLOUD_API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, data: data?.data ?? data, status: res.status };
}

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
        const result = await wpCloudGet(`/get-available-datacenters/${WPCLOUD_CLIENT}`);
        if (!result.ok) return error("Failed to get datacenters", 502);
        return json({
          datacenters: result.data,
          mapped: [
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
        const result = await wpCloudPost(`/ssl-info/${domain}`);
        if (!result.ok) return error("Failed to get SSL info", 502);
        return json(result.data);
      }

      // Delete a site
      case "delete-site": {
        if (!siteId) return error("siteId is required");

        // Verify user owns this site
        const sb = supabaseAdmin();
        const { data: svc } = await sb.from("services")
          .select("id, wp_cloud_site_id, user_id")
          .eq("id", siteId).single();

        if (!svc || svc.user_id !== user.id) return error("Site not found", 404);
        if (!svc.wp_cloud_site_id) return error("Site has no wp.cloud ID", 400);

        const result = await wpCloudPost(`/delete-site/domain/${svc.wp_cloud_site_id}`);
        console.log("Delete site result:", result.status, JSON.stringify(result.data));

        // Update service status regardless of wp.cloud result
        await sb.from("services").update({
          status: "cancelled",
          metadata: { deleted_at: new Date().toISOString(), wp_cloud_response: result.data },
        }).eq("id", siteId);

        return json({ deleted: true, jobId: result.data?.job_id });
      }

      default:
        return error(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    console.error("Site info error:", e);
    return error(String(e), 500);
  }
});
