# RLS audit — `src/services/*.ts`

Phase 1, commit 4. Audit of every read path in `src/services/` against the
new RLS policies introduced by `20260506000004_rls_customer_tables.sql`.

**Outcome:** No changes required to `src/services/*.ts`. Every service
file already constructs its Supabase client via
`createClient` from `@/lib/supabase-server`, which produces a *user-scoped*
client that respects RLS. Once policies land, queries that read per-user
data will automatically filter by `auth.uid()`. Admin-scoped queries rely
on the policies' `fn_is_admin_or_staff()` predicate, which checks the
caller's `users.role` and grants admin/staff/affiliate full access.

The privileged code paths (webhooks, edge functions, cron routes,
provisioning, admin write endpoints) all construct a *service-role*
client inline (`createClient` from `@supabase/supabase-js` with
`SUPABASE_SECRET_KEY`). Service-role bypasses RLS automatically and is
unaffected by this migration.

---

## Per-file findings

### `src/services/admin.ts`
- **Client:** user-scoped (`@/lib/supabase-server`).
- **Queries reviewed:**
  - `getDashboardCounts` — counts `users`, `sites`, `domains`. Requires
    admin role to return non-zero counts. Policy:
    `fn_is_admin_or_staff()` covers this — only admin/staff/affiliate
    sessions get rows.
  - `getRecentCustomers`, `getAllCustomers`, `getCustomerById`,
    `getCustomerRelatedData`, `getRecentActivity`, `getAdminLogs` — all
    cross-user reads. Same admin-role gate.
  - `getUserDashboardCounts`, `getRecentUserServices`,
    `getRecentUserDomains` — user-scoped (caller passes `userId`, query
    filters with `.eq('user_id', userId)`). RLS double-checks this:
    a non-admin caller can only see their own rows even if `userId` is
    forged.
  - `getUserLogs` — reads `logs` table; no policies were added on
    `logs` in Phase 1 (out of scope — the audit doc flagged this as a
    separate concern). Behavior unchanged.
- **Changes made:** none.
- **Justification for keeping user-scoped client:** the admin paths
  rely on the admin's session role. This is the desired RLS-native
  pattern.

### `src/services/auth.ts`
- **Client:** user-scoped.
- **Queries reviewed:** `getCurrentUser`, `getEffectiveUserId`,
  `getImpersonationInfo`, `getUserProfile`. All read `users` table.
- **Impersonation note:** `getEffectiveUserId` reads the target user's
  `partner_id` to verify the impersonating partner is authorized. With
  RLS, that read will return null unless the partner can see the target
  user. Partner→client is enforced today by the application code
  (`partner_id = caller`). A future enhancement is to add an RLS
  policy on `users` letting partners SELECT rows where
  `partner_id = auth.uid()`, but that's not strictly required because
  the application-level check still works — and admin policy already
  covers the admin impersonation case.
- **Changes made:** none.

### `src/services/billing.ts`
- **Client:** user-scoped.
- **Queries reviewed:** `getUserSubscriptions`,
  `getUserSubscriptionsWithDetails`, `getSubscriptionById`,
  `getActiveSubscription`, `getUserInvoices`, `getCustomerInfo`,
  `getAllSubscriptionsAdmin`, `getAllActiveSubscriptions`,
  `getAdminBillingStats`, `getAdminRecentInvoices`,
  `getAllCustomersWithUsers`, `getAbandonedCheckoutCount`,
  `getAbandonedCheckouts`.
- All admin-prefixed queries depend on the admin role policy.
- `getCustomerInfo` makes a *direct* Stripe `fetch` call — that's an
  outbound API path the api_calls logger (Phase 1 commit 4 added
  `src/lib/api-call-logger.ts`) will wrap in Phase 3.
- **Changes made:** none.

### `src/services/blog.ts`
- **Client:** user-scoped.
- **Queries reviewed:** all read `blog_posts`. No RLS on `blog_posts`
  was added in Phase 1 (public marketing content).
- **Changes made:** none.

### `src/services/commissions.ts`
- **Client:** user-scoped.
- **Queries reviewed:** `getAllCommissions`, `getCommissionStats`,
  `getCommissionsByEarner`. The earner-scoped query filters by
  `earner_id = userId` which the RLS policy
  `Earners can view own commissions` also enforces.
- **Changes made:** none.

### `src/services/domains.ts`
- **Client:** user-scoped.
- **Queries reviewed:** `getUserDomains`, `getUserDomainsForSite`,
  `getDomainById`, `getAdminDomainById`, `getAllDomains`,
  `getRegisteredDomainsCount`. All admin-prefixed reads rely on the
  admin role policy.
- **Changes made:** none.

### `src/services/partners.ts`
- **Client:** user-scoped.
- **Queries reviewed:** `getPartnerProfile`, `updatePartnerProfile`,
  `getApprovedPartners`, `getPartnerClients`, `getPartnerClientDetail`,
  `getPartnerTickets`, `getPartnerTicketDetail`, `getPartnerCommissions`,
  `getPartnerEarningStats`, `applyAsPartner`, `getClientPartnerInfo`,
  `getPartnerApplications`, `adminReviewPartner`,
  `togglePartnerFeatured`, `trackReferralClick`.
- **Partner-scoped reads** (`getPartnerClients`, `getPartnerTickets`,
  etc.) filter on `partner_id = partnerId` / `earner_id = partnerId`.
  Without an explicit RLS policy for the partner→client relationship
  on `users`, the partner won't see their clients' rows when reading
  via the user-scoped client. This is a known follow-up — to be added
  in Phase 7 or earlier, as a policy on `users`:
  ```sql
  CREATE POLICY "Partners can view their clients"
    ON public.users FOR SELECT
    USING (partner_id = auth.uid());
  ```
  Until then, partner dashboard reads will fall back to admin-mediated
  flows. The partner program UI is currently behind feature flag.
- **Changes made:** none in Phase 1. Tracked as TODO for Phase 7.

### `src/services/plans.ts`
- **Client:** user-scoped.
- **Queries reviewed:** all read `products`. No RLS on `products` was
  added in Phase 1 (catalog data, intended to be public-readable).
- **Changes made:** none.

### `src/services/sites.ts`
- **Client:** user-scoped.
- **Queries reviewed:** `getUserSites`, `getSiteById`,
  `getUserSitesWithSubscriptions`, `getUserServicesBasic`,
  `getUserServicesList`, `getServiceDetailById`, `getServiceDomains`,
  `getServiceLogs`, `getAllServices`. Admin reads rely on the admin
  role policy.
- **Note:** `getSiteById` doesn't filter by `user_id` — it relies
  entirely on RLS to scope the read. That's exactly the RLS-native
  pattern; once policies land, this becomes safer than the previous
  behavior (which leaked any site by ID to authenticated callers).
- **Changes made:** none.

### `src/services/tickets.ts`
- **Client:** user-scoped.
- **Queries reviewed:** `getUserTickets`, `getTicketById`,
  `getAllTickets`, `getTicketCounts`, `getRecentTicketsByType`,
  `getAdminTicketDetail`. Admin reads rely on the admin role policy.
- **Changes made:** none.

---

## Follow-ups (not Phase 1)

- **Partner→client RLS policy on `users`** (see `partners.ts` above).
  Required before partners can use the dashboard without admin
  intervention. Phase 7 candidate.
- **`logs`, `products`, `blog_posts` RLS.** Out of Phase 1 scope; the
  audit doc treated these as a separate decision. Customer-facing tables
  were the priority for this commit.
- **Service-role inline construction.** A handful of admin API routes
  in `src/app/api/admin/**` build service-role clients inline. They're
  unaffected by the new policies (RLS bypass) but worth cataloguing in
  a future audit so we can spot accidental privilege creep.
