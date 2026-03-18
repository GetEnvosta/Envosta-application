-- ============================================================================
-- Seed: Envosta hosting plans (Starter / Pro / Business)
-- Replace stripe_price_id values with your real Stripe Price IDs
-- ============================================================================

INSERT INTO public.plans (name, slug, description, stripe_price_id_monthly, stripe_price_id_yearly, price_monthly, price_yearly, disk_gb, bandwidth_gb, php_workers, sites_allowed, domains_allowed, has_staging, has_backups, has_cdn, has_waf, sort_order, features) VALUES
(
    'Starter',
    'starter',
    'Perfect for personal sites and small blogs',
    'price_starter_monthly',   -- REPLACE with real Stripe price ID
    'price_starter_yearly',    -- REPLACE with real Stripe price ID
    999,     -- $9.99/mo
    9990,    -- $99.90/yr (save ~17%)
    10, 50, 2, 1, 1,
    false, true, false, false,
    1,
    '["1 WordPress site", "10 GB SSD storage", "50 GB bandwidth", "Free SSL certificate", "Daily backups", "Email support"]'::jsonb
),
(
    'Pro',
    'pro',
    'For growing businesses that need more power',
    'price_pro_monthly',       -- REPLACE with real Stripe price ID
    'price_pro_yearly',        -- REPLACE with real Stripe price ID
    2499,    -- $24.99/mo
    24990,   -- $249.90/yr
    25, 200, 4, 5, 5,
    true, true, true, false,
    2,
    '["5 WordPress sites", "25 GB SSD storage", "200 GB bandwidth", "Free SSL certificate", "Daily backups", "Staging environment", "Free CDN", "Priority support"]'::jsonb
),
(
    'Business',
    'business',
    'Enterprise-grade hosting for serious businesses',
    'price_business_monthly',  -- REPLACE with real Stripe price ID
    'price_business_yearly',   -- REPLACE with real Stripe price ID
    4999,    -- $49.99/mo
    49990,   -- $499.90/yr
    50, 500, 10, 20, 20,
    true, true, true, true,
    3,
    '["20 WordPress sites", "50 GB SSD storage", "500 GB bandwidth", "Free SSL certificate", "Daily backups", "Staging environment", "Free CDN", "Web application firewall", "Dedicated support", "White-label option"]'::jsonb
);
