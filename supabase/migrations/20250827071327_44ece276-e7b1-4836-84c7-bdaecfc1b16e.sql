-- Enable RLS if not already enabled (safe to run)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_evaluation_questions ENABLE ROW LEVEL SECURITY;

-- Allow employees (authenticated users) to view their own employee row via email
CREATE POLICY "Employees can view their own employee row"
ON public.employees
FOR SELECT
TO authenticated
USING (email = (auth.jwt() ->> 'email'));

-- Allow employees to view their own order assignments
CREATE POLICY "Employees can view their own assignments"
ON public.order_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = order_assignments.employee_id
      AND e.email = (auth.jwt() ->> 'email')
  )
);

-- Allow employees to UPDATE their own assignments (e.g., start/in_progress/completed)
CREATE POLICY "Employees can update their own assignments"
ON public.order_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = order_assignments.employee_id
      AND e.email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = order_assignments.employee_id
      AND e.email = (auth.jwt() ->> 'email')
  )
);

-- Allow employees to view orders that are assigned to them
CREATE POLICY "Employees can view assigned orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.order_assignments oa
    JOIN public.employees e ON e.id = oa.employee_id
    WHERE oa.order_id = orders.id
      AND e.email = (auth.jwt() ->> 'email')
  )
);

-- Allow employees to view evaluation questions for their assigned orders
CREATE POLICY "Employees can view questions for assigned orders"
ON public.order_evaluation_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.order_assignments oa
    JOIN public.employees e ON e.id = oa.employee_id
    WHERE oa.order_id = order_evaluation_questions.order_id
      AND e.email = (auth.jwt() ->> 'email')
  )
);