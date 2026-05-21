-- ═══════════════════════════════════════════════════════════════════════
-- DRIFT ALERTED_AT — observability Phase 8
-- Date: 2026-05-17
--
-- Adds sync_drift.alerted_at so the /api/cron/drift-alerter cron can
-- notify exactly once per drift row instead of re-alerting every run.
-- The partial index keeps the alerter's "unresolved + unalerted" scan
-- cheap.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.sync_drift ADD COLUMN IF NOT EXISTS alerted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_sync_drift_alerted ON public.sync_drift(alerted_at) WHERE resolved = false;

NOTIFY pgrst, 'reload schema';
