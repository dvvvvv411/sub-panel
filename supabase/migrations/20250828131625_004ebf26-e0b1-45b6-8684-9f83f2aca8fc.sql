-- Create telegram_subscribers table for managing Telegram chat IDs
CREATE TABLE public.telegram_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  last_notified_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage telegram subscribers
CREATE POLICY "Admins can manage all telegram subscribers" 
ON public.telegram_subscribers 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::text)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_telegram_subscribers_updated_at
BEFORE UPDATE ON public.telegram_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();