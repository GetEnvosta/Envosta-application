import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase-server';
import { activeIndustries } from '@/config/industries';

/**
 * Sitemap — hosting-first IA (rebuild brief Phase 2.8).
 * Hidden routes (the Minimum plan, internal flows) are never listed.
 * Industry/city pages come from config: adding an industry updates the
 * sitemap with zero code changes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://envosta.com';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/plans`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/industries`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/scorecard`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/service-promise`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/stack`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/support`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/careers`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/legal/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/legal/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/legal/cookies`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/legal/gdpr`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Per-industry city landing pages (launch metro; grows with config).
  const industryPages: MetadataRoute.Sitemap = activeIndustries().map((i) => ({
    url: `${baseUrl}/${i.slug}/calgary`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Published blog posts.
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, published_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (posts) {
      blogPages = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updated_at || post.published_at),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }));
    }
  } catch {
    // If Supabase fetch fails, continue with static pages only
  }

  return [...staticPages, ...industryPages, ...blogPages];
}
