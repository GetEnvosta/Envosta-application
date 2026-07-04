/**
 * config/industries — THE canonical industry source (charter CLAUDE.md §1).
 *
 * Adding an industry — including non-trade verticals (legal, professional
 * services) — must require ZERO code changes: add an entry here (and its
 * city spot records) and every template, page, and API picks it up. Nothing
 * trade-specific may be hardcoded anywhere else.
 *
 * Growth spot counts are REAL (per-industry, per-city exclusivity). Never
 * fake scarcity: `spotsRemaining()` computes from the ledger below (which
 * becomes a DB read at Phase 6 behind these same helpers — call sites don't
 * change).
 */

export type IndustryFamily = 'construction' | 'legal' | 'professional';

export interface IndustryVocabulary {
  /** "HVAC company" — how the business calls itself. */
  businessNoun: string;
  /** "HVAC owner" — who we're talking to. */
  ownerTitle: string;
  /** The work: "jobs" / "cases" / "engagements". */
  jobNoun: string;
  /** Example services for copy and service-area pages. */
  serviceExamples: string[];
  /** Example local-intent searches ("furnace repair calgary"). */
  searchExamples: string[];
  /** A high-ticket job that pays for the plan on its own (value-equation copy). */
  highTicketExample: string;
}

export interface Industry {
  slug: string;
  name: string;
  family: IndustryFamily;
  active: boolean;
  /** Hard cap of Growth spots for this industry (charter: 12). */
  growthCap: number;
  vocabulary: IndustryVocabulary;
}

export type SpotStatus = 'open' | 'reserved' | 'taken';

export interface IndustrySpot {
  industrySlug: string;
  city: string;
  region: string;
  country: string;
  status: SpotStatus;
}

/** Launch industries (charter roadmap: construction trades → legal → professional). */
export const INDUSTRIES: readonly Industry[] = [
  {
    slug: 'hvac',
    name: 'HVAC',
    family: 'construction',
    active: true,
    growthCap: 12,
    vocabulary: {
      businessNoun: 'HVAC company',
      ownerTitle: 'HVAC owner',
      jobNoun: 'jobs',
      serviceExamples: [
        'furnace repair',
        'AC installation',
        'heat pump replacement',
        'duct cleaning',
        'emergency no-heat calls',
      ],
      searchExamples: ['furnace repair near me', 'AC installation calgary', 'emergency furnace repair'],
      highTicketExample: 'one furnace replacement',
    },
  },
  {
    slug: 'roofing',
    name: 'Roofing',
    family: 'construction',
    active: true,
    growthCap: 12,
    vocabulary: {
      businessNoun: 'roofing company',
      ownerTitle: 'roofing contractor',
      jobNoun: 'jobs',
      serviceExamples: [
        'roof replacement',
        'hail damage repair',
        'shingle installation',
        'roof inspections',
        'emergency leak repair',
      ],
      searchExamples: ['roof replacement near me', 'hail damage roof repair calgary', 'roofing companies near me'],
      highTicketExample: 'one roof replacement',
    },
  },
] as const;

/**
 * The exclusivity ledger: one Growth client per industry per city.
 * Empty at launch = every city open (honest scarcity: 12 of 12 available).
 * Phase 6 moves this ledger into the `industry_spots` table; these helpers
 * keep the same signatures so no call site changes.
 */
export const INDUSTRY_SPOTS: readonly IndustrySpot[] = [] as const;

// ── Helpers ────────────────────────────────────────────────────────────────

export function getIndustry(slug: string): Industry | null {
  return INDUSTRIES.find((i) => i.slug === slug && i.active) ?? null;
}

export function activeIndustries(): Industry[] {
  return INDUSTRIES.filter((i) => i.active);
}

/** Taken Growth spots for an industry (real count, never fabricated). */
export function spotsTaken(industrySlug: string): number {
  return INDUSTRY_SPOTS.filter(
    (s) => s.industrySlug === industrySlug && s.status === 'taken',
  ).length;
}

/** Remaining Growth spots for an industry — the number shown on the site. */
export function spotsRemaining(industrySlug: string): number {
  const industry = getIndustry(industrySlug);
  if (!industry) return 0;
  return Math.max(0, industry.growthCap - spotsTaken(industrySlug));
}

/** Spot status for a specific industry+city ("open" if no record exists). */
export function citySpotStatus(industrySlug: string, city: string, region?: string): SpotStatus {
  const hit = INDUSTRY_SPOTS.find(
    (s) =>
      s.industrySlug === industrySlug &&
      s.city.toLowerCase() === city.toLowerCase() &&
      (!region || s.region.toLowerCase() === region.toLowerCase()),
  );
  return hit?.status ?? 'open';
}
