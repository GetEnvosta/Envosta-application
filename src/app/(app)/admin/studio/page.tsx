export const revalidate = 5;
import { getStudioProjects } from '@/services/studio';
import { ProjectList } from '@/components/studio/project-list';

export default async function StudioPage() {
  const projects = await getStudioProjects();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Studio</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Design WordPress websites with AI. Create projects, style them, generate pages, and export production-ready themes.
        </p>
      </div>
      <ProjectList initialProjects={projects} />
    </div>
  );
}
