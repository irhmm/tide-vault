-- Remove account_type column and add saving_date column to savings table
ALTER TABLE public.savings 
DROP COLUMN account_type;

ALTER TABLE public.savings 
ADD COLUMN saving_date date;