import type { Metadata } from 'next';
import PricingClient from './pricing-client';
import { createClient } from '@/lib/supabase-server';
import { DesignPackages } from '@/components/marketing/design-packages';

export const metadata: Metadata = {
  title: 'Hosting Plans — Envosta Managed WordPress Hosting',
  description: 'Managed WordPress hosting plans. Pick the foundation that fits — every plan starts with a personal consultation.',
  alternates: { canonical: 'https://envosta.com/plans' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'Managed WordPress hosting with personal onboarding, AI tools, and free SSL, CDN, and backups on every plan.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress Hosting',
    description: 'Managed WordPress hosting with personal onboarding, AI tools, and the essentials baked in.',
  },
};

// Re-render whenever the underlying products change. 60s is plenty for a
// public marketing page and avoids hammering Supabase on every visit.
export const revalidate = 60;

interface HostingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_usd: number | null;
  price_yearly_usd: number | null;
  price_cad: number | null;
  price_yearly_cad: number | null;
  sort_order: number | null;
  features: string[] | null;
  metadata: any;
}

function dollars(cents: number | null | undefined): string {
  if (!cents) return '0';
  return Math.round(cents / 100).toString();
}

/** Annual displayed as a per-month equivalent (yearly / 12). */
function annualMonthly(yearlyCents: number | null | undefined): string {
  if (!yearlyCents) return '0';
  return Math.round(yearlyCents / 12 / 100).toString();
}

/** % savings of yearly vs (monthly * 12). */
function annualSavings(monthly: number | null, yearly: number | null): number | null {
  if (!monthly || !yearly) return null;
  const fullYear = monthly * 12;
  if (yearly >= fullYear) return null;
  return Math.round(((fullYear - yearly) / fullYear) * 100);
}

function check() {
  return (
    <span className="ck-wrap">
      <svg className="ck" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * Universal-plan features that already appear in the "Included with every
 * plan" grid below the cards. We strip these from per-card feature lists
 * to avoid stating the same thing twice. The customer reads "Everything
 * in <previous plan>" and trusts that includes them.
 */
const UNIVERSAL_PATTERNS: RegExp[] = [
  /\bssl\b/i,
  /\bcdn\b/i,
  /daily backups/i,
  /auto[- ]?updates/i,
  /uptime/i,
  /free site migration|free wordpress migration|free migration/i,
  /\bwhois\b/i,
  /performance monitoring/i,
  /\bwaf\b|web application firewall/i,
  /\bstaging\b/i,
];

function isUniversalFeature(f: string): boolean {
  return UNIVERSAL_PATTERNS.some(re => re.test(f));
}

/**
 * Synthesize a plan's full feature list from its metadata. Universal
 * essentials (SSL, CDN, backups, etc.) are intentionally excluded —
 * they live in the "Included with every plan" section.
 */
function deriveFullFeatures(plan: HostingPlan): string[] {
  if (Array.isArray(plan.features) && plan.features.length > 0) {
    return plan.features.filter(f => !isUniversalFeature(f));
  }

  const meta = (plan.metadata as any) ?? {};
  const out: string[] = [];
  const slug = (plan.slug || '').toLowerCase();

  // Sites allotted
  const sites = meta.sites_allowed;
  if (typeof sites === 'number') {
    out.push(sites <= 1 ? '1 managed WordPress site' : `Up to ${sites} managed WordPress sites`);
  }

  // Storage
  if (meta.storage_gb) out.push(`${meta.storage_gb} GB SSD storage`);

  // Onboarding tier
  if (meta.onboarding_type === 'guided') out.push('Guided onboarding call');
  else if (meta.onboarding_type === 'concierge' || meta.onboarding_type === 'white_glove') {
    out.push('Done-with-you concierge onboarding');
  }

  // Support tier — only call out when it beats baseline email
  if (meta.support_type === 'priority') out.push('Priority support · 4-hr response');
  else if (meta.support_type === 'dedicated') out.push('Dedicated account manager');
  else if (slug.includes('minimum') || slug.includes('starter')) {
    out.push('Email support');
  }

  // Slug-keyed defaults — fill in the gaps so each tier reads as a clear
  // upgrade. Idempotent (won't duplicate).
  const has = (re: RegExp) => out.some(f => re.test(f));

  if (slug.includes('minimum') || slug.includes('starter')) {
    if (!out.some(f => /\bsite\b/i.test(f))) out.push('1 managed WordPress site');
    if (!has(/storage|ssd/i)) out.push('25 GB SSD storage');
  } else if (slug.includes('standard')) {
    if (!out.some(f => /\bsite\b/i.test(f))) out.push('Up to 3 managed sites');
    if (!has(/storage|ssd/i)) out.push('50 GB SSD storage');
    if (!has(/onboarding/i)) out.push('Guided onboarding call');
    if (!has(/priority|dedicated|response/i)) out.push('Priority support · 4-hr response');
    if (!has(/woo/i)) out.push('WooCommerce ready');
    if (!has(/seo|report/i)) out.push('Monthly SEO + performance report');
    if (!has(/forms?|capture/i)) out.push('Lead capture forms');
  } else if (slug.includes('growth')) {
    if (!out.some(f => /\bsite\b/i.test(f))) out.push('Up to 10 managed sites');
    if (!has(/storage|ssd|scaling/i)) out.push('Auto-scaling storage');
    if (!has(/onboarding/i)) out.push('Done-with-you concierge onboarding');
    if (!has(/priority|dedicated|response/i)) out.push('Dedicated account manager');
    if (!has(/seo/i)) out.push('AI-powered SEO optimization');
    if (!has(/content|assistant/i)) out.push('AI content & copy assistant');
    if (!has(/woo/i)) out.push('WooCommerce ready');
    if (!has(/strategy|consult/i)) out.push('Quarterly strategy consultations');
    if (!has(/integration|stripe/i)) out.push('Stripe & payment integrations');
    if (!has(/analytics/i)) out.push('Google Analytics + tag manager setup');
  }

  return out;
}

/**
 * Builds the per-tier feature list shown on each card. Each plan only
 * lists what's NEW relative to the cheaper plans below it — so the
 * cards stagger as a clean ladder of additive value:
 *   Minimum   → its own essentials
 *   Standard  → "Everything in Minimum" + only the deltas
 *   Growth    → "Everything in Standard" + only the deltas
 *
 * Even though Minimum technically also gets things like staging if
 * its metadata has them set, we don't enumerate every essential —
 * that's covered by the "Included with every plan" grid below.
 */
function buildTierFeatures(plans: HostingPlan[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const seenLower = new Set<string>();
  for (const plan of plans) {
    const full = deriveFullFeatures(plan);
    const fresh: string[] = [];
    for (const f of full) {
      const key = f.toLowerCase().trim();
      if (seenLower.has(key)) continue;
      fresh.push(f);
      seenLower.add(key);
    }
    result[plan.id] = fresh;
  }
  return result;
}

export default async function PricingPage() {
  const supabase = await createClient();
  // Pull every active hosting plan. We sort client-side by USD price so the
  // order is deterministic — sort_order in the DB is unreliable (often left
  // at 0/NULL when a new plan is added).
  const { data: rawPlans } = await supabase
    .from('products')
    .select('id, name, slug, description, price_usd, price_yearly_usd, price_cad, price_yearly_cad, sort_order, features, metadata')
    .eq('type', 'hosting_plan')
    .eq('is_active', true);

  const plans: HostingPlan[] = ((rawPlans ?? []) as any[])
    .slice()
    .sort((a, b) => (a.price_usd ?? a.price_cad ?? 0) - (b.price_usd ?? b.price_cad ?? 0));

  // Compute per-tier feature lists once, here, so each card only renders
  // what's NEW relative to cheaper tiers. Cleaner ladder, less repetition.
  const tierFeatures = buildTierFeatures(plans);

  // Mark the middle plan featured if there are 3+, else the most expensive.
  const featuredSlug = plans.length >= 3
    ? plans[Math.floor(plans.length / 2)]?.slug
    : plans[plans.length - 1]?.slug;

  const gridCols = plans.length >= 3 ? 'repeat(3,1fr)' : 'repeat(2,1fr)';
  const gridMaxWidth = plans.length >= 3 ? '1200px' : '860px';

  const overallSavings = (() => {
    // Use the cheapest plan's savings as the badge anchor.
    const cheapest = [...plans].sort((a, b) => (a.price_usd ?? 0) - (b.price_usd ?? 0))[0];
    return annualSavings(cheapest?.price_usd ?? null, cheapest?.price_yearly_usd ?? null);
  })();

  return (
    <>
      <PricingClient />

      <style>{`
        .pricing-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
        .pricing-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
        .pricing-hero .c{position:relative;z-index:1}
        .pricing-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;letter-spacing:-1.5px;line-height:1.12;margin-bottom:20px}
        .pricing-hero h1 em{font-style:normal;color:#fff;font-weight:500}
        .pricing-hero p{font-size:1.05rem;color:var(--t3);max-width:520px;margin:0 auto 44px;line-height:1.7;font-weight:300}
        .toggle-wrap{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:10px}
        .toggle-label{font-size:.88rem;color:var(--t2);font-weight:400;transition:color .2s}
        .toggle-label.active{color:var(--t1);font-weight:500}
        .toggle{width:52px;height:28px;background:var(--card2);border:1px solid var(--bdr2);border-radius:100px;cursor:pointer;position:relative;transition:background .3s}
        .toggle::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;background:#fff;border-radius:50%;transition:transform .3s}
        .toggle.on{background:var(--gold);border-color:var(--gold)}.toggle.on::after{transform:translateX(24px)}
        .save-badge{display:inline-block;background:rgba(34,197,94,.12);color:#22c55e;font-size:.7rem;font-weight:600;padding:3px 10px;border-radius:100px;margin-left:4px}
        .pricing-grid{padding:0 0 100px}
        .pricing-grid .c{display:grid;grid-template-columns:${gridCols};gap:20px;max-width:${gridMaxWidth};margin:0 auto;align-items:stretch}

        /* — Card shell — */
        .p-card{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:40px 36px 32px;position:relative;display:flex;flex-direction:column;transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}
        .p-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
        .p-card.featured{
          border-color:rgba(201,164,92,.55);
          background:
            linear-gradient(180deg,rgba(201,164,92,.06),transparent 50%),
            radial-gradient(circle at 50% 0%,rgba(201,164,92,.08),transparent 60%),
            var(--card);
          box-shadow:0 0 0 1px rgba(201,164,92,.18),0 24px 48px -24px rgba(201,164,92,.25);
        }
        .p-card.featured:hover{box-shadow:0 0 0 1px rgba(201,164,92,.3),0 28px 56px -22px rgba(201,164,92,.35)}
        .p-card.featured::before{content:'Most Popular';position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#c9a45c,#b8943f);color:#0a0e1a;font-size:.65rem;font-weight:700;padding:6px 18px;border-radius:100px;letter-spacing:1.4px;text-transform:uppercase;box-shadow:0 6px 20px -6px rgba(201,164,92,.6)}

        /* — Header: balanced name + price hierarchy — */
        .p-card-name{font-size:1.5rem;font-weight:600;color:var(--t1);letter-spacing:-.5px;line-height:1.2;margin-bottom:14px}
        .p-card-price{display:flex;align-items:baseline;gap:4px;line-height:1;margin-bottom:6px}
        .p-card-price .currency{font-size:1.25rem;font-weight:500;color:var(--t1);letter-spacing:-.3px}
        .p-card-price .amount{font-size:2.85rem;font-weight:700;letter-spacing:-1.8px;line-height:1;color:var(--t1);font-variant-numeric:tabular-nums}
        .p-card-period{font-size:.84rem;color:var(--t3);font-weight:400;margin-top:8px;letter-spacing:.1px}
        .annual-note{display:inline-flex;align-items:center;gap:6px;font-size:.74rem;color:#22c55e;font-weight:600;margin-top:10px;letter-spacing:.2px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:100px;padding:3px 10px;align-self:flex-start;width:fit-content}
        .annual-note::before{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:#22c55e}

        /* — Tagline (Hormozi-shaped, longer) — */
        .p-card-tag{font-size:.95rem;color:var(--t2);font-weight:300;line-height:1.65;margin:24px 0 28px;min-height:4.8em}

        /* — CTA: outline on every plan, accent ramps with tier — */
        .p-card .p-cta{display:block;width:100%;text-align:center;padding:14px 24px;font-size:.9rem;font-weight:600;letter-spacing:.3px;border-radius:12px;background:transparent;border:1.5px solid var(--bdr2);color:var(--t1);text-decoration:none;transition:background .2s,border-color .2s,color .2s,transform .15s}
        .p-card .p-cta:hover{background:rgba(255,255,255,.03);border-color:var(--t2);color:#fff;transform:translateY(-1px)}
        .p-card.featured .p-cta{border-color:rgba(201,164,92,.5);color:#c9a45c}
        .p-card.featured .p-cta:hover{background:rgba(201,164,92,.1);border-color:#c9a45c;color:#e6c46e}

        /* — Divider + feature list — */
        .p-card-highlights{margin-top:32px;padding-top:28px;border-top:1px solid var(--bdr);flex:1;display:flex;flex-direction:column}
        .p-card-highlights-label{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:var(--t3);margin-bottom:16px}
        .p-card ul{list-style:none;margin:0;padding:0}
        .p-card li{display:flex;align-items:flex-start;gap:11px;font-size:.88rem;color:var(--t2);padding:8px 0;font-weight:400;line-height:1.5;border:none}
        .p-card li .ck-wrap{flex-shrink:0;width:18px;height:18px;border-radius:50%;background:rgba(34,197,94,.12);display:inline-flex;align-items:center;justify-content:center;margin-top:2px}
        .p-card li .ck{width:10px;height:10px;color:#22c55e}
        .p-card.featured li .ck-wrap{background:rgba(201,164,92,.15)}
        .p-card.featured li .ck{color:#c9a45c}
        .all-plans{padding:0 0 100px}
        .all-plans-header{text-align:center;margin-bottom:56px}
        .all-plans-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .all-plans-header p{font-size:.92rem;color:var(--t3);font-weight:300;max-width:520px;margin:0 auto;line-height:1.7}
        .all-plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1080px;margin:0 auto}
        .ap-card{background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:28px 24px;transition:border-color .3s}
        .ap-card:hover{border-color:var(--bdr2)}
        .ap-icon{width:40px;height:40px;border-radius:10px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:var(--gold)}
        .ap-icon svg{width:20px;height:20px}
        .ap-card h4{font-size:.88rem;font-weight:500;margin-bottom:6px}
        .ap-card p{font-size:.76rem;color:var(--t3);line-height:1.6;font-weight:300}
        /* Collapsible "Compare every feature" sits below the pricing grid */
        .compare-toggle{max-width:${gridMaxWidth};margin:36px auto 0;text-align:center}
        .compare-toggle summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:10px;padding:12px 22px;border:1px solid var(--bdr);border-radius:100px;background:var(--card);color:var(--t1);font-size:.86rem;font-weight:500;transition:border-color .2s,background .2s,color .2s;user-select:none}
        .compare-toggle summary::-webkit-details-marker{display:none}
        .compare-toggle summary:hover{border-color:var(--gold);color:var(--gold)}
        .compare-toggle[open] summary{border-color:var(--gold);color:var(--gold);background:rgba(201,164,92,.04)}
        .compare-toggle .ct-arrow{display:inline-block;transition:transform .25s ease;width:14px;height:14px}
        .compare-toggle[open] .ct-arrow{transform:rotate(180deg)}
        .compare-toggle-wrap{display:flex;justify-content:center}
        .compare-table-wrap{margin-top:36px;overflow-x:auto;animation:ctSlide .35s ease}
        @keyframes ctSlide{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .compare-table{width:100%;border-collapse:collapse}
        .compare-table thead th{padding:16px 20px;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:var(--t2);text-align:center;border-bottom:1px solid var(--bdr)}
        .compare-table thead th:first-child{text-align:left;color:var(--t3)}
        .compare-table thead th.feat{color:var(--gold)}
        .compare-table tbody td{padding:14px 20px;font-size:.84rem;color:var(--t2);border-bottom:1px solid var(--bdr);text-align:center;font-weight:300;line-height:1.7}
        .compare-table tbody td:first-child{text-align:left;color:var(--t1);font-weight:400}
        .compare-table tbody tr:hover{background:rgba(37,99,235,.03)}
        .compare-table .check{color:var(--grn);font-size:1rem}
        .compare-table .dash{color:var(--t3)}
        .faq{padding:0 0 100px}
        .faq-header{text-align:center;margin-bottom:56px}
        .faq-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .faq-header p{font-size:.95rem;color:var(--t2);font-weight:300;line-height:1.75}
        .faq-list{max-width:720px;margin:0 auto}
        .faq-item{border-bottom:1px solid var(--bdr)}
        .faq-q{display:flex;align-items:center;justify-content:space-between;padding:20px 0;cursor:pointer;gap:16px}
        .faq-q h4{font-size:.92rem;font-weight:400;color:var(--t1);transition:color .2s}
        .faq-q:hover h4{color:#fff}
        .faq-icon{width:24px;height:24px;flex-shrink:0;color:var(--t3);transition:transform .3s,color .3s}
        .faq-item.open .faq-icon{transform:rotate(45deg);color:var(--gold)}
        .faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .4s ease}
        .faq-item.open .faq-a{max-height:300px;padding-bottom:20px}
        .faq-a p{font-size:.84rem;color:var(--t2);line-height:1.7;font-weight:300}
        @media(max-width:1024px){.pricing-grid .c{grid-template-columns:repeat(2,1fr);gap:16px}.p-card{padding:36px 28px 28px}.p-card-name{font-size:1.35rem}.p-card-price .amount{font-size:2.5rem;letter-spacing:-1.5px}.all-plans-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){.pricing-grid .c{grid-template-columns:1fr}.p-card{padding:40px 32px 32px}.p-card-name{font-size:1.45rem}.p-card-price .amount{font-size:2.7rem;letter-spacing:-1.7px}.all-plans-grid{grid-template-columns:1fr}}
      `}</style>

      {/* PRICING HERO */}
      <section className="pricing-hero">
        <div className="c">
          <h1 className="rv">Simple, transparent <em>pricing</em></h1>
          <p className="rv">Every plan starts with a personal consultation. Pick the foundation that fits — we&apos;ll help you build from there.</p>
          <div className="toggle-wrap rv">
            <span id="lbl-monthly" className="toggle-label">Monthly</span>
            <div id="billing-toggle" className="toggle on" role="switch" aria-label="Toggle annual billing" aria-checked="true"></div>
            <span id="lbl-annual" className="toggle-label active">
              Annual{overallSavings ? <span className="save-badge">Save {overallSavings}%</span> : null}
            </span>
          </div>
          <p className="rv pricing-trial-note">Try free for 14 days. Cancel anytime.</p>
        </div>
      </section>

      {/* PRICING CARDS — rendered live from products table */}
      <section className="pricing-grid rv">
        <div className="c">
          {plans.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--t3)', gridColumn: '1 / -1' }}>
              Plans are being updated — please check back shortly.
            </p>
          )}
          {plans.map((plan, idx) => {
            const isFeatured = plan.slug === featuredSlug;
            const monthly = plan.price_usd ?? plan.price_cad ?? 0;
            const yearly = plan.price_yearly_usd ?? plan.price_yearly_cad ?? 0;
            const yearlyDisplayPerMonth = annualMonthly(yearly);
            const savings = annualSavings(monthly, yearly);
            const features = tierFeatures[plan.id] ?? [];
            const previousPlan = idx > 0 ? plans[idx - 1] : null;
            // Short tagline — use description if set, else a sensible default
            // keyed off plan position in the ladder.
            const tagline = plan.description
              || (idx === 0
                ? 'Get a fast, secure WordPress site online today — no servers to manage, no plugins to babysit, no hosting decisions to second-guess.'
                : idx === plans.length - 1
                  ? 'The full growth stack 7-figure brands run on. Every tool, every service, and a dedicated team — so the only thing standing between you and #1 is the work.'
                  : 'When "just hosting" stops moving the needle. Multiple sites, AI-powered SEO, priority support, and the tools to compound — without jumping to enterprise pricing.');
            return (
              <div key={plan.id} className={isFeatured ? 'p-card featured' : 'p-card'}>
                {/* Stacked header: small uppercase plan name → BIG price → period */}
                <h3 className="p-card-name">{plan.name}</h3>
                <div className="p-card-price">
                  <span className="currency">$</span>
                  <span
                    className="amount price-val"
                    data-monthly={dollars(monthly)}
                    data-annual={yearlyDisplayPerMonth}
                  >
                    {/* Annual is the default selection */}
                    {yearly ? yearlyDisplayPerMonth : dollars(monthly)}
                  </span>
                </div>
                <div className="p-card-period">USD per month</div>
                <div className="annual-note" style={{ display: yearly ? 'inline-flex' : 'none' }}>
                  Billed annually · ${dollars(yearly)}/yr{savings ? ` · save ${savings}%` : ''}
                </div>

                <p className="p-card-tag">{tagline}</p>

                <a
                  href={`/get-started?plan=${plan.slug}&billing=annual`}
                  className="p-cta"
                >
                  Try for free
                </a>

                <div className="p-card-highlights">
                  <div className="p-card-highlights-label">Highlights</div>
                  <ul>
                    {previousPlan && (
                      <li>{check()}Everything in {previousPlan.name}</li>
                    )}
                    {features.map((f, i) => (
                      <li key={i}>{check()}{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison table — collapsed by default, sits below the plans
            in place of the old "Need a dedicated team — Get in touch"
            line. Native <details> so no client component required. */}
        <details className="compare-toggle">
          <summary>
            Compare every feature
            <svg className="ct-arrow" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className={plan.slug === featuredSlug ? 'feat' : ''}>
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Price</td>
                  {plans.map((plan) => (
                    <td key={plan.id}>${dollars(plan.price_usd ?? plan.price_cad)} USD/mo</td>
                  ))}
                </tr>
                <tr>
                  <td>Sites included</td>
                  {plans.map((plan) => {
                    const allowed = (plan.metadata as any)?.sites_allowed ?? 1;
                    return <td key={plan.id}>{allowed === 1 ? '1' : `Up to ${allowed}`}</td>;
                  })}
                </tr>
                <tr>
                  <td>SSD storage</td>
                  {plans.map((plan) => {
                    const gb = (plan.metadata as any)?.storage_gb;
                    return <td key={plan.id}>{gb ? `${gb} GB` : 'Auto-scaling'}</td>;
                  })}
                </tr>
                <tr><td>WordPress on WP.Cloud</td>{plans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr><td>Free SSL + global CDN</td>{plans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr><td>Daily backups</td>{plans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr><td>Automatic updates</td>{plans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr>
                  <td>Support</td>
                  {plans.map((plan) => {
                    const s = (plan.metadata as any)?.support_type;
                    const label = s === 'priority' ? 'Priority' : s === 'dedicated' ? 'Dedicated' : 'Email';
                    return <td key={plan.id}>{label}</td>;
                  })}
                </tr>
                <tr><td>Full onboarding by our team</td>{plans.map(p => {
                  const t = (p.metadata as any)?.onboarding_type;
                  const has = t && t !== 'standard';
                  return <td key={p.id} className={has ? 'check' : 'dash'}>{has ? '✓' : '—'}</td>;
                })}</tr>
                <tr><td>Free site migration</td>{plans.map(p => <td key={p.id} className="check">{'✓'}</td>)}</tr>
                <tr><td>WooCommerce ready</td>{plans.map(p => {
                  const isCheapest = p.slug === plans[0]?.slug;
                  return <td key={p.id} className={isCheapest ? 'dash' : 'check'}>{isCheapest ? '—' : '✓'}</td>;
                })}</tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* ALL PLANS INCLUDE */}
      <section className="all-plans rv"><div className="c">
        <div className="all-plans-header">
          <h2>Included with every plan</h2>
          <p>No matter which plan you choose, you get the essentials that make Envosta different — right out of the box.</p>
        </div>
        <div className="all-plans-grid">

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <h4>Free SSL Certificate</h4>
            <p>Every site gets a free SSL certificate, auto-renewed and configured for you.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" /></svg></div>
            <h4>Global CDN</h4>
            <p>Content delivered from edge locations around the world for lightning-fast load times.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></div>
            <h4>Daily Backups</h4>
            <p>Automatic daily backups with one-click restore, so your site is always protected and recoverable.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l9-3 9 3v6c0 5.5-3.5 10-9 12-5.5-2-9-6.5-9-12V5z" /><path d="M9 12l2 2 4-4" /></svg></div>
            <h4>Web Application Firewall</h4>
            <p>Always-on WAF blocks bots, brute-force attempts, and OWASP Top 10 threats before they hit your site.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
            <h4>99.99% Uptime SLA</h4>
            <p>Enterprise-grade infrastructure with guaranteed uptime across all plans.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div>
            <h4>Free Site Migration</h4>
            <p>Our team handles your entire migration — files, database, DNS — with zero downtime.</p>
          </div>

        </div>
      </div></section>

      {/* MORE OPTIONS — design packages with email-quote CTAs */}
      <DesignPackages />

      {/* Compare-every-feature section moved into the collapsible <details>
          underneath the pricing grid (replacing the old "Need a dedicated
          team — Get in touch" line). No standalone section here anymore. */}

      {/* FAQ */}
      <section className="faq rv"><div className="c">
        <div className="faq-header">
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know about our plans, billing, and support.</p>
        </div>
        <div className="faq-list">

          <div className="faq-item">
            <div className="faq-q">
              <h4>Can I switch plans after signing up?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Absolutely. You can upgrade or downgrade at any time. When upgrading, the price difference is prorated. When downgrading, the new rate applies at your next billing cycle.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>What does the personal onboarding include?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>We walk through your goals, configure your hosting environment, install WordPress, set up your domain and SSL, and make sure everything is optimized before you go live.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Do you handle WordPress migrations?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. Our team will migrate your existing WordPress site for free with any plan. We handle everything — files, database, DNS configuration — with zero downtime.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Is my site backed up automatically?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. Every plan includes automatic daily backups with one-click restore. Backups are stored securely off-site so you can recover your site at any time.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>What kind of support can I expect?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Every plan includes email support with a fast response window. Higher tiers add priority support with quicker turnaround and more hands-on guidance.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Do you offer custom or enterprise plans?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Absolutely. If none of our standard plans fit your needs, reach out and we&apos;ll put together a custom solution with the exact resources and support you require.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Can I cancel at any time?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. There are no long-term contracts. Monthly plans can be cancelled anytime. Annual plans are covered by our 14-day money-back guarantee.</p></div>
          </div>

        </div>
      </div></section>
    </>
  );
}
