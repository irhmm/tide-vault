-- Create bills table for tracking invoices and bills
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bill_name TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  destination_account TEXT,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('my_bills', 'others_bills_to_me')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own bills" 
ON public.bills 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bills" 
ON public.bills 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills" 
ON public.bills 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills" 
ON public.bills 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bills_updated_at
BEFORE UPDATE ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();