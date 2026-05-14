/**
 * TLDs service — read helpers for the public.tlds catalog.
 *
 * Phase 3 architecture:
 *   - public.tlds replaces the old type='domain_tld' rows in public.products.
 *   - NO Stripe Products for TLDs. Checkout uses inline `price_data`
 *     computed from `tlds` at the moment of charge.
 *   - Renewals are cron-fired off-session PaymentIntents, not recurring
 *     Stripe Subscriptions.
 *
 * All prices stored in CENTS. CAD is primary (required, NOT NULL on the
 * register/renew CAD columns). USD is secondary (nullable).
 */
import { createClient } from '@/lib/supabase-server';

export interface Tld {
  id: string;
  tld: string;
  display_name: string;
  registry: string | null;
  is_active: boolean;
  requires_documentation: boolean;
  description: string | null;
  register_price_cad_cents: number;
  renew_price_cad_cents: number;
  transfer_price_cad_cents: number | null;
  redemption_price_cad_cents: number | null;
  register_price_usd_cents: number | null;
  renew_price_usd_cents: number | null;
  transfer_price_usd_cents: number | null;
  redemption_price_usd_cents: number | null;
  min_registration_years: number;
  max_registration_years: number;
  metadata: any;
}

// ─── Reads ────────────────────────────────────────────────

export async function getActiveTlds(): Promise<Tld[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tlds')
    .select('*')
    .eq('is_active', true)
    .order('tld', { ascending: true });
  return (data ?? []) as Tld[];
}

export async function getAllTlds(): Promise<Tld[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tlds')
    .select('*')
    .order('tld', { ascending: true });
  return (data ?? []) as Tld[];
}

export async function getTldByName(tld: string): Promise<Tld | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tlds')
    .select('*')
    .eq('tld', tld.toLowerCase())
    .maybeSingle();
  return (data as Tld | null) ?? null;
}

// ─── Pricing helpers ──────────────────────────────────────

/**
 * Compute the total registration price for N years.
 *
 * Two-tier model: year 1 = register_price; years 2+ = renew_price.
 * Both prices are CENTS. Returns null if the TLD doesn't exist, isn't
 * active, or the requested currency has no USD price configured.
 */
export async function getRegisterPriceCents(
  tld: string,
  currency: 'cad' | 'usd',
  years: number,
): Promise<number | null> {
  if (years < 1) return null;
  const row = await getTldByName(tld);
  if (!row || !row.is_active) return null;

  if (currency === 'cad') {
    const reg = row.register_price_cad_cents;
    const ren = row.renew_price_cad_cents;
    return reg + Math.max(0, years - 1) * ren;
  }

  // USD
  const reg = row.register_price_usd_cents;
  const ren = row.renew_price_usd_cents;
  if (reg == null || ren == null) return null;
  return reg + Math.max(0, years - 1) * ren;
}

/**
 * Renewal price for N years (default 1). Returns null on missing TLD
 * or missing USD price when requested.
 */
export async function getRenewPriceCents(
  tld: string,
  currency: 'cad' | 'usd',
  years: number = 1,
): Promise<number | null> {
  if (years < 1) return null;
  const row = await getTldByName(tld);
  if (!row || !row.is_active) return null;

  if (currency === 'cad') return row.renew_price_cad_cents * years;
  if (row.renew_price_usd_cents == null) return null;
  return row.renew_price_usd_cents * years;
}
