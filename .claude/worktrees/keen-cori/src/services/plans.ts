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

export async function getDomainPricing() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('type', 'domain_tld')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getTldPricing(tld: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('type', 'domain_tld')
    .eq('slug', `tld-${tld.toLowerCase()}`)
    .eq('is_active', true)
    .single();
  return data;
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
