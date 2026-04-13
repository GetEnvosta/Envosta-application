import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
export { isStaffRole, STAFF_ROLES, type StaffRole, type UserRole } from '@/lib/roles';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the effective user ID for dashboard pages.
 * Admins can impersonate any customer.
 * Partners can manage (impersonate) their own clients.
 */
export async function getEffectiveUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const impersonating = cookieStore.get('impersonating_user_id')?.value;

  if (impersonating) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Admin can impersonate anyone
    if (profile?.role === 'admin') return impersonating;

    // Partner can only manage their own clients
    if (profile?.role === 'partner') {
      const { data: target } = await supabase
        .from('users')
        .select('partner_id')
        .eq('id', impersonating)
        .single();
      if (target?.partner_id === user.id) return impersonating;
    }
  }

  return user.id;
}

/**
 * Returns impersonation/managing info if active, null otherwise.
 * Includes `mode` ('admin' | 'partner') so the UI can show the correct banner.
 */
export async function getImpersonationInfo() {
  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_user_id')?.value;
  if (!impersonatingId) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: callerProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = callerProfile?.role;

  if (role === 'admin') {
    const { data: target } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', impersonatingId)
      .single();
    return target ? { ...target, mode: 'admin' as const } : null;
  }

  if (role === 'partner') {
    const { data: target } = await supabase
      .from('users')
      .select('id, full_name, email, partner_id')
      .eq('id', impersonatingId)
      .single();
    if (target?.partner_id === user.id) {
      return { id: target.id, full_name: target.full_name, email: target.email, mode: 'partner' as const };
    }
  }

  return null;
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, role, partner_id')
    .eq('id', userId)
    .single();
  return data;
}
