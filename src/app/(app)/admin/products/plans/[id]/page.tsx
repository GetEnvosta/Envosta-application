import { redirect } from 'next/navigation';

export default async function LegacyEditPlanRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/settings/plans/${id}`);
}
