'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function NewBlogPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('wordpress-news');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

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
      category,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      status,
    };

    if (status === 'published') {
      postData.published_at = new Date().toISOString();
    }

    const { error: insertError } = await supabase
      .from('blog_posts')
      .insert(postData);

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push('/admin/blog');
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
        <h1 className="text-xl font-semibold text-gray-900">New Blog Post</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new blog post.</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input w-full" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="wordpress-news">WordPress News &amp; Tips</option>
              <option value="website-design">Website Design</option>
              <option value="business-growth">Business Growth</option>
            </select>
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
            {saving ? 'Saving...' : 'Create Post'}
          </button>
          <Link href="/admin/blog" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
