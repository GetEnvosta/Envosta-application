import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  return (
    <AdminShell user={profile} email={user.email ?? ''}>
      {children}
    </AdminShell>
  );
}
