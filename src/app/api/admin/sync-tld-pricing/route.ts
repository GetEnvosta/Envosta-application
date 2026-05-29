/**
 * POST /api/admin/sync-tld-pricing
 *
 * Admin-only. Two modes:
 *
 *  - mode: 'preview'  → For every ACTIVE TLD, look up the OpenSRS standard
 *    registration price (by probing a synthetic available domain), then compute
 *    proposed retail prices:
 *        USD = round(openSrsUsd * 1.25)        (25% markup, USD is the anchor)
 *        CAD = round(USD * usdToCad)           (FX-converted from the USD price)
 *    Returns the per-TLD comparison. Writes NOTHING.
 *
 *  - mode: 'apply'    → Writes the reviewed { tld, usdCents, cadCents } items to
 *    public.tlds (register_price_usd_cents / register_price_cad_cents). Re-checks
 *    admin auth + sane bounds; does NOT re-hit OpenSRS (writes what was previewed).
 *
 * Only the REGISTER price is synced — the OpenSRS availability lookup returns the
 * registration price only. Renewal/transfer/redemption are untouched.
 *
 * OpenSRS calls originate from whitelisted Vercel IPs, so this cannot be
 * exercised from local dev — verify on deploy.
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { isAdminRole } from '@/lib/roles';
import { createOpenSrsClient } from '@/lib/integrations/opensrs';
import { getUsdToCadRate } from '@/lib/fx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120; // OpenSRS lookup per TLD; allow headroom

const MARKUP = 1.25; // 25% increase over OpenSRS cost
const MIN_CENTS = 50; // $0.50 — reject absurdly low computed/applied prices
const MAX_CENTS = 500_000; // $5,000 — reject absurdly high (also dodges premium names)
const PROBE_CONCURRENCY = 5;

interface PreviewRow {
  tld: string;
  displayName: string;
  status: 'ok' | 'error';
  error?: string;
  openSrsUsd: number | null; // dollars, as returned by OpenSRS
  currentUsdCents: number | null;
  currentCadCents: number | null;
  proposedUsdCents: number | null;
  proposedCadCents: number | null;
}

interface ApplyItem {
  tld: string;
  usdCents: number;
  cadCents: number;
}

function inBounds(cents: number): boolean {
  return Number.isInteger(cents) && cents >= MIN_CENTS && cents <= MAX_CENTS;
}

/** Run `fn` over `items` with a small concurrency cap (sequential batches). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}

export async function POST(req: Request) {
  // ── Auth: admin only (mirrors /api/admin/update-tld-price) ──
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === 'apply' ? 'apply' : 'preview';
  const sb = serviceClient();

  // ────────────────────────────── APPLY ──────────────────────────────
  if (mode === 'apply') {
    const items: any[] = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'No items to apply' }, { status: 400 });
    }

    let applied = 0;
    const errors: { tld: string; error: string }[] = [];
    for (const item of items) {
      const tld = String(item?.tld ?? '').toLowerCase().trim();
      const usdCents = Number(item?.usdCents);
      const cadCents = Number(item?.cadCents);
      if (!tld) { errors.push({ tld: '(blank)', error: 'missing tld' }); continue; }
      if (!inBounds(usdCents) || !inBounds(cadCents)) {
        errors.push({ tld, error: `price out of range ($${MIN_CENTS / 100}–$${MAX_CENTS / 100})` });
        continue;
      }
      const { error } = await sb
        .from('tlds')
        .update({
          register_price_usd_cents: usdCents,
          register_price_cad_cents: cadCents,
          updated_at: new Date().toISOString(),
        })
        .eq('tld', tld);
      if (error) errors.push({ tld, error: error.message });
      else applied++;
    }

    return NextResponse.json({ success: true, applied, errors });
  }

  // ───────────────────────────── PREVIEW ─────────────────────────────
  // Resolve FX: honor a manual override from the client, else fetch live.
  let fxRate: number;
  let fxSource: string;
  const override = Number(body?.fxRate);
  if (Number.isFinite(override) && override > 0) {
    fxRate = override;
    fxSource = 'manual';
  } else {
    const fx = await getUsdToCadRate();
    fxRate = fx.rate;
    fxSource = fx.source;
  }

  const { data: tlds, error: tldErr } = await sb
    .from('tlds')
    .select('tld, display_name, register_price_usd_cents, register_price_cad_cents')
    .eq('is_active', true)
    .order('tld', { ascending: true });
  if (tldErr) return NextResponse.json({ error: tldErr.message }, { status: 500 });

  const client = createOpenSrsClient();

  const rows = await mapLimit(tlds ?? [], PROBE_CONCURRENCY, async (t: any): Promise<PreviewRow> => {
    const base: PreviewRow = {
      tld: t.tld,
      displayName: t.display_name,
      status: 'error',
      openSrsUsd: null,
      currentUsdCents: t.register_price_usd_cents ?? null,
      currentCadCents: t.register_price_cad_cents ?? null,
      proposedUsdCents: null,
      proposedCadCents: null,
    };

    // Probe a synthetic, almost-certainly-available name to read the standard
    // (non-premium) registry price for this TLD.
    const probe = `envosta-pc-${Math.random().toString(36).slice(2, 12)}.${t.tld}`;
    try {
      const res = await client.checkAvailability(probe);
      if (!res.available) return { ...base, error: 'Probe domain unexpectedly taken — re-run' };
      if (typeof res.price !== 'number' || !(res.price > 0)) {
        return { ...base, error: 'OpenSRS returned no price' };
      }
      const proposedUsdCents = Math.round(res.price * MARKUP * 100);
      const proposedCadCents = Math.round(proposedUsdCents * fxRate);
      if (!inBounds(proposedUsdCents) || !inBounds(proposedCadCents)) {
        return { ...base, openSrsUsd: res.price, error: 'Computed price out of range' };
      }
      return {
        ...base,
        status: 'ok',
        openSrsUsd: res.price,
        proposedUsdCents,
        proposedCadCents,
      };
    } catch (e) {
      return { ...base, error: e instanceof Error ? e.message : String(e) };
    }
  });

  const okCount = rows.filter(r => r.status === 'ok').length;
  return NextResponse.json({
    success: true,
    markup: MARKUP,
    fxRate,
    fxSource,
    counts: { total: rows.length, ok: okCount, failed: rows.length - okCount },
    rows,
  });
}
