
-- 1) Funktion: Assignment-Status automatisch an Evaluation-Status anpassen
CREATE OR REPLACE FUNCTION public.sync_assignment_status_on_evaluation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Setze den Auftragszuweisungs-Status abhängig vom Evaluationsstatus
  IF NEW.status = 'pending' THEN
    UPDATE public.order_assignments
      SET status = 'evaluated'
      WHERE id = NEW.assignment_id;
  ELSIF NEW.status = 'approved' THEN
    UPDATE public.order_assignments
      SET status = 'completed'
      WHERE id = NEW.assignment_id;
  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.order_assignments
      SET status = 'in_progress'
      WHERE id = NEW.assignment_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Trigger neu anlegen (vorhandenen ggf. ersetzen)
DROP TRIGGER IF EXISTS trg_sync_assignment_status_on_evaluation ON public.order_evaluations;

CREATE TRIGGER trg_sync_assignment_status_on_evaluation
AFTER INSERT OR UPDATE OF status ON public.order_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.sync_assignment_status_on_evaluation_change();
