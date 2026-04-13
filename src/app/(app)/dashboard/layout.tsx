import { getCurrentUser, getUserProfile, getImpersonationInfo } from '@/services/auth';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ImpersonationBanner } from '@/components/layout/impersonation-banner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const impersonation = await getImpersonationInfo();
  const profileUserId = impersonation?.id ?? user.id;
  const profile = await getUserProfile(profileUserId);

  return (
    <DashboardShell
      user={{
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? user.email ?? '',
        avatar_url: null,
        role: profile?.role ?? 'customer',
        partner_id: profile?.partner_id ?? null,
      }}
      impersonationBanner={
        impersonation ? (
          <ImpersonationBanner
            targetName={impersonation.full_name}
            targetEmail={impersonation.email}
            mode={impersonation.mode}
          />
        ) : null
      }
    >
      {children}
    </DashboardShell>
  );
}
