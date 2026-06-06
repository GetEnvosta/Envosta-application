import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { AcceptHandoff } from '@/components/transfer/accept-handoff';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Recipient landing page for a site handoff invite. Resolves the pending
 * transfer by its one-time token (the token itself is the authorization to
 * view this), shows a summary, and renders the accept control. Reachable
 * logged-out (middleware only gates /dashboard + /admin).
 */
export default async function AcceptHandoffPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let site: any = null;
  let plan: any = null;
  let invalid = '';

  if (!token) {
    invalid = 'No handoff token provided.';
  } else {
    const db = sb();
    const { data: s } = await db
      .from('sites')
      .select('id, label, status, product_id, metadata')
      .eq('metadata->>transfer_token', token)
      .maybeSingle();
    if (!s) {
      invalid = 'This handoff link is invalid or has already been used.';
    } else {
      const transfer = (s.metadata as any)?.transfer ?? {};
      if (transfer.status !== 'pending') invalid = 'This handoff is no longer pending.';
      else if (transfer.expires_at && new Date(transfer.expires_at) < new Date()) invalid = 'This handoff link has expired.';
      else {
        site = s;
        if (s.product_id) {
          const { data: p } = await db.from('products').select('name, price_cad').eq('id', s.product_id).maybeSingle();
          plan = p;
        }
      }
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-8">
        {invalid ? (
          <>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Handoff unavailable</h1>
            <p className="text-sm text-gray-500 mb-6">{invalid}</p>
            <Link href="/dashboard" className="btn-primary text-sm py-2 px-4">Go to dashboard</Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Accept site handoff</h1>
            <p className="text-sm text-gray-500 mb-5">
              Someone wants to transfer a website to you. Review and accept to take over billing — the site stays live, nothing is rebuilt.
            </p>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 mb-5 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Site</span><span className="font-medium text-gray-900">{site.label}</span></div>
              {plan?.name && <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium text-gray-900">{plan.name}</span></div>}
              {plan?.price_cad != null && (
                <div className="flex justify-between"><span className="text-gray-500">Your price</span><span className="font-medium text-gray-900">${Math.round(plan.price_cad / 100)} CAD/mo</span></div>
              )}
            </div>
            <AcceptHandoff token={token!} siteId={site.id} toEmail={(site.metadata as any)?.transfer?.to_email ?? ''} />
          </>
        )}
      </div>
    </div>
  );
}
