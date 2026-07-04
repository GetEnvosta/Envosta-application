/**
 * config/pricing — THE canonical pricing source (charter CLAUDE.md §2–§3).
 *
 * FROZEN until 2027-07-02. No renames, no new plans, no price changes, no
 * discounts. Every page, script, and API that shows a price, plan name, plan
 * content line, SLA, or the annual-prepay rule must read it from here —
 * literals in components are a charter violation (§9.6).
 *
 * Annual prepay is a BONUS MONTH (13 months for the price of 12) — never
 * expressed as a discount or percentage off (§2, offer spec Call 5).
 */

export type PlanKey = 'minimum' | 'basic' | 'business' | 'growth';

/** Currency labeling is an Open Decision (OPEN_QUESTIONS.md #2) — the locked
 * numerals don't change; only the label does. Flag, not a fork. */
export const CURRENCY: 'USD' | 'CAD' = 'USD';

export interface Plan {
  key: PlanKey;
  name: string;
  /** Hidden plans never appear in nav, sitemap, pricing pages, or schema. */
  hidden: boolean;
  setupCents: number;
  monthlyCents: number;
  /** Which offer layer this plan represents (charter §2 shape). */
  layer: 'retention_floor' | 'hosting_site_base' | 'marketing_layer' | 'full_program';
  /** Ranking-targeted service-area pages generated per month (monthly engine cadence). */
  pagesPerMonth: number;
  /** Growth only: hard cap of spots per industry (per-city exclusivity). */
  spotCapPerIndustry?: number;
  /** One-line summary for cards/tables. */
  summary: string;
  /** Structured contents: what THIS tier adds. Render inherited tiers with `inheritsLabel`. */
  inheritsLabel?: string;
  contents: string[];
  /** Edit SLA (business days) for the Service Promise + dashboards. */
  editSlaBusinessDays: number | null;
}

/** Order = ladder order. Minimum is the hidden retention/downgrade floor. */
export const PLANS: readonly Plan[] = [
  {
    key: 'minimum',
    name: 'Minimum',
    hidden: true,
    setupCents: 0,
    monthlyCents: 3_600,
    layer: 'retention_floor',
    pagesPerMonth: 0,
    summary: 'Hosting + domain kept alive. Retention/downgrade net only — never advertised.',
    contents: [
      'Managed WordPress hosting on wp.cloud',
      'Domain kept registered and renewed',
      'Security, backups, updates, uptime monitoring',
    ],
    editSlaBusinessDays: null,
  },
  {
    key: 'basic',
    name: 'Basic',
    hidden: false,
    setupCents: 150_000,
    monthlyCents: 29_700,
    layer: 'hosting_site_base',
    pagesPerMonth: 0,
    summary: 'Industry-specialized managed hosting — the site, the domain, and the upkeep, handled.',
    contents: [
      'Industry-specialized managed hosting on wp.cloud',
      'Custom Studio-built site migrated live',
      'Domain + branded email',
      'Google Business Profile setup',
      'Click-to-call + quote-request forms on every page',
      'Unlimited small edits',
      'Security, backups, updates, uptime',
      'Monthly branded report',
    ],
    editSlaBusinessDays: 2,
  },
  {
    key: 'business',
    name: 'Business',
    hidden: false,
    setupCents: 150_000,
    monthlyCents: 59_700,
    layer: 'marketing_layer',
    pagesPerMonth: 2,
    summary: 'The marketing layer: SEO foundation, service-area pages, reviews, citations.',
    inheritsLabel: 'Everything in Basic',
    contents: [
      'Automated SEO foundation',
      '2 ranking-targeted service-area pages per month',
      'Review generation',
      'Citation management',
      'Ongoing Google Business Profile optimization',
      'Priority support',
    ],
    editSlaBusinessDays: 1,
  },
  {
    key: 'growth',
    name: 'Growth',
    hidden: false,
    setupCents: 250_000,
    monthlyCents: 347_200,
    layer: 'full_program',
    pagesPerMonth: 4,
    spotCapPerIndustry: 12,
    summary: 'The full program — all real ongoing human work lives here. 12 spots per industry.',
    inheritsLabel: 'Everything in Business',
    contents: [
      '4 service-area pages per month',
      'Active local SEO',
      'Reputation management',
      'Lead & call tracking',
      'Dedicated account manager',
      'Per-industry, per-city exclusivity',
    ],
    editSlaBusinessDays: 1,
  },
] as const;

/** Annual prepay: 13 months for the price of 12 — a bonus month, NEVER a
 * discount/percent-off. Copy must always frame it as a bonus month. */
export const ANNUAL_PREPAY = {
  monthsPaid: 12,
  monthsGranted: 13,
  framing: '13th month free',
} as const;

/** Service promise (charter §3) — client-facing commitments, verbatim. */
export const SERVICE_PROMISE = {
  acknowledgeHours: 4,
  siteDown: 'immediate',
  intakeSteps: [
    'Client calls or texts one number',
    'Request logged',
    'Change executed via Studio + Claude workflow',
    'QA pass',
    'Confirmation sent back',
  ],
  coveredBoundary:
    'Small edits are covered. New builds, redesigns, and major features are quoted projects.',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────

export function getPlan(key: PlanKey): Plan {
  const plan = PLANS.find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown plan: ${key}`);
  return plan;
}

/** Plans that may appear on any public surface (nav, pricing, sitemap, schema). */
export function publicPlans(): Plan[] {
  return PLANS.filter((p) => !p.hidden);
}

/** Annual prepay charge for a plan in cents (12× monthly; 13th month is the bonus). */
export function annualPrepayCents(plan: Plan): number {
  return plan.monthlyCents * ANNUAL_PREPAY.monthsPaid;
}

/** "$297" — whole-dollar display with thousands separators, from cents. */
export function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

/** "$3,472/mo" style money label with the configured currency available. */
export function formatMonthly(plan: Plan): string {
  return `${formatDollars(plan.monthlyCents)}/mo`;
}
