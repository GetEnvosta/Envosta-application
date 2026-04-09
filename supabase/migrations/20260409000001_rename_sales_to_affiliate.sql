-- Rename: sales role → affiliate, sales ticket type → onboarding, sales_rep commission → affiliate

-- 1. Convert role column from enum to text
-- Drop the default first (depends on enum), convert column, then re-set default
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN role TYPE TEXT USING role::TEXT;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'customer';
DROP TYPE IF EXISTS user_role;

-- Update existing sales users to affiliate
UPDATE public.users SET role = 'affiliate' WHERE role = 'sales';

-- 2. Rename ticket type: sales → onboarding
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_type_check;
UPDATE public.tickets SET type = 'onboarding' WHERE type = 'sales';
ALTER TABLE public.tickets ADD CONSTRAINT tickets_type_check
  CHECK (type IN ('technical', 'studio', 'onboarding', 'support'));

-- 3. Rename commission type: sales_rep → affiliate
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_type_check;
UPDATE public.commissions SET type = 'affiliate' WHERE type = 'sales_rep';
ALTER TABLE public.commissions ADD CONSTRAINT commissions_type_check
  CHECK (type IN ('affiliate', 'referral'));
