import { createClient } from '@/lib/supabase-server';

// ── Partner Profile ────────────────────────────────────────

export async function getPartnerProfile(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('partner_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) return null;

  // Get avg rating and client count
  const [{ data: ratingData }, { count: clientCount }] = await Promise.all([
    supabase.rpc('fn_calculate_partner_avg_rating', { p_partner_id: userId }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('partner_id', userId),
  ]);

  const { data: user } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  return {
    ...profile,
    full_name: user?.full_name ?? null,
    email: user?.email ?? null,
    avg_rating: Number(ratingData ?? 0),
    client_count: clientCount ?? 0,
  };
}

export async function updatePartnerProfile(
  userId: string,
  updates: {
    bio?: string;
    specializations?: string[];
    industries?: string[];
    portfolio_links?: any[];
    location?: string;
    setup_fee_range?: string;
    photo_url?: string;
  },
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('partner_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  return data;
}

// ── Marketplace ────────────────────────────────────────────

export async function getApprovedPartners(filters?: {
  specialization?: string;
  industry?: string;
  minRating?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from('partner_profiles')
    .select('*, users(id, full_name, email)')
    .eq('status', 'approved')
    .order('featured', { ascending: false })
    .order('applied_at', { ascending: true });

  if (filters?.specialization) {
    query = query.contains('specializations', [filters.specialization]);
  }
  if (filters?.industry) {
    query = query.contains('industries', [filters.industry]);
  }

  const { data: profiles } = await query;
  if (!profiles?.length) return [];

  // Enrich with ratings and client counts
  const enriched = await Promise.all(
    profiles.map(async (p: any) => {
      const [{ data: ratingData }, { count: clientCount }] = await Promise.all([
        supabase.rpc('fn_calculate_partner_avg_rating', { p_partner_id: p.user_id }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('partner_id', p.user_id),
      ]);
      const avgRating = Number(ratingData ?? 0);

      if (filters?.minRating && avgRating < filters.minRating) return null;

      return {
        ...p,
        full_name: p.users?.full_name ?? null,
        email: p.users?.email ?? null,
        avg_rating: avgRating,
        client_count: clientCount ?? 0,
      };
    }),
  );

  return enriched.filter(Boolean);
}

// ── Partner Clients ────────────────────────────────────────

export async function getPartnerClients(partnerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, created_at, credit_balances(subscription_credits, purchased_credits)')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (!data) return [];

  // Get site counts per client
  const enriched = await Promise.all(
    data.map(async (client: any) => {
      const { count } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', client.id)
        .in('status', ['active', 'provisioning']);

      const bal = client.credit_balances?.[0] ?? client.credit_balances;
      return {
        id: client.id,
        full_name: client.full_name,
        email: client.email,
        created_at: client.created_at,
        sites_count: count ?? 0,
        credit_balance: (bal?.subscription_credits ?? 0) + (bal?.purchased_credits ?? 0),
      };
    }),
  );

  return enriched;
}

export async function getPartnerClientDetail(partnerId: string, clientId: string) {
  const supabase = await createClient();

  // Verify this client belongs to this partner
  const { data: client } = await supabase
    .from('users')
    .select('id, full_name, email, created_at')
    .eq('id', clientId)
    .eq('partner_id', partnerId)
    .single();

  if (!client) return null;

  const [{ data: sites }, { data: domains }, { data: balance }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, label, status, domain_name, config, products(name, slug)')
      .eq('user_id', clientId)
      .not('status', 'in', '("cancelled","deleted")'),
    supabase
      .from('domains')
      .select('id, domain_name, tld, status, expiry_date')
      .eq('user_id', clientId)
      .not('status', 'eq', 'deleted'),
    supabase
      .from('credit_balances')
      .select('subscription_credits, purchased_credits')
      .eq('user_id', clientId)
      .maybeSingle(),
  ]);

  return {
    ...client,
    sites: sites ?? [],
    domains: domains ?? [],
    credit_balance: {
      subscription: balance?.subscription_credits ?? 0,
      purchased: balance?.purchased_credits ?? 0,
      total: (balance?.subscription_credits ?? 0) + (balance?.purchased_credits ?? 0),
    },
  };
}

// ── Partner Tickets ────────────────────────────────────────

export async function getPartnerTickets(partnerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tickets')
    .select('*, users(full_name, email)')
    .eq('partner_id', partnerId)
    .order('updated_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getPartnerTicketDetail(ticketId: string, partnerId: string) {
  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, users(full_name, email)')
    .eq('id', ticketId)
    .eq('partner_id', partnerId)
    .single();

  if (!ticket) return null;

  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  return { ...ticket, messages: messages ?? [] };
}

// ── Partner Earnings ───────────────────────────────────────

export async function getPartnerCommissions(partnerId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('commissions')
    .select('*, users:customer_id(full_name, email)')
    .eq('earner_id', partnerId)
    .eq('type', 'partner')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getPartnerEarningStats(partnerId: string) {
  const supabase = await createClient();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const { data: commissions } = await supabase
    .from('commissions')
    .select('amount_cad, created_at, status')
    .eq('earner_id', partnerId)
    .eq('type', 'partner');

  let thisMonth = 0, lastMonth = 0, allTime = 0;
  for (const c of commissions ?? []) {
    allTime += c.amount_cad;
    if (c.created_at >= thisMonthStart) thisMonth += c.amount_cad;
    else if (c.created_at >= lastMonthStart) lastMonth += c.amount_cad;
  }

  return { thisMonth, lastMonth, allTime, count: commissions?.length ?? 0 };
}

// ── Commission Rate ────────────────────────────────────────

export function calculatePartnerCommissionRate(avgRating: number): number {
  if (avgRating >= 4.5) return 0.25;
  if (avgRating >= 4.0) return 0.20;
  return 0.15;
}

// ── Application ────────────────────────────────────────────

export async function applyAsPartner(
  userId: string,
  profileData: {
    bio: string;
    specializations: string[];
    industries: string[];
    portfolio_links?: any[];
    location?: string;
    setup_fee_range?: string;
    company_name?: string;
    website?: string;
  },
) {
  const supabase = await createClient();

  // Check if already applied
  const { data: existing } = await supabase
    .from('partner_profiles')
    .select('user_id, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return { error: `Application already exists (status: ${existing.status})`, data: null };
  }

  const { data, error } = await supabase
    .from('partner_profiles')
    .insert({
      user_id: userId,
      bio: profileData.bio,
      specializations: profileData.specializations,
      industries: profileData.industries,
      portfolio_links: profileData.portfolio_links ?? [],
      location: profileData.location ?? null,
      setup_fee_range: profileData.setup_fee_range ?? null,
      metadata: {
        company_name: profileData.company_name,
        website: profileData.website,
      },
    })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

// ── Rating ─────────────────────────────────────────────────

export async function ratePartner(
  clientId: string,
  partnerId: string,
  rating: number,
  comment?: string,
) {
  const supabase = await createClient();

  // Verify client actually has this partner
  const { data: client } = await supabase
    .from('users')
    .select('partner_id')
    .eq('id', clientId)
    .single();

  if (client?.partner_id !== partnerId) {
    return { error: 'This is not your assigned partner' };
  }

  const { data, error } = await supabase
    .from('partner_ratings')
    .upsert(
      { partner_id: partnerId, client_id: clientId, rating, comment },
      { onConflict: 'partner_id,client_id' },
    )
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

// ── Change Request ─────────────────────────────────────────

export async function requestPartnerChange(clientId: string, reason: string) {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('users')
    .select('partner_id')
    .eq('id', clientId)
    .single();

  if (!client?.partner_id) {
    return { error: 'You do not have a partner assigned' };
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('partner_change_requests')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return { error: 'You already have a pending change request' };
  }

  const { data, error } = await supabase
    .from('partner_change_requests')
    .insert({
      client_id: clientId,
      current_partner_id: client.partner_id,
      reason,
    })
    .select()
    .single();

  return { data, error: error?.message ?? null };
}

// ── Client's Partner Info ──────────────────────────────────

export async function getClientPartnerInfo(clientId: string) {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from('users')
    .select('partner_id')
    .eq('id', clientId)
    .single();

  if (!client?.partner_id) return null;
  return getPartnerProfile(client.partner_id);
}

// ── Admin Functions ────────────────────────────────────────

export async function getPartnerApplications(statusFilter?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('partner_profiles')
    .select('*, users(full_name, email)')
    .order('applied_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);
  const { data } = await query;
  return data ?? [];
}

export async function adminReviewPartner(
  userId: string,
  action: 'approve' | 'reject' | 'suspend' | 'remove',
  adminNotes?: string,
) {
  const supabase = await createClient();

  if (action === 'approve') {
    await supabase
      .from('partner_profiles')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('user_id', userId);
    await supabase
      .from('users')
      .update({ role: 'partner' })
      .eq('id', userId);
  } else if (action === 'reject' || action === 'remove') {
    await supabase
      .from('partner_profiles')
      .update({ status: 'removed' })
      .eq('user_id', userId);
    // Revert role to customer if removing
    if (action === 'remove') {
      await supabase.from('users').update({ role: 'customer' }).eq('id', userId);
      // Unassign all clients
      await supabase.from('users').update({ partner_id: null }).eq('partner_id', userId);
    }
  } else if (action === 'suspend') {
    await supabase
      .from('partner_profiles')
      .update({ status: 'suspended' })
      .eq('user_id', userId);
  }

  return { success: true };
}

export async function togglePartnerFeatured(userId: string, featured: boolean) {
  const supabase = await createClient();
  await supabase
    .from('partner_profiles')
    .update({ featured })
    .eq('user_id', userId);
}

export async function getPartnerChangeRequests(statusFilter?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('partner_change_requests')
    .select('*, client:client_id(full_name, email), partner:current_partner_id(full_name, email)')
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);
  const { data } = await query;
  return data ?? [];
}

export async function resolvePartnerChangeRequest(
  requestId: string,
  action: 'approve' | 'deny',
  newPartnerId?: string,
  adminNotes?: string,
) {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from('partner_change_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request || request.status !== 'pending') {
    return { error: 'Request not found or already resolved' };
  }

  if (action === 'approve') {
    // Update the client's partner_id
    await supabase
      .from('users')
      .update({ partner_id: newPartnerId ?? null })
      .eq('id', request.client_id);

    await supabase
      .from('partner_change_requests')
      .update({
        status: 'approved',
        new_partner_id: newPartnerId ?? null,
        admin_notes: adminNotes,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  } else {
    await supabase
      .from('partner_change_requests')
      .update({
        status: 'denied',
        admin_notes: adminNotes,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  }

  return { success: true };
}
