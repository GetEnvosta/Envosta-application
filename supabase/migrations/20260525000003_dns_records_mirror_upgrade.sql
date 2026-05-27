-- ═══════════════════════════════════════════════════════════════════════
-- DNS RECORDS MIRROR UPGRADE
-- Date: 2026-05-25
--
-- public.dns_records was previously a plain customer-facing table, but
-- OpenSRS is the source of truth for DNS state and SET_DNS_ZONE
-- replaces the entire zone wholesale. Stale local state = data-loss
-- bug: if a customer/admin adds a record while our mirror is missing
-- records present at the registrar, we'd blast those records on push.
--
-- This upgrade gives dns_records the standard mirror semantics:
--   * upstream_status — 'synced' | 'pending_push' | 'extra_in_upstream'
--                       | 'missing_in_upstream'
--   * last_synced_at  — timestamp of the most recent reconcile/write
--                       that confirmed this row matches upstream.
--   * source          — 'customer' (added through our UI) or 'upstream'
--                       (discovered via reconciliation — typically a
--                        record present at OpenSRS but missing locally).
--   * upstream_payload — raw OpenSRS record snapshot at last sync.
--
-- All existing rows are stamped synced @ now() since they were
-- DELETE+INSERTed wholesale by the existing set-dns route which only
-- writes after OpenSRS confirms the SET_DNS_ZONE call.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.dns_records
  ADD COLUMN IF NOT EXISTS upstream_status   TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source            TEXT NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS upstream_payload  JSONB;

ALTER TABLE public.dns_records
  DROP CONSTRAINT IF EXISTS dns_records_upstream_status_check;
ALTER TABLE public.dns_records
  ADD CONSTRAINT dns_records_upstream_status_check
  CHECK (upstream_status IS NULL OR upstream_status IN (
    'synced', 'pending_push', 'extra_in_upstream', 'missing_in_upstream'
  ));

ALTER TABLE public.dns_records
  DROP CONSTRAINT IF EXISTS dns_records_source_check;
ALTER TABLE public.dns_records
  ADD CONSTRAINT dns_records_source_check
  CHECK (source IN ('customer', 'upstream'));

-- Backfill: any existing row is presumed in-sync (the previous set-dns
-- code only wrote rows AFTER OpenSRS confirmed the zone push).
UPDATE public.dns_records
SET upstream_status = 'synced',
    last_synced_at  = COALESCE(last_synced_at, updated_at, now())
WHERE upstream_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_dns_records_upstream_status ON public.dns_records(upstream_status);
CREATE INDEX IF NOT EXISTS idx_dns_records_last_synced     ON public.dns_records(last_synced_at);

NOTIFY pgrst, 'reload schema';
