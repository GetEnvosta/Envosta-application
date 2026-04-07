import { createClient } from '@/lib/supabase-server';

/**
 * Get all studio projects ordered by most recent.
 */
export async function getStudioProjects() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('studio_projects')
    .select('*, studio_pages(id)')
    .order('created_at', { ascending: false });

  return (data ?? []).map((p: any) => ({
    ...p,
    page_count: Array.isArray(p.studio_pages) ? p.studio_pages.length : 0,
    studio_pages: undefined,
  }));
}

/**
 * Get a single studio project with all its pages.
 */
export async function getStudioProjectById(id: string) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (!project) return null;

  const { data: pages } = await supabase
    .from('studio_pages')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true });

  return { project, pages: pages ?? [] };
}
