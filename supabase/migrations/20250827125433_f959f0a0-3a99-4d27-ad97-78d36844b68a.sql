
-- Add employment type to contract submissions
ALTER TABLE public.employment_contract_submissions
ADD COLUMN IF NOT EXISTS employment_type text
  CHECK (employment_type IN ('minijob', 'teilzeit', 'vollzeit'));
