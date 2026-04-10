-- ═══════════════════════════════════════════════════════════
-- CONSOLIDATE PARTNER TABLES INTO USERS
-- Date: 2026-04-11
--
-- partner_profiles → columns on users
-- partner_ratings → removed (build later)
-- partner_change_requests → use tickets (type='partner_change')
-- referral_clicks → use logs table for tracking
-- ═══════════════════════════════════════════════════════════

-- ─── ADD PARTNER PROFILE COLUMNS TO USERS ───────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS portfolio_links JSONB DEFAULT '[]';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS setup_fee_range TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS partner_status TEXT CHECK (partner_status IN ('pending', 'approved', 'suspended', 'removed'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS partner_applied_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS partner_approved_at TIMESTAMPTZ;

-- ─── MIGRATE EXISTING PARTNER PROFILE DATA ──────────────────
UPDATE public.users u
SET bio = pp.bio,
    specializations = pp.specializations,
    industries = pp.industries,
    portfolio_links = pp.portfolio_links,
    location = pp.location,
    setup_fee_range = pp.setup_fee_range,
    photo_url = pp.photo_url,
    featured = pp.featured,
    partner_status = pp.status,
    partner_applied_at = pp.applied_at,
    partner_approved_at = pp.approved_at
FROM public.partner_profiles pp
WHERE u.id = pp.user_id;

-- ─── MIGRATE REFERRAL CLICKS TO LOGS ────────────────────────
INSERT INTO public.logs (user_id, action, details, level, ip_address, metadata, created_at)
SELECT
    rc.affiliate_id,
    'referral.click',
    'Referral click' || CASE WHEN rc.converted THEN ' (converted)' ELSE '' END,
    'info',
    rc.ip_address,
    jsonb_build_object(
        'referral_code', rc.referral_code,
        'converted', rc.converted,
        'customer_id', rc.customer_id,
        'user_agent', rc.user_agent
    ),
    rc.created_at
FROM public.referral_clicks rc;

-- ─── DROP OLD TABLES ────────────────────────────────────────
DROP TABLE IF EXISTS public.partner_ratings;
DROP TABLE IF EXISTS public.partner_change_requests;
DROP TABLE IF EXISTS public.partner_profiles;
DROP TABLE IF EXISTS public.referral_clicks;

-- ─── CLEAN UP: drop the avg rating function ─────────────────
DROP FUNCTION IF EXISTS public.fn_calculate_partner_avg_rating(UUID);
