/**
 * /admin/billing/invoice/new — admin tool to create a one-off invoice
 * for any customer. Moved from /admin/products/invoices during the
 * Billing+Reporting consolidation so it lives under the right domain.
 */
export const dynamic = 'force-dynamic';

import { getAllCustomersWithUsers } from '@/services/billing';
import { InvoiceForm } from '@/components/admin/invoice-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function CustomInvoicesPage() {
  const customers = await getAllCustomersWithUsers();

  return (
    <div>
      <Link href="/admin/billing" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Billing
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Custom invoice</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send a one-time invoice to a customer for custom work, consultations, or any ad-hoc charge.</p>
      </div>

      <InvoiceForm mode="full" customers={customers as any} />
    </div>
  );
}
