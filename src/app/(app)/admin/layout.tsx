import { getCurrentUser, getUserProfile } from '@/services/auth';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';
import { isStaffRole } from '@/lib/roles';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const profile = await getUserProfile(user.id);
  if (!isStaffRole(profile?.role)) redirect('/dashboard');

  return (
    <AdminShell user={profile} email={user.email ?? ''} role={profile?.role ?? 'customer'}>
      {children}
    </AdminShell>
  );
}
