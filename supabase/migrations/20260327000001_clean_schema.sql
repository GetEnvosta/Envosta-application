-- ═══════════════════════════════════════════════════════════
-- ENVOSTA CLEAN SCHEMA v2 — 11 TABLES
-- Date: 2026-03-27
-- ═══════════════════════════════════════════════════════════

-- Users table managed by Supabase Auth + custom columns
-- stripe_customer_id added directly to users (no separate customers table)

-- ─── CATALOG ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('hosting_plan', 'domain_tld', 'plan_addon', 'one_time_service')),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    billing TEXT NOT NULL DEFAULT 'monthly' CHECK (billing IN ('monthly', 'yearly', 'one_time')),
    price_cad INTEGER DEFAULT 0,
    price_yearly_cad INTEGER,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    stripe_price_id_yearly TEXT,
    features JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── BILLING (Stripe) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    stripe_subscription_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'incomplete', 'paused')),
    billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id),
    stripe_invoice_id TEXT UNIQUE,
    amount_cad INTEGER DEFAULT 0,
    status TEXT DEFAULT 'paid' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    description TEXT,
    hosted_invoice_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── HOSTING (wp.cloud) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id),
    product_id UUID REFERENCES public.products(id),
    label TEXT,
    wp_cloud_site_id TEXT,
    wp_cloud_url TEXT,
    domain_name TEXT,
    server_region TEXT DEFAULT 'us-east',
    status TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'active', 'suspended', 'cancelled', 'deleted', 'failed')),
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    stripe_subscription_item_id TEXT,
    enabled_at TIMESTAMPTZ DEFAULT now(),
    disabled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(site_id, product_id)
);

-- ─── DOMAINS (OpenSRS) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    domain_name TEXT NOT NULL,
    tld TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'transferring', 'expired', 'failed', 'deleted')),
    registrar TEXT DEFAULT 'opensrs',
    expiry_date TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    whois_privacy BOOLEAN DEFAULT true,
    nameservers JSONB DEFAULT '["ns1.opensrs.net", "ns2.opensrs.net"]',
    dns_records JSONB DEFAULT '[]',
    renewal_stripe_subscription_id TEXT,
    agreement_accepted_at TIMESTAMPTZ,
    agreement_ip TEXT,
    agreement_user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── COMMUNICATION ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'technical' CHECK (type IN ('technical', 'studio', 'sales')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'quoted', 'approved', 'completed', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    subject TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    source TEXT DEFAULT 'dashboard' CHECK (source IN ('dashboard', 'signup', 'contact', 'manual', 'email')),
    stage TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('customer', 'admin', 'system')),
    message TEXT NOT NULL,
    is_draft BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── CONTENT ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image_url TEXT,
    category TEXT DEFAULT 'wordpress' CHECK (category IN ('wordpress', 'design', 'business', 'ecommerce', 'envosta-news')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    meta_title TEXT,
    meta_description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── SYSTEM ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    level TEXT DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error', 'debug')),
    ip_address TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEXES ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(type);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON public.invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sites_user ON public.sites(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON public.sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_wpcloud ON public.sites(wp_cloud_site_id);
CREATE INDEX IF NOT EXISTS idx_site_addons_site ON public.site_addons(site_id);
CREATE INDEX IF NOT EXISTS idx_site_addons_product ON public.site_addons(product_id);
CREATE INDEX IF NOT EXISTS idx_domains_user ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_site ON public.domains(site_id);
CREATE INDEX IF NOT EXISTS idx_domains_name ON public.domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_domains_status ON public.domains(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON public.tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_logs_user ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON public.logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.logs(created_at DESC);
