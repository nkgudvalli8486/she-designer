-- Fix order_number column: Make it nullable or add default generation
-- Run this in your Supabase SQL Editor

-- Option 1: Make order_number nullable (if you want to allow nulls)
-- ALTER TABLE public.orders ALTER COLUMN order_number DROP NOT NULL;

-- Option 2: Add a default value function (recommended)
-- Create a function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  date_part text;
  random_part text;
BEGIN
  date_part := to_char(now(), 'YYYYMMDD');
  random_part := upper(substring(md5(random()::text) from 1 for 5));
  RETURN 'ORD-' || date_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Set default value for order_number column
ALTER TABLE public.orders 
ALTER COLUMN order_number SET DEFAULT generate_order_number();

-- Update existing rows that have NULL order_number
UPDATE public.orders 
SET order_number = generate_order_number()
WHERE order_number IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders' 
  AND column_name = 'order_number';

