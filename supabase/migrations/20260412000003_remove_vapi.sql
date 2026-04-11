-- Remove Vapi references — not used
DELETE FROM public.products WHERE slug LIKE 'vapi%' AND type = 'credit_rate';
