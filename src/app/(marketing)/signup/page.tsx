/**
 * /signup — the signup flow (rebuild brief Phase 3.1–3.2).
 *
 * ONE flow, two motions:
 *  - Rep-assisted (now): a logged-in staff member drives it live with the
 *    client. Charter §4 step 1 — "rep closes live on envosta.com."
 *  - Self-serve (Gate 3): the identical flow opens to the public when
 *    SELF_SERVE_ENABLED=true. Built now, shipped dark.
 *
 * Anyone else sees the rep-assisted explainer routing to the Scorecard
 * funnel — the public purchase path before Gate 3.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import { selfServeEnabled } from '@/config/flags';
import { SignupFlow } from './signup-flow';

export const metadata: Metadata = {
  title: 'Sign Up — Envosta',
  description: 'Start industry-specialized managed hosting with Envosta.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  let isStaff = false;
  let repUserId: string | null = null;
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
      isStaff = isStaffRole(profile?.role);
      if (isStaff) repUserId = user.id;
    }
  } catch {
    // No session context — treated as public.
  }

  const open = isStaff || selfServeEnabled();

  if (!open) {
    return (
      <div className="mk2">
        <section style={{ padding: '110px 0 130px' }}>
          <div className="wrap" style={{ maxWidth: 640 }}>
            <div className="panel panel--framed" style={{ padding: '48px 40px', textAlign: 'center' }}>
              <span className="eyebrow">Signup is by conversation</span>
              <h1 style={{ fontSize: '1.9rem', margin: '14px 0' }}>
                We set every client up personally.
              </h1>
              <p style={{ lineHeight: 1.75, maxWidth: 480, margin: '0 auto 28px' }}>
                Every Envosta client is onboarded white-glove by our team — starting with the free
                scorecard of your city&apos;s search landscape. Get yours and we&apos;ll take it
                from there.
              </p>
              <Link href="/scorecard" className="btn btn--primary">Get your free scorecard</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mk2">
      <SignupFlow repAssisted={isStaff} repUserId={repUserId} />
    </div>
  );
}
