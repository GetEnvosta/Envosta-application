/**
 * config/offer — the offer layer (ENVOSTA_OFFER_SPEC.md, subordinate to
 * CLAUDE.md). Guarantee concepts and the bonus stack are LOCKED: exactly
 * these two guarantees, exactly these five bonuses. Copy may polish
 * phrasing, never terms. No other guarantees may be invented anywhere.
 */

import type { PlanKey } from './pricing';

/** Growth's sales wrapper name. Plan key/name stays `growth`/`Growth`
 * everywhere in billing, config, and DB — this is pitch copy only. */
export const GROWTH_PROGRAM_NAME = 'the Local Domination Program';

/** The lead magnet feeding the application funnel. */
export const LEAD_MAGNET_NAME = 'Local Domination Scorecard';

export interface Guarantee {
  key: 'booked_calls_make_good' | 'deliverable_guarantee';
  name: string;
  appliesTo: PlanKey[];
  /** Locked concept wording (copywriter may polish phrasing, not terms). */
  promise: string;
  /** Conditions stated plainly, never buried. */
  conditions: string[];
}

export const GUARANTEES: readonly Guarantee[] = [
  {
    key: 'booked_calls_make_good',
    name: 'The Booked-Calls Make-Good',
    appliesTo: ['growth'],
    promise:
      'More booked calls in your first 6 months than in the 6 months before you joined — measured by your own call-tracking dashboard — or we keep working for free until you get there.',
    conditions: [
      'You keep Google Business Profile access granted',
      'You answer tracked calls during business hours',
      'The program runs uninterrupted for 6 months',
      'Baseline = your attested prior 6-month call volume, captured at onboarding',
    ],
  },
  {
    key: 'deliverable_guarantee',
    name: 'The Deliverable Guarantee',
    appliesTo: ['basic', 'business'],
    promise:
      'Every promised page, post, update, and report delivered on time each month — or that month is free.',
    conditions: [],
  },
] as const;

export interface Bonus {
  name: string;
  description: string;
}

/** Exactly five named bonuses (Growth pitch). No invented bonuses; dollar
 * values, if shown, must be defensible and consistent site-wide — values are
 * deliberately NOT hardcoded here until real vendor-equivalent pricing is
 * attached (no invented numbers). */
export const GROWTH_BONUSES: readonly Bonus[] = [
  {
    name: 'White-Glove Migration',
    description:
      'Full domain, email, and site migration handled end to end — your team touches nothing.',
  },
  {
    name: 'Local Domination Scorecard — Deep Audit edition',
    description:
      'The full competitor + search-presence teardown for your city, delivered in week one.',
  },
  {
    name: 'Review Engine Install & Launch',
    description: 'The fast-proof system live in your first 30 days.',
  },
  {
    name: 'Call Tracking & Attribution Setup',
    description: 'The instrumentation that powers the guarantee.',
  },
  {
    name: 'Quarterly Market Strategy Call',
    description: 'Founder-level review of your city’s search landscape.',
  },
] as const;

export function guaranteeForPlan(plan: PlanKey): Guarantee | null {
  return GUARANTEES.find((g) => g.appliesTo.includes(plan)) ?? null;
}
