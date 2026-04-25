import { supabaseAdmin, supabaseForUser, SUPABASE_SERVICE_ROLE_KEY, wpcloudPost, wpcloudGet, WPCLOUD_CLIENT, runWpCli, manageSoftware, cors, json, error, log } from "../_shared/deps.ts";
import { sendEmail, siteReadyEmail, provisioningFailedEmail } from "../_shared/email.ts";
import { setDnsZone, buildWpCloudDnsRecords } from "../_shared/opensrs.ts";
import { jetpackPartnerProvision } from "../_shared/jetpack.ts";

// Parent theme bundled with every Envosta site. Configurable so we can point
// at a pinned release tag instead of HEAD once we cut stable releases.
// Default points at the Envosta parent theme release asset. Zip unpacks to
// `envosta/` — WP uses that as the installed slug, which matches what
// Studio-generated child themes declare as Template.
// Override via env var to pin a specific tag or swap to a staging build.
const ENVOSTA_PARENT_THEME_ZIP_URL = Deno.env.get("ENVOSTA_PARENT_THEME_ZIP_URL")
  ?? "https://github.com/GetEnvosta/Envosta-Theme/releases/latest/download/envosta.zip";

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

    // Auth: either user session or service role key with userId in body (webhook/admin calls)
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace("Bearer ", "");
    const isServiceRole = bearerToken === SUPABASE_SERVICE_ROLE_KEY;

    const userSb = supabaseForUser(req);
    const { data: { user } } = await userSb.auth.getUser();

    if (!user && !(bodyUserId && isServiceRole)) return error("Unauthorized", 401);
    const userId = user?.id ?? bodyUserId;
    const userEmail = user?.email ?? adminEmail ?? "admin@envosta.com";

    const sb = supabaseAdmin();
    let svc: any;

    // If an existing service ID is provided, use it (admin triggering provisioning for a queued service)
    if (serviceId) {
      const { data: existingSvc } = await sb.from("sites")
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
        const { data: existingSvc } = await sb.from("sites")
          .select("id, status, wp_cloud_site_id").eq("subscription_id", subscriptionId).maybeSingle();
        if (existingSvc?.wp_cloud_site_id) return error("This subscription already has a provisioned site", 409);
        // If a service exists but isn't provisioned yet, use it
        if (existingSvc) {
          svc = existingSvc;
        }
      }

      if (!svc) {
        const geoAffinity = region ?? "dca";
        const { data: newSvc, error: svcErr } = await sb.from("sites").insert({
          user_id: userId,
          subscription_id: subscriptionId ?? null,
          product_id: planId ?? null,
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
    let hasBackups = true;
    let hasCdn = true;
    let hasWaf = true;
    let hasStaging = true;

    if (svc.product_id) {
      const { data: plan } = await sb.from("products")
        .select("slug, metadata")
        .eq("id", svc.product_id)
        .single();
      if (plan) {
        const meta = plan.metadata as any ?? {};
        planSlug = plan.slug ?? "minimum";
        storageGb = meta.storage_gb ?? 25;
        defaultWorkers = meta.php_workers_default ?? 2;
        phpMemory = meta.php_memory_mb ?? 512;
        hasBackups = meta.has_backups ?? true;
        hasCdn = meta.has_cdn ?? true;
        hasWaf = meta.has_waf ?? true;
        hasStaging = meta.has_staging ?? true;
      }
    }

    const geoAffinity = svc.server_region ?? "dca";
    const php = (svc.metadata as any)?.php_version ?? phpVersion ?? "8.4";

    // Build wp.cloud request
    const siteName = label.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50);
    // Generate a secure admin password for the WordPress site
    const wpAdminPassword = `Env${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}!`;
    const wpBody: Record<string, unknown> = {
      admin_email: adminEmail ?? userEmail ?? "admin@envosta.com",
      admin_user: (() => {
        const raw = (adminEmail ?? userEmail ?? "admin").split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase();
        // wp.cloud requires: min 5 chars, not all numbers
        const padded = raw.length < 5 ? raw + "_admin" : raw;
        return padded.slice(0, 30) || "envosta_admin";
      })(),
      admin_pass: wpAdminPassword,
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
        envosta_site_id: svc.id,
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
      await sb.from("sites").update({
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

    await sb.from("sites").update({
      status: "active",
      wp_cloud_site_id: String(wpSiteId ?? ""),
      wp_cloud_url: wpUrl,
      metadata: {
        ...(svc.metadata as any ?? {}),
        wp_cloud_response: wpResponse,
        job_id: wpResponse?.job_id,
        domain_name: domainName ?? null,
        site_ip: siteIp,
        wp_admin_user: (wpBody.admin_user as string) ?? "envosta_admin",
        wp_admin_password: wpAdminPassword,
        provisioned_at: new Date().toISOString(),
      },
    }).eq("id", svc.id);

    // Apply plan features (backups, CDN, WAF, staging) via wp.cloud site-meta
    const wpSiteIdStr = String(wpSiteId ?? "");
    if (wpSiteIdStr) {
      const featureUpdates: Array<{ key: string; value: string; label: string }> = [];

      // Backups — enable/disable automated backups
      featureUpdates.push({ key: "jetpack_backup", value: hasBackups ? "1" : "0", label: "backups" });

      // CDN — enable/disable page optimization / CDN
      featureUpdates.push({ key: "page_optimize", value: hasCdn ? "1" : "0", label: "CDN" });

      // WAF — enable/disable web application firewall
      featureUpdates.push({ key: "jetpack_waf", value: hasWaf ? "1" : "0", label: "WAF" });

      // Staging — enable/disable staging environment
      if (hasStaging) {
        featureUpdates.push({ key: "has_staging", value: "1", label: "staging" });
      }

      for (const feat of featureUpdates) {
        try {
          const featRes = await wpcloudPost(
            `/api/v1.0/site-meta/${wpSiteIdStr}/${feat.key}/update`,
            { value: feat.value },
          );
          console.log(`Feature ${feat.label} (${feat.key}=${feat.value}):`, featRes.status);
        } catch (featErr) {
          // Non-fatal — log but don't fail provisioning
          console.error(`Feature ${feat.label} setup failed (non-fatal):`, featErr);
        }
      }

      // Store applied features in site config + guardrail defaults
      await sb.from("sites").update({
        config: {
          storage_gb: storageGb,
          php_workers: defaultWorkers,
          php_memory_mb: phpMemory,
          has_backups: hasBackups,
          has_cdn: hasCdn,
          has_waf: hasWaf,
          has_staging: hasStaging,
        },
        max_php_workers: defaultWorkers,
        max_ssd_gb: storageGb,
        bursting_enabled: false,
      }).eq("id", svc.id);

      // ─── Install Envosta parent theme + bundled plugins, unlock Jetpack ───
      // wp.cloud pre-installs Jetpack as a "hosting-managed" locked plugin.
      // We want it installed (for partner features) but deletable — so after
      // creation we explicitly unlock it, and we auto-install Akismet too.
      // The parent theme is installed from a zip URL (GitHub main by default,
      // overridable via ENVOSTA_PARENT_THEME_ZIP_URL).
      const softwareResults: Record<string, any> = {};

      // Install + activate the Envosta parent theme (fire-and-forget; WP-CLI
      // tasks run async on wp.cloud).
      try {
        const themeRes = await runWpCli(wpSiteIdStr, [
          "theme", "install", ENVOSTA_PARENT_THEME_ZIP_URL, "--activate", "--force",
        ]);
        softwareResults.parent_theme = { ok: themeRes.ok, status: themeRes.status, task_id: themeRes.data?.task_id ?? themeRes.data?.atomic_task_id };
        console.log("Parent theme install:", softwareResults.parent_theme);
      } catch (e) {
        console.error("Parent theme install failed (non-fatal):", e);
        softwareResults.parent_theme = { ok: false, error: String(e) };
      }

      // Install + activate Akismet (unlocked by default — user can remove it).
      try {
        const akismetRes = await runWpCli(wpSiteIdStr, [
          "plugin", "install", "akismet", "--activate",
        ]);
        softwareResults.akismet = { ok: akismetRes.ok, status: akismetRes.status, task_id: akismetRes.data?.task_id ?? akismetRes.data?.atomic_task_id };
        console.log("Akismet install:", softwareResults.akismet);
      } catch (e) {
        console.error("Akismet install failed (non-fatal):", e);
        softwareResults.akismet = { ok: false, error: String(e) };
      }

      // Unlock Jetpack so users can deactivate/delete if they choose.
      // (wp.cloud auto-locks it as "hosting-managed" on provisioning.)
      try {
        const unlockJp = await manageSoftware("plugin", wpSiteIdStr, "unlock", { slug: "jetpack" });
        softwareResults.jetpack_unlock = { ok: unlockJp.ok, status: unlockJp.status, message: unlockJp.data?.message };
        console.log("Jetpack unlock:", softwareResults.jetpack_unlock);
      } catch (e) {
        console.error("Jetpack unlock failed (non-fatal):", e);
        softwareResults.jetpack_unlock = { ok: false, error: String(e) };
      }

      // Unlock Akismet too (in case wp.cloud auto-locks it similarly).
      try {
        const unlockAk = await manageSoftware("plugin", wpSiteIdStr, "unlock", { slug: "akismet" });
        softwareResults.akismet_unlock = { ok: unlockAk.ok, status: unlockAk.status, message: unlockAk.data?.message };
        console.log("Akismet unlock:", softwareResults.akismet_unlock);
      } catch (e) {
        console.error("Akismet unlock failed (non-fatal):", e);
        softwareResults.akismet_unlock = { ok: false, error: String(e) };
      }

      await log({
        userId, serviceId: svc.id,
        action: "site.software.bootstrap",
        message: "parent theme + Akismet installed, Jetpack/Akismet unlocked",
        res: softwareResults,
      });
    }

    // Register Envosta's Jetpack partner attribution on the new site.
    // wp.cloud pre-installs Jetpack as a managed plugin; this ties it to our
    // partner account. If Jetpack isn't connected yet, Jetpack creates a
    // "Pending Activation" that attaches when the site connects (14-day TTL).
    let jetpackAttribution: any = null;
    if (wpUrl) {
      try {
        const jpUser = (wpBody.admin_user as string) ?? "envosta_admin";
        const jpResult = await jetpackPartnerProvision(wpUrl, jpUser);
        jetpackAttribution = {
          ok: jpResult.ok,
          status: jpResult.status,
          success: jpResult.success,
          error_code: jpResult.error_code,
          error_message: jpResult.error_message,
          attributed_at: new Date().toISOString(),
        };
        console.log("Jetpack partner attribution:", jetpackAttribution);
        await log({
          userId, serviceId: svc.id,
          level: jpResult.ok ? "info" : "warn",
          action: jpResult.ok ? "jetpack.partner.attributed" : "jetpack.partner.failed",
          message: jpResult.error_message ?? `${wpUrl} → partner`,
          res: jpResult.raw,
        });
        // Persist attribution status to site metadata for visibility
        await sb.from("sites").update({
          metadata: {
            ...(svc.metadata as any ?? {}),
            wp_cloud_response: wpResponse,
            job_id: wpResponse?.job_id,
            domain_name: domainName ?? null,
            site_ip: siteIp,
            wp_admin_user: (wpBody.admin_user as string) ?? "envosta_admin",
            wp_admin_password: wpAdminPassword,
            provisioned_at: new Date().toISOString(),
            jetpack_attribution: jetpackAttribution,
          },
        }).eq("id", svc.id);
      } catch (jpErr) {
        // Non-fatal — site is still usable without partner attribution
        console.error("Jetpack partner attribution error (non-fatal):", jpErr);
        await log({ userId, serviceId: svc.id, level: "error", action: "jetpack.partner.error", message: String(jpErr) });
      }
    }

    // Link domain if provided
    if (domainName) {
      await sb.from("domains")
        .update({ site_id: svc.id })
        .eq("user_id", userId)
        .eq("domain_name", domainName);
    }

    // Auto-setup DNS for Envosta-registered domains
    // Uses the site IP already fetched above to set A, SPF, DKIM, DMARC records via OpenSRS
    let dnsSetup = null;
    if (domainName && siteIp) {
      try {
        const { data: domainRecord } = await sb.from("domains")
          .select("registrar, metadata")
          .eq("user_id", userId)
          .eq("domain_name", domainName)
          .maybeSingle();

        // Skip DNS auto-setup if client manages their own DNS
        if (domainRecord?.registrar === "opensrs" && (domainRecord?.metadata as any)?.dns_mode !== "custom") {
          const dnsRecords = buildWpCloudDnsRecords(siteIp);
          const dnsResult = await setDnsZone(domainName, dnsRecords);

          if (dnsResult.isSuccess) {
            await sb.from("domains")
              .update({
                metadata: { dns_records: dnsRecords, dns_setup: "complete", site_ip: siteIp, dns_setup_at: new Date().toISOString() },
              })
              .eq("user_id", userId)
              .eq("domain_name", domainName);

            dnsSetup = { siteIp, records: dnsRecords.length };
            console.log("DNS records set for", domainName, "→", siteIp);
            await log({ userId: userId, serviceId: svc.id, action: "domain.dns.auto_setup", message: `${domainName} → ${siteIp}` });
          } else {
            console.error("DNS auto-setup failed:", dnsResult.responseText);
            await log({ userId: userId, serviceId: svc.id, level: "error", action: "domain.dns.auto_setup.failed", message: `${domainName}: ${dnsResult.responseText}` });
          }
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
