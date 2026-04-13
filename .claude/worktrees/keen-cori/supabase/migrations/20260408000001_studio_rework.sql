-- Studio rework: add guided workflow columns to studio_projects
ALTER TABLE public.studio_projects
  ADD COLUMN IF NOT EXISTS step INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS brief TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS brief_options JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS selected_brief INTEGER,
  ADD COLUMN IF NOT EXISTS business_info JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wireframe JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS wireframe_approved BOOLEAN DEFAULT false;
