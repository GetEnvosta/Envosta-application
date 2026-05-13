# Envosta Architecture Audit — Phase 0

> Read-only inventory of every place Envosta talks to wp.cloud, OpenSRS, and Stripe; every webhook, cron, edge function, mirror table, and env var. Baseline for the mirror-table refactor.

> **HISTORICAL — superseded by Phase 2D (2026-05-13).** The Cloud Run
> proxies (`opensrs-proxy/`, the off-repo wp.cloud proxy) and the
> Supabase Edge Functions `stripe-webhook`, `provision-hosting`,
> `site-info`, `register-domain`, and `health-check` have been deleted.
> All wp.cloud + OpenSRS traffic now originates from Vercel static IPs
> via `src/lib/integrations/{wpcloud,opensrs,jetpack}.ts` and the
> `/api/internal/{wpcloud,opensrs}/*` + `/api/webhooks/stripe` routes.
> The proxy and edge-function references below describe the pre-Phase-2D
> world and are kept only for context.

**Scope:** `src/`, `supabase/`, `opensrs-proxy/` (removed), `vercel.json`, `package.json`, `.env.example`.
**Generated against:** `main` @ commit `6f3f820` (chore: use new Supabase API key naming exclusively).

---

## Table of contents

1. Outbound API calls
2. Webhook endpoints
3. Direct UI reads from external APIs
4. Cron jobs / scheduled tasks
5. Cloud Run / proxy infrastructure
6. Supabase schema inventory
7. Environment variables
8. Supabase Edge Functions
9. Top-level findings + recommendations

---

# 1. Outbound API calls

The platform has **two parallel paths** for talking to externals:

- **Next.js routes** (Vercel) — call Stripe directly from `src/app/api/**` using the `stripe` npm package. Static IPs make IP-allowlisted endpoints reachable here too, but currently only Stripe (which doesn't IP-allowlist) is called this way.
- **Supabase Edge Functions** (Deno) — call wp.cloud (through `WPCLOUD_PROXY_URL`), OpenSRS (through `OPENSRS_PROXY_URL` or directly), and Stripe (via `Stripe` SDK in `_shared/deps.ts`).

## 1a. wp.cloud (Atomic) — every call

All wp.cloud HTTP traffic flows through `wpcloudPost` / `wpcloudGet` / `runWpCli` / `manageSoftware` in `supabase/functions/_shared/deps.ts`. The URL is `${WPCLOUD_PROXY_URL}${path}` — a Cloud Run proxy with a static IP that wp.cloud whitelists. Auth: `Auth: ${WPCLOUD_API_KEY}` + `X-Proxy-Secret: ${WPCLOUD_PROXY_SECRET}` headers.

No Next.js route calls wp.cloud directly — they all go through `/functions/v1/{provision-hosting,site-info,health-check}` edge functions.

| Call (path) | Caller file | Runs in | Mirror? |
|---|---|---|---|
| `POST /api/v1.0/create-site/{client}/{id}` | `supabase/functions/provision-hosting/index.ts:157,166` | Edge function | Yes — writes `sites.wp_cloud_site_id`, `sites.wp_cloud_url`, `sites.metadata.wp_cloud_response` |
| `GET /api/v1.0/get-ips/{client}/{ref}` | `provision-hosting/index.ts:206`, `health-check/index.ts:44`, `site-info/index.ts:409,659` | Edge function | Partial — caches in `sites.metadata.site_ip` |
| `POST /api/v1.0/site-meta/{id}/{key}/update` | `provision-hosting/index.ts:251`, `site-info/index.ts:314,484,489,499,566,599` | Edge function | No — live writes to wp.cloud, mirror only in `sites.config` |
| `task-create/{client}/run-wp-cli-command` (raw fetch) | `provision-hosting/index.ts:289,301`, `site-info/index.ts:854,895,899` (via `runWpCli`) | Edge function | No — task ID logged, async result never polled |
| `POST /api/v1.0/site-manage-software/{type}/{id}` (lock/unlock) | `provision-hosting/index.ts:314,324`, `site-info/index.ts:903,907` | Edge function | No |
| `GET /api/v1.0/get-domain-verification-code/{client}/{domain}` | `site-info/index.ts:34` | Edge function | No — read-through |
| `GET /api/v1.0/get-available-datacenters/{client}` | `site-info/index.ts:70` | Edge function | No — hardcoded fallback list |
| `POST /api/v1.0/ssl-info/{domain}` | `site-info/index.ts:91` | Edge function | No — read-through every call |
| `GET /api/v1.0/get-sites/{client}/+` | `site-info/index.ts:99` | Edge function | No — used for sync/drift detection |
| `GET /api/v1.0/get-site/{wpId}/extra` | `site-info/index.ts:117` | Edge function | Partial — `disk_usage_mb` synced by daily cron |
| `GET /api/v1.0/site-backups-list/{client}/{id}` | `site-info/index.ts:135` | Edge function | No — read-through |
| `POST /api/v1.0/delete-site/{client}/{id}` | `site-info/index.ts:257` | Edge function | Yes — flips `sites.status='cancelled'`, nulls `wp_cloud_site_id` |
| `GET /api/v1.0/get-php-versions/{client}/verbose` | `site-info/index.ts:285` | Edge function | No |
| `POST /api/v1.0/update-site-domain/{client}/{id}/{domain}/{keep}` | `site-info/index.ts:380,627` | Edge function | Partial — updates `sites.wp_cloud_url` |
| `*` edge cache (`/api/v1.0/edge-cache/{id}/{action}/{domain}`) | `site-info/index.ts:714,719,724,739,744` | Edge function | No |
| `POST /api/v1.0/on-demand-backup/create/{id}/{type}` | `site-info/index.ts:757` | Edge function | No |
| `GET /api/v1.0/site-backup-get/{client}/{id}/{backupId}` | `site-info/index.ts:771` | Edge function | No |
| `GET /api/v1.0/ssh-user/{client}/{id}/list` | `site-info/index.ts:784` | Edge function | No |
| `POST /api/v1.0/ssh-user/{client}/{id}/update/{user}` | `site-info/index.ts:799` | Edge function | No |
| `POST /api/v1.0/site-error-logs/{id}` | `site-info/index.ts:817` | Edge function | No |

**All wp.cloud calls go through the `WPCLOUD_PROXY_URL` proxy.** With Vercel Static IPs enabled, this proxy is now redundant — wp.cloud could allowlist Vercel's static IPs and the edge functions could call `https://atomic-api.wordpress.com` directly.

## 1b. Jetpack Start API (Automattic — partner attribution)

Special-purpose Automattic API, called directly (no proxy):

| Call | Caller | Runs in | Mirror? |
|---|---|---|---|
| `POST https://public-api.wordpress.com/oauth2/token` | `supabase/functions/_shared/jetpack.ts:58`, `src/app/api/admin/jetpack-attribute/route.ts:22` | Edge function + Next.js | No — token discarded after call |
| `POST https://public-api.wordpress.com/rest/v1.3/jpphp/provision` | `supabase/functions/_shared/jetpack.ts:107`, `src/app/api/admin/jetpack-attribute/route.ts:34` | Edge function + Next.js | Partial — stamps `sites.metadata.jetpack_attribution` |

Called once at the end of `provision-hosting`, and from the admin backfill route. The Next.js version duplicates the edge-function logic — should consolidate.

## 1c. OpenSRS — every call

All XML-API calls go through `opensrsRequest` in `supabase/functions/_shared/opensrs.ts`. If `OPENSRS_PROXY_URL` is set, requests go through the Cloud Run proxy at `opensrs-proxy/`; otherwise directly to `${OPENSRS_HOST}:55443`.

No Next.js route calls OpenSRS directly — they go through `/functions/v1/register-domain`. The one outlier is `/api/admin/commissions` which calls `https://api.stripe.com/...` directly (not OpenSRS).

| Action / XML protocol | Caller | Mirror? |
|---|---|---|
| `DOMAIN.LOOKUP` | `register-domain/index.ts:201` (action `check`) | No — availability check, read-only |
| `DOMAIN.SW_REGISTER` (reg_type=new) | `register-domain/index.ts:276` | Yes — `domains.status`, `expiry_date`, `metadata` |
| `DOMAIN.SW_REGISTER` (reg_type=transfer) | `register-domain/index.ts:339` | Yes — `domains.status='transferring'` then `registered` via cron |
| `DOMAIN.ADVANCED_UPDATE_NAMESERVERS` | `register-domain/index.ts:441` | Yes — `domains.metadata.nameservers` |
| `nameserver.registry_add_ns` | `register-domain/index.ts:404` (helper `registryAddNs` in `_shared/opensrs.ts:367`) | No |
| `DOMAIN.SET_DNS_ZONE` + `CREATE_DNS_ZONE` | `_shared/opensrs.ts:254` (`setDnsZone`), called from `register-domain/index.ts:470,533,567`, `provision-hosting/index.ts:408`, `health-check/index.ts:77`, `site-info/index.ts:433` | Partial — `domains.metadata.dns_records`, `dns_setup`, `dns_setup_at` |
| `DOMAIN.GET_DNS_ZONE` | (export `buildGetDnsZoneXml` in `_shared/opensrs.ts:178` — defined but never called) | n/a |
| `DOMAIN.modify` (expire_action / auto_renew) | `register-domain/index.ts:626`, `stripe-webhook/index.ts:630` | Yes — `domains.auto_renew` |
| `DOMAIN.modify` (whois_privacy_state) | `register-domain/index.ts:698` | Yes — `domains.metadata.whois_privacy` |
| `DOMAIN.modify` (lock_state) | `_shared/opensrs.ts:408` (`setDomainLock`), called from `register-domain/index.ts:392,448,599,631,738` | No — fetched live each time |
| `DOMAIN.get` (type=status) | `_shared/opensrs.ts:441` (`getDomainLockStatus`), called from `register-domain/index.ts:720` | No — read-through |
| `DOMAIN.get` (type=domain_auth_info) | `_shared/opensrs.ts:482` (`getDomainAuthCode`), called from `register-domain/index.ts:753` | No — sensitive, never persisted |
| `DOMAIN.get` (type=all_info) | `_shared/opensrs.ts:523` (`checkTransferStatus`), called from `health-check/index.ts:140` | Partial — used to flip transferring → registered |
| `nameserver.create` | `_shared/opensrs.ts:293` (`createNameserver`), called from `register-domain/index.ts:773` | No |
| `nameserver.delete` | `_shared/opensrs.ts:324` (`deleteNameserver`) — defined but never called | n/a |
| `DOMAIN.GET_DOMAINS_BY_EXPIREDATE` (paginated) | `_shared/opensrs.ts:576` (`listAllDomains`), called from `register-domain/index.ts:190` | No — used for drift check |

**Direct vs. proxy:** every OpenSRS call routes through the `opensrsRequest` helper which conditionally goes through `OPENSRS_PROXY_URL` (a separate Cloud Run service at `opensrs-proxy/`). Same redundancy as wp.cloud — with Vercel static IPs and the new Supabase static-egress option, proxy is removable.

## 1d. Stripe — every call

Two SDKs: `stripe` npm in Next.js routes, `https://esm.sh/stripe@14` in edge functions via `getStripe()` from `_shared/deps.ts`.

### Next.js routes calling Stripe directly

| File | Operations | Through proxy? | Mirror? |
|---|---|---|---|
| `src/app/api/create-subscription/route.ts:99,147,154,196` | `customers.create`, `promotionCodes.list`, `subscriptions.create`, `setupIntents.create` | Direct | Mirror via webhook |
| `src/app/api/create-site/route.ts:97,141,254` | `subscriptions.create`, `subscriptionItems.update`, then fires provisioning | Direct | Mirror via webhook |
| `src/app/api/billing-portal/route.ts:32,41,74,79` | `customers.create`, `setupIntents.create`, `customers.update`, `paymentMethods.retrieve` | Direct | No — `card_*` cached in `users.metadata` |
| `src/app/api/payment-methods/route.ts:25,41,42,50,55,83,103,108,131` | `customers.create`, `paymentMethods.list/retrieve/detach`, `customers.retrieve/update`, `subscriptions.list`, `setupIntents.create` | Direct | Partial — card details mirrored to `users.metadata` |
| `src/app/api/signup-checkout/route.ts:182,208,238` | `customers.create`, `promotionCodes.list`, `checkout.sessions.create` | Direct | Mirror via webhook |
| `src/app/api/domain-checkout/route.ts:61,71` | `customers.create`, `subscriptions.create` | Direct | Mirror via webhook |
| `src/app/api/domain-only-checkout/route.ts:71,80` | `customers.create`, `subscriptions.create` | Direct | Mirror via webhook |
| `src/app/api/reactivate-site/route.ts:106` | `subscriptions.create` | Direct | Mirror via webhook |
| `src/app/api/upgrade-site/route.ts` | reads + updates subscription items | Direct | Mirror via webhook |
| `src/app/api/admin/charge-customer/route.ts:57,68,76,87,88` | `customers.retrieve`, `invoiceItems.create`, `invoices.create/finalizeInvoice/pay` | Direct | Mirror via webhook |
| `src/app/api/admin/refund-invoice/route.ts:41,47` | `invoices.retrieve`, `refunds.create` | Direct | Yes — flips `invoices.status='void'` |
| `src/app/api/admin/sync-stripe/route.ts:28,38,43,49,91,95,105,119,261,296,317,356,368` | full product/price catalog push & pull | Direct | Yes — writes back to `products.stripe_*` |
| `src/app/api/admin/sync-customer/route.ts:56,89,110,112` | `subscriptions.list`, `invoices.list`, `customers.retrieve`, `paymentMethods.retrieve` | Direct | Yes — drift fixer |
| `src/app/api/admin/coupons/route.ts:36,40,90,93,113` | `coupons.list/create/del`, `promotionCodes.list/create` | Direct | No — read-through |
| `src/app/api/admin/stripe-products/route.ts:36,43` | iterates `products.list`, `prices.list` | Direct | Yes — auto-link by metadata + clear stale IDs |
| `src/app/api/admin/create-product/route.ts:103,105` | `products.update`, `prices.update` (deactivate) | Direct | No |
| `src/app/api/admin/update-tld-price/route.ts:43,52` | `products.create`, `prices.create` | Direct | Yes — writes `stripe_product_id`, `stripe_price_id` |
| `src/app/api/admin/attach-domain-subscription/route.ts:44` | `subscriptions.create` | Direct | Yes |
| `src/app/api/admin/commissions/route.ts:132` | raw `fetch` to `https://api.stripe.com/v1/customers/{id}/balance_transactions` | Direct | Yes — stamps `commissions.stripe_txn_id` |
| `src/lib/stripe-subscription.ts` | helpers: `subscriptionItems.create/update/del`, `subscriptions.update/retrieve` | Direct | Mirror via webhook |
| `src/lib/admin-precreate-subscription.ts:66,99,103,106` | `customers.create`, `subscriptions.create` | Direct | Yes — mirrored synchronously into `subscriptions` |

### Edge functions calling Stripe

| File | Operations | Mirror? |
|---|---|---|
| `supabase/functions/stripe-checkout/index.ts:34,40,46,48,74,81,89,90,109,189` | `customers.create`, `products` lookup, `invoiceItems.create`, `invoices.create/finalizeInvoice/sendInvoice`, `checkout.sessions.create` | Mirror via webhook |
| `supabase/functions/stripe-webhook/index.ts:165,259,316,767,780,822` | `customers.update`, `subscriptionItems.update`, `subscriptions.create/cancel/retrieve` | Yes — primary mirror writer |
| `supabase/functions/site-info/index.ts:167-201,509-525,685-692` | `subscriptions.retrieve/update`, `subscriptionItems.del`, raw fetch to `https://api.stripe.com/v1/...` for plan-change | Mirror via webhook |
| `supabase/functions/register-domain/index.ts:649-658` | `subscriptions.update` (auto-renew sync) | No — best-effort sync |
| `supabase/functions/health-check/index.ts:195,227,273` | `invoices.list`, `subscriptions.list`, `paymentMethods.list` — daily drift sweep | Yes — upserts on drift |

**No proxy is used for Stripe** anywhere — direct egress.

---

# 2. Webhook endpoints

| Endpoint | Provider | Handler | Verifies signature? | Dedupes? | Inline orchestration? | Latency risk |
|---|---|---|---|---|---|---|
| `POST /functions/v1/stripe-webhook` | Stripe | `supabase/functions/stripe-webhook/index.ts` (863 lines) | Yes — `stripe.webhooks.constructEventAsync` with `STRIPE_WEBHOOK_SECRET` | Yes — inserts into `webhook_events` table (**no migration creates this table**) | **Yes, heavily** | Could exceed 5s on heavy events |
| _(none)_ | wp.cloud | wp.cloud doesn't push events; state is polled via `health-check` cron | n/a | n/a | n/a | n/a |
| _(none)_ | OpenSRS | OpenSRS doesn't push events; state is polled via `health-check` cron | n/a | n/a | n/a | n/a |

### Stripe webhook handler — orchestration breakdown

`stripe-webhook/index.ts` is the orchestration bottleneck of the whole system. Per-event work inside the handler:

- **`customer.subscription.created` / `updated`** — match price → product; upsert `subscriptions` row; iterate every subscription item to upsert `sites.product_id` + `stripe_subscription_item_id`; pre-link site by `metadata.envosta_site_id` OR by `subscription_id` lookup OR brand-new INSERT; **synchronously fires `POST /functions/v1/register-domain`** (line 284) AND **`POST /functions/v1/provision-hosting`** (line 372); creates a yearly domain renewal Stripe subscription (line 316); writes welcome email via Resend (line 272); handles pause/resume cascade across all attached sites (lines 407-478).
- **`customer.subscription.deleted`** — flips `subscriptions.status='cancelled'`; pauses every attached site; sends `sitesPausedEmail`; if `metadata.type='domain_renewal'`, fires inline OpenSRS `DOMAIN.modify` to disable auto-renew (line 630).
- **`invoice.paid` / `payment_failed` / `created`** — upserts `invoices`; flips `users.metadata.signup_status` from awaiting_payment → active; flips Supabase Auth `email_confirm`; sends invoice email; on domain renewal, retrieves the Stripe subscription and bumps `domains.expires_at`; resets `users.payment_status='current'`; **fallback site INSERT if no site found** (line 808).
- **`checkout.session.completed`** — currently only handles studio_request tickets (Studio feature is removed elsewhere — leftover code path).
- **`customer.created`** — back-stamps `users.stripe_customer_id`.

**Total inline external calls per `subscription.created`:** up to 4 — Stripe (`stripe.customers.update`, `stripe.subscriptionItems.update`, `stripe.subscriptions.create`), an edge-function call to `register-domain` (which itself talks to OpenSRS), and a call to `provision-hosting` (which talks to wp.cloud, then OpenSRS for DNS, then Jetpack). Worst-case path stacks all of these serially in a single webhook handler. This is the single largest violation of the "webhooks just enqueue work" principle the cleanup plan targets.

**Idempotency note:** the `webhook_events` table is referenced (`stripe-webhook/index.ts:26-31`) but **no migration creates it**. Either the table was created manually in the Supabase dashboard or the dedupe check is silently failing (the `try{}catch{}` around the insert means dedupe failures are swallowed). This should be in a migration.

---

# 3. Direct UI reads from external APIs

The dashboard reads almost exclusively from Supabase mirrors. The exceptions are all live wp.cloud reads on the customer's site detail page, plus admin diagnostic views.

| Component / page | What's fetched live | Local mirror exists? | Replaceable by mirror? |
|---|---|---|---|
| `src/components/sites/ssl-status.tsx` | wp.cloud `ssl-info` per render | No | Yes — add `sites.ssl_*` columns, refresh hourly |
| `src/components/sites/site-backups.tsx` | wp.cloud `list-backups` per render | No | Yes — mirror table `site_backups` |
| `src/components/sites/site-performance.tsx` | wp.cloud `edge-cache/status` per render | No | Partial — cache state on `sites.config` |
| `src/components/sites/site-ip.tsx` | wp.cloud `get-ips` if missing | Yes — `sites.metadata.site_ip` (lazy cache) | Already mirrored — just trust the mirror |
| `src/components/sites/site-access.tsx` (SFTP) | reads from props/server — no live call | n/a | n/a |
| `src/app/(app)/admin/logs/health-checks.tsx` | calls `/api/admin/sync-check` → live wp.cloud `list-all-sites` + OpenSRS `list-all-domains` | n/a — drift check, this is the intended live read | n/a (this IS the reconciliation tool) |
| `src/components/admin/sync-info.tsx` | same as above | n/a | n/a |
| `src/components/domains/dns-manager.tsx` | live OpenSRS DNS get via `/api/domains` → `register-domain` | Partial — `domains.metadata.dns_records` snapshot only | Yes — cache DNS records per domain, invalidate on write |
| `src/components/admin/stripe-products.tsx` | `/api/admin/stripe-products` → live `products.list` + `prices.list` | Yes — `products.stripe_*` columns | Already mirrored — this is reconciliation UI only |
| `src/components/admin/coupon-manager.tsx` | `/api/admin/coupons` → live `coupons.list` + `promotionCodes.list` | **No** | Should add a `coupons` mirror table |
| `src/app/api/payment-methods/route.ts` GET | live `paymentMethods.list` + `customers.retrieve` on every dashboard hit | Partial — `users.metadata.card_*` | Yes — read mirror in normal UI, only hit Stripe on add/remove |
| `src/app/(app)/admin/diagnostics/page.tsx` | reads from Supabase only | Mirror | n/a |
| `src/app/(app)/dashboard/sites/[id]/page.tsx` | reads from Supabase only | Mirror | n/a |

**Customer-facing impact:** every visit to a site detail page makes 2-3 live wp.cloud calls (SSL, backups, cache status). On a flaky proxy these hang the dashboard. Mirroring + refresh-on-demand is the obvious win.

---

# 4. Cron jobs / scheduled tasks

All crons are **Vercel Cron** entries in `vercel.json` hitting `/api/cron/*` routes in the Next.js app. No `pg_cron`, no Supabase scheduled functions.

| Schedule | Path | What it does | Idempotent? | Side effects |
|---|---|---|---|---|
| `0 6 * * *` (daily 6am UTC) | `/api/cron/health-check` (`src/app/api/cron/health-check/route.ts`) | (1) Calls edge fn `health-check` (IP drift, domain expiry, transfer status, Stripe reconciliation); (2) Per-site `get-site` to sync `disk_usage_mb`; (3) `list-all-sites` from wp.cloud, auto-creates orphan `sites` rows for any wp.cloud site not in DB, emails admin@envosta.com on drift via raw Resend fetch. | Yes — upserts only on drift | Auto-inserts site rows with `user_id=null`. Sends email to admin |
| `0 5 * * *` (daily 5am UTC) | `/api/cron/cleanup-unclaimed` (`src/app/api/cron/cleanup-unclaimed/route.ts`) | Deletes user rows where `claimed=false AND claim_expires_at < now()`. Cascades through sites, subscriptions, tickets, ticket_messages, logs, commissions, invoices, then `auth.admin.deleteUser`. | Per-user yes (no double-delete) | **Destructive** — purges customer data |
| `*/5 * * * *` (every 5 min) | `/api/cron/retry-stuck-provisions` (`src/app/api/cron/retry-stuck-provisions/route.ts`) | Re-fires `provision-hosting` for sites stuck in `status='provisioning'` with no `wp_cloud_site_id`. Caps at 5 attempts/site, exponential backoff (5→10→20→40→80 min), 10 sites/batch. | Yes — attempt counter on `sites.metadata.provision_attempts`, `provision_giving_up` flag | Calls wp.cloud via `provision-hosting` |
| `0 4 * * *` (daily 4am UTC) | `/api/cron/delete-expired-sites` (`src/app/api/cron/delete-expired-sites/route.ts`) | Hard-deletes sites where `status='cancelled' AND metadata.recovery_deadline < now()`. Calls `site-info` `hard-delete-site` action. Caps at 25/batch, max 5 attempts/site. | Yes — `metadata.delete_attempts`, `delete_giving_up` | **Destructive** — calls wp.cloud `delete-site` |
| `0 3 * * *` (daily 3am UTC) | `/api/cron/cleanup-abandoned-signups` (`src/app/api/cron/cleanup-abandoned-signups/route.ts`) | Deletes user rows where `metadata.signup_status` is `awaiting_payment` or `payment_failed` AND `created_at < now() - 30d` AND no paid invoice on file. 50/batch. | Yes (per-user). Defense-in-depth: re-checks paid invoices, skips comped sites | **Destructive** — purges customer auth + data |

All crons authenticate via `CRON_SECRET` header. **None has a kill switch in DB** — to pause one you'd have to redeploy `vercel.json`.

---

# 5. Cloud Run / proxy infrastructure

## 5a. `opensrs-proxy/` (in repo)

Tiny Node/Express service:
- `opensrs-proxy/index.js` (36 lines) — accepts `POST /` with raw XML body, forwards to `https://${OPENSRS_HOST}:55443` (defaults to `rr-n1-tor.opensrs.net`).
- Auth model: header `X-Proxy-Secret: ${PROXY_SECRET}` from caller (Supabase edge function) must match Cloud Run env var.
- `Dockerfile`: `node:20-slim`, port 8080.
- Forwards headers `X-Username`, `X-Signature`, `Content-Type` only.
- **OpenSRS IP allowlist** is the only reason this exists.

Env vars (in Cloud Run): `PROXY_SECRET`, `OPENSRS_HOST`, `PORT`.

## 5b. wp.cloud proxy

**Not in this repo.** Referenced only via env vars `WPCLOUD_PROXY_URL` + `WPCLOUD_PROXY_SECRET`. Lives in a separate Cloud Run deployment (presumed similar to the OpenSRS proxy — strips `X-Proxy-Secret`, forwards to `https://atomic-api.wordpress.com`).

## 5c. Removal plan implication

Both proxies become removable as soon as wp.cloud and OpenSRS allowlist Vercel's static IPs AND Supabase's static-egress IPs. The OpenSRS edge code already has a no-proxy fallback (`opensrs.ts:56-65`); the wp.cloud helpers do **not** — `wpcloudPost`/`wpcloudGet`/`runWpCli` hard-code `${WPCLOUD_PROXY_URL}` and the proxy secret header. Removing the wp.cloud proxy requires (small) code changes.

---

# 6. Supabase schema inventory

Migrations from `2026-03-27` (clean rebuild) through `2026-05-06` (Twilio teardown). The schema has been churned heavily — multiple consolidate / drop cycles for studio, credits, partners, integrations, Twilio.

## 6a. Current public tables

(After all 38 migrations are applied; this is the "live" set.)

### Customer-facing (UI reads from these)

| Table | One-line purpose | Mirror? | FKs | Indexes | RLS | Notable JSONB |
|---|---|---|---|---|---|---|
| `users` | Profile rows alongside `auth.users` — adds role, partner, Stripe customer ID, payment state, claim flow, partner-program fields | Partial mirror of Stripe Customer (`stripe_customer_id`) | self-FK `partner_id`, `referred_by`, `created_by` | various | implicit (Supabase auth pattern) | `metadata` (signup_status, payment confirmation, card_*, agreement, claim, address) |
| `sites` | One row per WordPress install | **Mirror of wp.cloud site** (`wp_cloud_site_id`, `wp_cloud_url`) but with extensive local-only state (config, guardrails) | `user_id`, `subscription_id`, `product_id` | `idx_sites_user/status/wpcloud/status_paused_at/flagged_for_deletion` | (none added explicitly post-clean_schema) | `config` (php_workers, storage_gb, has_backups/cdn/waf/staging), `metadata` (wp_admin_user/pass, site_ip, jetpack_attribution, recovery_deadline, provision_attempts/giving_up, delete_attempts, comp flag, soft_deleted_at) |
| `domains` | One row per OpenSRS domain | **Mirror of OpenSRS domain** | `user_id`, `site_id` | `idx_domains_user/site/name/status` | – | `metadata` (agreement_acceptance, dns_records, dns_mode, dns_setup, site_ip, nameservers, renewal_stripe_subscription_id, whois_privacy, registration_error, transfer_initiated_at) |
| `products` | Catalog of plans, TLDs, addons, one-time services | **Mirror of Stripe Product/Price** | – | `idx_products_type/slug/active` | – | `features`, `metadata` (storage_gb, php_workers_default, php_memory_mb, has_*, wpcloud_key, registration_price_usd/cad, onboarding_type) |
| `subscriptions` | Stripe subscriptions (hosting + domain renewals) | **Mirror of Stripe Subscription** | `user_id`, `product_id` | `idx_subscriptions_user/status/stripe` | – | `metadata` (stripe_price_id, cancel_at_period_end, subscription_type, item_count, type=domain_renewal, paused_at/reason, admin_pre_created, reactivated) |
| `invoices` | Past invoices | **Mirror of Stripe Invoice** | `user_id`, `subscription_id` | `idx_invoices_user/stripe` | – | `metadata` (currency, amount_due/paid, invoice_pdf, period_*, product_type, email_sent, failure_email_sent, refund_id) |
| `tickets` | Support tickets (technical, studio (legacy), sales, partner_change) | n/a — local-only | `user_id`, `site_id`, `partner_id` | `idx_tickets_user/type/status/partner_id` | – | `metadata`, `stage` |
| `ticket_messages` | Ticket replies | n/a — local-only | `ticket_id` | `idx_ticket_messages_ticket` | – | `metadata`, `is_draft` |
| `blog_posts` | Public blog | n/a — local-only | `author_id` | `idx_blog_posts_slug/status/category` | – | – |
| `commissions` | Affiliate + referral + partner commissions | Partial — `stripe_txn_id` mirrors balance transactions | `earner_id`, `customer_id`, `ticket_id`, `approved_by` | (added in 20260406) | – | – |
| `platform_settings` | Admin K/V store (Envosta phone, feature flags) | n/a | – | – | **enabled** (service-role only) | `value` |

### Existing mirrors (already mirror external state)

`sites` (wp.cloud), `domains` (OpenSRS), `products` (Stripe products+prices), `subscriptions` (Stripe), `invoices` (Stripe), partial card data on `users.metadata`.

### Should-be mirrors but aren't

| Concept | Where the data lives now | Notes |
|---|---|---|
| **SSL certs** | wp.cloud `ssl-info` — fetched live in `SslStatus` component every render | Add `sites.ssl_status`, `sites.ssl_expires_at`, refresh from health-check cron |
| **Backups** | wp.cloud `site-backups-list` — fetched live in `SiteBackups` component | Add `site_backups` table |
| **wp.cloud datacenters** | wp.cloud `get-available-datacenters` — fetched live in `site-info` (with hardcoded fallback) | Cache in `platform_settings` |
| **PHP versions list** | wp.cloud `get-php-versions/verbose` — live in `site-info` | Cache in `platform_settings` |
| **Edge cache state** | wp.cloud `edge-cache/status/{domain}` — live in `SitePerformance` | Add `sites.edge_cache_enabled` |
| **Defensive (DDoS) mode** | wp.cloud `edge-cache/ddos_until` — live | Add `sites.defensive_mode_until` |
| **SFTP users** | wp.cloud `ssh-user/{client}/{id}/list` — live in `SiteAccess` | Add `site_ssh_users` table |
| **OpenSRS domain lock state** | OpenSRS `DOMAIN.get type=status` — live | Add `domains.is_locked` |
| **Coupons** | Stripe — live in admin coupon manager | Add `coupons` table |
| **Payment methods** | Stripe `paymentMethods.list` — live on every `/api/payment-methods` GET | Already partially mirrored on `users.metadata.card_*` — extend to a real `payment_methods` table |
| **Stripe customer balance / credits** | Live in `commissions` payout flow | Add `stripe_balance_transactions` audit table |
| **wp.cloud site disk usage** | Cron syncs `sites.disk_usage_mb` daily — fine | Already mirrored, just document |
| **wp.cloud orphan site discovery** | Cron auto-inserts `sites` rows with `user_id=null` | This is "discovery + mirror" — works but creates ambiguous rows; needs admin claim flow |
| **Jetpack attribution status** | Stamped in `sites.metadata.jetpack_attribution` once, never refreshed | Should detect failures/retries |

### Pure orchestration / system tables

| Table | Purpose |
|---|---|
| `logs` | Single unified audit log. Receives writes from every edge function and several Next.js routes. Replaces the old `credit_transactions`, `ai_usage_log`, `referral_clicks`. Heavy JSONB usage. |
| `webhook_events` | Idempotency dedupe for `stripe-webhook`. **No migration creates this — exists by hand in the DB.** |
| `platform_settings` | Admin key-value store (Envosta phone config, feature flags) |

### Dropped tables (don't re-introduce)

Listed for context — these were all removed but their migration files still ship: `studio_projects`, `studio_pages`, `credit_balances`, `credit_transactions`, `service_credit_pricing`, `auto_refill_settings`, `site_guardrails` (consolidated into `sites`), `ai_usage_log`, `partner_profiles`/`ratings`/`change_requests` (consolidated into `users`+`tickets`), `referral_clicks` (consolidated into `logs`), `integration_providers`/`user_integrations`/`oauth_states`, `phone_numbers`, `site_addons` (consolidated into `sites`).

## 6b. RLS posture

Only `platform_settings`, `phone_numbers` (dropped), `user_integrations`/`oauth_states`/`integration_providers` (dropped) ever had explicit RLS. The customer-facing tables — `users`, `sites`, `domains`, `subscriptions`, `invoices`, `tickets`, `commissions`, `products`, `logs` — rely on the **service-role key being kept server-side** + the application enforcing ownership in Next.js routes / edge functions. There are **no RLS policies in any migration** for the customer-facing tables. This is a significant security posture decision the cleanup plan should make explicit.

---

# 7. Environment variables

## 7a. From `src/` (Next.js — `process.env.*`)

| Var | System | Read in | In .env.example? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Many files | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase | Many files (new naming) | Yes |
| `SUPABASE_SECRET_KEY` | Supabase | Many files (new naming) | Yes |
| `STRIPE_SECRET_KEY` | Stripe | All /api/admin/stripe-*, /api/*-checkout, /api/payment-methods, etc | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Client-side checkout | Yes |
| `JETPACK_PARTNER_ID` | Jetpack | `src/app/api/admin/jetpack-attribute/route.ts` | **No** |
| `JETPACK_PARTNER_SECRET` | Jetpack | Same | **No** |
| `JETPACK_DEFAULT_PLAN` | Jetpack | Same | **No** |
| `RESEND_API_KEY` | Resend | `src/app/api/cron/health-check/route.ts` (and edge fns) | **No** |
| `CRON_SECRET` | App | All `/api/cron/*` route guards | **No** |
| `NEXT_PUBLIC_APP_URL` | App | One reference | **No** — likely obsolete |
| `NEXT_PUBLIC_SITE_URL` | App | One reference | **No** — likely obsolete |
| `NODE_ENV` | Node | Set by runtime | n/a |

## 7b. From `supabase/functions/` (Deno — `Deno.env.get`)

| Var | System | Read in | In .env.example? |
|---|---|---|---|
| `SUPABASE_URL` | Supabase | `_shared/deps.ts` | (Vercel uses NEXT_PUBLIC_ prefix; edge fns get auto-injected `SUPABASE_URL`) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase | `_shared/deps.ts` | Yes (NEXT_PUBLIC_ variant) |
| `SUPABASE_SECRET_KEY` | Supabase | `_shared/deps.ts` | Yes |
| `STRIPE_SECRET_KEY` | Stripe | `_shared/deps.ts` | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe | `_shared/deps.ts` | Yes |
| `WPCLOUD_API_KEY` | wp.cloud | `_shared/deps.ts` | Yes |
| `WPCLOUD_PROXY_URL` | wp.cloud | `_shared/deps.ts` | Yes |
| `WPCLOUD_PROXY_SECRET` | wp.cloud | `_shared/deps.ts` | Yes |
| `WPCLOUD_CLIENT` | wp.cloud | `_shared/deps.ts` (default `envosta`) | Yes |
| `OPENSRS_USERNAME` | OpenSRS | `_shared/opensrs.ts` | Yes |
| `OPENSRS_API_KEY` | OpenSRS | `_shared/opensrs.ts` | Yes |
| `OPENSRS_HOST` | OpenSRS | `_shared/opensrs.ts` (default `horizon.opensrs.net`) | **No** |
| `OPENSRS_PROXY_URL` | OpenSRS | `_shared/opensrs.ts` (optional) | **No** |
| `OPENSRS_PROXY_SECRET` | OpenSRS | `_shared/opensrs.ts` | **No** |
| `JETPACK_PARTNER_ID` | Jetpack | `_shared/jetpack.ts` | **No** |
| `JETPACK_PARTNER_SECRET` | Jetpack | `_shared/jetpack.ts` | **No** |
| `JETPACK_DEFAULT_PLAN` | Jetpack | `_shared/jetpack.ts` (default `free`) | **No** |
| `ENVOSTA_PARENT_THEME_ZIP_URL` | App | `provision-hosting/index.ts`, `site-info/index.ts` | **No** |
| `RESEND_API_KEY` | Resend | `_shared/email.ts` | **No** |

## 7c. From `opensrs-proxy/`

| Var | Used by | In .env.example? |
|---|---|---|
| `PROXY_SECRET` | Cloud Run only | n/a (runtime-local) |
| `OPENSRS_HOST` | Cloud Run only | n/a |
| `PORT` | Cloud Run only | n/a |

## 7d. `.env.example` ↔ code drift

**In `.env.example` but unused in code:** none observed (every var present is referenced).

**Used in code but missing from `.env.example`:**
- `CRON_SECRET` — required for Vercel cron auth
- `RESEND_API_KEY` — required for all email sending
- `JETPACK_PARTNER_ID`, `JETPACK_PARTNER_SECRET`, `JETPACK_DEFAULT_PLAN` — required for partner attribution
- `OPENSRS_HOST`, `OPENSRS_PROXY_URL`, `OPENSRS_PROXY_SECRET` — required if proxy is enabled
- `ENVOSTA_PARENT_THEME_ZIP_URL` — optional but documented
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` — single-reference each; verify and remove

**Naming inconsistency:** the recent migrations (`6f3f820`, `ca6e806`) renamed `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY` and `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`. All call sites are now consistent — no stragglers found.

---

# 8. Supabase Edge Functions

Directory: `supabase/functions/`. Shared utilities in `_shared/{deps,email,opensrs,jetpack}.ts`.

| Function | Purpose | LOC | Inbound from | Outbound to | Violates "no outbound to wp.cloud/OpenSRS"? |
|---|---|---|---|---|---|
| `stripe-webhook` | Receive Stripe events, mirror to DB, orchestrate site creation + domain registration | 863 | Stripe | Stripe (more API calls), wp.cloud (via `provision-hosting`), OpenSRS (via `register-domain` + inline auto-renew toggle), Resend (email), Supabase DB | Yes (indirectly via edge-fn fanout + direct OpenSRS call line 630) |
| `provision-hosting` | Create wp.cloud site, set features, install theme/Akismet, unlock Jetpack, register Jetpack partner, set DNS at OpenSRS | 462 | `stripe-webhook`, admin Next.js routes (`/api/admin/create-site`, `/api/admin/provision-site`, `/api/admin/reinstall-site`, `/api/admin/add-site-for-customer`, `/api/admin/create-unclaimed-account`, `/api/create-site`, cron `retry-stuck-provisions`) | wp.cloud, OpenSRS (DNS), Jetpack, Supabase DB, Resend | **Yes — heaviest violator** |
| `register-domain` | All OpenSRS actions: check, register, transfer, DNS, nameservers, auto-renew, WHOIS, lock, EPP, list-all | 793 | Customer flows (`/api/domains`, `/api/domain-check`), admin (`/api/admin/register-domain`), `stripe-webhook` (domain reg + renewal), `sync-check` | OpenSRS, Stripe (renewal sub sync), Supabase DB, Resend | Yes — by design |
| `site-info` | Catch-all proxy for ~25 wp.cloud actions (ssl, datacenters, list-sites, get-site, backups, delete, php-versions, update-meta, update-domain, change-plan, addons, disconnect-domain, get-ip, end-trial, edge-cache, defensive-mode, create-backup, download-backup, sftp, error-logs, wp-cli, software-bootstrap) | 922 | `/api/site-actions` (customer), `/api/admin/*`, `/api/upgrade-site`, `/api/site-guardrails`, `/api/cron/*`, `/api/reactivate-site` | wp.cloud, OpenSRS (DNS auto-config), Stripe (plan change, end trial), Supabase DB | **Yes — heaviest violator** |
| `stripe-checkout` | Create Stripe Checkout Session (subscription or one-time), studio request, admin custom invoice | 199 | Customer dashboard flows | Stripe, Supabase DB | No (Stripe only) |
| `health-check` | Daily reconciliation: site IP drift → re-set DNS, domain expiry warnings, transfer status, stuck-provisioning detection, Stripe invoice/subscription/payment-method sweep | 329 | Cron `/api/cron/health-check`, admin manual trigger | wp.cloud, OpenSRS, Stripe, Resend | Yes — but appropriately, since this is the reconciliation worker |
| `log-action` | Append to `logs` table (audit log endpoint for client-side actions) | 20 | Client components | Supabase DB only | No |

**Note on the "no outbound calls" rule:** the planned target is for edge functions to be thin DB-write layers, with all external API orchestration moved to Next.js routes or a dedicated worker. Today, `provision-hosting`, `site-info`, `register-domain`, `stripe-webhook`, and `health-check` all violate this. Only `stripe-checkout` and `log-action` are clean.

**Edge-function-to-edge-function calls (also a planned anti-pattern):**
- `stripe-webhook` → `register-domain` (line 284)
- `stripe-webhook` → `provision-hosting` (line 372)
- `cron/health-check` route → `health-check` edge fn → wp.cloud + OpenSRS + Stripe
- `cron/health-check` route → `site-info` edge fn (per site, in a loop)
- `cron/retry-stuck-provisions` → `provision-hosting`
- `cron/delete-expired-sites` → `site-info` (`hard-delete-site` action)
- `cron/cleanup-site` → `site-info`
- Many admin routes → `site-info`, `provision-hosting`, `register-domain`

---

# 9. Top-level findings + recommendations

## 9.1 Highest-impact issues found

1. **The Stripe webhook is the single largest orchestration risk.** `stripe-webhook/index.ts` synchronously creates Stripe customers, invokes OpenSRS via `register-domain`, invokes wp.cloud via `provision-hosting` (which then calls wp.cloud → wp.cloud → OpenSRS → Jetpack), and sends emails — all inside the handler. A single slow wp.cloud response will time out the webhook past Stripe's 5-second budget; if Stripe retries, the dedupe table catches it but several wp.cloud side-effects may already have run. The fanout shape is also the textbook violation of the planned mirror+enqueue pattern.

2. **The `webhook_events` idempotency table is referenced but never created in any migration.** Either someone created it by hand in Supabase, or dedupe has been silently failing the whole time (the surrounding `try{}catch{}` hides this). Either way, this is the first thing to fix in Phase 1 — make a migration explicit.

3. **No RLS policies on any customer-facing table.** `users`, `sites`, `domains`, `subscriptions`, `invoices`, `tickets`, `commissions`, `products`, `logs` are protected purely by application-level ownership checks. The mirror-refactor is the natural moment to add RLS, but it's a meaningful, separate workstream — and it isn't called out in the user's stated Phase 1-9 plan.

4. **`site-info` is doing too much.** 922 lines, ~25 actions, talks to wp.cloud + OpenSRS + Stripe + Supabase DB, mixes admin and customer surfaces. It should be split per-resource (e.g. `wpcloud/site`, `wpcloud/edge-cache`, `wpcloud/backups`, etc.) and ideally hosted in Next.js routes once static IPs replace the proxy.

5. **Dashboard pages make live wp.cloud calls every render.** `ssl-status.tsx`, `site-backups.tsx`, `site-performance.tsx` hit the proxy three times per site detail page load. A flaky proxy directly stalls the customer dashboard. Mirror tables (`site_backups`, `site_ssl_status`, edge-cache state columns) with cron-refresh + invalidate-on-write would fix this and remove user-visible coupling to wp.cloud uptime.

## 9.2 Smaller findings worth tracking

- `_shared/opensrs.ts` exports `buildGetDnsZoneXml` and `deleteNameserver` but nothing calls them — dead helpers.
- `stripe-webhook` has a `checkout.session.completed` handler that only fires for `studio_request` tickets, but the Studio feature is fully removed elsewhere (commit `c329dd6` "feat: remove Studio + direct Anthropic API integration"). Dead branch.
- `/api/admin/jetpack-attribute/route.ts` re-implements `_shared/jetpack.ts` in JS rather than calling the edge function. Should consolidate to a single Jetpack module.
- `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` each have exactly one reference in `src/` — likely obsolete; verify and delete.
- `.env.example` is missing 7+ required env vars (CRON_SECRET, RESEND_API_KEY, JETPACK_*, OPENSRS_HOST/PROXY_*, ENVOSTA_PARENT_THEME_ZIP_URL).
- `cron/health-check` auto-inserts orphan site rows with `user_id=null`. Combined with admin UI flows that "claim" orphans, this works — but it's an undocumented data-flow. Should be in the mirror-rules doc.
- Two parallel paths to call Stripe (Next.js direct SDK vs. edge function via `_shared/deps.ts`) — both currently fine, but the cleanup plan should pick one as canonical to make code-review easier.
- `users.metadata` is overloaded — signup_status, payment confirmation, card brand/last4/expiry, address, agreement_acceptance, claim flow, payment_method, partner_status — it's the JSONB swamp the migrations were trying to drain. Worth a dedicated columns pass when the schema is touched.

## 9.3 Rough effort by phase (1 = small day, 5 = large week+)

| Phase (assumed) | Workstream | Estimate |
|---|---|---|
| 1 | Add `webhook_events` migration + verify dedupe works | 1 |
| 1 | `.env.example` completeness sweep | 1 |
| 2 | Mirror tables: `coupons`, `payment_methods`, `site_backups`, `site_ssl_status`, columns for edge-cache + defensive-mode | 3 |
| 2 | Refresh-on-cron + invalidate-on-write logic for new mirrors | 3 |
| 3 | Split `stripe-webhook` into mirror-only + enqueued background work (Supabase Realtime channel OR `pg_cron` worker OR Next.js cron route polling a queue table) | 5 |
| 3 | Move `register-domain` orchestration calls (Stripe sync, email) out of the webhook handler | 3 |
| 4 | Remove `WPCLOUD_PROXY_URL` from edge functions; switch to direct `atomic-api.wordpress.com` after wp.cloud allowlists Vercel + Supabase static IPs | 2 |
| 4 | Remove `OPENSRS_PROXY_URL` path; delete `opensrs-proxy/` from repo; spin down Cloud Run | 2 |
| 5 | Split `site-info` per resource family | 4 |
| 6 | Consolidate Jetpack module — delete the Next.js re-implementation | 1 |
| 7 | Add RLS policies on customer-facing tables (significant cross-cutting work; touches every dashboard query) | 5 |
| 8 | Replace `users.metadata` JSONB stew with typed columns | 4 |
| 9 | Documentation pass: write the mirror-rules contract, the "no outbound from edge functions" rule, and an architecture diagram | 2 |

## 9.4 Gaps the user's Phase 1-9 plan may not cover

(The user described a plan focused on enforcing mirrors and removing proxies.)

- **The dead `webhook_events` table.** Easy to miss; will silently make dedupe disappear once it's noticed and "fixed" by the next person to look at it.
- **RLS posture.** The current model is "service-role-only + app enforces ownership." Either commit to that explicitly with documentation and tests, or commit to RLS. The mirror refactor is the natural breakpoint for that decision.
- **Auth-bypass anti-pattern in `site-info`.** Line 49 decodes the JWT payload directly rather than calling `getUser()`. The comment claims "the Supabase gateway already validated the JWT signature" — true, but this short-circuit makes the function harder to reason about. Worth standardizing.
- **No queue / outbox table.** Phase 3's "move orchestration out of the webhook" implies one. Need to decide between: (a) a `jobs` table polled by a 1-minute cron, (b) Supabase Realtime as a queue, (c) a Supabase Edge Function triggered by `pg_notify`. Each has different operational properties.
- **No structured retry policy for wp.cloud failures outside `retry-stuck-provisions`.** Many `site-info` actions (`update-meta`, `edge-cache`, `add-addon`) are fire-and-forget on the wp.cloud side — if they fail, the local DB row already shows the new state. Mirror integrity assumes wp.cloud confirms; today nothing checks.
- **`logs` table growth.** Single audit table receives writes from every edge function and several Next.js routes. No partitioning, no TTL. Worth a retention policy when mirrors land.
- **The migration history is non-linear** (multiple consolidate / re-introduce cycles for partners, credits, studio, integrations, Twilio). For a fresh contributor, reading top-to-bottom paints a confusing schema picture. A `schema_current.sql` snapshot regenerated at each milestone would help — orthogonal to the mirror refactor but worth doing.

---

*End of audit.*
