-- ═══════════════════════════════════════════════════════════
-- ENVOSTA PARTNER PROGRAM — 3 NEW TABLES + ALTERATIONS
-- Date: 2026-04-11
-- ═══════════════════════════════════════════════════════════

-- ─── PARTNER PROFILES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    bio TEXT,
    specializations TEXT[] DEFAULT '{}',
    industries TEXT[] DEFAULT '{}',
    portfolio_links JSONB DEFAULT '[]',
    location TEXT,
    setup_fee_range TEXT,
    photo_url TEXT,
    featured BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'removed')),
    applied_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- ─── PARTNER RATINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(partner_id, client_id)
);

-- ─── PARTNER CHANGE REQUESTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_partner_id UUID NOT NULL REFERENCES public.users(id),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    new_partner_id UUID REFERENCES public.users(id),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- ─── ALTER EXISTING TABLES ──────────────────────────────────

-- Users: add partner_id (the partner managing this client)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.users(id);

-- Tickets: add partner routing
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.users(id);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS escalated_to_admin BOOLEAN DEFAULT false;

-- Ticket messages: allow 'partner' as sender
ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_sender_check;
ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_sender_check
    CHECK (sender IN ('customer', 'admin', 'system', 'partner'));

-- Commissions: allow 'partner' type
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_type_check;
ALTER TABLE public.commissions ADD CONSTRAINT commissions_type_check
    CHECK (type IN ('affiliate', 'referral', 'partner'));

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_partner_profiles_status ON public.partner_profiles(status);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_featured ON public.partner_profiles(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_partner_ratings_partner ON public.partner_ratings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_change_requests_status ON public.partner_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_partner_id ON public.users(partner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_partner_id ON public.tickets(partner_id);

-- ─── POSTGRES FUNCTION ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_calculate_partner_avg_rating(p_partner_id UUID)
RETURNS NUMERIC(3,2) AS $$
    SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0)
    FROM public.partner_ratings WHERE partner_id = p_partner_id;
$$ LANGUAGE sql STABLE;
