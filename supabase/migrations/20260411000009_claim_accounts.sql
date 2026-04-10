-- ═══════════════════════════════════════════════════════════
-- CLAIM ACCOUNT ONBOARDING FLOW
-- Date: 2026-04-11
--
-- Partners/admin/staff create accounts pre-built with sites.
-- Customer claims by setting password + billing.
-- Unclaimed accounts auto-expire.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS claim_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_claim_token
  ON public.users(claim_token) WHERE claim_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_unclaimed
  ON public.users(claimed, claim_expires_at) WHERE claimed = false;
