import '../globals.css';
import { getCurrentUser, getUserProfile } from '@/services/auth';
import { redirect } from 'next/navigation';
import { isStaffRole } from '@/lib/roles';

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const profile = await getUserProfile(user.id);
  if (!isStaffRole(profile?.role)) redirect('/dashboard');

  return (
    <div className="font-sans h-screen overflow-hidden bg-white">
      {children}
    </div>
  );
}
