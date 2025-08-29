
-- 1) Neue Spalten für Adresse in employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text;

-- 2) Standardwerte für bestehende Mitarbeiter ohne Adressdaten setzen
UPDATE public.employees
SET
  address = COALESCE(NULLIF(address, ''), 'Musterstr. 15'),
  postal_code = COALESCE(NULLIF(postal_code, ''), '12345'),
  city = COALESCE(NULLIF(city, ''), 'Musterstadt')
WHERE (address IS NULL OR address = '')
  AND (postal_code IS NULL OR postal_code = '')
  AND (city IS NULL OR city = '');

-- 3) Neue Spalten für Adresse in employment_contract_submissions
ALTER TABLE public.employment_contract_submissions
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text;

-- 4) RLS: Mitarbeiter dürfen ihre eigene employees-Zeile updaten
-- (basiert auf bestehender Logik, die per Email matcht)
CREATE POLICY "Employees can update their own employee row"
  ON public.employees
  FOR UPDATE
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));
