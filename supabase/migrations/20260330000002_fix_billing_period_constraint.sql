-- Allow 2yr and 3yr billing periods in subscriptions table
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_period_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_billing_period_check CHECK (billing_period IN ('monthly', 'yearly', '2yr', '3yr'));
