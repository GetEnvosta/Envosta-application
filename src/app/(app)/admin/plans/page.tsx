/**
 * Legacy redirect — plan CRUD moved to /admin/settings/plans.
 * (Previously this redirected to /admin/products/plans which itself
 * redirects to settings — short-circuited to one hop.)
 */
import { redirect } from 'next/navigation';

export default function LegacyPlansRedirect() {
  redirect('/admin/settings/plans');
}
