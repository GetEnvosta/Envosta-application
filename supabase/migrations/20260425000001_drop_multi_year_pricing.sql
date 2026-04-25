-- Drop multi-year (2yr/3yr) pricing.
-- Policy: only monthly + annual billing periods are offered.

ALTER TABLE public.products DROP COLUMN IF EXISTS price_2yr_cad;
ALTER TABLE public.products DROP COLUMN IF EXISTS price_3yr_cad;
ALTER TABLE public.products DROP COLUMN IF EXISTS stripe_price_id_2yr;
ALTER TABLE public.products DROP COLUMN IF EXISTS stripe_price_id_3yr;

-- Drop the old CHECK first so we can normalize legacy rows without
-- it rejecting the UPDATE statement below.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_period_check;

-- Defensive backfill: any subs still on 2yr/3yr roll forward to yearly.
UPDATE public.subscriptions
   SET billing_period = 'yearly'
 WHERE billing_period IN ('2yr', '3yr');

-- Re-add the tightened CHECK.
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_period_check
    CHECK (billing_period IN ('monthly', 'yearly'));
