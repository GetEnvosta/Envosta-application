import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single();

  return (
    <DashboardShell user={profile} email={user.email ?? ''} role={profile?.role ?? 'customer'}>
      {children}
    </DashboardShell>
  );
}
