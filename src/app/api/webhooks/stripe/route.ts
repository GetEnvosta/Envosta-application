/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook — orchestration-only after the Sync Engine cutover.
 * The Supabase Stripe Sync Engine continuously mirrors every Stripe
 * object into the `stripe` schema, so this handler no longer maintains
 * a local public.subscriptions / public.invoices mirror. Its job is
 * limited to the side effects Stripe data alone can't drive:
 *
 *   - Provisioning new wp.cloud sites for new subscriptions
 *   - Cascading sub status changes to `sites` (active/paused/cancelled)
 *   - Flipping users.metadata.signup_status on payment success/failure
 *   - Sending transactional emails (welcome, paid, payment_failed, sites_paused)
 *   - Auto-registering domains via OpenSRS for new signups
 *   - Studio-request ticket creation (one-time checkout flow)
 *   - Stamping users.stripe_customer_id on customer.created
 *
 * Dedup: every event is recorded in `webhook_events`
 *        (provider='stripe', provider_event_id=event.id). The UNIQUE
 *        constraint handles dedup; duplicate inserts return 200 immediately.
 *
 * What this handler explicitly DOES NOT do:
 *   - Write to public.subscriptions / public.invoices (tables dropped)
 *   - Write to sites.subscription_id (column dropped — account-centric)
 *   - Create or manage Stripe Subscriptions for domain renewals
 *     (Phase 3 cutover: renewals are off-session PaymentIntents fired by
 *      /api/cron/process-domain-renewals, NOT Stripe Subscriptions)
 *
 * Phase 3 inbound surfaces:
 *   - checkout.session.completed with metadata.product_type ==
 *     'domain_registration' → register domain via OpenSRS internal route,
 *     stamp domains.auto_renew=true so the daily cron picks it up.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createOpenSrsClient, OpenSrsError, type OpenSrsContact, type OpenSrsContacts } from '@/lib/integrations/opensrs';
import {
  sendEmail,
  welcomeEmail,
  invoicePaidEmail,
  paymentFailedEmail,
  sitesPausedEmail,
} from '@/lib/email';
import { recordAudit } from '@/lib/audit';

/**
 * Parse the `addon_slugs` metadata field stamped on hosting
 * Subscriptions by /api/create-subscription. Stored as a JSON-stringified
 * array of strings so a single Stripe metadata key can carry the whole
 * bundle without colliding with reserved characters. Falls back to a
 * comma-delimited string for any legacy / hand-edited subs.
 */
function parseAddonSlugs(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string' && s.length > 0);
  } catch {
    // Not JSON — fall through to comma-split fallback.
  }
  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ─── Clients ──────────────────────────────────────────────────

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

// ─── Audit log helper ─────────────────────────────────────────

async function logEvent(p: {
  userId?: string | null;
  siteId?: string | null;
  level?: string;
  action: string;
  message?: string;
}): Promise<void> {
  try {
    const supabase = sb();
    await supabase.from('logs').insert({
      user_id: p.userId ?? null,
      site_id: p.siteId ?? null,
      level: p.level ?? 'info',
      action: p.action,
      message: p.message ?? null,
    });
  } catch (e) {
    console.error('[stripe-webhook] log write failed:', e);
  }
}

// ─── Internal route helpers ──────────────────────────────────

function internalOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && env.length > 0) return env.replace(/\/$/, '');
  return new URL(req.url).origin;
}

function internalHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
  };
}

async function provisionSiteViaInternal(
  req: Request,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: any }> {
  const origin = internalOrigin(req);
  try {
    const res = await fetch(`${origin}/api/internal/wpcloud/provision-site`, {
      method: 'POST',
      headers: internalHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

// ─── OpenSRS register helper ─────────────────────────────────

function buildContactFromProfile(profile: any, fallbackEmail: string): OpenSrsContact {
  const parts = (profile?.full_name ?? 'Domain Owner').split(' ');
  const meta = (profile?.metadata as any) ?? {};
  return {
    first_name: parts[0] ?? 'Domain',
    last_name: parts.slice(1).join(' ') || 'Owner',
    org_name: profile?.company_name ?? 'N/A',
    email: profile?.email ?? fallbackEmail ?? 'domains@envosta.com',
    phone: profile?.phone ?? '+1.0000000000',
    address1: meta.address ?? 'N/A',
    city: meta.city ?? 'Calgary',
    state: meta.state ?? 'AB',
    postal_code: meta.postal_code ?? 'T2P0A1',
    country: meta.country ?? 'CA',
  };
}

async function registerDomainViaOpenSrs(params: {
  userId: string;
  domainName: string;
  years: number;
  siteId?: string | null;
}): Promise<{ ok: boolean; error?: string; orderId?: string }> {
  const supabase = sb();
  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, phone, company_name, metadata')
    .eq('id', params.userId)
    .maybeSingle();
  if (!profile) return { ok: false, error: 'User not found' };

  const contacts: OpenSrsContacts = { owner: buildContactFromProfile(profile, profile.email ?? '') };
  const tld = params.domainName.split('.').slice(-1)[0] ?? '';

  const { data: existing } = await supabase
    .from('domains')
    .select('id, status, expiry_date, metadata')
    .eq('user_id', params.userId)
    .eq('domain_name', params.domainName)
    .maybeSingle();

  let domainRowId = existing?.id as string | undefined;
  if (!domainRowId) {
    const { data: inserted, error: insErr } = await supabase
      .from('domains')
      .insert({
        user_id: params.userId,
        site_id: params.siteId ?? null,
        domain_name: params.domainName,
        tld,
        status: 'pending',
        registrar: 'opensrs',
      })
      .select('id')
      .single();
    if (insErr || !inserted) return { ok: false, error: `Failed to insert domains row: ${insErr?.message ?? 'unknown'}` };
    domainRowId = inserted.id;
  }

  try {
    const client = createOpenSrsClient();
    const result = await client.registerDomain({ domain: params.domainName, years: params.years, contacts });

    const nowIso = new Date().toISOString();
    const expiryIso = new Date(Date.now() + params.years * 365.25 * 86_400_000).toISOString();

    await supabase
      .from('domains')
      .update({
        status: 'registered',
        expiry_date: expiryIso,
        metadata: {
          ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
          registration_date: nowIso,
          opensrs_order_id: result.order_id,
          opensrs_status: result.status,
        },
      })
      .eq('id', domainRowId);

    // Mirror upsert — expanded columns. Contacts / registry dates /
    // lock_state get backfilled by the reconcile-opensrs cron.
    await supabase.from('opensrs_domains').upsert(
      {
        upstream_id: params.domainName,
        domain_id: domainRowId,
        upstream_status: result.status,
        auto_renew: true,
        let_expire: false,
        whois_privacy: 'enabled',
        expires_at: expiryIso,
        upstream_payload: { registerDomain: result },
        last_synced_at: nowIso,
      },
      { onConflict: 'upstream_id' },
    );

    return { ok: true, orderId: result.order_id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const code = e instanceof OpenSrsError ? e.responseCode : undefined;
    await supabase
      .from('domains')
      .update({
        status: 'failed',
        metadata: {
          ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
          error: { message, response_code: code },
        },
      })
      .eq('id', domainRowId);
    return { ok: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════

export async function POST(req: Request) {
  const stripe = getStripe();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature' }, { status: 400 });
  }

  // Read raw bytes BEFORE parsing — required for signature verification.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] signature error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log('[stripe-webhook] event received:', event.type, event.id);
  const supabase = sb();

  // ── Idempotency: webhook_events row (UNIQUE on provider+provider_event_id) ──
  const { error: dedupErr } = await supabase.from('webhook_events').insert({
    provider: 'stripe',
    provider_event_id: event.id,
    event_type: event.type,
    raw_payload: event as unknown as Record<string, unknown>,
    signature_verified: true,
  });
  if (dedupErr) {
    if ((dedupErr as any).code === '23505') {
      console.log('[stripe-webhook] duplicate event, skipping:', event.id);
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[stripe-webhook] webhook_events insert failed (continuing):', dedupErr);
  }

  try {
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const custStripeId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

      // Resolve the user via stripe_customer_id (no more sub-mirror lookup).
      const { data: cust } = await supabase
        .from('users')
        .select('id, full_name, email, metadata, role, stripe_customer_id')
        .eq('stripe_customer_id', custStripeId)
        .maybeSingle();
      if (!cust) {
        console.log('[stripe-webhook] no customer for', custStripeId);
        return NextResponse.json({ received: true });
      }

      const items = sub.items?.data ?? [];
      const firstItem = items[0];
      const firstPriceId = firstItem?.price?.id ?? '';

      // Match first item's price to a plan (drives downstream provisioning).
      let primaryPlan: any = null;
      if (firstPriceId) {
        const { data: p } = await supabase
          .from('products')
          .select('id,slug,type,metadata')
          .or(
            `stripe_price_id.eq.${firstPriceId},stripe_price_id_yearly.eq.${firstPriceId},stripe_price_id_cad.eq.${firstPriceId},stripe_price_id_yearly_cad.eq.${firstPriceId}`,
          )
          .maybeSingle();
        primaryPlan = p;
      }

      // ── Promote awaiting_payment / payment_failed users to active ──
      const subActive = sub.status === 'active' || sub.status === 'trialing';
      if (subActive) {
        const pmeta = (cust.metadata as any) ?? {};
        if (pmeta.signup_status && pmeta.signup_status !== 'active') {
          await supabase
            .from('users')
            .update({
              metadata: {
                ...pmeta,
                signup_status: 'active',
                payment_confirmed_at: pmeta.payment_confirmed_at ?? new Date().toISOString(),
              },
            })
            .eq('id', cust.id);
          try {
            const adminClient: any = (supabase as any).auth?.admin;
            if (adminClient?.updateUserById) {
              await adminClient.updateUserById(cust.id, { email_confirm: true });
            }
          } catch (e) {
            console.error('[stripe-webhook] auth email_confirm flip failed:', e);
          }
        }
      }

      // ── Sync line items to sites (price changes → product_id update) ──
      for (const item of items) {
        const itemPriceId = item.price?.id ?? '';
        const siteIdMeta = (item.metadata as any)?.envosta_site_id;
        if (!itemPriceId) continue;

        let itemPlan: any = null;
        if (itemPriceId) {
          const { data: p } = await supabase
            .from('products')
            .select('id,slug,type')
            .or(`stripe_price_id.eq.${itemPriceId},stripe_price_id_yearly.eq.${itemPriceId},stripe_price_id_cad.eq.${itemPriceId}`)
            .maybeSingle();
          itemPlan = p;
        }

        const { data: existingSite } = await supabase
          .from('sites')
          .select('id, product_id')
          .eq('stripe_subscription_item_id', item.id)
          .maybeSingle();

        if (existingSite) {
          if (itemPlan && existingSite.product_id !== itemPlan.id) {
            await supabase.from('sites').update({ product_id: itemPlan.id }).eq('id', existingSite.id);
            console.log('[stripe-webhook] site plan updated:', existingSite.id, '→', itemPlan.slug);
          }
        } else if (siteIdMeta) {
          await supabase
            .from('sites')
            .update({
              stripe_subscription_item_id: item.id,
              product_id: itemPlan?.id ?? null,
            })
            .eq('id', siteIdMeta);
          console.log('[stripe-webhook] site linked to item:', siteIdMeta, '→', item.id);
        }
      }

      // ── Auto-create / pre-link site + provision (hosting only) ──
      // Phase 3: TLDs are no longer Stripe products and domain renewals
      // are no longer Stripe subscriptions — these legacy flags only
      // ever fire on pre-Phase-3 subs being mirrored during cutover.
      const hasPaymentMethod = !!sub.default_payment_method;
      const shouldProvision = sub.status === 'active' || (sub.status === 'trialing' && hasPaymentMethod);

      // Set the subscription's PM as the customer's default.
      if (hasPaymentMethod && custStripeId) {
        try {
          const pmId =
            typeof sub.default_payment_method === 'string'
              ? sub.default_payment_method
              : (sub.default_payment_method as any)?.id;
          if (pmId) {
            await stripe.customers.update(custStripeId, {
              invoice_settings: { default_payment_method: pmId },
            });
          }
        } catch (pmErr) {
          console.error('[stripe-webhook] failed to set default PM:', pmErr);
        }
      }

      if (shouldProvision && primaryPlan?.type === 'hosting_plan') {
        const name = (cust.full_name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'my-site';
        const domainFromMeta = (sub.metadata as any)?.domain_name ?? null;
        const planMeta = (primaryPlan?.metadata as any) ?? {};

        let svc: { id: string; wp_cloud_site_id: string | null; label?: string | null } | null = null;
        let wasNewlyInserted = false;

        // ── Pre-linked site path ──
        const preLinkedSiteId = (sub.metadata as any)?.envosta_site_id;
        if (preLinkedSiteId) {
          const { data: pre } = await supabase
            .from('sites')
            .select('id, wp_cloud_site_id, label, user_id')
            .eq('id', preLinkedSiteId)
            .maybeSingle();
          if (pre && pre.user_id === cust.id) {
            await supabase
              .from('sites')
              .update({
                stripe_subscription_item_id: firstItem?.id ?? null,
                product_id: primaryPlan?.id ?? null,
              })
              .eq('id', pre.id);
            svc = { id: pre.id, wp_cloud_site_id: pre.wp_cloud_site_id, label: pre.label };
            console.log('[stripe-webhook] pre-linked site attached:', pre.id);
          } else {
            console.warn('[stripe-webhook] envosta_site_id stamped but site not found:', preLinkedSiteId);
          }
        }

        // ── Existing site by subscription item ──
        if (!svc && firstItem?.id) {
          const { data: existing } = await supabase
            .from('sites')
            .select('id, wp_cloud_site_id, label')
            .eq('stripe_subscription_item_id', firstItem.id)
            .limit(1);
          if (existing?.length) {
            svc = existing[0] as any;
            console.log('[stripe-webhook] site already linked via item:', svc!.id);
          }
        }

        // ── Insert new site (original signup path) ──
        if (!svc) {
          const { data: inserted, error: svcErr } = await supabase
            .from('sites')
            .insert({
              user_id: cust.id,
              product_id: primaryPlan?.id ?? null,
              stripe_subscription_item_id: firstItem?.id ?? null,
              label: `${name}-site`,
              status: 'provisioning',
              server_region: 'dca',
              domain_name: domainFromMeta,
              config: {
                php_workers: planMeta.php_workers_default ?? 2,
                storage_gb: planMeta.storage_gb ?? 25,
                php_memory_mb: planMeta.php_memory_mb ?? 512,
              },
              metadata: {
                auto_provisioned: true,
                plan_slug: primaryPlan?.slug ?? 'minimum',
                onboarding_type: planMeta.onboarding_type ?? 'standard',
              },
            })
            .select('id, wp_cloud_site_id, label')
            .single();
          console.log('[stripe-webhook] site created:', inserted?.id, 'err:', svcErr?.message);
          if (inserted && !svcErr) {
            svc = inserted as any;
            wasNewlyInserted = true;
          }
        }

        if (svc) {
          // Reconciliation: stamp the Stripe item with our site ID.
          if (firstItem?.id) {
            try {
              await stripe.subscriptionItems.update(firstItem.id, {
                metadata: { envosta_site_id: svc.id },
              });
            } catch {
              /* non-fatal */
            }
          }

          // Welcome email — only on brand-new insert.
          if (wasNewlyInserted && cust.email) {
            const planName = primaryPlan?.slug ? primaryPlan.slug.charAt(0).toUpperCase() + primaryPlan.slug.slice(1) : 'Hosting';
            const email = welcomeEmail(cust.full_name ?? 'there', planName, 'https://my.envosta.com/dashboard');
            await sendEmail({ to: cust.email, ...email });
          }

          // Auto-register domain — only on brand-new insert.
          if (wasNewlyInserted && domainFromMeta) {
            const { data: existingDomain } = await supabase
              .from('domains')
              .select('id, status')
              .eq('domain_name', domainFromMeta)
              .eq('user_id', cust.id)
              .maybeSingle();

            if (!existingDomain) {
              console.log('[stripe-webhook] auto-registering domain:', domainFromMeta);
              const reg = await registerDomainViaOpenSrs({
                userId: cust.id,
                domainName: domainFromMeta,
                years: 1,
                siteId: svc.id,
              });
              if (reg.ok) {
                await supabase
                  .from('domains')
                  .update({ site_id: svc.id, auto_renew: true })
                  .eq('domain_name', domainFromMeta)
                  .eq('user_id', cust.id);
              } else {
                console.error('[stripe-webhook] domain registration failed:', domainFromMeta, reg.error);
              }
            } else {
              await supabase.from('domains').update({ site_id: svc.id }).eq('id', existingDomain.id);
              console.log('[stripe-webhook] existing domain linked:', domainFromMeta);
            }
          }

          // ── Write site_addons rows for the signup add-on bundle ──
          // /api/create-subscription stamps metadata.addon_slugs and
          // attaches the add-ons as Stripe line items, but it can't
          // create site_addons rows because the site row doesn't exist
          // yet at signup. Now that `svc` (the signup site) exists, we
          // record one site_addons row per add-on slug, resolving the
          // matching Stripe SubscriptionItem on this sub to capture its
          // stripe_subscription_item_id. Non-fatal — wrapped so a
          // failure here never blocks provisioning.
          //
          // This assumes the account-centric one-site-at-signup model:
          // the bundle attaches to the single site created above. For a
          // multi-site agency flow, add-on assignment would move to a
          // post-signup step keyed by siteId.
          if (wasNewlyInserted) {
            try {
              const signupAddonSlugs = parseAddonSlugs((sub.metadata as any)?.addon_slugs);
              if (signupAddonSlugs.length > 0) {
                const { data: addonProducts } = await supabase
                  .from('products')
                  .select('id, slug, stripe_price_id, stripe_price_id_yearly, stripe_price_id_cad, stripe_price_id_yearly_cad')
                  .eq('type', 'plan_addon')
                  .in('slug', signupAddonSlugs);

                const nowIso = new Date().toISOString();
                for (const slug of signupAddonSlugs) {
                  const product = (addonProducts ?? []).find((p: any) => p.slug === slug);
                  if (!product) {
                    console.warn('[stripe-webhook] addon slug has no product row:', slug);
                    continue;
                  }
                  // Resolve the Stripe SubscriptionItem for this add-on by
                  // matching the item's price.id against any of the
                  // product's known price IDs (currency/period agnostic).
                  const priceIds = [
                    product.stripe_price_id,
                    product.stripe_price_id_yearly,
                    product.stripe_price_id_cad,
                    product.stripe_price_id_yearly_cad,
                  ].filter((x): x is string => typeof x === 'string' && x.length > 0);
                  const matchedItem = items.find(it => it.price?.id && priceIds.includes(it.price.id));

                  await supabase
                    .from('site_addons')
                    .upsert(
                      {
                        site_id: svc.id,
                        product_id: product.id,
                        quantity: 1,
                        status: 'active',
                        stripe_subscription_item_id: matchedItem?.id ?? null,
                        enabled_at: nowIso,
                        disabled_at: null,
                        updated_at: nowIso,
                      },
                      { onConflict: 'site_id,product_id' },
                    );
                  console.log('[stripe-webhook] site_addon recorded:', svc.id, slug, matchedItem?.id ?? '(no stripe item)');
                }
              }
            } catch (addonErr) {
              console.error('[stripe-webhook] site_addons write failed (non-fatal):', addonErr);
            }
          }

          // ── Idempotent wp.cloud provisioning ──
          if (!svc.wp_cloud_site_id) {
            console.log('[stripe-webhook] auto-provisioning site:', svc.id);
            const provRes = await provisionSiteViaInternal(req, {
              siteId: svc.id,
              serviceId: svc.id,
              label: svc.label ?? `${name}-site`,
              region: 'dca',
              phpVersion: '8.4',
              planId: primaryPlan?.id ?? null,
              userId: cust.id,
              ...(domainFromMeta && { domainName: domainFromMeta }),
            });
            console.log('[stripe-webhook] auto-provision result:', provRes.status);
            if (!provRes.ok) {
              console.error('[stripe-webhook] auto-provision failed (admin can retry):', provRes.data?.error);
            }
          } else {
            console.log('[stripe-webhook] site already provisioned, skipping:', svc.id, svc.wp_cloud_site_id);
          }
        }
      }

      // ── Subscription paused / resumed → cascade to sites (by item) ──
      if (event.type === 'customer.subscription.updated') {
        const isPaused = sub.status === 'paused' || (sub.pause_collection && sub.pause_collection.behavior);
        const periodEndIso = (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const itemIds = items.map(i => i.id);

        if (isPaused && itemIds.length > 0) {
          const { data: sitesToFlag } = await supabase
            .from('sites')
            .select('id, label, status, metadata, user_id')
            .in('stripe_subscription_item_id', itemIds)
            .in('status', ['active', 'provisioning', 'paused']);

          let flagged = 0;
          for (const site of sitesToFlag ?? []) {
            const meta = (site.metadata as any) ?? {};
            if (site.status === 'cancelled' && meta.recovery_deadline) continue;

            await supabase
              .from('sites')
              .update({
                status: 'cancelled',
                paused_at: new Date().toISOString(),
                flag_reason: 'subscription_paused',
                metadata: {
                  ...meta,
                  recovery_deadline: periodEndIso,
                  cancelled_at: new Date().toISOString(),
                },
              })
              .eq('id', site.id);

            await logEvent({
              siteId: site.id,
              action: 'site.flagged_for_deletion',
              message: `${site.label} flagged for deletion at ${periodEndIso} (subscription paused)`,
            });
            flagged++;
          }

          if (flagged > 0 && cust.email) {
            const email = sitesPausedEmail(cust.full_name ?? 'there', flagged);
            await sendEmail({ to: cust.email, ...email });
          }
          console.log(`[stripe-webhook] subscription paused: ${sub.id}, flagged ${flagged} site(s)`);
        } else if (sub.status === 'active' && !sub.pause_collection && itemIds.length > 0) {
          // Resume → restore sites we flagged.
          const { data: flagged } = await supabase
            .from('sites')
            .select('id, label, metadata')
            .in('stripe_subscription_item_id', itemIds)
            .eq('status', 'cancelled')
            .eq('flag_reason', 'subscription_paused');

          for (const site of flagged ?? []) {
            const meta = (site.metadata as any) ?? {};
            const { recovery_deadline, cancelled_at, ...keptMeta } = meta;
            await supabase
              .from('sites')
              .update({
                status: 'active',
                paused_at: null,
                flag_reason: null,
                metadata: { ...keptMeta, restored_at: new Date().toISOString() },
              })
              .eq('id', site.id);
            await logEvent({ siteId: site.id, action: 'site.restored', message: `${site.label} restored after subscription resumed` });
          }
          if ((flagged ?? []).length > 0) {
            console.log(`[stripe-webhook] subscription resumed: ${sub.id}, restored ${flagged?.length} site(s)`);
          }
        }
      }

      // ── Add-on bundle audit ─────────────────────────────────────
      // When /api/create-subscription bundles plan-addons onto the new
      // sub (e.g. customer ticked an add-on at signup), the slug list is
      // stamped as `metadata.addon_slugs` (JSON-string). Log it to the
      // audit trail so operators can see what shipped with the sub.
      //
      // TODO when the first addon ships: per-slug side effects here —
      // wp.cloud manageSoftware + site-meta toggle for things like
      // premium SSL flags, WAF rules, etc.
      const addonSlugs = parseAddonSlugs((sub.metadata as any)?.addon_slugs);
      if (addonSlugs.length > 0) {
        await recordAudit({
          actorType: 'webhook',
          action: 'subscription.addons.attached',
          resourceType: 'subscription',
          resourceId: sub.id,
          metadata: {
            stripe_subscription_id: sub.id,
            stripe_customer_id: custStripeId,
            user_id: cust.id,
            event_type: event.type,
            addon_slugs: addonSlugs,
          },
        });
      }

      // Phase 3: standalone domain purchases no longer ride a Stripe
      // Subscription — they're checkout.session.completed events handled
      // in the dedicated block below. Nothing to do here.
    }

    // ── checkout.session.completed (one-time payments) ──
    else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = (session.metadata ?? {}) as Record<string, string>;

      // ── Studio request (one-time) ──
      if (metadata.type === 'studio_request') {
        const userId = metadata.supabase_user_id;
        if (userId) {
          const { data: ticket } = await supabase
            .from('tickets')
            .insert({
              user_id: userId,
              subject: metadata.studio_subject ?? 'Studio Request',
              type: 'studio',
              status: 'open',
              priority: 'normal',
              metadata: {
                stripe_payment_id: session.payment_intent ?? session.id,
                amount_cad: session.amount_total ?? 25000,
              },
            })
            .select('id')
            .single();

          if (ticket && metadata.studio_message) {
            await supabase.from('ticket_messages').insert({
              ticket_id: ticket.id,
              sender: 'customer',
              message: metadata.studio_message,
            });
          }
          console.log('[stripe-webhook] studio ticket created:', ticket?.id);
        }
      }

      // ── Domain registration (Phase 3 inline-checkout flow) ──
      else if (metadata.product_type === 'domain_registration') {
        const domainName = (metadata.domain_name ?? '').toLowerCase();
        const years = Math.max(1, Math.min(10, parseInt(metadata.years ?? '1', 10) || 1));
        let userId = metadata.supabase_user_id ?? '';

        // Resolve user via metadata first, then customer_email fallback.
        if (!userId) {
          const custEmail =
            session.customer_details?.email ?? session.customer_email ?? null;
          const custStripeId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id;
          if (custStripeId) {
            const { data: byStripe } = await supabase
              .from('users')
              .select('id')
              .eq('stripe_customer_id', custStripeId)
              .maybeSingle();
            if (byStripe?.id) userId = byStripe.id;
          }
          if (!userId && custEmail) {
            const { data: byEmail } = await supabase
              .from('users')
              .select('id')
              .eq('email', custEmail.toLowerCase())
              .maybeSingle();
            if (byEmail?.id) userId = byEmail.id;
          }
        }

        if (!userId || !domainName) {
          console.warn('[stripe-webhook] domain_registration session missing user or domain', { sessionId: session.id, userId, domainName });
        } else {
          console.log('[stripe-webhook] registering paid domain:', domainName, 'for', userId);
          // Reuse the internal OpenSRS register endpoint (preferred path
          // — it already handles audit_log + opensrs_domains mirror).
          const origin = internalOrigin(req);
          let reg: { ok: boolean; error?: string } = { ok: false };
          try {
            const res = await fetch(`${origin}/api/internal/opensrs/register-domain`, {
              method: 'POST',
              headers: internalHeaders(),
              body: JSON.stringify({ userId, domainName, years }),
            });
            const data = await res.json().catch(() => ({}));
            reg = { ok: res.ok, error: data?.error };
          } catch (e) {
            reg = { ok: false, error: String(e) };
          }

          if (reg.ok) {
            // Stamp auto_renew=true so the daily cron picks it up.
            await supabase
              .from('domains')
              .update({ auto_renew: true })
              .eq('domain_name', domainName)
              .eq('user_id', userId);
          } else {
            // Internal route failure — fall back to the in-process helper
            // so we still produce a domains row + opensrs_domains mirror.
            console.warn('[stripe-webhook] internal register-domain failed, falling back to inline:', reg.error);
            const fallback = await registerDomainViaOpenSrs({ userId, domainName, years });
            if (fallback.ok) {
              await supabase
                .from('domains')
                .update({ auto_renew: true })
                .eq('domain_name', domainName)
                .eq('user_id', userId);
            } else {
              console.error('[stripe-webhook] domain registration failed:', domainName, fallback.error);
            }
          }
        }
      }
    }

    else if (event.type === 'payment_intent.succeeded') {
      console.log('[stripe-webhook] payment intent succeeded:', (event.data.object as Stripe.PaymentIntent).id);
    }

    // ── customer.subscription.deleted ──
    else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const custStripeId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      console.log('[stripe-webhook] subscription cancelled:', sub.id);

      const { data: cust } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('stripe_customer_id', custStripeId)
        .maybeSingle();

      // Cascade to sites linked via stripe_subscription_item_id.
      const itemIds = (sub.items?.data ?? []).map(i => i.id);
      let pausedSiteCount = 0;
      if (cust && itemIds.length > 0) {
        const { data: sites } = await supabase
          .from('sites')
          .select('id, label, status, user_id')
          .in('stripe_subscription_item_id', itemIds)
          .in('status', ['active', 'provisioning']);

        for (const site of sites ?? []) {
          await supabase
            .from('sites')
            .update({
              status: 'paused',
              paused_at: new Date().toISOString(),
              flag_reason: 'subscription_cancelled_via_stripe',
            })
            .eq('id', site.id);

          await logEvent({
            siteId: site.id,
            action: 'site.paused_via_stripe',
            message: `${site.label} paused after subscription cancelled in Stripe portal`,
          });
          pausedSiteCount++;
        }
      }

      if (pausedSiteCount > 0 && cust?.email) {
        const email = sitesPausedEmail(cust.full_name ?? 'there', pausedSiteCount);
        await sendEmail({ to: cust.email, ...email });
      }

      // Phase 3: domain renewal subscriptions no longer exist. Customers
      // toggle auto_renew via the domains UI; the daily renewal cron
      // honours that flag directly.
    }

    // ── invoice.paid / invoice.payment_failed ──
    else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const inv = event.data.object as Stripe.Invoice;
      const custStripeId = typeof inv.customer === 'string' ? inv.customer : (inv.customer as any)?.id;
      const { data: cust } = await supabase
        .from('users')
        .select('id, full_name, email, metadata')
        .eq('stripe_customer_id', custStripeId)
        .maybeSingle();
      if (!cust) return NextResponse.json({ received: true });

      const meta = (cust.metadata as any) ?? {};

      if (event.type === 'invoice.paid' && (inv.amount_paid ?? 0) > 0) {
        // Promote signup_status if pending.
        if (meta.signup_status === 'awaiting_payment' || meta.signup_status === 'payment_failed') {
          await supabase
            .from('users')
            .update({
              metadata: {
                ...meta,
                signup_status: 'active',
                payment_confirmed_at: new Date().toISOString(),
              },
            })
            .eq('id', cust.id);
          try {
            const adminClient: any = (supabase as any).auth?.admin;
            if (adminClient?.updateUserById) {
              await adminClient.updateUserById(cust.id, { email_confirm: true });
            }
          } catch (e) {
            console.error('[stripe-webhook] auth email_confirm flip failed:', e);
          }
        }

        // Receipt email.
        if (cust.email) {
          const amount = `$${((inv.amount_paid ?? 0) / 100).toFixed(2)} ${(inv.currency ?? 'USD').toUpperCase()}`;
          const desc = inv.description ?? `Invoice ${inv.number ?? ''}`;
          const email = invoicePaidEmail(cust.full_name ?? 'there', amount, desc, inv.hosted_invoice_url ?? null);
          await sendEmail({ to: cust.email, ...email });
        }

        // Clear payment status + grace period.
        await supabase
          .from('users')
          .update({
            payment_status: 'current',
            payment_failed_at: null,
            suspended_at: null,
            pre_suspension_state: null,
          })
          .eq('id', cust.id);
      }

      if (event.type === 'invoice.payment_failed') {
        if (meta.signup_status === 'awaiting_payment') {
          await supabase
            .from('users')
            .update({
              metadata: { ...meta, signup_status: 'payment_failed', last_payment_failure_at: new Date().toISOString() },
            })
            .eq('id', cust.id);
        }

        if ((inv.amount_due ?? 0) > 0 && cust.email) {
          const amount = `$${((inv.amount_due ?? 0) / 100).toFixed(2)} ${(inv.currency ?? 'USD').toUpperCase()}`;
          const email = paymentFailedEmail(cust.full_name ?? 'there', amount);
          await sendEmail({ to: cust.email, ...email });
        }
      }
    }

    else if (event.type === 'customer.created') {
      const c = event.data.object as Stripe.Customer;
      const userId = (c.metadata as any)?.supabase_user_id;
      if (userId) {
        await supabase.from('users').update({ stripe_customer_id: c.id }).eq('id', userId);
        console.log('[stripe-webhook] user stripe_customer_id updated:', c.id);
      }
    }
  } catch (e) {
    console.error('[stripe-webhook] handler error:', e);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  // Mark webhook_events row as processed (best-effort).
  try {
    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('provider', 'stripe')
      .eq('provider_event_id', event.id);
  } catch (e) {
    console.error('[stripe-webhook] failed to mark processed (non-fatal):', e);
  }

  return NextResponse.json({ received: true });
}
