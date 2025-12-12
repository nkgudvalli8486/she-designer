-- Complete fix: Ensure ALL required columns exist in order_items table
-- Run this in your Supabase SQL Editor to fix all PGRST204 errors for order_items

-- First, ensure the table exists with basic structure
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  quantity int DEFAULT 1
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add order_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_order_id_fkey'
    AND table_schema = 'public'
    AND table_name = 'order_items'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
      ALTER TABLE public.order_items 
      ADD CONSTRAINT order_items_order_id_fkey 
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add product_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_items_product_id_fkey'
    AND table_schema = 'public'
    AND table_name = 'order_items'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
      ALTER TABLE public.order_items 
      ADD CONSTRAINT order_items_product_id_fkey 
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add all required columns
DO $$
BEGIN
  -- Add name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN name text NOT NULL DEFAULT '';
  ELSE
    -- If column exists but is nullable, make it NOT NULL with default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_items' 
      AND column_name = 'name'
      AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE public.order_items ALTER COLUMN name SET DEFAULT '';
      UPDATE public.order_items SET name = '' WHERE name IS NULL;
      ALTER TABLE public.order_items ALTER COLUMN name SET NOT NULL;
    END IF;
  END IF;

  -- Add unit_amount_cents column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'unit_amount_cents'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN unit_amount_cents int NOT NULL DEFAULT 0;
  ELSE
    -- If column exists but is nullable, make it NOT NULL with default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_items' 
      AND column_name = 'unit_amount_cents'
      AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE public.order_items ALTER COLUMN unit_amount_cents SET DEFAULT 0;
      UPDATE public.order_items SET unit_amount_cents = 0 WHERE unit_amount_cents IS NULL;
      ALTER TABLE public.order_items ALTER COLUMN unit_amount_cents SET NOT NULL;
    END IF;
  END IF;

  -- Add quantity column if it doesn't exist (should already exist, but ensure it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'quantity'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN quantity int NOT NULL DEFAULT 1;
  END IF;

  -- Add attributes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'attributes'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN attributes jsonb DEFAULT '{}'::jsonb;
  ELSE
    -- Update existing NULL values
    UPDATE public.order_items 
    SET attributes = '{}'::jsonb
    WHERE attributes IS NULL;
  END IF;

  -- Add title column if it doesn't exist (often an alias for name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN title text NOT NULL DEFAULT '';
  ELSE
    -- If column exists but is nullable, make it NOT NULL with default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_items' 
      AND column_name = 'title'
      AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE public.order_items ALTER COLUMN title SET DEFAULT '';
      UPDATE public.order_items SET title = COALESCE(name, '') WHERE title IS NULL;
      ALTER TABLE public.order_items ALTER COLUMN title SET NOT NULL;
    ELSE
      -- If NOT NULL but no default, add default and update NULLs
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items' 
        AND column_name = 'title'
        AND is_nullable = 'NO'
        AND column_default IS NULL
      ) THEN
        ALTER TABLE public.order_items ALTER COLUMN title SET DEFAULT '';
        UPDATE public.order_items SET title = COALESCE(name, '') WHERE title IS NULL;
      END IF;
    END IF;
  END IF;

  -- Add unit_price column if it doesn't exist (numeric/decimal version of unit_amount_cents)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN unit_price numeric DEFAULT 0;
  ELSE
    -- If column exists but has NOT NULL without default, add default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_items' 
      AND column_name = 'unit_price'
      AND is_nullable = 'NO'
      AND column_default IS NULL
    ) THEN
      ALTER TABLE public.order_items ALTER COLUMN unit_price SET DEFAULT 0;
      -- Update existing NULL values to use unit_amount_cents / 100.0 or 0
      UPDATE public.order_items 
      SET unit_price = COALESCE(unit_amount_cents::numeric / 100.0, 0)
      WHERE unit_price IS NULL;
    END IF;
  END IF;

  -- Add total_price column if it doesn't exist (unit_price * quantity)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'total_price'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN total_price numeric DEFAULT 0;
  ELSE
    -- If column exists but has NOT NULL without default, add default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_items' 
      AND column_name = 'total_price'
      AND is_nullable = 'NO'
      AND column_default IS NULL
    ) THEN
      ALTER TABLE public.order_items ALTER COLUMN total_price SET DEFAULT 0;
      -- Update existing NULL values to use unit_price * quantity or 0
      UPDATE public.order_items 
      SET total_price = COALESCE(unit_price * quantity, 0)
      WHERE total_price IS NULL;
    END IF;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify all columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'order_items' 
ORDER BY ordinal_position;

