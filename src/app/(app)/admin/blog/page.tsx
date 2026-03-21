import { getAllPosts } from '@/services/blog';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';

export default async function BlogPostsPage() {
  const posts = await getAllPosts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create and manage blog content.
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Title
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Published
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!posts || posts.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No blog posts yet.</p>
                  </td>
                </tr>
              ) : (
                posts.map((post: any) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="text-sm font-medium text-admin-600 hover:text-admin-700"
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={post.status === 'published' ? 'badge-green' : 'badge-yellow'}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {formatDate(post.published_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/blog/${post.id}/edit`}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
