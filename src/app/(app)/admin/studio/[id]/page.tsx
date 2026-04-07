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
    <div>
      <Link href="/admin/studio" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Studio
      </Link>
      <StudioEditor project={result.project} initialPages={result.pages} />
    </div>
  );
}
