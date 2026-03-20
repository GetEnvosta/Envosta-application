-- ============================================================================
-- Blog Posts
-- ============================================================================

CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    meta_title TEXT,
    meta_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================
CREATE TRIGGER set_updated_at_blog_posts
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "blog_posts_public_read" ON public.blog_posts
    FOR SELECT
    USING (status = 'published');

-- Admins can read all posts (including drafts)
CREATE POLICY "blog_posts_admin_select" ON public.blog_posts
    FOR SELECT
    USING (public.is_admin());

-- Admins can insert
CREATE POLICY "blog_posts_admin_insert" ON public.blog_posts
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Admins can update
CREATE POLICY "blog_posts_admin_update" ON public.blog_posts
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins can delete
CREATE POLICY "blog_posts_admin_delete" ON public.blog_posts
    FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
