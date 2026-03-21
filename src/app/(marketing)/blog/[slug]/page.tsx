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
    publisher: {
      '@type': 'Organization',
      name: 'Envosta',
      url: 'https://envosta.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://envosta.com/blog/${post.slug}`,
    },
  };

  return (
    <>
      <style>{`
/* ── Post Hero ── */
.post-hero{padding:140px 0 0;position:relative;overflow:hidden}
.post-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
.post-hero .c{position:relative;z-index:1}
.post-hero-inner{max-width:780px;margin:0 auto;text-align:center}
.post-breadcrumb{display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:24px;font-size:.78rem;color:var(--t3);font-weight:300}
.post-breadcrumb a{color:var(--t3);text-decoration:none;transition:color .2s}
.post-breadcrumb a:hover{color:var(--t1)}
.post-breadcrumb .sep{opacity:.5}
.post-hero-cat{display:inline-block;padding:5px 16px;background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;margin-bottom:20px}
.post-hero h1{font-size:clamp(2rem,4.5vw,3.2rem);font-weight:500;letter-spacing:-1.5px;line-height:1.12;margin-bottom:20px;color:var(--t1)}
.post-hero-excerpt{font-size:1.05rem;color:var(--t2);max-width:600px;margin:0 auto 28px;line-height:1.75;font-weight:300}

/* ── Author & Meta Row ── */
.post-author-row{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:40px;flex-wrap:wrap}
.post-author{display:flex;align-items:center;gap:10px}
.post-author-avatar{width:36px;height:36px;border-radius:50%;background:var(--card2);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-size:.7rem;color:var(--t3);font-weight:500}
.post-author-info{text-align:left}
.post-author-name{font-size:.82rem;font-weight:500;color:var(--t1)}
.post-author-role{font-size:.72rem;color:var(--t3);font-weight:300}
.meta-divider{width:1px;height:24px;background:var(--bdr2)}
.post-hero-meta{display:flex;align-items:center;gap:12px;font-size:.78rem;color:var(--t3);font-weight:300}
.post-meta-dot{width:3px;height:3px;border-radius:50%;background:var(--t3)}

/* ── Featured Image ── */
.post-featured-img{max-width:960px;margin:0 auto 0;border-radius:16px;overflow:hidden;border:1px solid var(--bdr)}
.post-featured-img img{width:100%;height:auto;display:block}
.post-featured-img-inner{background:linear-gradient(135deg,var(--card2),#111d38);min-height:420px;display:flex;align-items:center;justify-content:center;position:relative}
.post-featured-img-inner .img-placeholder{font-size:5rem;opacity:.08}

/* ── Article Content Layout (3-column) ── */
.post-content-wrap{padding:64px 0 80px}
.post-layout{display:grid;grid-template-columns:1fr minmax(0,720px) 1fr;gap:0}
.post-sidebar-left{position:relative}
.post-sidebar-right{position:relative}

/* ── Sticky Share Bar ── */
.share-bar{position:sticky;top:100px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;padding-right:40px;padding-top:4px}
.share-label{font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);font-weight:500;margin-bottom:4px}
.share-btn{width:36px;height:36px;border-radius:10px;background:var(--card);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;color:var(--t3);text-decoration:none;font-size:.82rem;transition:all .2s;cursor:pointer}
.share-btn:hover{border-color:var(--bdr2);color:var(--t1);background:var(--card2)}

/* ── Sticky TOC ── */
.toc{position:sticky;top:100px;padding-left:40px;padding-top:4px}
.toc-label{font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);font-weight:500;margin-bottom:12px}
.toc-list{list-style:none;display:flex;flex-direction:column;gap:0;padding:0;margin:0}
.toc-list a{display:block;padding:6px 0 6px 14px;font-size:.78rem;color:var(--t3);text-decoration:none;border-left:1px solid var(--bdr);transition:all .2s;font-weight:300;line-height:1.5}
.toc-list a:hover,.toc-list a.active{color:var(--t1);border-left-color:var(--gold)}

/* ── Article Body ── */
.post-body{max-width:720px}
.post-body h2{font-size:1.6rem;font-weight:500;letter-spacing:-.5px;line-height:1.2;margin:48px 0 16px;color:var(--t1);scroll-margin-top:90px}
.post-body h3{font-size:1.2rem;font-weight:500;letter-spacing:-.3px;line-height:1.3;margin:36px 0 12px;color:var(--t1);scroll-margin-top:90px}
.post-body p{font-size:.95rem;color:var(--t2);line-height:1.85;margin-bottom:20px;font-weight:300}
.post-body a{color:var(--gold-bright);text-decoration:underline;text-underline-offset:3px;transition:color .2s}
.post-body a:hover{color:#fff}
.post-body strong{color:var(--t1);font-weight:500}
.post-body ul,.post-body ol{margin:0 0 20px 20px;color:var(--t2);font-size:.95rem;font-weight:300;line-height:1.85}
.post-body li{margin-bottom:8px}
.post-body blockquote{margin:32px 0;padding:20px 24px;background:var(--card);border-left:3px solid var(--gold);border-radius:0 12px 12px 0;font-size:.95rem;color:var(--t2);line-height:1.8;font-weight:300;font-style:italic}
.post-body blockquote p{margin-bottom:0}
.post-body code{background:var(--card);padding:2px 8px;border-radius:6px;font-size:.84rem;color:var(--gold-bright);font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace}
.post-body pre{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:20px 24px;margin:24px 0;overflow-x:auto}
.post-body pre code{background:none;padding:0;font-size:.82rem;color:var(--t2);line-height:1.7}
.post-body img{width:100%;border-radius:12px;margin:32px 0;border:1px solid var(--bdr)}
.post-body hr{border:none;border-top:1px solid var(--bdr);margin:40px 0}

/* ── Callout Box ── */
.callout{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:24px 28px;margin:32px 0;display:flex;gap:14px;align-items:flex-start}
.callout-icon{font-size:1.1rem;flex-shrink:0;line-height:1.7}
.callout-body{font-size:.88rem;color:var(--t2);line-height:1.75;font-weight:300}
.callout-body strong{color:var(--t1);font-weight:500}

/* ── Post Tags ── */
.post-tags{display:flex;flex-wrap:wrap;gap:8px;margin:48px 0 0;padding-top:32px;border-top:1px solid var(--bdr)}
.post-tag{padding:5px 16px;background:var(--card);border:1px solid var(--bdr);border-radius:100px;font-size:.75rem;color:var(--t2);text-decoration:none;transition:all .2s;font-weight:400}
.post-tag:hover{border-color:var(--bdr2);color:var(--t1)}

/* ── Author Card ── */
.author-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:32px;margin:48px 0 0;display:flex;gap:20px;align-items:flex-start}
.author-card-avatar{width:56px;height:56px;border-radius:50%;background:var(--card2);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-size:.88rem;color:var(--t3);font-weight:500;flex-shrink:0}
.author-card-body h4{font-size:.95rem;font-weight:500;color:var(--t1);margin-bottom:2px}
.author-card-body .author-card-role{font-size:.75rem;color:var(--gold);font-weight:400;margin-bottom:10px}
.author-card-body p{font-size:.84rem;color:var(--t2);line-height:1.7;font-weight:300;margin:0}

/* ── Related Posts ── */
.related-section{padding:0 0 100px}
.sec-header{text-align:center;margin-bottom:56px}
.sec-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.sec-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:520px;margin:0 auto;line-height:1.75}
.post-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:0}
.post-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;overflow:hidden;transition:transform .3s,border-color .3s;display:flex;flex-direction:column;text-decoration:none;color:inherit}
.post-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
.post-card-img{height:200px;background:linear-gradient(135deg,var(--card2),#111d38);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.post-card-img img{width:100%;height:100%;object-fit:cover}
.post-card-img .post-cat-badge{position:absolute;top:14px;left:14px;background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase}
.post-card-img-icon{font-size:2.5rem;opacity:.08}
.post-card-body{padding:28px 24px;flex:1;display:flex;flex-direction:column}
.post-card-body .post-cat{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:8px}
.post-card-body h4{font-size:1rem;font-weight:500;margin-bottom:8px;line-height:1.3}
.post-card-body p{font-size:.84rem;color:var(--t2);line-height:1.7;margin-bottom:auto;padding-bottom:16px;font-weight:300}
.post-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--bdr)}
.post-card-footer .post-meta{display:flex;align-items:center;gap:12px;font-size:.72rem;color:var(--t3);font-weight:300}
.post-card-footer .read-link{font-size:.84rem}
.read-link{display:inline-flex;align-items:center;gap:6px;color:var(--gold);text-decoration:none;font-weight:500;font-size:.88rem;transition:gap .2s}
.read-link:hover{gap:10px}

/* ── Newsletter CTA ── */
.cta-section{padding:0 0 100px}
.cta-box{background:var(--card);border:1px solid var(--gold);border-radius:20px;padding:64px 48px;text-align:center;position:relative;overflow:hidden}
.cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.1),transparent 65%);pointer-events:none}
.cta-box h2{font-size:clamp(1.8rem,3.5vw,2.4rem);font-weight:500;letter-spacing:-1px;margin-bottom:14px;position:relative;z-index:1}
.cta-box p{font-size:.95rem;color:var(--t2);max-width:460px;margin:0 auto 32px;font-weight:300;line-height:1.75;position:relative;z-index:1}
.nl-form{display:flex;gap:10px;max-width:440px;margin:0 auto;position:relative;z-index:1}
.nl-form input{flex:1;padding:12px 18px;background:var(--bg2);border:1px solid var(--bdr);border-radius:100px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s}
.nl-form input:focus{border-color:var(--gold)}
.nl-form input::placeholder{color:var(--t3)}
.nl-form .bp{white-space:nowrap}

/* ── Responsive ── */
@media(max-width:1200px){
.post-layout{grid-template-columns:0 minmax(0,720px) 0}
.share-bar,.toc{display:none}
.post-layout{max-width:720px;margin:0 auto;display:block}
}
@media(max-width:1024px){
.post-grid{grid-template-columns:repeat(3,1fr);gap:14px}
}
@media(max-width:768px){
.post-grid{grid-template-columns:1fr}
.cta-box{padding:40px 24px}
.nl-form{flex-direction:column}
.post-hero{padding:110px 0 0}
.post-hero h1{font-size:clamp(1.6rem,6vw,2.2rem)}
.post-featured-img-inner{min-height:220px}
.post-content-wrap{padding:40px 0 60px}
.post-body h2{margin-top:36px}
.author-card{flex-direction:column;align-items:center;text-align:center}
}
      `}</style>

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
