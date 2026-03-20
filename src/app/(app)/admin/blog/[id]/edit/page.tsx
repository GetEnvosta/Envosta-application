'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [tags, setTags] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !data) {
        setError('Post not found.');
        setLoading(false);
        return;
      }

      setTitle(data.title ?? '');
      setSlug(data.slug ?? '');
      setContent(data.content ?? '');
      setExcerpt(data.excerpt ?? '');
      setFeaturedImageUrl(data.featured_image_url ?? '');
      setTags(Array.isArray(data.tags) ? data.tags.join(', ') : '');
      setMetaTitle(data.meta_title ?? '');
      setMetaDescription(data.meta_description ?? '');
      setStatus(data.status ?? 'draft');
      setPublishedAt(data.published_at ?? null);
      setLoading(false);
    }
    fetchPost();
  }, [id]);

  function handleTitleChange(value: string) {
    setTitle(value);
    setSlug(generateSlug(value));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const supabase = createClient();

    const tagsArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const postData: any = {
      title,
      slug,
      content,
      excerpt: excerpt || null,
      featured_image_url: featuredImageUrl || null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      status,
    };

    if (status === 'published' && !publishedAt) {
      postData.published_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update(postData)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.push('/admin/blog');
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    router.push('/admin/blog');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading post...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/blog"
          className="text-sm text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Blog
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Edit Post</h1>
            <p className="text-sm text-gray-500 mt-0.5">Update this blog post.</p>
          </div>
          <button onClick={handleDelete} className="btn-danger inline-flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="card p-5 space-y-5">
        <div>
          <label className="label">Title</label>
          <input
            type="text"
            className="input w-full"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Slug</label>
          <input
            type="text"
            className="input w-full"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Content</label>
          <textarea
            className="input w-full min-h-[200px]"
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Excerpt</label>
          <textarea
            className="input w-full min-h-[80px]"
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Featured Image URL</label>
          <input
            type="text"
            className="input w-full"
            value={featuredImageUrl}
            onChange={e => setFeaturedImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="label">Tags (comma-separated)</label>
          <input
            type="text"
            className="input w-full"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="web hosting, tutorials, updates"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label">Meta Title</label>
            <input
              type="text"
              className="input w-full"
              value={metaTitle}
              onChange={e => setMetaTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Meta Description</label>
            <textarea
              className="input w-full min-h-[80px]"
              value={metaDescription}
              onChange={e => setMetaDescription(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Status</label>
          <select
            className="input w-full"
            value={status}
            onChange={e => setStatus(e.target.value as 'draft' | 'published')}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href="/admin/blog" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
