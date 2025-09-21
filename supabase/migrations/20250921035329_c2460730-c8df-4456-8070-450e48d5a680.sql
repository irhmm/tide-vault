-- Add debt_type column to categorize debts and receivables
ALTER TABLE public.debts 
ADD COLUMN debt_type TEXT NOT NULL DEFAULT 'debt' 
CHECK (debt_type IN ('debt', 'receivable'));

-- Rename creditor_name to party_name for more neutral naming
ALTER TABLE public.debts 
RENAME COLUMN creditor_name TO party_name;

-- Add comment to clarify the debt_type values
COMMENT ON COLUMN public.debts.debt_type IS 'debt = hutang (liabilities), receivable = piutang (receivables)';
COMMENT ON COLUMN public.debts.party_name IS 'Name of the party involved (creditor for debt, debtor for receivable)';

-- Update existing records to have debt_type = 'debt' (this is already handled by the default value)
-- No need for explicit UPDATE since we used DEFAULT 'debt'