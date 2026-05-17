import { redirect } from 'next/navigation';

export default function LegacyNewPlanRedirect() {
  redirect('/admin/settings/plans/new');
}
