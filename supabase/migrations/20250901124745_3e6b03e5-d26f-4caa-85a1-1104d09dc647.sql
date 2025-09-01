
-- 1) Bestehende Daten normalisieren (einmaliger Fix)
UPDATE public.employees
SET email = lower(email)
WHERE email IS NOT NULL AND email <> lower(email);

-- 2) Trigger-Funktion zum Normalisieren künftiger Inserts/Updates
CREATE OR REPLACE FUNCTION public.normalize_employee_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Alten Trigger (falls vorhanden) entfernen und neuen anlegen
DROP TRIGGER IF EXISTS trg_employees_normalize_email ON public.employees;

CREATE TRIGGER trg_employees_normalize_email
BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.normalize_employee_email();
