-- Create table for order evaluations
CREATE TABLE IF NOT EXISTS public.order_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  order_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  details JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  overall_comment TEXT,
  premium_awarded NUMERIC NOT NULL DEFAULT 0,
  reviewed_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_assignment_evaluation UNIQUE (assignment_id)
);

-- Enable RLS
ALTER TABLE public.order_evaluations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all order evaluations"
ON public.order_evaluations
AS PERMISSIVE
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Employees can view their own evaluations"
ON public.order_evaluations
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = order_evaluations.employee_id
    AND e.email = (auth.jwt() ->> 'email')
));

CREATE POLICY "Employees can insert their own evaluations"
ON public.order_evaluations
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_id
    AND e.email = (auth.jwt() ->> 'email')
));

CREATE POLICY "Employees can update their pending evaluations"
ON public.order_evaluations
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  status = 'pending' AND EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = order_evaluations.employee_id
      AND e.email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  status = 'pending' AND EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
      AND e.email = (auth.jwt() ->> 'email')
  )
);

-- Use existing timestamp updater
CREATE TRIGGER update_order_evaluations_updated_at
BEFORE UPDATE ON public.order_evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to set approval fields automatically
CREATE OR REPLACE FUNCTION public.set_order_evaluation_approval_fields()
RETURNS TRIGGER AS $$
DECLARE
  _premium NUMERIC;
BEGIN
  -- Only on transition to approved
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Set approved_at if not provided
    IF NEW.approved_at IS NULL THEN
      NEW.approved_at = now();
    END IF;

    -- If premium_awarded not set, default to the order's current premium
    IF COALESCE(NEW.premium_awarded, 0) = 0 THEN
      SELECT o.premium INTO _premium FROM public.orders o WHERE o.id = NEW.order_id;
      NEW.premium_awarded = COALESCE(_premium, 0);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to apply approval fields
DROP TRIGGER IF EXISTS trg_set_order_evaluation_approval_fields ON public.order_evaluations;
CREATE TRIGGER trg_set_order_evaluation_approval_fields
BEFORE UPDATE ON public.order_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.set_order_evaluation_approval_fields();