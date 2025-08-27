-- Create WhatsApp accounts table
CREATE TABLE public.whatsapp_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    account_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    order_number TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    project_goal TEXT NOT NULL,
    premium DECIMAL(10,2) NOT NULL,
    whatsapp_account_id UUID REFERENCES public.whatsapp_accounts(id),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order evaluation questions table
CREATE TABLE public.order_evaluation_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order assignments table
CREATE TABLE public.order_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'assigned',
    UNIQUE(order_id, employee_id)
);

-- Enable RLS on all tables
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_evaluation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for WhatsApp accounts
CREATE POLICY "Admins can manage all WhatsApp accounts" 
ON public.whatsapp_accounts 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for orders
CREATE POLICY "Admins can manage all orders" 
ON public.orders 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for order evaluation questions
CREATE POLICY "Admins can manage all order evaluation questions" 
ON public.order_evaluation_questions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for order assignments
CREATE POLICY "Admins can manage all order assignments" 
ON public.order_assignments 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Create triggers for updated_at columns
CREATE TRIGGER update_whatsapp_accounts_updated_at
    BEFORE UPDATE ON public.whatsapp_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_evaluation_questions_updated_at
    BEFORE UPDATE ON public.order_evaluation_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add some sample WhatsApp accounts
INSERT INTO public.whatsapp_accounts (name, account_info) VALUES 
('WhatsApp Business 1', '+49 123 456 7890'),
('WhatsApp Business 2', '+49 123 456 7891'),
('Support WhatsApp', '+49 123 456 7892');