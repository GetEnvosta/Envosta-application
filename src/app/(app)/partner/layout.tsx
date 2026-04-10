import { getCurrentUser, getUserProfile } from '@/services/auth';
import { redirect } from 'next/navigation';
import { PartnerShell } from '@/components/layout/partner-shell';

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const profile = await getUserProfile(user.id);
  if (profile?.role !== 'partner') redirect('/dashboard');

  return (
    <PartnerShell
      user={{
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? user.email ?? '',
      }}
    >
      {children}
    </PartnerShell>
  );
}
