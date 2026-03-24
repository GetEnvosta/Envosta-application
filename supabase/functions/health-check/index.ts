import { supabaseAdmin, wpcloudGet, WPCLOUD_CLIENT, cors, json, error, log } from "../_shared/deps.ts";

/**
 * Daily health check — run via cron or manual trigger.
 *
 * Checks:
 * 1. wp.cloud site IPs — if changed, updates DNS at OpenSRS
 * 2. Domain expiry dates — flags domains expiring within 30 days
 * 3. Site status — flags any non-active provisioned sites
 *
 * Trigger via: POST /functions/v1/health-check (admin only or cron)
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sb = supabaseAdmin();
  const results: string[] = [];
  const issues: string[] = [];

  try {
    // ═══ 1. CHECK SITE IPs ═══
    const { data: activeSites } = await sb.from("services")
      .select("id, label, wp_cloud_site_id, wp_cloud_url, metadata, user_id")
      .eq("status", "active")
      .not("wp_cloud_site_id", "is", null);

    for (const site of activeSites ?? []) {
      if (!site.wp_cloud_site_id) continue;

      try {
        const storedIp = (site.metadata as any)?.site_ip ?? null;
        const siteRef = site.wp_cloud_url?.replace("https://", "") ?? site.wp_cloud_site_id;

        const ipsResult = await wpcloudGet(`/api/v1.0/get-ips/${WPCLOUD_CLIENT}/${siteRef}`);
        const currentIp = ipsResult.data?.ip_address ?? ipsResult.data?.ipv4?.[0] ?? null;

        if (!currentIp) {
          issues.push(`${site.label}: Could not fetch IP from wp.cloud`);
          continue;
        }

        if (storedIp && currentIp !== storedIp) {
          // IP changed — update metadata
          await sb.from("services").update({
            metadata: { ...(site.metadata as any), site_ip: currentIp, ip_updated_at: new Date().toISOString() },
          }).eq("id", site.id);

          // Find connected OpenSRS domain and update DNS
          const { data: domain } = await sb.from("domains")
            .select("id, domain_name, registrar")
            .eq("service_id", site.id)
            .eq("registrar", "opensrs")
            .maybeSingle();

          if (domain) {
            // Update DNS records with new IP
            const dnsRecords = [
              { type: "A", subdomain: "", ip_address: currentIp, ttl: 3600 },
              { type: "A", subdomain: "www", ip_address: currentIp, ttl: 3600 },
              { type: "TXT", subdomain: "", text: "v=spf1 include:_spf.wpcloud.com ~all", ttl: 3600 },
              { type: "CNAME", subdomain: "wpcloud1._domainkey", hostname: "wpcloud1._domainkey.wpcloud.com", ttl: 3600 },
              { type: "CNAME", subdomain: "wpcloud2._domainkey", hostname: "wpcloud2._domainkey.wpcloud.com", ttl: 3600 },
              { type: "TXT", subdomain: "_dmarc", text: "v=DMARC1; p=none;", ttl: 3600 },
            ];

            await sb.from("domains").update({
              dns_records: dnsRecords,
              metadata: { dns_setup: "complete", site_ip: currentIp, dns_updated_at: new Date().toISOString() },
            }).eq("id", domain.id);

            issues.push(`${site.label}: IP changed ${storedIp} → ${currentIp}, DNS updated for ${domain.domain_name}`);
            await log({ serviceId: site.id, action: "health.ip_changed", message: `${storedIp} → ${currentIp}, DNS updated for ${domain.domain_name}` });
          } else {
            issues.push(`${site.label}: IP changed ${storedIp} → ${currentIp}, no OpenSRS domain to update`);
            await log({ serviceId: site.id, action: "health.ip_changed", message: `${storedIp} → ${currentIp}` });
          }
        }

        results.push(`${site.label}: IP ${currentIp} OK`);
      } catch (e) {
        issues.push(`${site.label}: Error checking IP — ${e}`);
      }
    }

    // ═══ 2. CHECK DOMAIN EXPIRY ═══
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString();
    const { data: expiringDomains } = await sb.from("domains")
      .select("id, domain_name, expiry_date, auto_renew, user_id")
      .eq("status", "registered")
      .lt("expiry_date", thirtyDaysFromNow)
      .order("expiry_date", { ascending: true });

    for (const domain of expiringDomains ?? []) {
      const daysLeft = Math.ceil((new Date(domain.expiry_date).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 0) {
        issues.push(`EXPIRED: ${domain.domain_name} expired ${Math.abs(daysLeft)} days ago${domain.auto_renew ? ' (auto-renew on)' : ' (auto-renew OFF)'}`);
      } else {
        issues.push(`EXPIRING: ${domain.domain_name} expires in ${daysLeft} days${domain.auto_renew ? '' : ' (auto-renew OFF!)'}`);
      }
    }

    results.push(`Checked ${expiringDomains?.length ?? 0} domains expiring within 30 days`);

    // ═══ 3. CHECK STUCK SERVICES ═══
    const { data: stuckServices } = await sb.from("services")
      .select("id, label, status, created_at")
      .eq("status", "provisioning")
      .lt("created_at", new Date(Date.now() - 3600000).toISOString()); // Stuck for > 1 hour

    for (const svc of stuckServices ?? []) {
      const hoursStuck = Math.round((Date.now() - new Date(svc.created_at).getTime()) / 3600000);
      issues.push(`STUCK: ${svc.label} has been "provisioning" for ${hoursStuck} hours`);
    }

    results.push(`Checked ${stuckServices?.length ?? 0} stuck services`);

    // ═══ LOG SUMMARY ═══
    await log({
      action: "health.check.complete",
      message: `Sites: ${activeSites?.length ?? 0}, Issues: ${issues.length}`,
      res: { results, issues },
    });

    return json({
      status: issues.length === 0 ? "healthy" : "issues_found",
      sites_checked: activeSites?.length ?? 0,
      issues_count: issues.length,
      results,
      issues,
      checked_at: new Date().toISOString(),
    });

  } catch (e) {
    console.error("Health check error:", e);
    return error(String(e), 500);
  }
});
