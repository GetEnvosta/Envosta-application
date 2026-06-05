/**
 * Server-side data loader for the per-site add-on management section.
 *
 * Combines two reads:
 *   - getActiveAddons() — all sell-able plan_addon products
 *   - getSiteAddons(siteId) — what's currently active on THIS site
 *
 * Resolves the customer's billing period (monthly/yearly) from their
 * account subscription so the price column matches what they'll be
 * charged. Renders the interactive client below.
 */
import { getActiveAddons, getSiteAddons } from '@/services/addons';
import { getSiteBillingPeriod } from '@/services/billing';
import { SiteAddonsClient, type SiteAddonRow } from './site-addons-client';

interface AddonEffects {
  php_workers?: number;
  php_memory_mb?: number;
  bursting_enabled?: boolean;
  burst_php_workers?: number;
  jetpack_backup_enabled?: boolean;
  jetpack_cdn_enabled?: boolean;
  jetpack_waf_enabled?: boolean;
}

/**
 * Pretty-print an addon's effects metadata into a single line shown in
 * the UI under the description. Returns null if no effects declared.
 */
function summarizeEffects(metadata: Record<string, any> | null | undefined): string | null {
  const eff = (metadata?.effects ?? null) as AddonEffects | null;
  if (!eff) return null;
  const parts: string[] = [];
  if (eff.php_workers) parts.push(`${eff.php_workers} PHP workers`);
  if (eff.php_memory_mb) parts.push(`${eff.php_memory_mb}MB PHP memory`);
  if (eff.bursting_enabled) parts.push('Bursting enabled');
  if (eff.burst_php_workers) parts.push(`up to ${eff.burst_php_workers} burst workers`);
  // Group Jetpack flags into one chip when all 3 are on (the "complete" pack);
  // otherwise list them individually.
  if (eff.jetpack_backup_enabled && eff.jetpack_cdn_enabled && eff.jetpack_waf_enabled) {
    parts.push('Jetpack Backup + CDN + WAF');
  } else {
    if (eff.jetpack_backup_enabled) parts.push('Jetpack Backup');
    if (eff.jetpack_cdn_enabled) parts.push('Jetpack CDN');
    if (eff.jetpack_waf_enabled) parts.push('Jetpack WAF');
  }
  return parts.length > 0 ? `→ ${parts.join(' · ')}` : null;
}

export async function SiteAddons({ siteId }: { siteId: string; userId: string }) {
  const [available, active, billingPeriod] = await Promise.all([
    getActiveAddons(),
    getSiteAddons(siteId),
    getSiteBillingPeriod(siteId),
  ]);

  const activeProductIds = new Set(active.map((a) => a.product_id));

  const rows: SiteAddonRow[] = (available ?? []).map((a) => ({
    productId: a.id,
    slug: a.slug,
    name: a.name,
    description: a.description,
    priceCadMonthly: a.price_cad,
    priceCadYearly: a.price_yearly_cad,
    isActive: activeProductIds.has(a.id),
    effectsSummary: summarizeEffects(a.metadata),
  }));

  return <SiteAddonsClient siteId={siteId} rows={rows} billingPeriod={billingPeriod} />;
}
