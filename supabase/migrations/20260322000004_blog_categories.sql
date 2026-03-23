-- Add category column to blog_posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'wordpress-news'
    CHECK (category IN ('wordpress-news', 'website-design', 'business-growth'));

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
