-- Create table for monthly expense targets
CREATE TABLE public.monthly_expense_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.monthly_expense_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_expense_targets
CREATE POLICY "Users can view their own targets"
ON public.monthly_expense_targets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own targets"
ON public.monthly_expense_targets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own targets"
ON public.monthly_expense_targets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own targets"
ON public.monthly_expense_targets
FOR DELETE
USING (auth.uid() = user_id);

-- Create table for manual expenses
CREATE TABLE public.manual_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_id UUID NOT NULL REFERENCES public.monthly_expense_targets(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.manual_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for manual_expenses
CREATE POLICY "Users can view their own manual expenses"
ON public.manual_expenses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own manual expenses"
ON public.manual_expenses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual expenses"
ON public.manual_expenses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual expenses"
ON public.manual_expenses
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on monthly_expense_targets
CREATE TRIGGER update_monthly_expense_targets_updated_at
BEFORE UPDATE ON public.monthly_expense_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on manual_expenses
CREATE TRIGGER update_manual_expenses_updated_at
BEFORE UPDATE ON public.manual_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();