-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 1 ESSENTIALS
-- Date: 2026-05-13
--
-- Replaces the original Phase 1 migrations (20260506000002 → 20260513000001)
-- which never applied to production. This is a single idempotent migration
-- containing only what we actually need:
--
--   1. Orchestration plumbing:  jobs, job_attempts, audit_log, webhook_events,
--                               api_calls, sync_runs, sync_drift
--   2. Customer-facing tables:  dns_records
--   3. Basic upstream mirrors:  wpcloud_sites, opensrs_domains, opensrs_contacts
--   4. RLS policies on existing customer tables
--
-- Deliberately EXCLUDED — Supabase Stripe Sync Engine handles these:
--   - stripe_customers, stripe_subscriptions, stripe_subscription_items,
--     stripe_invoices, stripe_payment_methods, stripe_products, stripe_prices
--
-- Drops the legacy 2-column webhook_events table (if present) before
-- recreating with the new shape needed by /api/webhooks/stripe.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- STEP 0 — Drop legacy webhook_events (old 2-column shape)
-- ───────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.webhook_events CASCADE;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 1 — Orchestration plumbing
-- ───────────────────────────────────────────────────────────────────────

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

-- ───────────────────────────────────────────────────────────────────────
-- STEP 2 — Basic upstream mirrors (wp.cloud + OpenSRS only — Stripe via Sync Engine)
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wpcloud_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wpcloud_sites_last_synced_at ON public.wpcloud_sites(last_synced_at);
ALTER TABLE public.wpcloud_sites ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.wpcloud_sites IS 'Mirror of wp.cloud state. Updated by Vercel /api/internal/wpcloud/* on successful calls. Service-role only.';

CREATE TABLE IF NOT EXISTS public.opensrs_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opensrs_domains_last_synced_at ON public.opensrs_domains(last_synced_at);
ALTER TABLE public.opensrs_domains ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.opensrs_domains IS 'Mirror of OpenSRS state. Updated by Vercel /api/internal/opensrs/* on successful calls. Service-role only.';

CREATE TABLE IF NOT EXISTS public.opensrs_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    contact_type TEXT CHECK (contact_type IN ('owner','admin','tech','billing')),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opensrs_contacts_last_synced_at ON public.opensrs_contacts(last_synced_at);
ALTER TABLE public.opensrs_contacts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.opensrs_contacts IS 'Mirror of OpenSRS contacts. Service-role only.';

-- ───────────────────────────────────────────────────────────────────────
-- STEP 3 — DNS records (customer-facing)
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dns_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('A','AAAA','CNAME','MX','TXT','SRV')),
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    ttl INTEGER DEFAULT 3600,
    priority INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dns_records_domain_id ON public.dns_records(domain_id);
ALTER TABLE public.dns_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view DNS records for their own domains" ON public.dns_records;
CREATE POLICY "Users can view DNS records for their own domains"
    ON public.dns_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = dns_records.domain_id
              AND d.user_id = auth.uid()
        )
    );

-- ───────────────────────────────────────────────────────────────────────
-- STEP 4 — RLS helper + policies on customer-facing tables
-- ───────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_is_admin_or_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('admin','staff','affiliate')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own row" ON public.users;
CREATE POLICY "Users can view own row"
    ON public.users FOR SELECT
    USING (id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
    ON public.users FOR UPDATE
    USING (id = auth.uid() OR public.fn_is_admin_or_staff());

-- sites
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own sites" ON public.sites;
CREATE POLICY "Users can view own sites"
    ON public.sites FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can update own sites" ON public.sites;
CREATE POLICY "Users can update own sites"
    ON public.sites FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can insert own sites" ON public.sites;
CREATE POLICY "Users can insert own sites"
    ON public.sites FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- domains
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own domains" ON public.domains;
CREATE POLICY "Users can view own domains"
    ON public.domains FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can update own domains" ON public.domains;
CREATE POLICY "Users can update own domains"
    ON public.domains FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can insert own domains" ON public.domains;
CREATE POLICY "Users can insert own domains"
    ON public.domains FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions"
    ON public.subscriptions FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets"
    ON public.tickets FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
CREATE POLICY "Users can update own tickets"
    ON public.tickets FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
CREATE POLICY "Users can insert own tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.fn_is_admin_or_staff());

-- ticket_messages
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view messages for own tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages for own tickets"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = ticket_messages.ticket_id
              AND (t.user_id = auth.uid() OR public.fn_is_admin_or_staff())
        )
    );
DROP POLICY IF EXISTS "Users can insert messages on own tickets" ON public.ticket_messages;
CREATE POLICY "Users can insert messages on own tickets"
    ON public.ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = ticket_messages.ticket_id
              AND (t.user_id = auth.uid() OR public.fn_is_admin_or_staff())
        )
    );

-- commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Earners can view own commissions" ON public.commissions;
CREATE POLICY "Earners can view own commissions"
    ON public.commissions FOR SELECT
    USING (earner_id = auth.uid() OR public.fn_is_admin_or_staff());

-- ───────────────────────────────────────────────────────────────────────
-- STEP 5 — Force PostgREST to refresh its schema cache
-- ───────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
