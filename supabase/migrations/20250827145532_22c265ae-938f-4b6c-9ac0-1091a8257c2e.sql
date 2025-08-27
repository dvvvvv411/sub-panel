
-- 1) Genehmigte Bewertungen -> Auftrag abgeschlossen
UPDATE public.order_assignments oa
SET status = 'completed'
WHERE EXISTS (
  SELECT 1
  FROM public.order_evaluations oe
  WHERE oe.assignment_id = oa.id
    AND oe.status = 'approved'
)
AND oa.status <> 'completed';

-- 2) Ausstehende (eingereichte) Bewertungen -> In Überprüfung (evaluated)
UPDATE public.order_assignments oa
SET status = 'evaluated'
WHERE EXISTS (
  SELECT 1
  FROM public.order_evaluations oe
  WHERE oe.assignment_id = oa.id
    AND oe.status = 'pending'
)
AND oa.status NOT IN ('completed', 'evaluated');

-- 3) Abgelehnte Bewertungen -> Zurück in Bearbeitung
UPDATE public.order_assignments oa
SET status = 'in_progress'
WHERE EXISTS (
  SELECT 1
  FROM public.order_evaluations oe
  WHERE oe.assignment_id = oa.id
    AND oe.status = 'rejected'
)
AND oa.status NOT IN ('completed', 'in_progress');
