import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';

export default function AddonsPage() {
  const addons = [
    {
      name: 'Studio Request',
      description: 'Design changes, new pages, plugin setup, custom features. One-time charge per request.',
      price: '$250 CAD',
      billing: 'One-time',
      status: 'Active',
      stripeStatus: 'Manual checkout',
    },
    {
      name: 'Bursting',
      description: 'Scales to 110+ PHP workers during traffic spikes. Per-site monthly add-on.',
      price: '$200 CAD/mo',
      billing: 'Monthly',
      status: 'Active',
      stripeStatus: 'Multi-item subscription',
    },
  ];

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Add-on Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage add-on products and their Stripe integration.</p>
        </div>
      </div>

      <div className="space-y-4">
        {addons.map(addon => (
          <div key={addon.name} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-admin-500 mt-0.5" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{addon.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{addon.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <span className="font-semibold text-gray-900">{addon.price}</span>
                    <span className="badge-blue">{addon.billing}</span>
                    <span className="badge-green">{addon.status}</span>
                    <span className="text-gray-400">{addon.stripeStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">
          Add-on products are managed as additional line items on site subscriptions.
          To add a new addon, create a product + recurring price in Stripe and wire it
          into the subscription update flow.
        </p>
      </div>
    </div>
  );
}
