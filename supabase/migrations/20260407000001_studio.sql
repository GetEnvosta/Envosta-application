-- Envosta Studio: AI WordPress website generator
CREATE TABLE IF NOT EXISTS public.studio_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    style_config JSONB NOT NULL DEFAULT '{
      "siteName": "",
      "fonts": { "heading": "Playfair Display", "body": "Source Sans 3" },
      "colors": {
        "primary": "#1a1a2e",
        "secondary": "#16213e",
        "accent": "#e94560",
        "background": "#0f0f1a",
        "surface": "#1a1a2e",
        "text": "#e8e8e8",
        "textMuted": "#8a8a9a",
        "border": "#2a2a3e"
      },
      "borderRadius": "4px",
      "maxWidth": "1200px"
    }'::jsonb,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.studio_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    html TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_projects_created_by ON public.studio_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_studio_projects_created ON public.studio_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_pages_project ON public.studio_pages(project_id);
