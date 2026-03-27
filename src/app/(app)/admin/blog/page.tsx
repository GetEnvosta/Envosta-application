import { getAllPosts } from '@/services/blog';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { FileText, Plus, Search } from 'lucide-react';
import { SeedBlogButton } from './seed-button';

export default async function BlogPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { q, category, status } = await searchParams;
  const allPosts = await getAllPosts();

  // Filter
  let posts = allPosts;
  if (q) {
    const query = q.toLowerCase();
    posts = posts.filter((p: any) => p.title?.toLowerCase().includes(query) || p.slug?.toLowerCase().includes(query));
  }
  if (category && category !== 'all') {
    posts = posts.filter((p: any) => p.category === category);
  }
  if (status && status !== 'all') {
    posts = posts.filter((p: any) => p.status === status);
  }

  // Get unique categories
  const categories = Array.from(new Set(allPosts.map((p: any) => p.category).filter(Boolean))) as string[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage blog content.</p>
        </div>
        <div className="flex items-center gap-2">
          <SeedBlogButton />
          <Link href="/admin/blog/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Post
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" name="q" defaultValue={q ?? ''} placeholder="Search posts..."
            className="input pl-9 w-full" />
        </div>
        <select name="category" defaultValue={category ?? ''} className="input w-auto">
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ''} className="input w-auto">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <button type="submit" className="btn-admin">Filter</button>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Published</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {q || category || status ? 'No posts match your filters.' : 'No blog posts yet.'}
                    </p>
                  </td>
                </tr>
              ) : posts.map((post: any) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/blog/${post.id}/edit`} className="text-sm font-medium text-admin-600 hover:text-admin-700">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    {post.category ? (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{post.category}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={post.status === 'published' ? 'badge-green' : 'badge-yellow'}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(post.published_at)}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/blog/${post.id}/edit`} className="btn-secondary text-xs px-3 py-1">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
