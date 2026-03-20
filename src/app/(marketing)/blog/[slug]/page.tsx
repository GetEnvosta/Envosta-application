import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, meta_title, meta_description, featured_image, slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

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
      ...(post.featured_image && {
        images: [{ url: post.featured_image, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(post.featured_image && { images: [post.featured_image] }),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

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
    image: post.featured_image || undefined,
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
/* Post Hero */
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
.post-hero-meta{display:flex;align-items:center;justify-content:center;gap:12px;font-size:.78rem;color:var(--t3);font-weight:300;margin-bottom:40px}
.post-meta-dot{width:3px;height:3px;border-radius:50%;background:var(--t3)}

/* Featured Image */
.post-featured-img{max-width:960px;margin:0 auto;border-radius:16px;overflow:hidden;border:1px solid var(--bdr)}
.post-featured-img img{width:100%;height:auto;display:block}
.post-featured-img-placeholder{background:linear-gradient(135deg,var(--card2),#111d38);min-height:420px;display:flex;align-items:center;justify-content:center}

/* Article Content */
.post-content-wrap{padding:64px 0 80px}
.post-body{max-width:720px;margin:0 auto}
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

/* Post Tags */
.post-tags{display:flex;flex-wrap:wrap;gap:8px;margin:48px 0 0;padding-top:32px;border-top:1px solid var(--bdr)}
.post-tag{padding:5px 16px;background:var(--card);border:1px solid var(--bdr);border-radius:100px;font-size:.75rem;color:var(--t2);text-decoration:none;transition:all .2s;font-weight:400}
.post-tag:hover{border-color:var(--bdr2);color:var(--t1)}

/* Back link */
.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--t3);text-decoration:none;font-size:.84rem;font-weight:400;transition:color .2s;margin-bottom:24px}
.back-link:hover{color:var(--t1)}

/* Newsletter CTA */
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

/* Responsive */
@media(max-width:768px){
.cta-box{padding:40px 24px}
.nl-form{flex-direction:column}
.post-hero{padding:110px 0 0}
.post-hero h1{font-size:clamp(1.6rem,6vw,2.2rem)}
.post-featured-img-placeholder{min-height:220px}
.post-content-wrap{padding:40px 0 60px}
.post-body h2{margin-top:36px}
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
              <span>{post.title.length > 40 ? post.title.slice(0, 40) + '...' : post.title}</span>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="post-hero-cat">{post.tags[0]}</div>
            )}
            <h1>{post.title}</h1>
            {post.excerpt && <p className="post-hero-excerpt">{post.excerpt}</p>}

            <div className="post-hero-meta">
              <span>{formatDate(post.published_at)}</span>
            </div>
          </div>

          {/* Featured Image */}
          {post.featured_image ? (
            <div className="post-featured-img">
              <img src={post.featured_image} alt={post.title} />
            </div>
          ) : (
            <div className="post-featured-img">
              <div className="post-featured-img-placeholder" />
            </div>
          )}
        </div>
      </section>

      {/* ARTICLE CONTENT */}
      <section className="post-content-wrap">
        <div className="c">
          <article
            className="post-body"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Post Tags */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div className="post-tags">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="post-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

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
