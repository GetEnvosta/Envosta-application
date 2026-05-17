import { redirect } from 'next/navigation';

/**
 * Legacy path. Products management has moved under /admin/settings/*.
 * Preserve old bookmarks by redirecting type-aware:
 *   - hosting_plan / no type  → /admin/settings/plans
 *   - domain_tld              → /admin/settings/tlds
 *   - plan_addon / one_time_service → /admin/settings/products
 */
export default async function LegacyProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (type === 'domain_tld') redirect('/admin/settings/tlds');
  if (type === 'plan_addon' || type === 'one_time_service') {
    redirect(`/admin/settings/products?type=${type}`);
  }
  redirect('/admin/settings/plans');
}
