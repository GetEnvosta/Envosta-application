import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { adminReviewPartner, togglePartnerFeatured } from '@/services/partners';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const { userId, action, featured } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  if (featured !== undefined) {
    await togglePartnerFeatured(userId, featured);
    return NextResponse.json({ success: true });
  }

  if (!['approve', 'reject', 'suspend', 'remove'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const result = await adminReviewPartner(userId, action);
  return NextResponse.json(result);
}
