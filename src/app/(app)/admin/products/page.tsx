import { getAllPlans, getDomainPricing } from '@/services/plans';
import { formatCents } from '@/lib/utils';
import { Settings, Package, Globe, FileText, ArrowRight, CheckCircle, AlertTriangle, Zap, DollarSign, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function getAddons() {
  const { data } = await getSupabase().from('products').select('*').order('sort_order');
  return data ?? [];
}

async function getOneTimeServices() {
  const { data } = await getSupabase().from('products').select('*').order('sort_order');
  return data ?? [];
}

export default async function ProductsPage() {
  const [plans, tlds, addons, oneTimeServices] = await Promise.all([
    getAllPlans(),
    getDomainPricing(),
    getAddons(),
    getOneTimeServices(),
  ]);

  const syncedPlans = plans.filter((p: any) => p.stripe_product_id && p.stripe_price_id_monthly).length;
  const syncedTlds = tlds.filter((t: any) => t.stripe_product_id && t.stripe_price_id_yearly).length;
  const syncedAddons = addons.filter((a: any) => a.stripe_product_id && a.stripe_price_id).length;
  const syncedServices = oneTimeServices.filter((s: any) => s.stripe_product_id && s.stripe_price_id).length;
  const totalProducts = plans.length + tlds.length + addons.length + oneTimeServices.length;
  const totalSynced = syncedPlans + syncedTlds + syncedAddons + syncedServices;
  const allSynced = totalSynced === totalProducts;

  const totalMRR = plans.reduce((sum: number, p: any) => sum + (p.price_monthly ?? 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage all products, pricing, and Stripe integration.</p>
      </div>

      {/* Sync status banner */}
      <div className={`rounded-xl border p-4 mb-6 flex items-center gap-3 ${allSynced ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        {allSynced ? (
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        )}
        <div>
          <p className={`text-sm font-medium ${allSynced ? 'text-green-800' : 'text-amber-800'}`}>
            {allSynced ? 'All products synced to Stripe' : `${totalProducts - totalSynced} product${totalProducts - totalSynced === 1 ? '' : 's'} need Stripe sync`}
          </p>
          <p className={`text-xs mt-0.5 ${allSynced ? 'text-green-600' : 'text-amber-600'}`}>
            {syncedPlans}/{plans.length} plans · {syncedTlds}/{tlds.length} TLDs · {syncedAddons}/{addons.length} add-ons · {syncedServices}/{oneTimeServices.length} services
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Plans</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{plans.length}</p>
          <p className="text-xs text-gray-400">{formatCents(Math.min(...plans.map((p: any) => p.price_monthly)))} – {formatCents(Math.max(...plans.map((p: any) => p.price_monthly)))}/mo</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Domain TLDs</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{tlds.length}</p>
          <p className="text-xs text-gray-400">{tlds.filter((t: any) => t.active).length} active</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Add-ons</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{addons.length}</p>
          <p className="text-xs text-gray-400">{addons.filter((a: any) => a.is_active).length} active</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Services</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{oneTimeServices.length}</p>
          <p className="text-xs text-gray-400">{oneTimeServices.filter((s: any) => s.is_active).length} active</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Stripe Sync</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{totalSynced}/{totalProducts}</p>
          <p className={`text-xs ${allSynced ? 'text-green-500' : 'text-amber-500'}`}>{allSynced ? 'Fully synced' : 'Needs attention'}</p>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Hosting Plans */}
        <Link href="/admin/products/plans" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">Hosting Plans</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Pricing, wp.cloud resources, Stripe billing, and plan features.</p>
          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="text-gray-500">{plans.length} plans</span>
            <span className={syncedPlans === plans.length ? 'text-green-600' : 'text-amber-600'}>
              {syncedPlans}/{plans.length} synced
            </span>
          </div>
          <div className="space-y-1.5">
            {plans.map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium">{plan.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{formatCents(plan.price_monthly)}/mo</span>
                  {plan.price_yearly > 0 && <span className="text-gray-400">· {formatCents(plan.price_yearly)}/yr</span>}
                  {plan.stripe_product_id ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Link>

        {/* Domain TLDs */}
        <Link href="/admin/products/domains" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">Domain TLDs</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Registration, renewal, and transfer pricing for each TLD.</p>
          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="text-gray-500">{tlds.length} TLDs</span>
            <span className={syncedTlds === tlds.length ? 'text-green-600' : 'text-amber-600'}>
              {syncedTlds}/{tlds.length} synced
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {tlds.map((tld: any) => (
              <span key={tld.id} className={`text-xs px-2 py-0.5 rounded-full ${tld.stripe_price_id_yearly ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                .{tld.tld}
              </span>
            ))}
          </div>
        </Link>

        {/* Plan Add-ons */}
        <Link href="/admin/products/addons" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">Plan Add-ons</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Per-site infrastructure add-ons and one-time service products.</p>
          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="text-gray-500">{addons.length} product{addons.length === 1 ? '' : 's'}</span>
            <span className={syncedAddons === addons.length ? 'text-green-600' : 'text-amber-600'}>
              {syncedAddons}/{addons.length} synced
            </span>
          </div>
          {addons.length > 0 ? (
            <div className="space-y-1.5">
              {addons.map((addon: any) => (
                <div key={addon.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 font-medium">{addon.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {formatCents(addon.price_cad)}{addon.billing_type === 'monthly' ? '/mo' : addon.billing_type === 'yearly' ? '/yr' : ''}
                    </span>
                    <span className="text-gray-400 capitalize">{addon.billing_type.replace('_', '-')}</span>
                    {addon.stripe_product_id ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No add-ons configured yet.</p>
          )}
        </Link>

        {/* One-Time Services */}
        <Link href="/admin/products/services" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">One-Time Services</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Billable one-time services like Studio requests, migrations, and audits.</p>
          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="text-gray-500">{oneTimeServices.length} service{oneTimeServices.length === 1 ? '' : 's'}</span>
            <span className={syncedServices === oneTimeServices.length ? 'text-green-600' : 'text-amber-600'}>
              {syncedServices}/{oneTimeServices.length} synced
            </span>
          </div>
          {oneTimeServices.length > 0 ? (
            <div className="space-y-1.5">
              {oneTimeServices.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 font-medium">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{formatCents(s.price_cad)}</span>
                    <span className="text-gray-400">one-time</span>
                    {s.stripe_product_id ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No services configured yet.</p>
          )}
        </Link>

        {/* Custom Invoices */}
        <Link href="/admin/products/invoices" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">Custom Invoices</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Send one-time invoices for custom work, migrations, or ad-hoc charges.</p>
          <div className="space-y-1.5 text-xs text-gray-500">
            <p>Create invoices via Stripe Checkout — any amount, any description.</p>
            <p>Customer receives a payment link. No Stripe product needed.</p>
          </div>
        </Link>

      </div>
    </div>
  );
}
