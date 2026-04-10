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
 * If an admin is impersonating a customer, returns the impersonated user's ID.
 * Otherwise returns the authenticated user's ID.
 */
export async function getEffectiveUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const impersonating = cookieStore.get('impersonating_user_id')?.value;

  if (impersonating) {
    // Verify the real user is an admin
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'admin') {
      return impersonating;
    }
  }

  return user.id;
}

/**
 * Returns impersonation info if active, null otherwise.
 */
export async function getImpersonationInfo() {
  const cookieStore = await cookies();
  const impersonatingId = cookieStore.get('impersonating_user_id')?.value;
  if (!impersonatingId) return null;

  // Verify admin
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: adminProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (adminProfile?.role !== 'admin') return null;

  // Get impersonated user info
  const { data: target } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', impersonatingId)
    .single();

  return target;
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
