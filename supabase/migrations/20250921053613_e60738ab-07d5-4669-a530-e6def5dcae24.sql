-- Add storage_location column to assets table
ALTER TABLE public.assets 
ADD COLUMN storage_location TEXT;