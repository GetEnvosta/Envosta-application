import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPosts } from '@/services/blog';
import { ContactForm } from '@/components/marketing/contact-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog | WordPress Hosting Insights',
  description: 'Hosting tips, WordPress guides, and expert insights for business owners — written by the Envosta team.',
  alternates: { canonical: '/blog' },
};

const CATEGORIES = [
  { slug: 'all', label: 'All Posts' },
  { slug: 'wordpress', label: 'WordPress' },
  { slug: 'design', label: 'Design' },
  { slug: 'business', label: 'Business' },
  { slug: 'ecommerce', label: 'Ecommerce' },
  { slug: 'envosta-news', label: 'Envosta News' },
];

const CATEGORY_LABELS: Record<string, string> = {
  'wordpress': 'WordPress',
  'design': 'Design',
  'business': 'Business',
  'ecommerce': 'Ecommerce',
  'envosta-news': 'Envosta News',
};

function categoryColor(cat: string): string {
  switch (cat) {
    case 'wordpress': return 'background:rgba(37,99,235,.15);color:#60a5fa';
    case 'design': return 'background:rgba(168,85,247,.15);color:#c084fc';
    case 'business': return 'background:rgba(34,197,94,.15);color:#86efac';
    case 'ecommerce': return 'background:rgba(251,146,60,.15);color:#fb923c';
    case 'envosta-news': return 'background:rgba(99,102,241,.15);color:#a5b4fc';
    default: return 'background:rgba(37,99,235,.15);color:#60a5fa';
  }
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const activeCategory = params.category ?? 'all';
  const posts = await getPublishedPosts(activeCategory === 'all' ? undefined : activeCategory);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const featuredPost = posts && posts.length > 0 ? posts[0] : null;
  const gridPosts = posts && posts.length > 1 ? posts.slice(1) : [];

  return (
    <>
      <style>{`
.blog-hero{padding:160px 0 60px;text-align:center;position:relative;overflow:hidden}
.blog-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
.blog-hero .c{position:relative;z-index:1}
.blog-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:400;letter-spacing:-1.5px;line-height:1.12;margin-bottom:16px;background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.blog-hero p{font-size:1.05rem;color:var(--t2);max-width:520px;margin:0 auto;line-height:1.75;font-weight:300}

/* Category tabs */
.cat-tabs{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;padding:0 0 48px}
.cat-tab{padding:8px 20px;border-radius:100px;font-size:.82rem;font-weight:400;text-decoration:none;transition:all .2s;border:1px solid var(--bdr2);color:var(--t2)}
.cat-tab:hover{border-color:var(--t3);color:var(--t1)}
.cat-tab.active{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#fff;font-weight:500}

/* Featured Post */
.feat-post{background:var(--card);border:1px solid var(--bdr);border-radius:20px;overflow:hidden;margin-bottom:56px;display:grid;grid-template-columns:1fr 1fr;gap:0;transition:all .3s;text-decoration:none;color:inherit}
.feat-post:hover{transform:translateY(-4px);border-color:var(--bdr2);box-shadow:0 20px 40px rgba(0,0,0,.2)}
.feat-img{background:linear-gradient(135deg,var(--card2),#111d38);min-height:360px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.feat-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.feat-body{padding:48px 40px;display:flex;flex-direction:column;justify-content:center}
.feat-body h3{font-size:clamp(1.6rem,2.5vw,2.2rem);font-weight:400;letter-spacing:-1px;line-height:1.15;margin-bottom:14px;color:var(--t1)}
.feat-body p{color:var(--t2);font-size:.95rem;line-height:1.75;margin-bottom:20px;font-weight:300}
.post-meta{display:flex;align-items:center;gap:12px;font-size:.75rem;color:var(--t3);font-weight:300}
.read-link{display:inline-flex;align-items:center;gap:6px;color:var(--gold);text-decoration:none;font-weight:500;font-size:.88rem;transition:gap .2s}.read-link:hover{gap:10px}

/* Category badge */
.cat-badge{display:inline-block;padding:4px 12px;border-radius:100px;font-size:.68rem;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:12px}

/* Post Grid */
.post-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:56px}
.post-card{background:var(--card);border:1px solid var(--bdr);border-radius:20px;overflow:hidden;transition:all .3s;display:flex;flex-direction:column;text-decoration:none;color:inherit}
.post-card:hover{transform:translateY(-4px);border-color:var(--bdr2);box-shadow:0 12px 32px rgba(0,0,0,.15)}
.post-card-img{height:200px;background:linear-gradient(135deg,var(--card2),#111d38);position:relative;overflow:hidden}
.post-card-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.post-card-body{padding:28px 24px;flex:1;display:flex;flex-direction:column}
.post-card-body h4{font-size:1rem;font-weight:500;margin-bottom:8px;line-height:1.3;color:var(--t1)}
.post-card-body p{font-size:.84rem;color:var(--t2);line-height:1.7;margin-bottom:auto;padding-bottom:16px;font-weight:300}
.post-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--bdr)}
.post-card-footer .post-meta{font-size:.72rem}
.post-card-footer .read-link{font-size:.84rem}

.blog-empty{text-align:center;padding:80px 0 120px}
.blog-empty h2{font-size:1.6rem;font-weight:400;color:var(--t1);margin-bottom:12px}
.blog-empty p{color:var(--t2);font-size:.95rem;font-weight:300}

.cta-section{padding:0 0 100px}
.cta-box{background:var(--card);border:1px solid var(--bdr2);border-radius:20px;padding:64px 48px;text-align:center;position:relative;overflow:hidden}
.cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.08),transparent 65%);pointer-events:none}
.cta-box h2{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:400;letter-spacing:-1px;margin-bottom:14px;position:relative;z-index:1}
.cta-box p{font-size:.95rem;color:var(--t2);max-width:460px;margin:0 auto 32px;font-weight:300;line-height:1.75;position:relative;z-index:1}
.nl-form{display:flex;gap:10px;max-width:440px;margin:0 auto;position:relative;z-index:1}
.nl-form input{flex:1;padding:12px 18px;background:var(--bg2);border:1px solid var(--bdr);border-radius:100px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s}
.nl-form input:focus{border-color:var(--gold)}
.nl-form input::placeholder{color:var(--t3)}

@media(max-width:1024px){.post-grid{grid-template-columns:repeat(2,1fr);gap:14px}.feat-post{grid-template-columns:1fr}}
@media(max-width:768px){.post-grid{grid-template-columns:1fr}.feat-post{grid-template-columns:1fr}.feat-img{min-height:200px}.feat-body{padding:28px 24px}.cta-box{padding:40px 24px}.nl-form{flex-direction:column}.blog-hero{padding:120px 0 32px}.cat-tabs{gap:6px;padding:0 0 32px}}
      `}</style>

      {/* HERO */}
      <section className="blog-hero">
        <div className="c">
          <h1>Insights for growing online</h1>
          <p>Hosting tips, WordPress guides, and expert insights for business owners.</p>
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
            </Link>
          ))}
        </div>
      </div>

      {!posts || posts.length === 0 ? (
        <section className="blog-empty">
          <div className="c">
            <h2>No posts yet</h2>
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
                      <img src={featuredPost.featured_image_url} alt={featuredPost.title} />
                    )}
                  </div>
                  <div className="feat-body">
                    {(featuredPost as any).category && (
                      <span className="cat-badge" style={{ [categoryColor((featuredPost as any).category).split(';')[0].split(':')[0]]: categoryColor((featuredPost as any).category).split(';')[0].split(':')[1] } as any}>
                        {CATEGORY_LABELS[(featuredPost as any).category] ?? (featuredPost as any).category}
                      </span>
                    )}
                    <h3>{featuredPost.title}</h3>
                    {featuredPost.excerpt && <p>{featuredPost.excerpt}</p>}
                    <div className="post-meta">
                      <span>{formatDate(featuredPost.published_at)}</span>
                    </div>
                    <div style={{ marginTop: 20 }}>
                      <span className="read-link">Read Article &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* POST GRID */}
          {gridPosts.length > 0 && (
            <section style={{ padding: '40px 0 100px' }}>
              <div className="c">
                <div className="post-grid">
                  {gridPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="post-card">
                      <div className="post-card-img">
                        {post.featured_image_url && (
                          <img src={post.featured_image_url} alt={post.title} />
                        )}
                      </div>
                      <div className="post-card-body">
                        {(post as any).category && (
                          <span className="cat-badge" style={{ [(categoryColor((post as any).category).split(';')[0].split(':')[0])]: categoryColor((post as any).category).split(';')[0].split(':')[1] } as any}>
                            {CATEGORY_LABELS[(post as any).category] ?? (post as any).category}
                          </span>
                        )}
                        <h4>{post.title}</h4>
                        {post.excerpt && <p>{post.excerpt}</p>}
                        <div className="post-card-footer">
                          <div className="post-meta">
                            <span>{formatDate(post.published_at)}</span>
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
        </>
      )}

      {/* NEWSLETTER */}
      <section className="cta-section">
        <div className="c">
          <div className="cta-box">
            <h2>Get tips delivered to your inbox</h2>
            <p>Join business owners who get our weekly WordPress tips, security updates, and growth guides.</p>
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
