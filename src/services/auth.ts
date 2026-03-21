import { createClient } from '@/lib/supabase-server';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url, role')
    .eq('id', userId)
    .single();
  return data;
}
