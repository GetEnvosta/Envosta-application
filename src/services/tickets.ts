import { createClient } from '@/lib/supabase-server';

/**
 * Get all tickets for current user (customer view).
 */
export async function getUserTickets(typeFilter?: string, userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('tickets')
    .select('*, ticket_messages(id, sender, message, created_at)')
    .order('updated_at', { ascending: false });

  if (typeFilter && typeFilter !== 'all') {
    query = query.eq('type', typeFilter);
  }
  if (userId) query = query.eq('user_id', userId);

  const { data } = await query;
  return data ?? [];
}

/**
 * Get a single ticket with all messages.
 */
export async function getTicketById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tickets')
    .select('*, ticket_messages(id, sender, message, is_draft, created_at), services(label, wp_cloud_url, status), users(full_name, email)')
    .eq('id', id)
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
    query = query.or(`subject.ilike.%${filters.q}%,contact_name.ilike.%${filters.q}%,contact_email.ilike.%${filters.q}%`);
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
      sites(id, label, wp_cloud_url, status, products(name, slug)),
      ticket_messages(id, sender, message, is_draft, created_at)
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

    const { data: subs } = await supabase
      .from('subscriptions')
      .select('products(name)')
      .eq('status', 'active')
      .limit(1);

    customerContext = {
      name: (ticket.users as any)?.full_name,
      email: (ticket.users as any)?.email,
      memberSince: (ticket.users as any)?.created_at,
      plan: (subs as any)?.[0]?.products?.name ?? null,
      siteUrl: (ticket.services as any)?.wp_cloud_url,
      siteStatus: (ticket.services as any)?.status,
      onboardingStage: (ticket.services as any)?.onboarding_status,
      totalTickets: ticketCount ?? 0,
    };
  }

  return { ticket, customerContext };
}
