
-- 1) Spalte is_default hinzufügen
ALTER TABLE public.whatsapp_accounts
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- 2) Maximal ein Standardkonto erzwingen (partieller Unique-Index)
-- Dieser Index lässt nur eine Zeile mit is_default=true zu.
CREATE UNIQUE INDEX IF NOT EXISTS one_default_whatsapp_account
  ON public.whatsapp_accounts (is_default)
  WHERE is_default;

-- 3) Trigger-Funktion: Wenn ein Konto als Standard gesetzt wird,
-- werden alle anderen auf false gesetzt (zusätzliche Sicherheit/Rennbedingungen).
CREATE OR REPLACE FUNCTION public.ensure_single_default_whatsapp_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_default IS TRUE THEN
    UPDATE public.whatsapp_accounts
      SET is_default = FALSE
      WHERE id <> NEW.id AND is_default IS TRUE;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger anlegen (vor Insert/Update)
DROP TRIGGER IF EXISTS trg_ensure_single_default_whatsapp_account ON public.whatsapp_accounts;
CREATE TRIGGER trg_ensure_single_default_whatsapp_account
BEFORE INSERT OR UPDATE ON public.whatsapp_accounts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_whatsapp_account();

-- 4) Foreign Key auf ON DELETE SET NULL ändern, damit Löschen möglich ist
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_whatsapp_account_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_whatsapp_account_id_fkey
  FOREIGN KEY (whatsapp_account_id)
  REFERENCES public.whatsapp_accounts(id)
  ON DELETE SET NULL;
