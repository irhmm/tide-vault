-- Rename account_number column to bank in savings table
ALTER TABLE public.savings 
RENAME COLUMN account_number TO bank;