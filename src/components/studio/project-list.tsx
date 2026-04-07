'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Paintbrush, FileText, Trash2, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';

export function ProjectList({ initialProjects }: { initialProjects: any[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await supabase
      .from('studio_projects')
      .insert({ name: name.trim(), slug, created_by: user.id })
      .select('id')
      .single();

    if (data) {
      router.push(`/admin/studio/${data.id}`);
    } else {
      alert(error?.message || 'Failed to create project');
      setCreating(false);
    }
  }

  async function handleDelete(id: string, projectName: string) {
    if (!confirm(`Delete "${projectName}" and all its pages? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from('studio_projects').delete().eq('id', id);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* New project card */}
        <button
          onClick={() => setShowCreate(true)}
          className="card p-5 border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-3 min-h-[140px] cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-600">New Project</span>
        </button>

        {/* Project cards */}
        {initialProjects.map((project: any) => (
          <div key={project.id} className="card p-5 hover:shadow-md transition-all group relative">
            <Link href={`/admin/studio/${project.id}`} className="block">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Paintbrush className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{project.name}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {project.page_count} {project.page_count === 1 ? 'page' : 'pages'}
                </span>
                <span>{formatDate(project.updated_at)}</span>
              </div>
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.name); }}
              className="absolute top-3 right-3 p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setName(''); }} title="New Studio Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="Calgary Plumbing Co"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowCreate(false); setName(''); }} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
