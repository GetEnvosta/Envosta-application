import { redirect } from 'next/navigation';

export default function DomainPricingRedirect() {
  redirect('/admin/products/domains');
}
