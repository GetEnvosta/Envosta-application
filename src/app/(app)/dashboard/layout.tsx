import { getCurrentUser, getUserProfile } from '@/services/auth';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const profile = await getUserProfile(user.id);

  return (
    <DashboardShell
      user={{
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? user.email ?? '',
        avatar_url: profile?.avatar_url ?? null,
        role: profile?.role ?? 'customer',
      }}
    >
      {children}
    </DashboardShell>
  );
}
