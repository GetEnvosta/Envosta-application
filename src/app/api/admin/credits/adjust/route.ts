import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import { adjustCredits } from '@/services/credits';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { userId, amount, description } = await req.json();
  if (!userId || !amount || !description) {
    return NextResponse.json({ error: 'userId, amount, and description are required' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount === 0) {
    return NextResponse.json({ error: 'amount must be a non-zero number' }, { status: 400 });
  }

  const result = await adjustCredits(userId, amount, description, user.id);
  return NextResponse.json(result);
}
