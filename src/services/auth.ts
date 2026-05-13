/**
 * Auth/identity service. Wraps Supabase auth helpers and adds Envosta-
 * specific concerns:
 *
 *   - getCurrentUser           — the authed Supabase user
 *   - getEffectiveUserId       — same, but if an admin is impersonating
 *                                (impersonating_user_id cookie set),
 *                                returns the impersonated user's ID.
 *                                Most route handlers + RSCs should use
 *                                this rather than getCurrentUser so
 *                                impersonation Just Works.
 *   - getUserProfile           — full users row by id
 *
 * Role helpers (isStaffRole, STAFF_ROLES, type StaffRole/UserRole) are
 * re-exported from '@/lib/roles' so callers have one import path.
 */
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

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: callerProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (callerProfile?.role === 'admin') {
    const { data: target } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', impersonatingId)
      .single();
    return target ? { ...target, mode: 'admin' as const } : null;
  }

  return null;
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', userId)
    .single();
  return data;
}
