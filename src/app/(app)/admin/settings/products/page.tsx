/**
 * Legacy combined Add-ons + Services page. Now split into two dedicated
 * tabs: /admin/settings/addons and /admin/settings/services. This route
 * redirects to the Add-ons tab so any old bookmarks / direct links still
 * land somewhere sensible.
 */
import { redirect } from 'next/navigation';

export default async function LegacyProductsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  // Honour ?type=one_time_service for old links that linked deep here.
  const { type } = await searchParams;
  if (type === 'one_time_service') redirect('/admin/settings/services');
  redirect('/admin/settings/addons');
}
