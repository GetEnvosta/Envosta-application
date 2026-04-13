-- Disable RLS on studio tables to match the rest of the app
-- (auth is handled at the application level, not DB level)
ALTER TABLE public.studio_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_pages DISABLE ROW LEVEL SECURITY;
