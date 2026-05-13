-- ═══════════════════════════════════════════════════════════
-- PHASE 1: MIRROR TABLES + UPSTREAM RESOURCE TRACKING
-- Date: 2026-05-06
--
-- For each external system we orchestrate (wp.cloud, OpenSRS, Stripe),
-- maintain a local mirror row keyed by the upstream resource ID. Mirrors
-- are populated by webhooks (Phase 4) and reconciliation jobs (Phase 6).
-- The UI reads from these mirrors instead of hitting upstream APIs.
--
-- Mirror tables are SERVICE-ROLE ONLY. RLS is enabled but no client
-- policies are defined — only the service-role key bypasses RLS.
-- ═══════════════════════════════════════════════════════════

-- ─── WP.CLOUD ────────────────────────────────────────────
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
COMMENT ON TABLE public.wpcloud_sites IS 'Mirror of wp.cloud state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

-- ─── OPENSRS ────────────────────────────────────────────
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
COMMENT ON TABLE public.opensrs_domains IS 'Mirror of OpenSRS state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

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
COMMENT ON TABLE public.opensrs_contacts IS 'Mirror of OpenSRS state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

-- ─── STRIPE ─────────────────────────────────────────────
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
COMMENT ON TABLE public.stripe_customers IS 'Mirror of Stripe state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

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
COMMENT ON TABLE public.stripe_subscriptions IS 'Mirror of Stripe state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

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
COMMENT ON TABLE public.stripe_subscription_items IS 'Mirror of Stripe state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

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
COMMENT ON TABLE public.stripe_invoices IS 'Mirror of Stripe state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

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
COMMENT ON TABLE public.stripe_payment_methods IS 'Mirror of Stripe state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

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
COMMENT ON TABLE public.stripe_products IS 'Mirror of Stripe state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

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
COMMENT ON TABLE public.stripe_prices IS 'Mirror of Stripe state. Updated by webhooks + reconciliation. UI never reads upstream directly.';

-- ─── DNS RECORDS (customer-facing, not a mirror) ─────────
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

-- Customer-facing read policy: users can see DNS records for domains they own.
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
