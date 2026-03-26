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
      <style>{`
.blog-hero{padding:160px 0 48px;text-align:center;position:relative;overflow:hidden}
.blog-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.1),transparent 65%);pointer-events:none}
.blog-hero .c{position:relative;z-index:1}
.blog-hero h1{font-size:clamp(2.4rem,5vw,3.6rem);font-weight:600;letter-spacing:-2px;line-height:1.08;margin-bottom:16px;background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.blog-hero p{font-size:1rem;color:var(--t2);max-width:480px;margin:0 auto;line-height:1.75;font-weight:300}

.cat-tabs{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;padding:0 0 48px}
.cat-tab{padding:8px 18px;border-radius:100px;font-size:.8rem;font-weight:400;text-decoration:none;transition:all .2s;border:1px solid transparent;color:var(--t3)}
.cat-tab:hover{color:var(--t1)}
.cat-tab.active{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.12);color:#fff;font-weight:500}
.cat-tab .ct-count{font-size:.68rem;opacity:.5;margin-left:4px}

.feat-post{background:var(--card);border:1px solid var(--bdr);border-radius:20px;overflow:hidden;margin-bottom:48px;display:grid;grid-template-columns:1.1fr 1fr;gap:0;transition:all .35s;text-decoration:none;color:inherit}
.feat-post:hover{border-color:var(--bdr2);box-shadow:0 24px 48px rgba(0,0,0,.2);transform:translateY(-2px)}
.feat-img{min-height:380px;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--card2),#0f1d36)}
.feat-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;transition:transform .6s ease}
.feat-post:hover .feat-img img{transform:scale(1.03)}
.feat-body{padding:48px 44px;display:flex;flex-direction:column;justify-content:center}
.feat-body h3{font-size:clamp(1.5rem,2.2vw,2rem);font-weight:600;letter-spacing:-.8px;line-height:1.2;margin-bottom:14px;color:var(--t1)}
.feat-body p{color:var(--t2);font-size:.92rem;line-height:1.75;margin-bottom:20px;font-weight:300;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.post-meta{display:flex;align-items:center;gap:8px;font-size:.75rem;color:var(--t3);font-weight:300}
.post-meta .dot{width:3px;height:3px;border-radius:50%;background:var(--t3);opacity:.5}
.read-link{display:inline-flex;align-items:center;gap:6px;color:var(--gold);text-decoration:none;font-weight:500;font-size:.85rem;transition:gap .2s}.read-link:hover{gap:10px}

.cat-badge{display:inline-block;padding:4px 10px;border-radius:100px;font-size:.65rem;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:10px}

.post-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:48px}
.post-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;overflow:hidden;transition:all .3s;display:flex;flex-direction:column;text-decoration:none;color:inherit}
.post-card:hover{border-color:var(--bdr2);box-shadow:0 12px 32px rgba(0,0,0,.15);transform:translateY(-2px)}
.post-card:hover .pc-img img{transform:scale(1.04)}
.pc-img{height:200px;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--card2),#0f1d36)}
.pc-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;transition:transform .5s ease}
.pc-body{padding:24px 22px;flex:1;display:flex;flex-direction:column}
.pc-body h4{font-size:.95rem;font-weight:600;margin-bottom:8px;line-height:1.35;color:var(--t1);letter-spacing:-.2px}
.pc-body p{font-size:.82rem;color:var(--t2);line-height:1.7;margin-bottom:auto;padding-bottom:14px;font-weight:300;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pc-foot{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--bdr)}

.blog-empty{text-align:center;padding:80px 0 120px}
.blog-empty h2{font-size:1.6rem;font-weight:600;color:var(--t1);margin-bottom:12px}
.blog-empty p{color:var(--t2);font-size:.95rem;font-weight:300}

.cta-section{padding:0 0 100px}
.cta-box{background:var(--card);border:1px solid var(--bdr2);border-radius:20px;padding:64px 48px;text-align:center;position:relative;overflow:hidden}
.cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.08),transparent 65%);pointer-events:none}
.cta-box h2{font-size:clamp(1.5rem,3vw,2rem);font-weight:600;letter-spacing:-.8px;margin-bottom:10px;position:relative;z-index:1;color:var(--t1)}
.cta-box p{font-size:.92rem;color:var(--t2);max-width:440px;margin:0 auto 28px;font-weight:300;line-height:1.7;position:relative;z-index:1}
.nl-form{display:flex;gap:10px;max-width:420px;margin:0 auto;position:relative;z-index:1}
.nl-form input{flex:1;padding:12px 18px;background:var(--bg2);border:1px solid var(--bdr);border-radius:100px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s}
.nl-form input:focus{border-color:var(--gold)}
.nl-form input::placeholder{color:var(--t3)}

@media(max-width:1024px){.post-grid{grid-template-columns:repeat(2,1fr)}.feat-post{grid-template-columns:1fr}}
@media(max-width:768px){.post-grid{grid-template-columns:1fr}.feat-post{grid-template-columns:1fr}.feat-img{min-height:220px}.feat-body{padding:28px 24px}.feat-body h3{font-size:1.3rem}.cta-box{padding:40px 24px}.nl-form{flex-direction:column}.blog-hero{padding:120px 0 32px}.cat-tabs{gap:4px;padding:0 0 28px}.cat-tab{padding:6px 14px;font-size:.75rem}}
      `}</style>

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
