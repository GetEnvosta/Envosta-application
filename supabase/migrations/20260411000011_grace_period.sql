-- ═══════════════════════════════════════════════════════════
-- GRACE PERIOD & PAYMENT STATUS TRACKING
-- Date: 2026-04-11
--
-- Tracks payment failures and grace periods:
-- - 0-30 days: grace period, everything stays running
-- - 30 days: sites paused, domain auto-renew off, states saved
-- - 90 days: account flagged as unpaid for admin
-- - On payment: restore saved states
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'current'
  CHECK (payment_status IN ('current', 'grace', 'suspended', 'unpaid'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pre_suspension_state JSONB;

CREATE INDEX IF NOT EXISTS idx_users_payment_status
  ON public.users(payment_status) WHERE payment_status != 'current';
