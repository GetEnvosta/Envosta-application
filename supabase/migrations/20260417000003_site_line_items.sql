-- Each site is now a Stripe subscription line item.
-- One subscription per customer, sites as items on it.
-- Upgrading a site = swapping its line item price (e.g., Minimum → Growth).

-- Track which Stripe subscription item each site corresponds to
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT;

-- Ensure product_id is set on sites (which plan tier the site is on)
-- This column already exists but may be nullable — make sure it's available
-- product_id references products(id) — already defined in schema
