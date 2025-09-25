-- Create catatan table
CREATE TABLE public.catatan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  judul TEXT NOT NULL,
  isi TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.catatan ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own catatan" 
ON public.catatan 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own catatan" 
ON public.catatan 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own catatan" 
ON public.catatan 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own catatan" 
ON public.catatan 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_catatan_updated_at
BEFORE UPDATE ON public.catatan
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();