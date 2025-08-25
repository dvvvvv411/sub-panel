-- Create employment_contract_requests table
CREATE TABLE public.employment_contract_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employment_contract_submissions table
CREATE TABLE public.employment_contract_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES public.employment_contract_requests(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    desired_start_date DATE,
    marital_status TEXT,
    social_security_number TEXT,
    tax_number TEXT,
    health_insurance TEXT,
    iban TEXT,
    bic TEXT,
    bank_name TEXT,
    id_front_path TEXT,
    id_back_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.employment_contract_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_contract_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employment_contract_requests
CREATE POLICY "Admins can manage all contract requests"
ON public.employment_contract_requests
FOR ALL
USING (get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for employment_contract_submissions
CREATE POLICY "Admins can manage all contract submissions"
ON public.employment_contract_submissions
FOR ALL
USING (get_user_role(auth.uid()) = 'admin');

-- Create storage bucket for ID documents
INSERT INTO storage.buckets (id, name, public) VALUES ('ids', 'ids', false);

-- Create storage policies for ID documents (admin only access)
CREATE POLICY "Admins can view ID documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'ids' AND get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can upload ID documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ids' AND get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update ID documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ids' AND get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete ID documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'ids' AND get_user_role(auth.uid()) = 'admin');

-- Add triggers for updated_at
CREATE TRIGGER update_employment_contract_requests_updated_at
    BEFORE UPDATE ON public.employment_contract_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employment_contract_submissions_updated_at
    BEFORE UPDATE ON public.employment_contract_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();