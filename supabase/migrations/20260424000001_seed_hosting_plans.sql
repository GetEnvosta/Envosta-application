-- ═══════════════════════════════════════════════════════════
-- Seed the two hosting plans with USD + CAD pricing + site limits.
--
-- USD: Minimum $36/mo monthly, $324/yr annual ($27/mo equiv, 25% off)
--      Growth  $297/mo monthly, $2,676/yr annual ($223/mo equiv, 25% off — rounded up from $222.75)
--
-- CAD: Minimum $49/mo monthly, $441/yr annual ($37/mo equiv, 25% off — USD × 1.35)
--      Growth  $401/mo monthly, $3,612/yr annual ($301/mo equiv, 25% off — USD × 1.35)
--
-- Sync to Stripe creates 4 prices per plan under one shared product:
-- monthly USD, yearly USD, monthly CAD, yearly CAD.
--
-- Feature lists must mirror the marketing pricing card copy in
-- src/app/(marketing)/plans/page.tsx so the dashboard add-site picker
-- and checkout cards stay in sync.
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.products (type, name, slug, description, billing, price_usd, price_yearly_usd, price_cad, price_yearly_cad, is_active, sort_order, features, metadata)
VALUES (
  'hosting_plan', 'Minimum', 'minimum',
  'Fast, secure WordPress hosting — fully managed, hands-off.',
  'monthly', 3600, 32400, 4900, 44100, true, 10,
  jsonb_build_array(
    '1 managed WordPress site on WP.Cloud',
    '25 GB SSD storage',
    'Free SSL + global CDN',
    'Daily backups & auto-updates',
    'Email support'
  ),
  jsonb_build_object(
    'storage_gb', 25,
    'sites_allowed', 1,
    'php_workers_default', 2,
    'php_workers_included', 4,
    'php_memory_mb', 512,
    'has_staging', false,
    'has_backups', true,
    'has_cdn', true,
    'has_waf', false,
    'onboarding_type', 'standard',
    'support_type', 'tickets'
  )
)
ON CONFLICT (slug) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  billing = EXCLUDED.billing,
  price_usd = EXCLUDED.price_usd,
  price_yearly_usd = EXCLUDED.price_yearly_usd,
  price_cad = EXCLUDED.price_cad,
  price_yearly_cad = EXCLUDED.price_yearly_cad,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  features = EXCLUDED.features,
  metadata = public.products.metadata || EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.products (type, name, slug, description, billing, price_usd, price_yearly_usd, price_cad, price_yearly_cad, is_active, sort_order, features, metadata)
VALUES (
  'hosting_plan', 'Growth', 'growth',
  'WordPress hosting plus a hands-on onboarding team, AI tools, and the essentials to grow.',
  'monthly', 29700, 267600, 40100, 361200, true, 20,
  jsonb_build_array(
    'Everything in Minimum, up to 5 sites',
    'Auto-scaling resources (SSD & more)',
    'Done-with-you onboarding',
    '1-on-1 strategy consultation',
    'SEO optimization (includes AI)',
    'WooCommerce ready',
    'Priority support'
  ),
  jsonb_build_object(
    'storage_gb', 50,
    'sites_allowed', 5,
    'php_workers_default', 4,
    'php_workers_included', 8,
    'php_memory_mb', 1024,
    'has_staging', true,
    'has_backups', true,
    'has_cdn', true,
    'has_waf', true,
    'onboarding_type', 'guided',
    'support_type', 'priority',
    'auto_scaling', true
  )
)
ON CONFLICT (slug) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  billing = EXCLUDED.billing,
  price_usd = EXCLUDED.price_usd,
  price_yearly_usd = EXCLUDED.price_yearly_usd,
  price_cad = EXCLUDED.price_cad,
  price_yearly_cad = EXCLUDED.price_yearly_cad,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  features = EXCLUDED.features,
  metadata = public.products.metadata || EXCLUDED.metadata,
  updated_at = now();
