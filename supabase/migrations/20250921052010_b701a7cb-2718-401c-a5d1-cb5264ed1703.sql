-- Add columns for recurring bills management
ALTER TABLE public.bills 
ADD COLUMN recurrence_type text DEFAULT 'one_time' CHECK (recurrence_type IN ('one_time', 'monthly', 'yearly', 'custom')),
ADD COLUMN recurrence_day integer CHECK (recurrence_day >= 1 AND recurrence_day <= 31),
ADD COLUMN recurrence_month integer CHECK (recurrence_month >= 1 AND recurrence_month <= 12),
ADD COLUMN next_due_date date,
ADD COLUMN is_template boolean DEFAULT false;

-- Create index for better performance on recurring queries
CREATE INDEX idx_bills_recurrence ON public.bills(recurrence_type, is_template, next_due_date);

-- Update existing bills to have default recurrence_type
UPDATE public.bills SET recurrence_type = 'one_time' WHERE recurrence_type IS NULL;