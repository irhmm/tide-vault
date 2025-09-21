-- Simplify financial_transactions table to match new requirements
-- Remove category column and rename columns to Indonesian terms

ALTER TABLE public.financial_transactions 
DROP COLUMN IF EXISTS category;

ALTER TABLE public.financial_transactions 
RENAME COLUMN description TO keterangan;

ALTER TABLE public.financial_transactions 
RENAME COLUMN type TO jenis;

ALTER TABLE public.financial_transactions 
RENAME COLUMN amount TO jumlah;

ALTER TABLE public.financial_transactions 
RENAME COLUMN transaction_date TO tanggal;

-- Change tanggal to timestamp with default now() instead of date
ALTER TABLE public.financial_transactions 
ALTER COLUMN tanggal TYPE timestamp with time zone,
ALTER COLUMN tanggal SET DEFAULT now();

-- Update existing records to have timestamp instead of just date
UPDATE public.financial_transactions 
SET tanggal = tanggal::timestamp with time zone 
WHERE tanggal IS NOT NULL;