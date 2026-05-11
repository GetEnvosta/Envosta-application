'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProvisionButton({ siteId, label }: { siteId: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function handleProvision() {
    if (!confirm(`Provision WordPress site "${label}" on wp.cloud?\n\nThis will create a live WordPress installation.`)) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setLoading(false); return; }

      // Get the service details to pass to provision-hosting
      const { data: service } = await supabase
        .from('sites')
        .select('*, subscriptions(id, product_id, products(slug)), users(email, full_name)')
        .eq('id', siteId)
        .single();

      if (!service) { setError('Service not found'); setLoading(false); return; }

      const planSlug = (service as any).subscriptions?.products?.slug ?? 'minimum';
      const userEmail = (service as any).users?.email ?? 'admin@envosta.com';
      const domainName = (service as any).metadata?.domain_name ?? null;

      // Admin retry resets the auto-retry counter so the cron starts fresh
      // if this attempt also fails. metadata is otherwise preserved.
      const existingMeta = (service as any).metadata ?? {};
      await supabase.from('sites').update({
        metadata: {
          ...existingMeta,
          provision_attempts: 0,
          provision_giving_up: false,
          provision_last_attempt_at: new Date().toISOString(),
          provision_manual_retry_at: new Date().toISOString(),
        },
      }).eq('id', siteId);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
          },
          body: JSON.stringify({
            siteId: service.id,
            label: service.label,
            region: service.server_region ?? 'dca',
            phpVersion: service.php_version ?? '8.4',
            planId: service.product_id,
            adminEmail: userEmail,
            ...(domainName && { domainName }),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Provisioning failed');
        setLoading(false);
        return;
      }

      setSuccess(`Site provisioned: ${data.domain ?? data.url ?? 'Success'}`);
      setLoading(false);
      setTimeout(() => router.refresh(), 1500);

    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  if (success) {
    return <span className="text-xs text-emerald-600 font-medium">{success}</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleProvision}
        disabled={loading}
        className="btn-admin text-xs py-1 px-2.5 inline-flex items-center gap-1"
      >
        {loading ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Provisioning...</>
        ) : (
          <><Rocket className="w-3 h-3" /> Provision</>
        )}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
