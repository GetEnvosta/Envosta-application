# OPEN QUESTIONS — owned by Koltyn

Per `CLAUDE.md` §10 and `ENVOSTA_REBUILD_BRIEF.md`: decisions built behind
config flags and surfaced here — never resolved unilaterally.

## Charter Open Decisions (CLAUDE.md §10)

1. **Beachhead industry:** HVAC vs. roofing. Templates/config support both;
   pick before Gate 0 outreach starts.
2. **Currency display:** the locked numerals ($36/$297/$597/$3,472) — labeled
   CAD or USD? Built as a config flag (`config/pricing`), default pending.
   Note: the existing production site prices in CAD with USD variants; the
   new plans seed in `0001_init.sql` defaults `currency='USD'`.
3. **Payment processor confirmation:** Stripe account + mode (the existing
   production Stripe account vs. a fresh one; test mode until go-live).
4. **Legal:** contract/ToS language for domain ownership, cancellation, and
   the two guarantees. Concepts are locked (charter §7); implementing terms
   need sign-off before shipping.

## The three human-only items (handoff header) — needed at Phase 6

5. **Secrets:** real values into `.env.local` + Vercel env. Never in chat/git.
6. **Dev Supabase project:** create one (do NOT reuse production), scoped
   access token, `supabase link` + `db push` of `0001_init.sql`.
   ⚠️ `0001_init.sql` must never run against the production project — it
   collides with live tables (`domains`, `sites`, …) holding customer data.
7. **wp.cloud endpoint paths:** pull exact paths from the partner docs into
   every `VERIFY` marker in `lib/wpcloud.ts`. `PROVISIONING_DRY_RUN` stays
   `true` until a full dry trace is approved in-session.
   Note: the repo already has a proven wp.cloud client
   (`src/lib/integrations/wpcloud.ts`) with working endpoints — candidate to
   fold into `lib/wpcloud.ts` at Phase 6 instead of re-verifying from docs.

## Operational questions raised by the audit

8. **Existing paying customers (2 live sites + 1 domain on the old
   plans/model):** the charter freezes a new ladder and bans Jetpack/coupons.
   What happens to the two live customers — grandfather on old pricing,
   migrate to Minimum/Basic, or handle manually? Their sites, per-site Stripe
   subs, and the `ranchhacks.ca` renewal cron keep running off `main` +
   production DB either way until cutover; nothing in this rebuild touches
   them without explicit go-ahead.
9. **Production DB strategy at cutover:** fresh schema (`0001_init.sql`) on a
   new/dev project vs. migrating the production project in place. The brief
   assumes dev-first; the cutover data story (customers, domains, sites)
   needs a decision before Phase 8 completes.
10. **envosta.com vs my.envosta.com:** the rebuild brief targets the marketing
    site + one app. Current production splits marketing (envosta.com) and
    dashboard (my.envosta.com) in this single repo. Confirm the new frontend
    serves both surfaces (charter implies yes: `/dashboard` + `/admin` in the
    same app).

## Phase 3 items for confirmation

11. **Stripe wiring (brief Phase 3.5):** the signup checkout charges the
    exact config numbers via inline `price_data` (no catalog objects, no
    drift). Phase 6's bootstrap script creates catalog Products/Prices and
    the route swaps to IDs. Confirm this is acceptable for the interim, and
    confirm the Stripe account/mode before any live rep-assisted close
    (Open Decision #3).
12. **Annual prepay mechanics:** implemented per the handoff's bootstrap
    definition — annual = 12× monthly billed yearly, framed as "13th month
    free". If the intent is instead a literal 13-month first term (12×
    price + one bonus month of coverage), say so — it changes the Stripe
    term setup, not the price.
13. **Before flipping SELF_SERVE_ENABLED at Gate 3:** add the Turnstile
    widget to the /signup form (the API already enforces verification for
    non-staff callers when the secret is configured) and re-run the
    Phase 9 checklist on the flow.

## Proposed, not built

- (empty — improvements spotted outside the brief's scope get parked here)
