-- Add foreign key constraints to order_evaluations table
ALTER TABLE public.order_evaluations 
ADD CONSTRAINT fk_order_evaluations_order 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_evaluations 
ADD CONSTRAINT fk_order_evaluations_employee 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE public.order_evaluations 
ADD CONSTRAINT fk_order_evaluations_assignment 
FOREIGN KEY (assignment_id) REFERENCES public.order_assignments(id) ON DELETE CASCADE;

-- Add new status for assignments: 'evaluated' for when employee submits review but admin hasn't approved yet
-- Current statuses: 'assigned', 'in_progress', 'completed'
-- Adding: 'evaluated' (employee submitted evaluation, waiting for admin approval)