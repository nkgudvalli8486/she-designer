-- Add paid_amount_cents and paid_amount columns to orders table
-- This tracks the actual amount paid for the order

-- Add paid_amount_cents column (integer, in cents)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS paid_amount_cents int DEFAULT 0;

-- Add paid_amount column (numeric/decimal version of paid_amount_cents)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;

-- Update existing orders to set paid_amount_cents = total_cents where payment_status = 'paid'
UPDATE public.orders 
SET paid_amount_cents = total_cents,
    paid_amount = total_cents / 100.0
WHERE payment_status = 'paid' 
  AND (paid_amount_cents IS NULL OR paid_amount_cents = 0);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

