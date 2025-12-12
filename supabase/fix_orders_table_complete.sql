-- Complete fix: Ensure ALL required columns exist in orders table
-- Run this in your Supabase SQL Editor to fix all PGRST204 errors

-- First, ensure enum types exist (outside DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM ('pending','processing','shipped','delivered','cancelled','returned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('unpaid','paid','refunded');
  END IF;
END $$;

-- Create function to generate order numbers (outside DO block)
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

-- Now add all missing columns
DO $$
BEGIN
  -- Add made_to_order column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'made_to_order'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN made_to_order boolean DEFAULT false;
  END IF;

  -- Add deleted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN deleted_at timestamptz;
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add total_cents column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'total_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN total_cents int NOT NULL DEFAULT 0;
  END IF;

  -- Add currency column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN currency text NOT NULL DEFAULT 'inr';
  END IF;

  -- Add shipping_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_address jsonb;
  END IF;

  -- Add status column if it doesn't exist (with proper type)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN status public.order_status NOT NULL DEFAULT 'pending';
  END IF;

  -- Add payment_status column if it doesn't exist (with proper type)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'unpaid';
  END IF;

  -- Add customer_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN customer_id uuid;
    -- Add foreign key if customers table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
      ALTER TABLE public.orders 
      ADD CONSTRAINT orders_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Add subtotal column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN subtotal int DEFAULT 0;
  ELSE
    -- If column exists but has NOT NULL without default, add default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'subtotal'
      AND is_nullable = 'NO'
      AND column_default IS NULL
    ) THEN
      ALTER TABLE public.orders ALTER COLUMN subtotal SET DEFAULT 0;
      -- Update existing NULL values to use total_cents or 0
      UPDATE public.orders 
      SET subtotal = COALESCE(total_cents, 0)
      WHERE subtotal IS NULL;
    END IF;
  END IF;

  -- Add total column if it doesn't exist (numeric/decimal version of total_cents)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'total'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN total numeric DEFAULT 0;
  ELSE
    -- If column exists but has NOT NULL without default, add default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'total'
      AND is_nullable = 'NO'
      AND column_default IS NULL
    ) THEN
      ALTER TABLE public.orders ALTER COLUMN total SET DEFAULT 0;
      -- Update existing NULL values to use total_cents / 100.0 or 0
      UPDATE public.orders 
      SET total = COALESCE(total_cents::numeric / 100.0, 0)
      WHERE total IS NULL;
    END IF;
  END IF;

  -- Add order_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'order_number'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN order_number text NOT NULL DEFAULT generate_order_number();
  ELSE
    -- If column exists but has NOT NULL without default, add default
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'order_number'
      AND is_nullable = 'NO'
      AND column_default IS NULL
    ) THEN
      ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT generate_order_number();
      
      -- Update existing NULL values
      UPDATE public.orders 
      SET order_number = generate_order_number()
      WHERE order_number IS NULL;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at) WHERE deleted_at IS NULL;

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
  AND table_name = 'orders' 
ORDER BY ordinal_position;

