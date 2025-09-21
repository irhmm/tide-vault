-- Add account_number column to savings table
ALTER TABLE public.savings 
ADD COLUMN account_number text;