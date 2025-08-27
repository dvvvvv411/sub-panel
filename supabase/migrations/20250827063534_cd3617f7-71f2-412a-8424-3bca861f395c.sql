-- Add new columns to orders table for placeholder orders
ALTER TABLE public.orders 
ADD COLUMN is_placeholder BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN download_links TEXT[],
ADD COLUMN instructions JSONB;

-- Add comment to explain the instructions structure
COMMENT ON COLUMN public.orders.instructions IS 'Array of instruction objects with title, icon, and content fields';

-- Create index for better performance on placeholder orders
CREATE INDEX idx_orders_is_placeholder ON public.orders(is_placeholder);