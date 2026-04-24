-- ═══════════════════════════════════════════════════════════
-- Site lifecycle: 'paused' (after Stripe cancels the sub for non-payment
-- or user-initiated cancel) and 'flagged_for_deletion' (admin-triggered).
-- Stripe drives the dunning timeline; this app just reflects the result
-- and gives admins a queue to review + delete.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_status_check;
ALTER TABLE public.sites ADD CONSTRAINT sites_status_check
  CHECK (status IN (
    'provisioning',
    'active',
    'paused',
    'suspended',
    'flagged_for_deletion',
    'cancelled',
    'deleted',
    'failed'
  ));

ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS flagged_for_deletion_at TIMESTAMPTZ;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_sites_status_paused_at
  ON public.sites(status, paused_at) WHERE status = 'paused';

CREATE INDEX IF NOT EXISTS idx_sites_flagged_for_deletion
  ON public.sites(flagged_for_deletion_at) WHERE status = 'flagged_for_deletion';
