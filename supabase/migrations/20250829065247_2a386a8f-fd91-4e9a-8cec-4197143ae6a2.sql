
-- Add columns for order-related premium adjustments
ALTER TABLE public.premium_adjustments
  ADD COLUMN IF NOT EXISTS is_order_related boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_title text,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS order_provider text;
