-- Enable realtime for financial_transactions table
ALTER TABLE public.financial_transactions REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_transactions;