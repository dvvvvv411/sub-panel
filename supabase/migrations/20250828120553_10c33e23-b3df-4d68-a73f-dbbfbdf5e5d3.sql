-- Add employment_type column to employees table
ALTER TABLE public.employees 
ADD COLUMN employment_type TEXT;