-- Retire the standalone "Reseller" hosting plan.
--
-- Resellers are now a per-account flag (users.metadata.reseller) that applies
-- a flat platform discount — a forever Stripe coupon — to every per-site
-- subscription they own (see src/lib/reseller.ts + /api/admin/set-reseller).
-- The bespoke plan tier is no longer referenced by any code path, so remove it.
--
-- Safe: no sites reference this product (per-site billing links to Stripe
-- prices, not this row). The orphaned Stripe Product/Prices can be archived
-- in the Stripe dashboard separately if desired.

delete from public.products
where slug = 'reseller' and type = 'hosting_plan';
