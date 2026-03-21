import { createClient } from '@/lib/supabase-server';

/**
 * All active plans ordered by sort_order.
 */
export async function getActivePlans() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

/**
 * Single plan by id.
 */
export async function getPlanById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

/**
 * Single plan by slug.
 */
export async function getPlanBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('plans')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

/**
 * All plans ordered by sort_order (regardless of active status, for admin).
 */
export async function getAllPlans() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true });
  return data ?? [];
}

/**
 * All plans ordered by price ascending (for admin billing page).
 */
export async function getAllPlansByPrice() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true });
  return data ?? [];
}
