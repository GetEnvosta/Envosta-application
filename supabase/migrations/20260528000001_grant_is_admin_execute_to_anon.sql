-- The "Admins manage products" RLS policy on `products` uses is_admin() with
-- cmd = ALL, which includes SELECT. When the anon role queries products (e.g.
-- the public pricing page), PostgreSQL evaluates both PERMISSIVE policies and
-- tries to call is_admin(). Without EXECUTE permission the entire query fails
-- silently, returning zero rows.
--
-- The function is safe for anon — auth.uid() is NULL so it always returns false.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
