import { supabaseAdmin, supabaseForUser, wpcloudPost, wpcloudGet, WPCLOUD_CLIENT, cors, json, error, log } from "../_shared/deps.ts";
import { sendEmail, siteReadyEmail, provisioningFailedEmail } from "../_shared/email.ts";

/**
 * Provision a WordPress site via wp.cloud Atomic API (routed through static IP proxy).
 *
 * API: POST /wpcom/v2/atomic/site/{client}
 * Proxy adds static IP for wp.cloud IP whitelist.
 */


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = Date.now();

  try {
    const body = await req.json();
    const { label, region, phpVersion, subscriptionId, planId, domainName, adminEmail, serviceId, userId: bodyUserId } = body;
    if (!label && !serviceId) return error("label or serviceId is required");

    // Auth: either user session or service role with userId in body (for webhook calls)
    const userSb = supabaseForUser(req);
    const { data: { user } } = await userSb.auth.getUser();

    if (!user && !bodyUserId) return error("Unauthorized", 401);
    const userId = user?.id ?? bodyUserId;
    const userEmail = user?.email ?? adminEmail ?? "admin@envosta.com";

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
        const geoAffinity = region ?? "dca";
        const { data: newSvc, error: svcErr } = await sb.from("services").insert({
          user_id: userId,
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

    // Get plan config from database
    let storageGb = 25;
    let defaultWorkers = 2;
    let phpMemory = 512;
    let planSlug = "minimum";

    if (svc.plan_id) {
      const { data: plan } = await sb.from("plans")
        .select("slug, storage_gb, default_php_workers, php_memory_mb")
        .eq("id", svc.plan_id)
        .single();
      if (plan) {
        planSlug = plan.slug ?? "minimum";
        storageGb = plan.storage_gb ?? 25;
        defaultWorkers = plan.default_php_workers ?? 2;
        phpMemory = plan.php_memory_mb ?? 512;
      }
    }

    const geoAffinity = svc.server_region ?? "dca";
    const php = svc.php_version ?? phpVersion ?? "8.4";

    // Build wp.cloud request
    const siteName = label.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50);
    const wpBody: Record<string, unknown> = {
      admin_email: adminEmail ?? userEmail ?? "admin@envosta.com",
      admin_user: "envosta_admin",
      php_version: php,
      space_quota: `${storageGb}G`,
      geo_affinity: geoAffinity,
      db_charset: "utf8mb4",
      meta: {
        default_php_conns: defaultWorkers,
        burst_php_conns: 0,
        php_memory_limit: phpMemory,
      },
      persist_data: {
        envosta_service_id: svc.id,
        envosta_user_id: userId,
        envosta_plan: planSlug,
      },
    };

    // Determine the domain
    const siteDomain = domainName ?? `${siteName}.envosta.com`;
    const siteIdentifier = Date.now().toString();

    // Try 1: Create with custom subdomain (e.g. customer.envosta.com)
    wpBody.domain_name = siteDomain;
    delete wpBody.demo_domain;

    console.log("Attempt 1: Creating site with domain:", siteDomain);
    let result = await wpcloudPost(`/api/v1.0/create-site/${WPCLOUD_CLIENT}/${siteIdentifier}`, wpBody);
    console.log("Attempt 1 result:", result.status, JSON.stringify(result.data));

    // If domain is rejected (e.g. TXT verification pending), fallback to demo domain
    if (!result.ok && result.data?.message?.includes?.("Domain name already used")) {
      console.log("Domain rejected, retrying with demo_domain...");
      delete wpBody.domain_name;
      wpBody.demo_domain = true;
      const retryIdentifier = (Date.now() + 1).toString();
      result = await wpcloudPost(`/api/v1.0/create-site/${WPCLOUD_CLIENT}/${retryIdentifier}`, wpBody);
      console.log("Attempt 2 (demo) result:", result.status, JSON.stringify(result.data));
    }

    const ms = Date.now() - t0;

    if (!result.ok) {
      await sb.from("services").update({
        status: "failed",
        metadata: { error: result.data, http_status: result.status },
      }).eq("id", svc.id);
      await log({
        userId: userId, serviceId: svc.id, level: "error",
        action: "hosting.provision.failed",
        message: result.data?.message ?? `HTTP ${result.status}`,
        req: wpBody, res: result.data, ms,
      });
      // Send failure notification email
      try {
        const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", userId).maybeSingle();
        if (userProfile?.email) {
          const email = provisioningFailedEmail(userProfile.full_name ?? "there", svc.label ?? "your site");
          await sendEmail({ to: userProfile.email, ...email });
        }
      } catch { /* non-fatal */ }

      return error(`Provisioning failed: ${result.data?.message ?? "Unknown error"}`, 502);
    }

    // Extract site info (result.data is the full response, .data is nested wp.cloud data)
    const wpResponse = result.data?.data ?? result.data;
    const wpSiteId = wpResponse?.atomic_site_id ?? wpResponse?.wpcom_blog_id ?? wpResponse?.job_id;
    const wpDomain = wpResponse?.domain_name ?? wpBody.domain_name;
    const wpUrl = wpDomain ? `https://${wpDomain}` : null;

    // Fetch site IP from wp.cloud
    let siteIp: string | null = null;
    try {
      const siteRef = wpDomain ?? wpSiteId;
      if (siteRef) {
        const ipsResult = await wpcloudGet(`/api/v1.0/get-ips/${WPCLOUD_CLIENT}/${siteRef}`);
        siteIp = ipsResult.data?.ip_address ?? ipsResult.data?.ipv4?.[0] ?? null;
        console.log("Site IP for", siteRef, ":", siteIp);
      }
    } catch (ipErr) {
      console.error("Failed to fetch site IP (non-fatal):", ipErr);
    }

    await sb.from("services").update({
      status: "active",
      wp_cloud_site_id: String(wpSiteId ?? ""),
      wp_cloud_url: wpUrl,
      provisioned_at: new Date().toISOString(),
      metadata: { wp_cloud_response: wpResponse, job_id: wpResponse?.job_id, domain_name: domainName ?? null, site_ip: siteIp },
    }).eq("id", svc.id);

    // Link domain if provided
    if (domainName) {
      await sb.from("domains")
        .update({ service_id: svc.id })
        .eq("user_id", userId)
        .eq("domain_name", domainName);
    }

    // Auto-setup DNS for Envosta-registered domains
    // Uses the site IP already fetched above to set A, SPF, DKIM, DMARC records via OpenSRS
    let dnsSetup = null;
    if (domainName && siteIp) {
      try {
        const { data: domainRecord } = await sb.from("domains")
          .select("registrar")
          .eq("user_id", userId)
          .eq("domain_name", domainName)
          .maybeSingle();

        if (domainRecord?.registrar === "opensrs") {
          const dnsRecords = [
            { type: "A", subdomain: "", ip_address: siteIp, ttl: 3600 },
            { type: "A", subdomain: "www", ip_address: siteIp, ttl: 3600 },
            { type: "TXT", subdomain: "", text: "v=spf1 include:_spf.wpcloud.com ~all", ttl: 3600 },
            { type: "CNAME", subdomain: "wpcloud1._domainkey", hostname: "wpcloud1._domainkey.wpcloud.com", ttl: 3600 },
            { type: "CNAME", subdomain: "wpcloud2._domainkey", hostname: "wpcloud2._domainkey.wpcloud.com", ttl: 3600 },
            { type: "TXT", subdomain: "_dmarc", text: "v=DMARC1; p=none;", ttl: 3600 },
          ];

          await sb.from("domains")
            .update({
              dns_records: dnsRecords,
              metadata: { dns_setup: "complete", site_ip: siteIp, dns_setup_at: new Date().toISOString() },
            })
            .eq("user_id", userId)
            .eq("domain_name", domainName);

          dnsSetup = { siteIp, records: dnsRecords.length };
          console.log("DNS records queued for", domainName, "→", siteIp);
          await log({ userId: userId, serviceId: svc.id, action: "domain.dns.auto_setup", message: `${domainName} → ${siteIp}` });
        }
      } catch (dnsErr) {
        // DNS setup is best-effort — don't fail provisioning
        console.error("DNS auto-setup error (non-fatal):", dnsErr);
      }
    }

    await log({
      userId: userId, serviceId: svc.id,
      action: "hosting.provision.success",
      message: wpDomain ?? label, req: wpBody, res: result.data, ms,
    });

    // Send "site ready" email
    try {
      const { data: userProfile } = await sb.from("users").select("email, full_name").eq("id", userId).maybeSingle();
      if (userProfile?.email && wpUrl) {
        const email = siteReadyEmail(userProfile.full_name ?? "there", svc.label ?? "Your site", wpUrl, `${wpUrl}/wp-admin`);
        await sendEmail({ to: userProfile.email, ...email });
      }
    } catch { /* non-fatal */ }

    return json({
      serviceId: svc.id,
      siteId: wpSiteId,
      url: wpUrl,
      domain: wpDomain,
      jobId: result.data?.job_id,
      status: "active",
      dnsSetup,
    });

  } catch (e) {
    console.error("Provision error:", e);
    await log({ level: "error", action: "hosting.provision.error", message: String(e) });
    return error(String(e), 500);
  }
});
