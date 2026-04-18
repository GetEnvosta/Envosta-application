-- Add foreign key from sites.product_id to products.id
-- Required for Supabase PostgREST to resolve the products(...) join
ALTER TABLE public.sites
  ADD CONSTRAINT sites_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE SET NULL;
