import { Suspense } from 'react';
import { GetStartedFlow } from './get-started-flow';

export default function GetStartedPage() {
  return (
    <Suspense>
      <GetStartedFlow />
    </Suspense>
  );
}
