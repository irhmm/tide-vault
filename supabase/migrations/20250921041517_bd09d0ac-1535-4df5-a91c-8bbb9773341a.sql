-- Create financial_targets table
CREATE TABLE public.financial_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  estimated_cost NUMERIC NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.financial_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own financial targets" 
ON public.financial_targets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own financial targets" 
ON public.financial_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial targets" 
ON public.financial_targets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial targets" 
ON public.financial_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_financial_targets_updated_at
BEFORE UPDATE ON public.financial_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();