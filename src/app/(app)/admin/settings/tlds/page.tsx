export const revalidate = 5;

import { Globe } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { TldsTable } from './tlds-table';
import { SyncPricingButton } from './sync-pricing';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

export default async function TldsSettingsPage() {
  const sb = getSupabase();
  const { data } = await sb
    .from('tlds')
    .select('id, tld, display_name, registry, is_active, register_price_cad_cents, renew_price_cad_cents, register_price_usd_cents, renew_price_usd_cents, min_registration_years, max_registration_years')
    .order('tld', { ascending: true });

  const tlds = (data ?? []) as any[];
  const active = tlds.filter(t => t.is_active).length;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Domain TLDs</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {tlds.length} TLD{tlds.length === 1 ? '' : 's'} · {active} active. Pricing is inline in <span className="font-mono">public.tlds</span>; no Stripe Products.
        </p>
      </div>

      <div className="card px-5 py-3 mb-4 bg-indigo-50/40 border-indigo-100">
        <p className="text-xs text-gray-600">
          <Globe className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 text-indigo-500" />
          Click any price to edit. Saves go straight to <span className="font-mono">public.tlds</span> via the existing
          <span className="font-mono"> /api/admin/update-tld-price</span> endpoint. Checkout reads inline price_data —
          no Stripe sync needed.
        </p>
      </div>

      <div className="mb-4">
        <SyncPricingButton />
      </div>

      <TldsTable tlds={tlds} />
    </div>
  );
}
