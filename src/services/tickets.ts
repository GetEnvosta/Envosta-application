/**
 * Support ticket reads. Tickets are scoped per-user; sales/onboarding
 * tickets are filtered out of customer views and only surface in admin.
 *
 * Replies and status changes go through /api/tickets/* which writes to
 * `ticket_messages` and updates `tickets.updated_at` for ordering.
 */
import { createClient } from '@/lib/supabase-server';
import { sanitizeSearchQuery } from '@/lib/sanitize';

/**
 * Get all tickets for current user (customer view).
 * Excludes sales tickets — those are admin-only.
 */
export async function getUserTickets(typeFilter?: string, userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('tickets')
    .select('*, ticket_messages(id, sender, message, created_at)')
    .neq('type', 'onboarding')
    .order('updated_at', { ascending: false });

  if (typeFilter && typeFilter !== 'all') {
    query = query.eq('type', typeFilter);
  }
  if (userId) query = query.eq('user_id', userId);

  const { data } = await query;
  return data ?? [];
}

/**
 * Get a single ticket with all messages, scoped to user.
 * Sales tickets are blocked for non-admin users.
 */
export async function getTicketById(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tickets')
    .select('*, ticket_messages(id, sender, message, created_at), users(full_name, email)')
    .eq('id', id)
    .eq('user_id', userId)
    .neq('type', 'onboarding')
    .single();
  return data;
}

/**
 * Admin: get all tickets with filters.
 */
export async function getAllTickets(filters?: { type?: string; status?: string; q?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from('tickets')
    .select('*, users(full_name, email), ticket_messages(id, sender, created_at)')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.q) {
    const safeQ = sanitizeSearchQuery(filters.q);
    query = query.or(`subject.ilike.%${safeQ}%`);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * Admin: ticket counts by status.
 */
export async function getTicketCounts() {
  const supabase = await createClient();
  const [
    { count: openCount },
    { count: inProgressCount },
    { count: totalCount },
  ] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'in-progress'),
    supabase.from('tickets').select('id', { count: 'exact', head: true }),
  ]);

  return {
    open: openCount ?? 0,
    inProgress: inProgressCount ?? 0,
    total: totalCount ?? 0,
  };
}

/**
 * Admin: get full ticket detail with customer context.
 */
/**
 * Admin: recent tickets by type for dashboard.
 */
export async function getRecentTicketsByType(type: string, limit: number = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tickets')
    .select('id, subject, type, status, priority, created_at, updated_at, metadata, users(full_name, email)')
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getAdminTicketDetail(id: string) {
  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      *,
      users(id, full_name, email, created_at),
      ticket_messages(id, sender, message, created_at)
    `)
    .eq('id', id)
    .single();

  if (!ticket) return null;

  // Get customer context
  let customerContext = null;
  if (ticket.user_id) {
    const { count: ticketCount } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ticket.user_id);

    // Look up the customer's plan via the new billing helper. Reads
    // from stripe.* + joins public.products for the plan name.
    const { getAccountSubscriptionWithProduct } = await import('@/services/billing');
    const sub = await getAccountSubscriptionWithProduct(ticket.user_id);

    customerContext = {
      name: (ticket.users as any)?.full_name,
      email: (ticket.users as any)?.email,
      memberSince: (ticket.users as any)?.created_at,
      plan: sub?.product?.name ?? null,
      totalTickets: ticketCount ?? 0,
    };
  }

  return { ticket, customerContext };
}
