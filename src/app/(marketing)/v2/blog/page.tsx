import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPosts } from '@/services/blog';
import { ContactForm } from '@/components/marketing/contact-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog — WordPress Hosting Insights & Guides',
  description: 'WordPress tutorials, web design trends, ecommerce guides, and business growth strategies — written by the Envosta team.',
  alternates: { canonical: '/blog' },
};

const CATEGORIES = [
  { slug: 'all', label: 'All' },
  { slug: 'wordpress', label: 'WordPress' },
  { slug: 'design', label: 'Design' },
  { slug: 'business', label: 'Business' },
  { slug: 'ecommerce', label: 'Ecommerce' },
];

const CATEGORY_LABELS: Record<string, string> = {
  wordpress: 'WordPress',
  design: 'Design',
  business: 'Business',
  ecommerce: 'Ecommerce',
  'envosta-news': 'Envosta News',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  wordpress: { bg: 'rgba(37,99,235,.12)', text: '#60a5fa' },
  design: { bg: 'rgba(168,85,247,.12)', text: '#c084fc' },
  business: { bg: 'rgba(34,197,94,.12)', text: '#86efac' },
  ecommerce: { bg: 'rgba(251,146,60,.12)', text: '#fb923c' },
  'envosta-news': { bg: 'rgba(99,102,241,.12)', text: '#a5b4fc' },
};

function readTime(excerpt: string | null): number {
  // Estimate from excerpt length — roughly 5 min for a full article
  const len = excerpt?.length ?? 0;
  if (len > 200) return 7;
  if (len > 120) return 5;
  return 3;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.wordpress;
  return (
    <span
      className="cat-badge"
      style={{ background: color.bg, color: color.text }}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const activeCategory = params.category ?? 'all';
  const allPosts = await getPublishedPosts();
  const posts = activeCategory === 'all' ? allPosts : allPosts?.filter((p: any) => p.category === activeCategory);

  // Count per category
  const counts: Record<string, number> = { all: allPosts?.length ?? 0 };
  allPosts?.forEach((p: any) => {
    if (p.category) counts[p.category] = (counts[p.category] ?? 0) + 1;
  });

  const featuredPost = posts && posts.length > 0 ? posts[0] : null;
  const gridPosts = posts && posts.length > 1 ? posts.slice(1, 19) : []; // max 18 grid posts
  const hasMore = posts && posts.length > 19;

  return (
    <>
      {/* HERO */}
      <section className="blog-hero">
        <div className="c">
          <h1>Insights for growing online</h1>
          <p>WordPress guides, design trends, ecommerce strategies, and business growth — from the Envosta team.</p>
        </div>
      </section>

      {/* CATEGORY TABS */}
      <div className="c">
        <div className="cat-tabs">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.slug}
              href={cat.slug === 'all' ? '/blog' : `/blog?category=${cat.slug}`}
              className={`cat-tab${activeCategory === cat.slug ? ' active' : ''}`}
            >
              {cat.label}
              {counts[cat.slug] ? <span className="ct-count">{counts[cat.slug]}</span> : null}
            </Link>
          ))}
        </div>
      </div>

      {!posts || posts.length === 0 ? (
        <section className="blog-empty">
          <div className="c">
            <h2>No posts in this category yet</h2>
            <p>Check back soon — we&apos;re working on new content.</p>
          </div>
        </section>
      ) : (
        <>
          {/* FEATURED POST */}
          {featuredPost && (
            <section style={{ padding: '0 0 16px' }}>
              <div className="c">
                <Link href={`/blog/${featuredPost.slug}`} className="feat-post">
                  <div className="feat-img">
                    {featuredPost.featured_image_url && (
                      <img src={featuredPost.featured_image_url} alt={featuredPost.title} loading="eager" />
                    )}
                  </div>
                  <div className="feat-body">
                    {(featuredPost as any).category && (
                      <CategoryBadge category={(featuredPost as any).category} />
                    )}
                    <h3>{featuredPost.title}</h3>
                    {featuredPost.excerpt && <p>{featuredPost.excerpt}</p>}
                    <div className="post-meta">
                      <span>{formatDate(featuredPost.published_at)}</span>
                      <span className="dot" />
                      <span>{readTime(featuredPost.excerpt)} min read</span>
                    </div>
                    <div style={{ marginTop: 20 }}>
                      <span className="read-link">Read article &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* POST GRID */}
          {gridPosts.length > 0 && (
            <section style={{ padding: '32px 0 80px' }}>
              <div className="c">
                <div className="post-grid">
                  {gridPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="post-card">
                      <div className="pc-img">
                        {post.featured_image_url && (
                          <img src={post.featured_image_url} alt={post.title} loading="lazy" />
                        )}
                      </div>
                      <div className="pc-body">
                        {(post as any).category && (
                          <CategoryBadge category={(post as any).category} />
                        )}
                        <h4>{post.title}</h4>
                        {post.excerpt && <p>{post.excerpt}</p>}
                        <div className="pc-foot">
                          <div className="post-meta">
                            <span>{formatDate(post.published_at)}</span>
                            <span className="dot" />
                            <span>{readTime(post.excerpt)} min read</span>
                          </div>
                          <span className="read-link">Read &rarr;</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {hasMore && (
                  <div style={{ textAlign: 'center', paddingTop: 16 }}>
                    <span style={{ fontSize: '.85rem', color: 'var(--t3)', fontWeight: 300 }}>
                      Showing 19 of {posts.length} posts
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* NEWSLETTER CTA */}
      <section className="cta-section">
        <div className="c">
          <div className="cta-box">
            <h2>WordPress tips, delivered weekly</h2>
            <p>Join business owners who get hosting insights, security updates, and growth strategies every week.</p>
            <ContactForm
              minimal
              type="newsletter"
              subject="Newsletter Subscription"
              buttonText="Subscribe"
              successMessage="You're subscribed! Check your inbox."
              showMessage={false}
              showName={false}
              className="nl-form"
            />
          </div>
        </div>
      </section>
    </>
  );
}
