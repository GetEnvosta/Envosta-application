import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { getServicePricing, updateServicePricing } from '@/services/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pricing = await getServicePricing();
  return NextResponse.json(pricing);
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id, credits_per_unit, is_active, description } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const updates: any = {};
  if (credits_per_unit !== undefined) updates.credits_per_unit = credits_per_unit;
  if (is_active !== undefined) updates.is_active = is_active;
  if (description !== undefined) updates.description = description;

  const result = await updateServicePricing(id, updates);
  return NextResponse.json(result);
}
