/**
 * POST /api/admin/update-tld-price
 *
 * Admin-only. Updates pricing on a row of public.tlds.
 *
 * TLDs have no Stripe Products/Prices — checkouts use inline price_data
 * computed from this row, so there is no Stripe sync involved.
 *
 * Body shape (all cents, all optional except `tld`):
 *   {
 *     tld: string,
 *     register_price_cad_cents?: number,
 *     renew_price_cad_cents?: number,
 *     transfer_price_cad_cents?: number | null,
 *     redemption_price_cad_cents?: number | null,
 *     register_price_usd_cents?: number | null,
 *     renew_price_usd_cents?: number | null,
 *     transfer_price_usd_cents?: number | null,
 *     redemption_price_usd_cents?: number | null,
 *     is_active?: boolean,
 *     display_name?: string,
 *     registry?: string | null,
 *     requires_documentation?: boolean,
 *     description?: string | null,
 *   }
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = new Set([
  'display_name',
  'registry',
  'is_active',
  'requires_documentation',
  'description',
  'register_price_cad_cents',
  'renew_price_cad_cents',
  'transfer_price_cad_cents',
  'redemption_price_cad_cents',
  'register_price_usd_cents',
  'renew_price_usd_cents',
  'transfer_price_usd_cents',
  'redemption_price_usd_cents',
  'min_registration_years',
  'max_registration_years',
]);

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json();
  const tld = String(body.tld ?? '').toLowerCase().trim();
  if (!tld) return NextResponse.json({ error: 'tld required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

  // Only keep recognised, scalar fields to avoid arbitrary writes.
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      updates[key] = body[key];
    }
  }

  const { data: existing, error: lookupErr } = await sb
    .from('tlds')
    .select('id')
    .eq('tld', tld)
    .maybeSingle();
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: `TLD .${tld} not found` }, { status: 404 });

  const { error: updErr } = await sb.from('tlds').update(updates).eq('id', existing.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
