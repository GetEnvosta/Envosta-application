import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getPostMetaBySlug, getRelatedPosts } from '@/services/blog';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostMetaBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || '';

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://envosta.com/blog/${post.slug}`,
      ...(post.featured_image_url && {
        images: [{ url: post.featured_image_url, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(post.featured_image_url && { images: [post.featured_image_url] }),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const [post, relatedPosts] = await Promise.all([
    getPostBySlug(slug),
    getRelatedPosts(slug, 3),
  ]);

  if (!post) {
    notFound();
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || '',
    image: post.featured_image_url || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      '@type': 'Person',
      name: (post as any).author || 'Envosta Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Envosta',
      url: 'https://envosta.com',
      logo: { '@type': 'ImageObject', url: 'https://envosta.com/assets/Logo/envosta-logo-mark-dark.svg' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://envosta.com/blog/${post.slug}`,
    },
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* POST HERO */}
      <section className="post-hero">
        <div className="c">
          <div className="post-hero-inner">

            <div className="post-breadcrumb">
              <Link href="/blog">Blog</Link>
              <span className="sep">&rarr;</span>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span>{post.tags[0]}</span>
                  <span className="sep">&rarr;</span>
                </>
              )}
              <span>{post.title.length > 40 ? post.title.slice(0, 40) + '\u2026' : post.title}</span>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="post-hero-cat">{post.tags[0]}</div>
            )}
            <h1>{post.title}</h1>
            {post.excerpt && <p className="post-hero-excerpt">{post.excerpt}</p>}

            <div className="post-author-row">
              {post.author && (
                <>
                  <div className="post-author">
                    <div className="post-author-avatar">
                      {post.author.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="post-author-info">
                      <div className="post-author-name">{post.author}</div>
                    </div>
                  </div>
                  <div className="meta-divider"></div>
                </>
              )}
              <div className="post-hero-meta">
                <span>{formatDate(post.published_at)}</span>
              </div>
            </div>

          </div>

          {/* Featured Image */}
          <div className="post-featured-img">
            {post.featured_image_url ? (
              <img src={post.featured_image_url} alt={post.title} />
            ) : (
              <div className="post-featured-img-inner">
                <div className="img-placeholder"></div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ARTICLE CONTENT (3-column layout) */}
      <section className="post-content-wrap">
        <div className="c">
          <div className="post-layout">

            {/* Left Sidebar: Share Bar */}
            <div className="post-sidebar-left">
              <div className="share-bar">
                <div className="share-label">Share</div>
                <a
                  href={`https://twitter.com/intent/tweet?url=https://envosta.com/blog/${post.slug}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn"
                  aria-label="Share on Twitter"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=https://envosta.com/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn"
                  aria-label="Share on LinkedIn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <button
                  className="share-btn"
                  aria-label="Copy link"
                  onClick={undefined}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
              </div>
            </div>

            {/* Article Body */}
            <article className="post-body">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />

              {/* Post Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="post-tags">
                  {post.tags.map((tag: string) => (
                    <span key={tag} className="post-tag">{tag}</span>
                  ))}
                </div>
              )}

              {/* Author Card */}
              {post.author && (
                <div className="author-card">
                  <div className="author-card-avatar">
                    {post.author.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="author-card-body">
                    <h4>{post.author}</h4>
                    <p>Author at Envosta</p>
                  </div>
                </div>
              )}
            </article>

            {/* Right Sidebar: Table of Contents */}
            <div className="post-sidebar-right">
              <div className="toc">
                <div className="toc-label">Contents</div>
                <ul className="toc-list">
                  {/* TOC is populated client-side or can be enhanced later */}
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* RELATED POSTS */}
      {relatedPosts && relatedPosts.length > 0 && (
        <section className="related-section">
          <div className="c">
            <div className="sec-header">
              <h2>Related articles</h2>
              <p>Keep reading for more insights and guides from the Envosta blog.</p>
            </div>

            <div className="post-grid">
              {relatedPosts.map((rp) => (
                <Link href={`/blog/${rp.slug}`} key={rp.slug} className="post-card">
                  <div className="post-card-img">
                    {rp.featured_image_url ? (
                      <img src={rp.featured_image_url} alt={rp.title} />
                    ) : (
                      <div className="post-card-img-icon"></div>
                    )}
                    {rp.tags && rp.tags.length > 0 && (
                      <div className="post-cat-badge">{rp.tags[0]}</div>
                    )}
                  </div>
                  <div className="post-card-body">
                    {rp.tags && rp.tags.length > 0 && (
                      <div className="post-cat">{rp.tags[0]}</div>
                    )}
                    <h4>{rp.title}</h4>
                    {rp.excerpt && <p>{rp.excerpt.length > 120 ? rp.excerpt.slice(0, 120) + '\u2026' : rp.excerpt}</p>}
                    <div className="post-card-footer">
                      <div className="post-meta">
                        <span>{formatDate(rp.published_at)}</span>
                      </div>
                      <span className="read-link">Read &rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* NEWSLETTER CTA */}
      <section className="cta-section">
        <div className="c">
          <div className="cta-box">
            <h2>Get marketing tips delivered to your inbox</h2>
            <p>Join 2,400+ business owners who get our weekly WordPress tips, security updates, and performance guides.</p>
            <div className="nl-form">
              <input type="email" placeholder="you@company.com" />
              <button className="bp blue">Subscribe</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
