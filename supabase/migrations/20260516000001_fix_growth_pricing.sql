-- Find and remove duplicate Growth row, keep the most recently updated one
-- (preferring rows already linked to Stripe).
DELETE FROM public.products
WHERE type = 'hosting_plan'
  AND (name ILIKE '%growth%' OR slug ILIKE '%growth%')
  AND id NOT IN (
    SELECT id FROM public.products
    WHERE type = 'hosting_plan'
      AND (name ILIKE '%growth%' OR slug ILIKE '%growth%')
    ORDER BY (stripe_price_id IS NOT NULL) DESC, updated_at DESC
    LIMIT 1
  );

-- Update the remaining Growth row to Shopify Advanced-equivalent pricing.
UPDATE public.products
SET
  price_cad = 51700,
  price_yearly_cad = 466800,
  price_usd = 39900,
  price_yearly_usd = 358800,
  updated_at = now()
WHERE type = 'hosting_plan'
  AND (name ILIKE '%growth%' OR slug ILIKE '%growth%');

NOTIFY pgrst, 'reload schema';
