import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog | WordPress Hosting Insights',
  description:
    'Hosting tips, WordPress guides, and expert insights for business owners — written by the Envosta team.',
  alternates: {
    canonical: '/blog',
  },
};

export default async function BlogPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image_url, published_at, tags, status')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const featuredPost = posts && posts.length > 0 ? posts[0] : null;
  const gridPosts = posts && posts.length > 1 ? posts.slice(1) : [];

  return (
    <>
      <style>{`
/* Blog Hero */
.blog-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
.blog-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
.blog-hero .c{position:relative;z-index:1}
.blog-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:500;letter-spacing:-1.5px;line-height:1.12;margin-bottom:20px}
.blog-hero h1 em{font-style:normal;color:#fff;font-weight:500}
.blog-hero p{font-size:1.05rem;color:var(--t2);max-width:520px;margin:0 auto 44px;line-height:1.75;font-weight:300}

/* Featured Post */
.feat-post{background:var(--card);border:1px solid var(--bdr);border-radius:16px;overflow:hidden;margin-bottom:56px;display:grid;grid-template-columns:1fr 1fr;gap:0;transition:transform .3s,border-color .3s;text-decoration:none;color:inherit}
.feat-post:hover{transform:translateY(-4px);border-color:var(--bdr2)}
.feat-img{background:linear-gradient(135deg,var(--card2),#111d38);min-height:340px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.feat-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.feat-img-label{position:absolute;top:20px;left:20px;background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;z-index:1}
.feat-body{padding:48px 40px;display:flex;flex-direction:column;justify-content:center}
.feat-body .post-cat{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:10px}
.feat-body h3{font-size:clamp(1.6rem,2.5vw,2.2rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px;color:var(--t1)}
.feat-body p{color:var(--t2);font-size:.95rem;line-height:1.75;margin-bottom:20px;font-weight:300}
.post-meta{display:flex;align-items:center;gap:12px;font-size:.75rem;color:var(--t3);font-weight:300}
.post-meta-dot{width:3px;height:3px;border-radius:50%;background:var(--t3)}
.read-link{display:inline-flex;align-items:center;gap:6px;color:var(--gold);text-decoration:none;font-weight:500;font-size:.88rem;transition:gap .2s}.read-link:hover{gap:10px}

/* Post Grid */
.post-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:56px}
.post-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;overflow:hidden;transition:transform .3s,border-color .3s;display:flex;flex-direction:column;text-decoration:none;color:inherit}
.post-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
.post-card-img{height:200px;background:linear-gradient(135deg,var(--card2),#111d38);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.post-card-img img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.post-card-img .post-cat-badge{position:absolute;top:14px;left:14px;background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;z-index:1}
.post-card-body{padding:28px 24px;flex:1;display:flex;flex-direction:column}
.post-card-body .post-cat{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:8px}
.post-card-body h4{font-size:1rem;font-weight:500;margin-bottom:8px;line-height:1.3;color:var(--t1)}
.post-card-body p{font-size:.84rem;color:var(--t2);line-height:1.7;margin-bottom:auto;padding-bottom:16px;font-weight:300}
.post-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--bdr)}
.post-card-footer .post-meta{font-size:.72rem}
.post-card-footer .read-link{font-size:.84rem}

/* Section header */
.sec-header{text-align:center;margin-bottom:56px}
.sec-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.sec-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:520px;margin:0 auto;line-height:1.75}

/* Empty State */
.blog-empty{text-align:center;padding:80px 0 120px}
.blog-empty h2{font-size:1.6rem;font-weight:500;color:var(--t1);margin-bottom:12px}
.blog-empty p{color:var(--t2);font-size:.95rem;font-weight:300}

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
@media(max-width:1024px){.post-grid{grid-template-columns:repeat(2,1fr);gap:14px}.feat-post{grid-template-columns:1fr}}
@media(max-width:768px){.post-grid{grid-template-columns:1fr}.feat-post{grid-template-columns:1fr}.feat-img{min-height:200px}.feat-body{padding:28px 24px}.cta-box{padding:40px 24px}.nl-form{flex-direction:column}.blog-hero{padding:120px 0 48px}}
      `}</style>

      {/* BLOG HERO */}
      <section className="blog-hero">
        <div className="c">
          <h1>Insights for growing <em>online</em></h1>
          <p>Hosting tips, WordPress guides, and expert insights for business owners — written by the Envosta team.</p>
        </div>
      </section>

      {!posts || posts.length === 0 ? (
        <section className="blog-empty">
          <div className="c">
            <h2>No posts yet</h2>
            <p>Check back soon — we are working on new content.</p>
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
                    <div className="feat-img-label">Featured</div>
                    {featuredPost.featured_image_url && (
                      <img src={featuredPost.featured_image_url} alt={featuredPost.title} />
                    )}
                  </div>
                  <div className="feat-body">
                    {featuredPost.tags && featuredPost.tags.length > 0 && (
                      <div className="post-cat">{featuredPost.tags[0]}</div>
                    )}
                    <h3>{featuredPost.title}</h3>
                    {featuredPost.excerpt && <p>{featuredPost.excerpt}</p>}
                    <div className="post-meta">
                      <span>{formatDate(featuredPost.published_at)}</span>
                    </div>
                    <div style={{ marginTop: '20px' }}>
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
                <div className="sec-header">
                  <h2>Latest articles</h2>
                  <p>Stay ahead with expert insights on WordPress, hosting, security, and growing your business online.</p>
                </div>

                <div className="post-grid">
                  {gridPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="post-card">
                      <div className="post-card-img">
                        {post.tags && post.tags.length > 0 && (
                          <div className="post-cat-badge">{post.tags[0]}</div>
                        )}
                        {post.featured_image_url && (
                          <img src={post.featured_image_url} alt={post.title} />
                        )}
                      </div>
                      <div className="post-card-body">
                        {post.tags && post.tags.length > 0 && (
                          <div className="post-cat">{post.tags[0]}</div>
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
