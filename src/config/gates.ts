/**
 * config/gates — the growth gates, kill triggers, and canonical metric
 * definitions (charter CLAUDE.md §8, verbatim). The sequence is law:
 * nothing scales until the gate before it is passed. Consumed by the
 * admin gate dashboard; never hardcode these numbers in components.
 */

export interface Gate {
  number: 0 | 1 | 2 | 3 | 4;
  title: string;
  /** MRR threshold in cents that opens this gate's evaluation (null = client-count gate). */
  mrrCents: number | null;
  requirements: string[];
  unlocks: string;
}

export const GATES: readonly Gate[] = [
  {
    number: 0,
    title: 'First 10 clients',
    mrrCents: null,
    requirements: [
      'One industry, one metro',
      'Measure CAC, tickets/client/mo, 90-day churn',
      'No model changes before client 10',
    ],
    unlocks: 'The right to change anything at all.',
  },
  {
    number: 1,
    title: '$15K MRR',
    mrrCents: 1_500_000,
    requirements: ['All recurring processes written as SOPs'],
    unlocks: 'First VA QA contractor.',
  },
  {
    number: 2,
    title: '$50K MRR',
    mrrCents: 5_000_000,
    requirements: ['Churn ≤ 3%/mo', '≤ 1 ticket/client/mo', 'CAC payback ≤ 4 months'],
    unlocks: 'First hire: ops lead. Paid acquisition (Envosta’s own) allowed.',
  },
  {
    number: 3,
    title: '$150K MRR',
    mrrCents: 15_000_000,
    requirements: ['Gates 0–2 held'],
    unlocks: 'Self-serve Basic signup launches (SELF_SERVE_ENABLED=true); industry #2 opens with its own 12 Growth spots.',
  },
  {
    number: 4,
    title: '$400K MRR',
    mrrCents: 40_000_000,
    requirements: ['Self-serve > 50% of new MRR — or headcount grows'],
    unlocks: 'The $1M/mo shape.',
  },
] as const;

export interface KillTrigger {
  key: 'churn' | 'tickets' | 'pricing_change';
  label: string;
  /** Threshold; interpretation depends on the metric. */
  threshold: number | null;
  consequence: string;
}

export const KILL_TRIGGERS: readonly KillTrigger[] = [
  {
    key: 'churn',
    label: 'Churn > 5%/mo for 2 consecutive months',
    threshold: 5,
    consequence: 'Freeze ALL acquisition. Fix retention before selling one more account.',
  },
  {
    key: 'tickets',
    label: 'Tickets > 2 per client per month',
    threshold: 2,
    consequence: 'Freeze all promises and features. Fix the product until the number drops.',
  },
  {
    key: 'pricing_change',
    label: 'Any pricing or plan change inside 12 months',
    threshold: null,
    consequence: 'Does not exist. The ladder is frozen until 2027-07-02.',
  },
] as const;

/** Canonical metric definitions (charter §8) — shown on the dashboard so
 * every number is read the same way by everyone. */
export const METRIC_DEFINITIONS = {
  mrr: 'MRR by plan — sum of active recurring revenue, monthly-normalized.',
  churn: 'Churn = % of MRR lost per month.',
  tickets: 'Tickets per client per month.',
  cac: 'CAC = fully-loaded cost (hours × rate + spend) per closed client.',
  cacPayback: 'CAC payback = CAC ÷ (monthly gross margin per client), setup fee counted.',
} as const;
