import { supabaseAdmin, supabaseForUser, wpcloudPost, WPCLOUD_CLIENT, cors, json, error, log } from "../_shared/deps.ts";

/**
 * Provision a WordPress site via wp.cloud Atomic API (routed through static IP proxy).
 *
 * API: POST /wpcom/v2/atomic/site/{client}
 * Proxy adds static IP for wp.cloud IP whitelist.
 */

// Map plan slugs to wp.cloud config
const PLAN_CONFIG: Record<string, { storage: string; phpWorkers: number; phpMemory: number }> = {
  minimum:     { storage: "25G",  phpWorkers: 4,  phpMemory: 512 },
  growth:      { storage: "50G",  phpWorkers: 6,  phpMemory: 1024 },
  performance: { storage: "200G", phpWorkers: 10, phpMemory: 2048 },
};

// Map our region names to wp.cloud geo_affinity codes
const REGION_MAP: Record<string, string> = {
  "us-east": "dca", "us-east-1": "dca", "dca": "dca",
  "us-west": "bur", "us-west-1": "bur", "bur": "bur",
  "us-central": "dfw", "us-central-1": "dfw", "dfw": "dfw",
  "eu-west": "ams", "eu-west-1": "ams", "ams": "ams",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = Date.now();

  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const { label, region, phpVersion, subscriptionId, planId, domainName, adminEmail, serviceId } = await req.json();
    if (!label && !serviceId) return error("label or serviceId is required");

    const sb = supabaseAdmin();
    let svc: any;

    // If an existing service ID is provided, use it (admin triggering provisioning for a queued service)
    if (serviceId) {
      const { data: existingSvc } = await sb.from("services")
        .select("*").eq("id", serviceId).single();
      if (!existingSvc) return error("Service not found", 404);
      if (existingSvc.status === "active") return error("Service is already active", 409);
      if (existingSvc.wp_cloud_site_id) return error("Service already has a wp.cloud site", 409);
      svc = existingSvc;
    } else {
      // New provisioning: verify subscription and create service record
      if (subscriptionId) {
        const { data: sub } = await sb.from("subscriptions")
          .select("status").eq("id", subscriptionId).single();
        if (!sub || !["active", "trialing"].includes(sub.status)) {
          return error("Subscription is not active", 403);
        }
        const { data: existingSvc } = await sb.from("services")
          .select("id, status, wp_cloud_site_id").eq("subscription_id", subscriptionId).maybeSingle();
        if (existingSvc?.wp_cloud_site_id) return error("This subscription already has a provisioned site", 409);
        // If a service exists but isn't provisioned yet, use it
        if (existingSvc) {
          svc = existingSvc;
        }
      }

      if (!svc) {
        const geoAffinity = REGION_MAP[region ?? "us-east-1"] ?? "dca";
        const { data: newSvc, error: svcErr } = await sb.from("services").insert({
          user_id: user.id,
          subscription_id: subscriptionId ?? null,
          plan_id: planId ?? null,
          type: "hosting",
          label,
          status: "provisioning",
          server_region: geoAffinity,
          php_version: phpVersion ?? "8.4",
        }).select().single();
        if (svcErr) return error(svcErr.message, 500);
        svc = newSvc;
      }
    }

    // Get plan config
    let planSlug = "minimum";
    const effectivePlanId = planId ?? svc.plan_id;
    if (effectivePlanId) {
      const { data: plan } = await sb.from("plans").select("slug").eq("id", effectivePlanId).single();
      if (plan) planSlug = plan.slug;
    }
    const config = PLAN_CONFIG[planSlug] ?? PLAN_CONFIG.minimum;
    const geoAffinity = REGION_MAP[svc.server_region ?? region ?? "us-east-1"] ?? "dca";
    const php = svc.php_version ?? phpVersion ?? "8.4";

    // Build wp.cloud request
    const siteName = label.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50);
    const wpBody: Record<string, unknown> = {
      admin_email: adminEmail ?? user.email ?? "admin@envosta.com",
      admin_user: "envosta_admin",
      php_version: php,
      space_quota: config.storage,
      geo_affinity: geoAffinity,
      db_charset: "utf8mb4",
      meta: {
        default_php_conns: config.phpWorkers,
        burst_php_conns: 1,
        php_memory_limit: config.phpMemory,
      },
      persist_data: {
        envosta_service_id: svc.id,
        envosta_user_id: user.id,
        envosta_plan: planSlug,
      },
    };

    // Determine the domain to use as identifier
    const siteDomain = domainName ?? `${siteName}.envosta.com`;
    wpBody.domain_name = siteDomain;

    // Call wp.cloud Atomic API via proxy
    // Endpoint: POST /create-site/{client}/{identifier}
    // Using the domain as the identifier (the API accepts domains interchangeably with site IDs)
    const result = await wpcloudPost(`/api/v1.0/create-site/${WPCLOUD_CLIENT}/${siteDomain}`, wpBody);
    const ms = Date.now() - t0;

    console.log("wp.cloud provision result:", result.status, JSON.stringify(result.data));

    if (!result.ok) {
      await sb.from("services").update({
        status: "failed",
        metadata: { error: result.data, http_status: result.status },
      }).eq("id", svc.id);
      await log({
        userId: user.id, serviceId: svc.id, level: "error",
        action: "hosting.provision.failed",
        message: result.data?.message ?? `HTTP ${result.status}`,
        req: wpBody, res: result.data, ms,
      });
      return error(`Provisioning failed: ${result.data?.message ?? "Unknown error"}`, 502);
    }

    // Extract site info
    const wpSiteId = result.data?.atomic_site_id ?? result.data?.wpcom_blog_id ?? result.data?.job_id;
    const wpDomain = result.data?.domain_name ?? wpBody.domain_name;
    const wpUrl = wpDomain ? `https://${wpDomain}` : null;

    await sb.from("services").update({
      status: "active",
      wp_cloud_site_id: String(wpSiteId ?? ""),
      wp_cloud_url: wpUrl,
      provisioned_at: new Date().toISOString(),
      metadata: { wp_cloud_response: result.data, job_id: result.data?.job_id },
    }).eq("id", svc.id);

    // Link domain if provided
    if (domainName) {
      await sb.from("domains")
        .update({ service_id: svc.id })
        .eq("user_id", user.id)
        .eq("domain_name", domainName);
    }

    await log({
      userId: user.id, serviceId: svc.id,
      action: "hosting.provision.success",
      message: wpDomain ?? label, req: wpBody, res: result.data, ms,
    });

    return json({
      serviceId: svc.id,
      siteId: wpSiteId,
      url: wpUrl,
      domain: wpDomain,
      jobId: result.data?.job_id,
      status: "active",
    });

  } catch (e) {
    console.error("Provision error:", e);
    await log({ level: "error", action: "hosting.provision.error", message: String(e) });
    return error(String(e), 500);
  }
});
