import { supabaseAdmin, supabaseForUser, WPCLOUD_API_URL, WPCLOUD_API_KEY, WPCLOUD_CLIENT, cors, json, error, log } from "../_shared/deps.ts";

/**
 * Provision a WordPress site via the wp.cloud Atomic API.
 *
 * wp.cloud API: POST /create-site/{client}/{identifier}
 * Auth: "Auth: API_KEY" header
 * Docs: https://wp.cloud/docs/api/
 */

// Map our region names to wp.cloud geo_affinity codes
const REGION_MAP: Record<string, string> = {
  "us-east": "dca",
  "us-east-1": "dca",
  "us-west": "bur",
  "us-west-1": "bur",
  "us-central": "dfw",
  "us-central-1": "dfw",
  "eu-west": "ams",
  "eu-west-1": "ams",
  "ams": "ams",
  "bur": "bur",
  "dca": "dca",
  "dfw": "dfw",
};

// Map plan slugs to storage quotas
const PLAN_STORAGE: Record<string, string> = {
  "minimum": "10G",
  "growth": "25G",
  "performance": "50G",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = Date.now();

  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const { label, region, phpVersion, subscriptionId, planId, domainName, adminEmail } = await req.json();
    if (!label) return error("label is required");

    const sb = supabaseAdmin();

    // Verify subscription is active
    if (subscriptionId) {
      const { data: sub } = await sb.from("subscriptions")
        .select("status").eq("id", subscriptionId).single();
      if (!sub || !["active", "trialing"].includes(sub.status)) {
        return error("Subscription is not active", 403);
      }
      // Check no site already linked to this subscription
      const { data: existingSvc } = await sb.from("services")
        .select("id").eq("subscription_id", subscriptionId).maybeSingle();
      if (existingSvc) return error("This subscription already has a site", 409);
    }

    // Get plan details for storage quota
    let planSlug = "minimum";
    if (planId) {
      const { data: plan } = await sb.from("plans").select("slug, disk_gb").eq("id", planId).single();
      if (plan) planSlug = plan.slug;
    }

    // Generate a unique site identifier (wpcom blog id placeholder — wp.cloud assigns this)
    const siteIdentifier = `envosta-${Date.now()}`;
    const geoAffinity = REGION_MAP[region ?? "us-east-1"] ?? "dca";
    const php = phpVersion ?? "8.4";
    const storageQuota = PLAN_STORAGE[planSlug] ?? "10G";
    const siteAdminEmail = adminEmail ?? user.email ?? "admin@envosta.com";

    // Create service record in our DB first (status: provisioning)
    const { data: svc, error: svcErr } = await sb.from("services").insert({
      user_id: user.id,
      subscription_id: subscriptionId ?? null,
      plan_id: planId ?? null,
      type: "hosting",
      label,
      status: "provisioning",
      server_region: geoAffinity,
      php_version: php,
    }).select().single();
    if (svcErr) return error(svcErr.message, 500);

    // Call wp.cloud Atomic API to create the site
    const createUrl = `${WPCLOUD_API_URL}/create-site/${WPCLOUD_CLIENT}/${siteIdentifier}`;
    console.log("Creating site:", createUrl);

    const wpBody: Record<string, unknown> = {
      admin_email: siteAdminEmail,
      admin_user: "envosta_admin",
      php_version: php,
      space_quota: storageQuota,
      geo_affinity: geoAffinity,
      db_charset: "utf8mb4",
      persist_data: {
        envosta_service_id: svc.id,
        envosta_user_id: user.id,
        envosta_plan: planSlug,
      },
      meta: {
        privacy_model: "wp_uploads",
      },
    };

    // Use domain if provided, otherwise generate a demo domain
    if (domainName) {
      wpBody.domain_name = domainName;
    } else {
      wpBody.demo_domain = true;
    }

    const wpRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Auth": WPCLOUD_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wpBody),
    });

    const wpData = await wpRes.json();
    const ms = Date.now() - t0;

    console.log("wp.cloud response:", wpRes.status, JSON.stringify(wpData));

    if (!wpRes.ok) {
      // Update service status to failed
      await sb.from("services").update({
        status: "failed",
        metadata: { error: wpData, http_status: wpRes.status },
      }).eq("id", svc.id);

      await log({
        userId: user.id, serviceId: svc.id, level: "error",
        action: "hosting.provision.failed",
        message: wpData?.message ?? `HTTP ${wpRes.status}`,
        req: wpBody, res: wpData, ms,
      });

      return error(`Provisioning failed: ${wpData?.message ?? "Unknown error"}`, 502);
    }

    // Success — extract site info from wp.cloud response
    const wpSiteId = wpData?.data?.atomic_site_id ?? wpData?.data?.wpcom_blog_id ?? wpData?.data?.job_id;
    const wpDomainName = wpData?.data?.domain_name ?? domainName;
    const wpUrl = wpDomainName ? `https://${wpDomainName}` : null;

    // Update service record with wp.cloud data
    await sb.from("services").update({
      status: "active",
      wp_cloud_site_id: String(wpSiteId ?? ""),
      wp_cloud_url: wpUrl,
      provisioned_at: new Date().toISOString(),
      metadata: {
        wp_cloud_response: wpData?.data,
        job_id: wpData?.data?.job_id,
      },
    }).eq("id", svc.id);

    // If a domain was used, link it to the service
    if (domainName) {
      await sb.from("domains")
        .update({ service_id: svc.id })
        .eq("user_id", user.id)
        .eq("domain_name", domainName);
    }

    await log({
      userId: user.id, serviceId: svc.id,
      action: "hosting.provision.success",
      message: wpDomainName ?? label,
      req: wpBody, res: wpData?.data, ms,
    });

    return json({
      serviceId: svc.id,
      siteId: wpSiteId,
      url: wpUrl,
      domainName: wpDomainName,
      jobId: wpData?.data?.job_id,
      status: "provisioning",
    });

  } catch (e) {
    console.error("Provision error:", e);
    await log({ level: "error", action: "hosting.provision.error", message: String(e) });
    return error(String(e), 500);
  }
});
