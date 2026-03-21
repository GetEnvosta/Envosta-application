-- ============================================================================
-- Multi-subscription support: link subscriptions <-> services 1:1
-- ============================================================================

-- The subscription_id column already exists on services from the initial schema.
-- Add a unique constraint to enforce the 1:1 relationship.
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_subscription_id_unique
  ON public.services(subscription_id)
  WHERE subscription_id IS NOT NULL;

-- Allow authenticated users to UPDATE their own domains (service_id switching)
CREATE POLICY "domains_update_own" ON public.domains
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT UPDATE ON public.domains TO authenticated;

-- Allow authenticated users to UPDATE their own services (subscription linking)
CREATE POLICY "services_update_own" ON public.services
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT UPDATE ON public.services TO authenticated;
