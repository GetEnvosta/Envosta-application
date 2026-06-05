-- Per-site subscription model: each site gets its own Stripe subscription.
--
-- This column links a site to its dedicated Stripe subscription (1 site : 1 sub).
-- `stripe_subscription_item_id` is retained as the add-on back-reference (each
-- add-on is an item on this same per-site subscription).
--
-- NOTE: the one-time backfill of existing rows from the stripe.* Sync-Engine
-- mirror is run as a separate data operation against production. It is kept OUT
-- of this migration on purpose so the migration stays portable to environments
-- (CI / preview branches) where the Stripe Sync Engine schema is absent.

alter table public.sites
  add column if not exists stripe_subscription_id text;

create index if not exists idx_sites_stripe_subscription_id
  on public.sites (stripe_subscription_id);

comment on column public.sites.stripe_subscription_id is
  'Stripe subscription dedicated to this site (per-site billing, 1 site : 1 sub).';
