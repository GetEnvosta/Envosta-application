-- ═══════════════════════════════════════════════════════════════════════
-- DROP PARTNER PROGRAM
-- Date: 2026-05-13
--
-- Removes the dedicated partner role + marketplace + commissions program.
-- The new product direction is account-centric with managed_by_account_id
-- for agency relationships, so the partner machinery is no longer needed.
--
-- Drops:
--   - commissions table
--   - partner_applications, partner_referrals (if they exist)
--   - users.partner_id, partner_status, partner_applied_at,
--     partner_approved_at, bio, specializations, industries,
--     portfolio_links, location, setup_fee_range, photo_url, featured
--   - tickets.partner_id, tickets.escalated_to_admin
--   - The 'partner' sender on ticket_messages (we coerce existing rows
--     back to 'admin' first, then reinstall a constraint without 'partner').
--   - Drops referral_clicks table (already absent in current schema; safe IF EXISTS).
--   - users.referral_code, users.referred_by — referral system was tied to
--     the commission/affiliate flow and is being removed alongside it.
--
-- Migrates existing 'partner' and 'affiliate' role users back to 'customer'
-- before tightening the role check constraint to ('customer','admin','staff').
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- STEP 1 — Drop partner-program tables
-- ───────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.commissions CASCADE;
DROP TABLE IF EXISTS public.partner_applications CASCADE;
DROP TABLE IF EXISTS public.partner_referrals CASCADE;
DROP TABLE IF EXISTS public.partner_profiles CASCADE;
DROP TABLE IF EXISTS public.partner_ratings CASCADE;
DROP TABLE IF EXISTS public.partner_change_requests CASCADE;
DROP TABLE IF EXISTS public.referral_clicks CASCADE;

-- Drop the partner avg-rating helper (already dropped in 20260411000005 but be safe)
DROP FUNCTION IF EXISTS public.fn_calculate_partner_avg_rating(UUID);

-- ───────────────────────────────────────────────────────────────────────
-- STEP 2 — Drop partner columns on users
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.users DROP COLUMN IF EXISTS partner_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS partner_status;
ALTER TABLE public.users DROP COLUMN IF EXISTS partner_applied_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS partner_approved_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS bio;
ALTER TABLE public.users DROP COLUMN IF EXISTS specializations;
ALTER TABLE public.users DROP COLUMN IF EXISTS industries;
ALTER TABLE public.users DROP COLUMN IF EXISTS portfolio_links;
ALTER TABLE public.users DROP COLUMN IF EXISTS location;
ALTER TABLE public.users DROP COLUMN IF EXISTS setup_fee_range;
ALTER TABLE public.users DROP COLUMN IF EXISTS photo_url;
ALTER TABLE public.users DROP COLUMN IF EXISTS featured;
ALTER TABLE public.users DROP COLUMN IF EXISTS referral_code;
ALTER TABLE public.users DROP COLUMN IF EXISTS referred_by;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 3 — Drop partner columns on tickets
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.tickets DROP COLUMN IF EXISTS partner_id;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS escalated_to_admin;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 4 — Tighten ticket_messages.sender to exclude 'partner'
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_sender_check;
UPDATE public.ticket_messages SET sender = 'admin' WHERE sender = 'partner';
ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_sender_check
    CHECK (sender IN ('customer', 'admin', 'system'));

-- ───────────────────────────────────────────────────────────────────────
-- STEP 5 — Migrate 'partner' and 'affiliate' role users to 'customer'
--          BEFORE installing the new role check constraint.
-- ───────────────────────────────────────────────────────────────────────
UPDATE public.users SET role = 'customer' WHERE role IN ('partner', 'affiliate');

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'admin', 'staff'));

-- ───────────────────────────────────────────────────────────────────────
-- STEP 6 — Force PostgREST to refresh its schema cache
-- ───────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
