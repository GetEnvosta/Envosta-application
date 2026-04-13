'use server';

import { cookies } from 'next/headers';
import { getCurrentUser, getUserProfile } from '@/services/auth';
import { redirect } from 'next/navigation';

export async function startImpersonation(targetUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const profile = await getUserProfile(user.id);
  if (profile?.role !== 'admin') throw new Error('Not authorized');

  const cookieStore = await cookies();
  cookieStore.set('impersonating_user_id', targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours max
  });

  redirect('/dashboard');
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete('impersonating_user_id');
  redirect('/admin');
}
