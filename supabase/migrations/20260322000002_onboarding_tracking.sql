-- ============================================================================
-- Add onboarding tracking to services table
-- Each site has its own onboarding status tied to its plan type
-- ============================================================================

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (onboarding_status IN ('not_started', 'scheduled', 'in_progress', 'completed')),
  ADD COLUMN IF NOT EXISTS onboarding_type TEXT DEFAULT 'standard'
    CHECK (onboarding_type IN ('standard', 'guided', 'concierge')),
  ADD COLUMN IF NOT EXISTS onboarding_call_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;

-- Index for admin filtering
CREATE INDEX IF NOT EXISTS idx_services_onboarding ON public.services(onboarding_status);
