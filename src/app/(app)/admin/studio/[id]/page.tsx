export const dynamic = 'force-dynamic';

import { getStudioProjectById } from '@/services/studio';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StudioEditor } from './studio-editor';

export default async function StudioProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getStudioProjectById(id);
  if (!result) notFound();

  return (
    <div className="h-full flex flex-col">
      <StudioEditor project={result.project} initialPages={result.pages} />
    </div>
  );
}
