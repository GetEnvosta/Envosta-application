import { createClient } from '@/lib/supabase-server';

/**
 * All published blog posts ordered by published_at desc.
 */
export async function getPublishedPosts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image_url, published_at, tags, status')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  return data ?? [];
}

/**
 * Single published post by slug.
 */
export async function getPostBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return data;
}

/**
 * Post metadata for SEO (generateMetadata).
 */
export async function getPostMetaBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('title, excerpt, meta_title, meta_description, featured_image_url, slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return data;
}

/**
 * Published posts excluding a given slug (for related posts).
 */
export async function getRelatedPosts(excludeSlug: string, limit: number = 3) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('title, slug, excerpt, featured_image_url, tags, published_at')
    .eq('status', 'published')
    .neq('slug', excludeSlug)
    .order('published_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Admin: all posts regardless of status.
 */
export async function getAllPosts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}
