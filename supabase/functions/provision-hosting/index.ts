import { supabaseAdmin, supabaseForUser, WPCLOUD_API_URL, WPCLOUD_API_KEY, cors, json, error, log } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = Date.now();

  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const { label, region, phpVersion, subscriptionId, planId } = await req.json();
    if (!label) return error("label is required");

    const sb = supabaseAdmin();

    // Verify subscription is active
    if (subscriptionId) {
      const { data: sub } = await sb.from("subscriptions")
        .select("status").eq("id", subscriptionId).single();
      if (!sub || sub.status !== "active") return error("Subscription is not active", 403);
    }

    // Check plan limits
    if (planId) {
      const { data: plan } = await sb.from("plans").select("sites_allowed").eq("id", planId).single();
      const { count } = await sb.from("services")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("type", "hosting").in("status", ["active", "provisioning", "pending"]);
      if (plan && count !== null && count >= plan.sites_allowed) {
        return error(`Plan limit reached: ${plan.sites_allowed} sites allowed`, 403);
      }
    }

    // Create service record
    const { data: svc, error: svcErr } = await sb.from("services").insert({
      user_id: user.id, subscription_id: subscriptionId, plan_id: planId,
      type: "hosting", label, status: "provisioning",
      server_region: region ?? "us-east-1", php_version: phpVersion ?? "8.2",
    }).select().single();
    if (svcErr) return error(svcErr.message, 500);

    // Call WP.cloud API
    const wpRes = await fetch(`${WPCLOUD_API_URL}/sites`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WPCLOUD_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: label.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50),
        php_version: phpVersion ?? "8.2",
        data_center: region ?? "us-east-1",
        metadata: { envosta_service_id: svc.id, envosta_user_id: user.id },
      }),
    });
    const wpData = await wpRes.json();
    const ms = Date.now() - t0;

    if (!wpRes.ok) {
      await sb.from("services").update({ status: "failed", metadata: { error: wpData } }).eq("id", svc.id);
      await log({ userId: user.id, serviceId: svc.id, level: "error", action: "hosting.provision.failed", res: wpData, ms });
      return error("Provisioning failed", 502);
    }

    await sb.from("services").update({
      status: "active",
      wp_cloud_site_id: wpData.id ?? wpData.site_id,
      wp_cloud_url: wpData.url ?? wpData.site_url,
      provisioned_at: new Date().toISOString(),
      metadata: wpData,
    }).eq("id", svc.id);

    await log({ userId: user.id, serviceId: svc.id, action: "hosting.provision.success", message: wpData.url ?? label, ms });
    return json({ serviceId: svc.id, siteId: wpData.id, url: wpData.url, status: "active" });

  } catch (e) {
    await log({ level: "error", action: "hosting.provision.error", message: String(e) });
    return error(String(e), 500);
  }
});
