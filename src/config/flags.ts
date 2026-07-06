/**
 * config/flags — operational feature flags (rebuild brief Phase 3).
 *
 * SELF_SERVE_ENABLED: the public may complete signup checkout themselves.
 * OFF until Gate 3 ($150K MRR — charter §8). While off, /signup requires a
 * logged-in staff member (the rep closes live); the flow itself is
 * identical, so flipping the env var at Gate 3 launches self-serve with
 * zero code changes.
 */
export function selfServeEnabled(): boolean {
  return process.env.SELF_SERVE_ENABLED === 'true';
}
