import { Suspense } from 'react';
import { BuyDomainFlow } from './buy-domain-flow';

export const metadata = {
  title: 'Register Domain | Envosta',
  description: 'Register your domain name with free WHOIS privacy and easy DNS management.',
};

export default function BuyDomainPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <BuyDomainFlow />
    </Suspense>
  );
}
