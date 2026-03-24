-- Add-on products table (bursting, studio requests, future addons)
CREATE TABLE public.addon_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_cad INTEGER NOT NULL DEFAULT 0,       -- cents
    billing_type TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', 'one_time'
    is_active BOOLEAN DEFAULT true,
    stripe_product_id TEXT,
    stripe_price_id TEXT,
    -- wp.cloud action metadata (e.g. burst_php_conns=1 for bursting)
    wpcloud_action JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default addons
INSERT INTO public.addon_products (name, slug, description, price_cad, billing_type, sort_order, wpcloud_action) VALUES
('Studio Request', 'studio-request', 'Design changes, new pages, plugin setup, custom features.', 25000, 'one_time', 1, '{}'),
('Bursting', 'bursting', 'Scales to 110+ PHP workers during traffic spikes. Per-site monthly add-on.', 20000, 'monthly', 2, '{"key": "burst_php_conns", "enable_value": 1, "disable_value": 0}');

-- Track which addons are attached to which services
CREATE TABLE public.service_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES public.addon_products(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled'
    stripe_subscription_item_id TEXT,       -- Stripe subscription item for recurring addons
    enabled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    disabled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(service_id, addon_id)
);

CREATE INDEX idx_service_addons_service ON public.service_addons(service_id);
CREATE INDEX idx_service_addons_addon ON public.service_addons(addon_id);

-- RLS
ALTER TABLE public.addon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active addons" ON public.addon_products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage addons" ON public.addon_products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can see own service addons" ON public.service_addons FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.services WHERE id = service_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage service addons" ON public.service_addons FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

GRANT ALL ON public.addon_products TO authenticated;
GRANT ALL ON public.service_addons TO authenticated;
