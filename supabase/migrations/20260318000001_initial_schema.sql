-- ============================================================================
-- Envosta Hosting Platform — Initial Schema
-- Tables: plans, users, customers, subscriptions, services, domains,
--         invoices, logs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE plan_interval AS ENUM ('monthly', 'yearly');
CREATE TYPE service_type AS ENUM ('hosting', 'domain', 'bundle');
CREATE TYPE service_status AS ENUM ('active','suspended','cancelled','pending','provisioning','failed');
CREATE TYPE subscription_status AS ENUM ('active','past_due','cancelled','trialing','incomplete','paused');
CREATE TYPE domain_status AS ENUM ('available','registered','transferring','expired','pending_dns','failed');
CREATE TYPE invoice_status AS ENUM ('draft','open','paid','void','uncollectible');
CREATE TYPE log_level AS ENUM ('info','warn','error','debug');
CREATE TYPE user_role AS ENUM ('customer','admin');

-- ============================================================================
-- PLANS (what Envosta sells)
-- ============================================================================
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                          -- "Starter", "Pro", "Business"
    slug TEXT UNIQUE NOT NULL,                   -- "starter", "pro", "business"
    description TEXT,
    stripe_price_id_monthly TEXT,                -- price_xxx from Stripe
    stripe_price_id_yearly TEXT,
    price_monthly INTEGER NOT NULL DEFAULT 0,    -- cents: 999 = $9.99
    price_yearly INTEGER NOT NULL DEFAULT 0,
    -- Resource limits
    disk_gb INTEGER NOT NULL DEFAULT 10,
    bandwidth_gb INTEGER NOT NULL DEFAULT 50,
    php_workers INTEGER NOT NULL DEFAULT 2,
    sites_allowed INTEGER NOT NULL DEFAULT 1,
    domains_allowed INTEGER NOT NULL DEFAULT 1,
    has_staging BOOLEAN DEFAULT false,
    has_backups BOOLEAN DEFAULT true,
    has_cdn BOOLEAN DEFAULT false,
    has_waf BOOLEAN DEFAULT false,
    -- Display
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]'::jsonb,          -- ["Free SSL", "24/7 Support", ...]
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- USERS (extends auth.users)
-- ============================================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    company_name TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    timezone TEXT DEFAULT 'UTC',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CUSTOMERS (Stripe linkage, 1:1 with users)
-- ============================================================================
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    payment_method_id TEXT,
    billing_email TEXT,
    billing_name TEXT,
    billing_address JSONB DEFAULT '{}'::jsonb,
    currency TEXT DEFAULT 'usd',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT customers_user_id_unique UNIQUE (user_id)
);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_price_id TEXT NOT NULL,
    status subscription_status NOT NULL DEFAULT 'incomplete',
    quantity INTEGER DEFAULT 1,
    cancel_at_period_end BOOLEAN DEFAULT false,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SERVICES (hosting sites)
-- ============================================================================
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    type service_type NOT NULL DEFAULT 'hosting',
    label TEXT NOT NULL,
    status service_status NOT NULL DEFAULT 'pending',
    wp_cloud_site_id TEXT,
    wp_cloud_url TEXT,
    server_region TEXT DEFAULT 'us-east-1',
    php_version TEXT DEFAULT '8.2',
    disk_usage_mb INTEGER DEFAULT 0,
    bandwidth_usage_mb INTEGER DEFAULT 0,
    provisioned_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- DOMAINS
-- ============================================================================
CREATE TABLE public.domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    domain_name TEXT NOT NULL,
    tld TEXT NOT NULL,
    status domain_status NOT NULL DEFAULT 'available',
    registrar TEXT DEFAULT 'enom',
    enom_order_id TEXT,
    registration_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    nameservers JSONB DEFAULT '[]'::jsonb,
    dns_records JSONB DEFAULT '[]'::jsonb,
    whois_privacy BOOLEAN DEFAULT true,
    transfer_lock BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT domains_domain_name_unique UNIQUE (domain_name)
);

-- ============================================================================
-- INVOICES (local mirror of Stripe invoices for fast dashboard display)
-- ============================================================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id TEXT UNIQUE,
    status invoice_status NOT NULL DEFAULT 'draft',
    amount_due INTEGER NOT NULL DEFAULT 0,       -- cents
    amount_paid INTEGER NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'usd',
    description TEXT,
    invoice_url TEXT,                             -- Stripe hosted invoice URL
    invoice_pdf TEXT,                             -- Stripe PDF download URL
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- LOGS (audit trail)
-- ============================================================================
CREATE TABLE public.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    level log_level NOT NULL DEFAULT 'info',
    action TEXT NOT NULL,
    message TEXT,
    request_payload JSONB,
    response_payload JSONB,
    ip_address INET,
    user_agent TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_plans_slug ON public.plans(slug);
CREATE INDEX idx_plans_active ON public.plans(is_active, sort_order);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_stripe_id ON public.customers(stripe_customer_id);

CREATE INDEX idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions(plan_id);

CREATE INDEX idx_services_user_id ON public.services(user_id);
CREATE INDEX idx_services_subscription_id ON public.services(subscription_id);
CREATE INDEX idx_services_type_status ON public.services(type, status);
CREATE INDEX idx_services_wp_cloud_id ON public.services(wp_cloud_site_id) WHERE wp_cloud_site_id IS NOT NULL;

CREATE INDEX idx_domains_user_id ON public.domains(user_id);
CREATE INDEX idx_domains_service_id ON public.domains(service_id);
CREATE INDEX idx_domains_name ON public.domains(domain_name);
CREATE INDEX idx_domains_status ON public.domains(status);
CREATE INDEX idx_domains_expiry ON public.domains(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_stripe_id ON public.invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

CREATE INDEX idx_logs_user_id ON public.logs(user_id);
CREATE INDEX idx_logs_action ON public.logs(action);
CREATE INDEX idx_logs_created_at ON public.logs(created_at DESC);

-- ============================================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['plans','users','customers','subscriptions','services','domains','invoices']
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at_%s BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
            t, t
        );
    END LOOP;
END $$;

-- ============================================================================
-- TRIGGER: auto-create user profile on auth signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ADMIN HELPER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- PLANS: everyone can read active plans, only admins can modify
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT USING (is_active = true);
CREATE POLICY "plans_admin_all" ON public.plans FOR ALL USING (public.is_admin());

-- USERS
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_insert_self" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_admin_all" ON public.users FOR ALL USING (public.is_admin());

-- CUSTOMERS: read own, only service_role/admin can write
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "customers_admin_all" ON public.customers FOR ALL USING (public.is_admin());

-- SUBSCRIPTIONS: read via customer FK
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT
    USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "subscriptions_admin_all" ON public.subscriptions FOR ALL USING (public.is_admin());

-- SERVICES: read own, NO direct insert from client (must go through Edge Functions)
CREATE POLICY "services_select_own" ON public.services FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "services_admin_all" ON public.services FOR ALL USING (public.is_admin());

-- DOMAINS: read own, NO direct insert from client
CREATE POLICY "domains_select_own" ON public.domains FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "domains_admin_all" ON public.domains FOR ALL USING (public.is_admin());

-- INVOICES: read own via customer FK
CREATE POLICY "invoices_select_own" ON public.invoices FOR SELECT
    USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY "invoices_admin_all" ON public.invoices FOR ALL USING (public.is_admin());

-- LOGS: read own only
CREATE POLICY "logs_select_own" ON public.logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "logs_admin_all" ON public.logs FOR ALL USING (public.is_admin());

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.customers TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.domains TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.logs TO authenticated;
