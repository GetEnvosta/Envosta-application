export const dynamic = 'force-dynamic';

import { getAllCustomersWithUsers } from '@/services/billing';
import { InvoiceForm } from '@/components/admin/invoice-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function CustomInvoicesPage() {
  const customers = await getAllCustomersWithUsers();

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Custom Invoices</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send one-time invoices to customers for custom work, consultations, or any other charges.</p>
      </div>

      <InvoiceForm mode="full" customers={customers as any} />
    </div>
  );
}
