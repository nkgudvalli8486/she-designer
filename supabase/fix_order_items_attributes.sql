-- Fix order_items table: Add missing columns
-- Run this in your Supabase SQL Editor

-- Add attributes column if it doesn't exist
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb;

-- Update existing NULL values
UPDATE public.order_items 
SET attributes = '{}'::jsonb
WHERE attributes IS NULL;

-- Add title column if it doesn't exist
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS title text DEFAULT '';

-- Fix title column if it has NOT NULL without default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'title'
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE public.order_items ALTER COLUMN title SET DEFAULT '';
    UPDATE public.order_items 
    SET title = COALESCE(name, '')
    WHERE title IS NULL;
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Add unit_price column if it doesn't exist (numeric/decimal version of unit_amount_cents)
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;

-- Fix unit_price column if it has NOT NULL without default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'unit_price'
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE public.order_items ALTER COLUMN unit_price SET DEFAULT 0;
    UPDATE public.order_items 
    SET unit_price = COALESCE(unit_amount_cents::numeric / 100.0, 0)
    WHERE unit_price IS NULL;
  END IF;
END $$;

-- Add total_price column if it doesn't exist (unit_price * quantity)
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0;

-- Fix total_price column if it has NOT NULL without default
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'total_price'
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE public.order_items ALTER COLUMN total_price SET DEFAULT 0;
    UPDATE public.order_items 
    SET total_price = COALESCE(unit_price * quantity, 0)
    WHERE total_price IS NULL;
  END IF;
END $$;

-- Refresh PostgREST schema cache again
NOTIFY pgrst, 'reload schema';

-- Verify the columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_items' 
  AND column_name IN ('attributes', 'title', 'unit_price')
ORDER BY column_name;

