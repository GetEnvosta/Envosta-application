-- ═══════════════════════════════════════════════════════════
-- PHASE 1: ORCHESTRATION PLUMBING
-- Date: 2026-05-06
--
-- Adds the tables that back the new reactive architecture:
--   - jobs / job_attempts: workflow tracking with idempotency
--   - audit_log: every state change with before/after JSONB
--   - webhook_events: idempotency-keyed inbound webhook log
--   - api_calls: outbound call log with timing + payloads
--   - sync_runs / sync_drift: reconciliation execution log
--
-- All service-role only (RLS enabled, no client policies).
-- ═══════════════════════════════════════════════════════════

-- ─── JOBS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','dead_letter','cancelled')),
    idempotency_key TEXT UNIQUE,
    vercel_workflow_id TEXT,
    result JSONB,
    error JSONB,
    run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after ON public.jobs(status, run_after);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency_key ON public.jobs(idempotency_key);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.jobs IS 'High-level workflow tracking. Service-role only.';

-- ─── JOB ATTEMPTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
    request_payload JSONB,
    response_payload JSONB,
    error JSONB,
    duration_ms INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_job_attempts_job_id ON public.job_attempts(job_id);
ALTER TABLE public.job_attempts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.job_attempts IS 'Per-retry request/response/error logging. Service-role only.';

-- ─── AUDIT LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('user','admin','system','webhook','workflow')),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    before_state JSONB,
    after_state JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.audit_log IS 'Every state change with actor + before/after. Service-role only.';

-- ─── WEBHOOK EVENTS ─────────────────────────────────────
-- Note: The legacy stripe-webhook code at supabase/functions/stripe-webhook/index.ts:26-31
-- inserts into a webhook_events table with shape { id, event_type }. That older shape was
-- never created by a migration (it existed by hand in the DB). Phase 4 will rewrite the
-- handler to use this new shape (provider, provider_event_id) and route through a job.
-- If a legacy webhook_events table exists with conflicting columns, this CREATE IF NOT
-- EXISTS will be a no-op — operators should drop the legacy table before applying.
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('stripe','wpcloud','opensrs')),
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    raw_payload JSONB NOT NULL,
    signature_verified BOOLEAN NOT NULL DEFAULT false,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    error JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON public.webhook_events(provider, provider_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed, created_at);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.webhook_events IS 'Raw inbound webhooks with idempotency. Service-role only.';

-- ─── API CALLS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('stripe','wpcloud','opensrs','jetpack','resend')),
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    request_payload JSONB,
    response_status INTEGER,
    response_payload JSONB,
    duration_ms INTEGER,
    error JSONB,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_calls_provider_created ON public.api_calls(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_calls_job_id ON public.api_calls(job_id);
ALTER TABLE public.api_calls ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.api_calls IS 'Every outbound call to wp.cloud/OpenSRS/Stripe/Jetpack/Resend. Service-role only.';

-- ─── SYNC RUNS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
    records_scanned INTEGER DEFAULT 0,
    drift_detected INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error JSONB
);
CREATE INDEX IF NOT EXISTS idx_sync_runs_provider_started ON public.sync_runs(provider, started_at DESC);
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.sync_runs IS 'Reconciliation job execution log. Service-role only.';

-- ─── SYNC DRIFT ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_drift (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_run_id UUID REFERENCES public.sync_runs(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    drift_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sync_drift_provider_resource ON public.sync_drift(provider, resource_type, resolved);
CREATE INDEX IF NOT EXISTS idx_sync_drift_created ON public.sync_drift(created_at DESC);
ALTER TABLE public.sync_drift ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.sync_drift IS 'Detected differences between mirror and upstream. Service-role only.';
