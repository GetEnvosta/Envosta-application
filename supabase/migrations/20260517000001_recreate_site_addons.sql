-- ═══════════════════════════════════════════════════════════════════════
-- RECREATE site_addons
-- Date: 2026-05-17
--
-- site_addons was dropped in 20260411000002 (credit-metered add-on
-- experiment) and never restored. The credit system was later removed,
-- leaving add-ons with no table backing. This recreates the table for
-- the site-scoped add-on model: one Stripe SubscriptionItem per add-on
-- TYPE on the account's subscription (quantity = number of sites using
-- it); one site_addons row per (site, add-on) pairing.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.site_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  stripe_subscription_item_id TEXT,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_site_addons_site_id ON public.site_addons(site_id);
CREATE INDEX IF NOT EXISTS idx_site_addons_product_id ON public.site_addons(product_id);
CREATE INDEX IF NOT EXISTS idx_site_addons_stripe_item ON public.site_addons(stripe_subscription_item_id);
CREATE INDEX IF NOT EXISTS idx_site_addons_status ON public.site_addons(status);

ALTER TABLE public.site_addons ENABLE ROW LEVEL SECURITY;

-- Customer can SELECT add-ons for sites they own; admin/staff see all.
-- Mutations happen through service-role API routes, so only a SELECT
-- policy is needed for the customer dashboard.
DROP POLICY IF EXISTS "Users can view add-ons for their own sites" ON public.site_addons;
CREATE POLICY "Users can view add-ons for their own sites"
  ON public.site_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = site_addons.site_id
        AND (s.user_id = auth.uid() OR public.fn_is_admin_or_staff())
    )
  );

NOTIFY pgrst, 'reload schema';
