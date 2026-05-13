-- ═══════════════════════════════════════════════════════════
-- PHASE 1 FIXUP: webhook_events shape correction
-- Date: 2026-05-06
--
-- The previous migration (20260506000003_orchestration.sql) used
-- CREATE TABLE IF NOT EXISTS for webhook_events, which is a no-op
-- against an already-existing table with the legacy two-column shape
-- (id TEXT PK, event_type TEXT). The subsequent CREATE INDEX statements
-- against the new column names would have failed.
--
-- The legacy table's contents are a malfunctioning audit log — the
-- previous code wrapped its INSERT in a swallowing try/catch and most
-- writes were silently lost. Dropping the data is acceptable.
--
-- This migration:
--   1. Drops the legacy webhook_events (CASCADE in case anything FK'd it)
--   2. Re-creates with the new shape and the indexes/RLS expected by
--      Phase 4's webhook handlers.
-- ═══════════════════════════════════════════════════════════

DROP TABLE IF EXISTS webhook_events CASCADE;

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe','wpcloud','opensrs')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_event_id)
);

CREATE INDEX ON webhook_events(provider, provider_event_id);
CREATE INDEX ON webhook_events(processed, created_at);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE webhook_events IS 'Idempotency-keyed inbound webhook log. Service-role only — never client-readable. Phase 4 webhook handlers insert here with provider+provider_event_id as the dedup key.';
