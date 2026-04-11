import { createClient } from '@/lib/supabase-server';

// ── Partner Profile (from users table) ─────────────────────

export async function getPartnerProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, bio, specializations, industries, portfolio_links, location, setup_fee_range, photo_url, featured, partner_status, partner_applied_at, partner_approved_at')
    .eq('id', userId)
    .single();

  if (!data || data.partner_status !== 'approved') return null;

  // Get client count
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', userId);

  return { ...data, client_count: count ?? 0 };
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
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('bio, specializations, industries, portfolio_links, location, setup_fee_range, photo_url')
    .single();
  return data;
}

// ── Marketplace ────────────────────────────────────────────

export async function getApprovedPartners(filters?: {
  specialization?: string;
  industry?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from('users')
    .select('id, full_name, email, bio, specializations, industries, portfolio_links, location, setup_fee_range, photo_url, featured')
    .eq('role', 'partner')
    .eq('partner_status', 'approved')
    .order('featured', { ascending: false });

  if (filters?.specialization) {
    query = query.contains('specializations', [filters.specialization]);
  }
  if (filters?.industry) {
    query = query.contains('industries', [filters.industry]);
  }

  const { data } = await query;
  if (!data?.length) return [];

  // Enrich with client counts
  const enriched = await Promise.all(
    data.map(async (p: any) => {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', p.id);
      return { ...p, client_count: count ?? 0 };
    }),
  );

  return enriched;
}

// ── Partner Clients ────────────────────────────────────────

export async function getPartnerClients(partnerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, created_at, usage_this_cycle, included_credits')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (!data) return [];

  const enriched = await Promise.all(
    data.map(async (client: any) => {
      const { count } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', client.id)
        .in('status', ['active', 'provisioning']);

      return {
        id: client.id,
        full_name: client.full_name,
        email: client.email,
        created_at: client.created_at,
        sites_count: count ?? 0,
        usage: Number(client.usage_this_cycle ?? 0),
        included: client.included_credits ?? 36,
      };
    }),
  );

  return enriched;
}

export async function getPartnerClientDetail(partnerId: string, clientId: string) {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('users')
    .select('id, full_name, email, created_at, usage_this_cycle, included_credits')
    .eq('id', clientId)
    .eq('partner_id', partnerId)
    .single();

  if (!client) return null;

  const [{ data: sites }, { data: domains }] = await Promise.all([
    supabase
      .from('sites')
      .select('id, label, status, domain_name, config')
      .eq('user_id', clientId)
      .not('status', 'in', '("cancelled","deleted")'),
    supabase
      .from('domains')
      .select('id, domain_name, tld, status, expiry_date')
      .eq('user_id', clientId)
      .not('status', 'eq', 'deleted'),
  ]);

  return {
    ...client,
    sites: sites ?? [],
    domains: domains ?? [],
    usage: Number(client.usage_this_cycle ?? 0),
    included: client.included_credits ?? 36,
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
    .in('type', ['partner', 'affiliate', 'referral'])
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
    .select('amount_cad, created_at')
    .eq('earner_id', partnerId);

  let thisMonth = 0, lastMonth = 0, allTime = 0;
  for (const c of commissions ?? []) {
    allTime += c.amount_cad;
    if (c.created_at >= thisMonthStart) thisMonth += c.amount_cad;
    else if (c.created_at >= lastMonthStart) lastMonth += c.amount_cad;
  }

  return { thisMonth, lastMonth, allTime, count: commissions?.length ?? 0 };
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
  const { data: user } = await supabase
    .from('users')
    .select('partner_status')
    .eq('id', userId)
    .single();

  if (user?.partner_status) {
    return { error: `Application already exists (status: ${user.partner_status})`, data: null };
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      bio: profileData.bio,
      specializations: profileData.specializations,
      industries: profileData.industries,
      portfolio_links: profileData.portfolio_links ?? [],
      location: profileData.location ?? null,
      setup_fee_range: profileData.setup_fee_range ?? null,
      partner_status: 'pending',
      partner_applied_at: new Date().toISOString(),
      metadata: {
        company_name: profileData.company_name,
        website: profileData.website,
      },
    })
    .eq('id', userId)
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
    .from('users')
    .select('id, full_name, email, bio, specializations, industries, partner_status, partner_applied_at, partner_approved_at, featured')
    .not('partner_status', 'is', null)
    .order('partner_applied_at', { ascending: false });

  if (statusFilter) query = query.eq('partner_status', statusFilter);
  const { data } = await query;
  return data ?? [];
}

export async function adminReviewPartner(
  userId: string,
  action: 'approve' | 'reject' | 'suspend' | 'remove',
) {
  const supabase = await createClient();

  if (action === 'approve') {
    await supabase
      .from('users')
      .update({ partner_status: 'approved', partner_approved_at: new Date().toISOString(), role: 'partner' })
      .eq('id', userId);
  } else if (action === 'reject' || action === 'remove') {
    await supabase
      .from('users')
      .update({ partner_status: 'removed' })
      .eq('id', userId);
    if (action === 'remove') {
      await supabase.from('users').update({ role: 'customer' }).eq('id', userId);
      await supabase.from('users').update({ partner_id: null }).eq('partner_id', userId);
    }
  } else if (action === 'suspend') {
    await supabase
      .from('users')
      .update({ partner_status: 'suspended' })
      .eq('id', userId);
  }

  return { success: true };
}

export async function togglePartnerFeatured(userId: string, featured: boolean) {
  const supabase = await createClient();
  await supabase.from('users').update({ featured }).eq('id', userId);
}

// ── Referral click tracking (now via logs table) ───────────

export async function trackReferralClick(
  referralCode: string,
  affiliateId: string,
  ipAddress: string,
  userAgent: string,
) {
  const supabase = await createClient();
  await supabase.from('logs').insert({
    user_id: affiliateId,
    action: 'referral.click',
    details: `Referral click for code: ${referralCode}`,
    level: 'info',
    ip_address: ipAddress,
    metadata: { referral_code: referralCode, user_agent: userAgent, converted: false },
  });
}
