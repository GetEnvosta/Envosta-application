-- Add missing admin fields to tickets table
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS quote_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
