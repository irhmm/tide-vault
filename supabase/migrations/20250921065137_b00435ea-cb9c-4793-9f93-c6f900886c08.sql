-- Fix check constraint to accept Indonesian values
ALTER TABLE public.financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_type_check;

-- Add new constraint for Indonesian values
ALTER TABLE public.financial_transactions 
ADD CONSTRAINT financial_transactions_jenis_check 
CHECK (jenis IN ('pemasukan', 'pengeluaran'));

-- Also add constraint for jumlah to be positive
ALTER TABLE public.financial_transactions 
ADD CONSTRAINT financial_transactions_jumlah_positive 
CHECK (jumlah > 0);