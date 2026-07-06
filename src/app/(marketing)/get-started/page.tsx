import { redirect } from 'next/navigation';

/**
 * /get-started — retired self-serve checkout (rebuild Phase 3).
 * Public signup is rep-assisted until Gate 3 (charter §8); the public
 * entry point is the Scorecard funnel. Old inbound links land there.
 * Self-serve returns at /signup behind SELF_SERVE_ENABLED.
 */
export default function GetStartedRedirect() {
  redirect('/scorecard');
}
