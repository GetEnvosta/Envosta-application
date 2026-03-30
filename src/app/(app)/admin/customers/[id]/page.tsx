export const dynamic = 'force-dynamic';

import { getCustomerById, getCustomerRelatedData } from '@/services/admin';
import { formatDate, formatDateTime, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { QuickInvoice } from '@/components/admin/quick-invoice';
import { ProvisionSiteButton } from '@/components/admin/provision-site-button';
import {
  ArrowLeft,
  Building2,
  Clock,
  CreditCard,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  Server,
  Shield,
  User,
} from 'lucide-react';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCustomerById(id);

  if (!user) {
    return (
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
        <div className="card p-12 text-center">
          <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Customer not found.</p>
        </div>
      </div>
    );
  }

  const { services, domains, subscriptions, logs } = await getCustomerRelatedData(user.id);

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      {/* ── Customer Overview ── */}
      <div className="card p-6 mb-6">
        {/* Profile header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-admin-100 text-admin-700 flex items-center justify-center text-lg font-semibold shrink-0">
            {(user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">{user.full_name || 'Unnamed'}</h1>
              <span className={user.role === 'admin' ? 'badge-indigo' : 'badge-gray'}>{user.role}</span>
            </div>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          {user.stripe_customer_id && (
            <a
              href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0"
            >
              <ExternalLink className="w-3 h-3" /> Stripe
            </a>
          )}
        </div>

        {/* Info pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <InfoPill icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} />
          {user.company_name && <InfoPill icon={<Building2 className="w-3.5 h-3.5" />} label="Company" value={user.company_name} />}
          {user.phone && <InfoPill icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={user.phone} />}
          {user.timezone && <InfoPill icon={<Clock className="w-3.5 h-3.5" />} label="Timezone" value={user.timezone} />}
          <InfoPill icon={<Shield className="w-3.5 h-3.5" />} label="Joined" value={formatDate(user.created_at)} />
        </div>

        {/* Quick counts */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-50 px-3.5 py-3 text-center">
            <p className="text-lg font-semibold text-gray-900">{services.length}</p>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Sites</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3.5 py-3 text-center">
            <p className="text-lg font-semibold text-gray-900">{domains.length}</p>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Domains</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3.5 py-3 text-center">
            <p className="text-lg font-semibold text-gray-900">{subscriptions.length}</p>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Subscriptions</p>
          </div>
        </div>
      </div>

      {/* ── Quick Invoice ── */}
      {user.stripe_customer_id && (
        <div className="mb-6">
          <QuickInvoice stripeCustomerId={user.stripe_customer_id} customerName={user.full_name || user.email} />
        </div>
      )}

      {/* ── Subscriptions ── */}
      {subscriptions.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Subscriptions ({subscriptions.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {subscriptions.map((sub: any) => {
              const linkedSite = services.find((s: any) => s.subscription_id === sub.id);
              const linkedDomain = domains.find((d: any) =>
                (d.metadata as any)?.renewal_stripe_subscription_id === sub.stripe_subscription_id
              );
              return (
                <div key={sub.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sub.products?.name ?? 'Unknown plan'}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={statusColor(sub.status)}>{sub.status}</span>
                        {sub.billing_period && <span className="text-xs text-gray-400">{sub.billing_period}</span>}
                        {linkedSite && (
                          <Link href={`/admin/services/${linkedSite.id}`} className="text-xs text-admin-600 hover:text-admin-700 inline-flex items-center gap-1">
                            <Server className="w-3 h-3" /> {linkedSite.label}
                          </Link>
                        )}
                        {linkedDomain && (
                          <span className="text-xs text-gray-600 inline-flex items-center gap-1">
                            <Globe className="w-3 h-3 text-gray-400" /> {linkedDomain.domain_name}
                          </span>
                        )}
                        {!linkedSite && !linkedDomain && (
                          <span className="text-xs text-amber-600">Not linked</span>
                        )}
                      </div>
                    </div>
                    {!linkedSite && !linkedDomain && (sub.status === 'active' || sub.status === 'trialing') && (
                      <ProvisionSiteButton
                        subscriptionId={sub.id}
                        userId={user.id}
                        planId={sub.product_id}
                        planName={sub.products?.name ?? 'Unknown'}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sites & Domains ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sites */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Sites ({services.length})</h2>
          </div>
          {services.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No sites.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {services.map((s: any) => {
                const siteDomain = domains.find((d: any) => d.site_id === s.id);
                return (
                  <div key={s.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/admin/services/${s.id}`} className="text-sm font-medium text-admin-600 hover:text-admin-700">
                          {s.label}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{s.products?.name ?? '\u2014'}</span>
                          {siteDomain && (
                            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {siteDomain.domain_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={statusColor(s.status)}>{s.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Domains */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Domains ({domains.length})</h2>
          </div>
          {domains.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No domains.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {domains.map((d: any) => {
                const linkedSite = services.find((s: any) => s.id === d.site_id);
                return (
                  <div key={d.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{d.domain_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {linkedSite && (
                            <Link href={`/admin/services/${linkedSite.id}`} className="text-xs text-admin-600 hover:text-admin-700 inline-flex items-center gap-1">
                              <Server className="w-3 h-3" /> {linkedSite.label}
                            </Link>
                          )}
                          {d.expires_at && <span className="text-xs text-gray-400">Exp {formatDate(d.expires_at)}</span>}
                          {d.auto_renew === false && <span className="text-xs text-amber-600">Auto-renew off</span>}
                        </div>
                      </div>
                      <span className={statusColor(d.status)}>{d.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No activity recorded.</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <span className="text-xs text-gray-400 shrink-0 ml-4">{formatDateTime(log.created_at)}</span>
                </div>
                {log.message && <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
