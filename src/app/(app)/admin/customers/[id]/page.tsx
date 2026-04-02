export const dynamic = 'force-dynamic';

import { getCustomerById, getCustomerRelatedData } from '@/services/admin';
import { formatDate, formatDateTime, formatCents, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { QuickInvoice } from '@/components/admin/quick-invoice';
import { ProvisionSiteButton } from '@/components/admin/provision-site-button';
import {
  ArrowLeft, Building2, Clock, CreditCard, ExternalLink, Globe,
  Mail, Phone, Server, Shield, User, FileText, Download, Layers,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { services, domains, subscriptions, invoices, logs } = await getCustomerRelatedData(user.id);

  // Split subscriptions: hosting vs domain
  const hostingSubs = subscriptions.filter((s: any) => s.products?.type === 'hosting_plan' || (!s.products?.type && !((s.metadata as any)?.type === 'domain_renewal')));
  const domainSubs = subscriptions.filter((s: any) => s.products?.type === 'domain_tld' || (s.metadata as any)?.type === 'domain_renewal');

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      {/* ── Customer Overview ── */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4 mb-5">
          <Avatar name={user.full_name || user.email} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">{user.full_name || 'Unnamed'}</h1>
              <span className={user.role === 'admin' ? 'badge-indigo' : 'badge-gray'}>{user.role}</span>
            </div>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          {user.stripe_customer_id && (
            <a href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`} target="_blank" rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0">
              <ExternalLink className="w-3 h-3" /> Stripe
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <InfoPill icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} />
          {user.company_name && <InfoPill icon={<Building2 className="w-3.5 h-3.5" />} label="Company" value={user.company_name} />}
          {user.phone && <InfoPill icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={user.phone} />}
          {user.timezone && <InfoPill icon={<Clock className="w-3.5 h-3.5" />} label="Timezone" value={user.timezone} />}
          <InfoPill icon={<Shield className="w-3.5 h-3.5" />} label="Joined" value={formatDate(user.created_at)} />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <CountPill label="Sites" count={services.length} />
          <CountPill label="Domains" count={domains.length} />
          <CountPill label="Subscriptions" count={subscriptions.length} />
          <CountPill label="Invoices" count={invoices.length} />
        </div>
      </div>

      {/* ── Quick Invoice ── */}
      {user.stripe_customer_id && (
        <div className="mb-6">
          <QuickInvoice stripeCustomerId={user.stripe_customer_id} customerName={user.full_name || user.email} />
        </div>
      )}

      {/* ── Hosting Subscriptions ── */}
      {hostingSubs.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Hosting Subscriptions ({hostingSubs.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {hostingSubs.map((sub: any) => {
              const linkedSite = services.find((s: any) => s.subscription_id === sub.id);
              return (
                <div key={sub.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sub.products?.name ?? 'Unknown plan'}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={statusColor(sub.status)}>{sub.status}</span>
                        {sub.billing_period && <span className="text-xs text-gray-400">{sub.billing_period}</span>}
                        {linkedSite ? (
                          <Link href={`/admin/services/${linkedSite.id}`} className="text-xs text-admin-600 hover:text-admin-700 inline-flex items-center gap-1">
                            <Server className="w-3 h-3" /> {linkedSite.label}
                          </Link>
                        ) : (
                          <span className="text-xs text-amber-600">No site linked</span>
                        )}
                      </div>
                    </div>
                    {!linkedSite && (sub.status === 'active' || sub.status === 'trialing') && (
                      <ProvisionSiteButton subscriptionId={sub.id} userId={user.id} planId={sub.product_id} planName={sub.products?.name ?? 'Unknown'} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Domain Subscriptions ── */}
      {domainSubs.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Domain Subscriptions ({domainSubs.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {domainSubs.map((sub: any) => {
              const domainName = (sub.metadata as any)?.domain_name;
              const linkedDomain = domainName ? domains.find((d: any) => d.domain_name === domainName) : null;
              return (
                <div key={sub.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{domainName ?? sub.products?.name ?? 'Domain renewal'}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={statusColor(sub.status)}>{sub.status}</span>
                        {sub.billing_period && <span className="text-xs text-gray-400">{sub.billing_period}</span>}
                        {linkedDomain && <span className="text-xs text-gray-500">Exp {formatDate(linkedDomain.expires_at)}</span>}
                        {linkedDomain?.auto_renew === false && <span className="text-xs text-amber-600">Auto-renew off</span>}
                      </div>
                    </div>
                    {sub.stripe_subscription_id && (
                      <a href={`https://dashboard.stripe.com/subscriptions/${sub.stripe_subscription_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-admin-600 font-mono">{sub.stripe_subscription_id.slice(-8)}</a>
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
                        <Link href={`/admin/services/${s.id}`} className="text-sm font-medium text-admin-600 hover:text-admin-700">{s.label}</Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{s.products?.name ?? '\u2014'}</span>
                          {siteDomain && <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Globe className="w-3 h-3" /> {siteDomain.domain_name}</span>}
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
                          {linkedSite && <Link href={`/admin/services/${linkedSite.id}`} className="text-xs text-admin-600 hover:text-admin-700 inline-flex items-center gap-1"><Server className="w-3 h-3" /> {linkedSite.label}</Link>}
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

      {/* ── Invoices ── */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Invoices ({invoices.length})</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No invoices.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => {
                  const meta = (inv.metadata as any) ?? {};
                  const pdfUrl = meta.invoice_pdf ?? null;
                  const viewUrl = inv.hosted_invoice_url ?? null;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(inv.created_at)}</td>
                      <td className="px-5 py-3 text-gray-900">{inv.description || meta.description || 'Invoice'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{formatCents(inv.amount_cad ?? 0, 'cad')}</td>
                      <td className="px-5 py-3"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-admin-600 hover:text-admin-700 inline-flex items-center gap-1 text-xs font-medium"><Download className="w-3 h-3" /> PDF</a>}
                          {viewUrl && <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 text-xs"><FileText className="w-3 h-3" /> View</a>}
                          {!pdfUrl && !viewUrl && <span className="text-gray-400">&mdash;</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Activity ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No activity recorded.</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-900">{log.action}</p>
                  <span className="text-xs text-gray-400 shrink-0 ml-4 font-mono">{formatDateTime(log.created_at)}</span>
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

function CountPill({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3.5 py-3 text-center">
      <p className="text-lg font-semibold text-gray-900">{count}</p>
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}
