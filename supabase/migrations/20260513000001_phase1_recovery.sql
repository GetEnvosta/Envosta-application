-- ═══════════════════════════════════════════════════════════════════════
-- PHASE 1 RECOVERY — bundled migrations
-- Date: 2026-05-13
--
-- The 4 Phase 1 migration files in supabase/migrations/ should have been
-- auto-applied by the Supabase GitHub integration but weren't. This single
-- SQL block contains all of them in idempotent form. Run it once in the
-- Supabase SQL Editor to bring production in sync with the repo.
--
-- Source migrations:
--   - 20260506000002_mirror_tables.sql
--   - 20260506000003_orchestration.sql
--   - 20260506000004_rls_customer_tables.sql
--   - 20260506000005_webhook_events_reshape.sql
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- STEP 0: Drop legacy webhook_events table if it exists (old 2-column shape)
-- ───────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.webhook_events CASCADE;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 1: Mirror tables (wp.cloud / OpenSRS / Stripe state mirrors)
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

CREATE TABLE IF NOT EXISTS public.stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_last_synced_at ON public.stripe_customers(last_synced_at);
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    stripe_customer_id TEXT REFERENCES public.stripe_customers(upstream_id) ON DELETE CASCADE,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_last_synced_at ON public.stripe_subscriptions(last_synced_at);
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stripe_subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    stripe_subscription_id TEXT REFERENCES public.stripe_subscriptions(upstream_id) ON DELETE CASCADE,
    price_id TEXT,
    quantity INTEGER,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_subscription_items_last_synced_at ON public.stripe_subscription_items(last_synced_at);
ALTER TABLE public.stripe_subscription_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stripe_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    amount_paid INTEGER,
    currency TEXT,
    paid_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_last_synced_at ON public.stripe_invoices(last_synced_at);
ALTER TABLE public.stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stripe_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    stripe_customer_id TEXT REFERENCES public.stripe_customers(upstream_id) ON DELETE CASCADE,
    type TEXT,
    is_default BOOLEAN,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_methods_last_synced_at ON public.stripe_payment_methods(last_synced_at);
ALTER TABLE public.stripe_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stripe_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    name TEXT,
    active BOOLEAN,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_products_last_synced_at ON public.stripe_products(last_synced_at);
ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stripe_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id TEXT NOT NULL UNIQUE,
    upstream_status TEXT,
    upstream_payload JSONB NOT NULL DEFAULT '{}',
    stripe_product_id TEXT REFERENCES public.stripe_products(upstream_id) ON DELETE CASCADE,
    unit_amount INTEGER,
    currency TEXT,
    recurring_interval TEXT,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_last_synced_at ON public.stripe_prices(last_synced_at);
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- STEP 2: DNS records (customer-facing, not a mirror)
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
-- STEP 3: Orchestration plumbing (jobs, audit_log, api_calls, sync_*)
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

-- New webhook_events shape (the legacy table was dropped in STEP 0)
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

-- ───────────────────────────────────────────────────────────────────────
-- STEP 4: RLS policies on customer-facing tables
-- ───────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_is_admin_or_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND role IN ('admin','staff','affiliate')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own row" ON public.users;
CREATE POLICY "Users can view own row"
    ON public.users FOR SELECT
    USING (id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
    ON public.users FOR UPDATE
    USING (id = auth.uid() OR public.fn_is_admin_or_staff());

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

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions"
    ON public.subscriptions FOR UPDATE
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (user_id = auth.uid() OR public.fn_is_admin_or_staff());

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

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Earners can view own commissions" ON public.commissions;
CREATE POLICY "Earners can view own commissions"
    ON public.commissions FOR SELECT
    USING (earner_id = auth.uid() OR public.fn_is_admin_or_staff());

-- ───────────────────────────────────────────────────────────────────────
-- STEP 5: Force PostgREST to refresh its schema cache so it sees new columns
-- ───────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
