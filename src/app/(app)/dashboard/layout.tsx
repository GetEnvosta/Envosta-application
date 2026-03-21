import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url, role')
    .eq('id', user.id)
    .single();

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
