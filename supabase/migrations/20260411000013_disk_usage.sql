-- Add disk_usage_mb column to sites for storage tracking from wp.cloud
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS disk_usage_mb INTEGER DEFAULT 0;
