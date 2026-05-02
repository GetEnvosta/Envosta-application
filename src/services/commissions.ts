/**
 * Commission queries powering the partner program payout views.
 *
 * Commissions are written by the stripe-webhook edge function whenever
 * a partner-attributed invoice is paid. This file is read-only — payout
 * status mutations happen through /api/admin/commissions/*.
 */
import { createClient } from '@/lib/supabase-server';

export interface CommissionFilters {
  type?: string;
  status?: string;
  earner_id?: string;
  q?: string;
}

/**
 * All commissions with optional filters (admin view).
 */
export async function getAllCommissions(filters?: CommissionFilters, limit = 50) {
  const supabase = await createClient();

  let query = supabase
    .from('commissions')
    .select('*, earner:users!commissions_earner_id_fkey(id, full_name, email, role), customer:users!commissions_customer_id_fkey(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.earner_id) query = query.eq('earner_id', filters.earner_id);

  const { data } = await query;
  return data ?? [];
}

/**
 * Commission stats: totals by status.
 */
export async function getCommissionStats() {
  const supabase = await createClient();

  const [
    { data: pending },
    { data: approved },
    { data: paid },
  ] = await Promise.all([
    supabase.from('commissions').select('amount_cad').eq('status', 'pending'),
    supabase.from('commissions').select('amount_cad').eq('status', 'approved'),
    supabase.from('commissions').select('amount_cad').eq('status', 'paid'),
  ]);

  const sum = (rows: any[] | null) => (rows ?? []).reduce((s, r) => s + (r.amount_cad ?? 0), 0);

  return {
    pendingTotal: sum(pending),
    pendingCount: pending?.length ?? 0,
    approvedTotal: sum(approved),
    approvedCount: approved?.length ?? 0,
    paidTotal: sum(paid),
    paidCount: paid?.length ?? 0,
  };
}

/**
 * Commissions earned by a specific user (staff or customer).
 */
export async function getCommissionsByEarner(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('commissions')
    .select('*, customer:users!commissions_customer_id_fkey(id, full_name, email)')
    .eq('earner_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}
