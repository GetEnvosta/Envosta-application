/**
 * Plans/products service — hosting plans, addons, and domain pricing
 * rows from the `products` table. Used by the marketing pricing page,
 * the signup flow, and admin product management.
 *
 * Stripe-side product/price sync is handled by /api/admin/stripe/* and
 * the stripe-webhook edge function; this file is local DB reads only.
 */
import { createClient } from '@/lib/supabase-server';

// ─── HOSTING PLANS ───────────────────────────────────────

export async function getActivePlans() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('type', 'hosting_plan')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getAllPlans() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('type', 'hosting_plan')
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getPlanById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export async function getPlanBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('type', 'hosting_plan')
    .eq('slug', slug)
    .single();
  return data;
}

// ─── DOMAIN TLDs ─────────────────────────────────────────
// Phase 3: TLD pricing moved to public.tlds — use @/services/tlds.
// These shim functions stay for callers we haven't migrated yet so the
// type checker still accepts their import path.

import { getActiveTlds, getTldByName, type Tld } from './tlds';

export async function getDomainPricing(): Promise<Tld[]> {
  return getActiveTlds();
}

export async function getTldPricing(tld: string): Promise<Tld | null> {
  return getTldByName(tld);
}

// ─── ALL PRODUCTS ────────────────────────────────────────

export async function getAllProducts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getProductsByType(type: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('type', type)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}
