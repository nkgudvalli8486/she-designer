-- Complete fix: Add ALL missing columns to orders table
-- Run this in your Supabase SQL Editor to fix all PGRST204 errors immediately

-- Ensure enum types exist first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM ('pending','processing','shipped','delivered','cancelled','returned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('unpaid','paid','refunded');
  END IF;
END $$;

-- Add all missing columns
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS made_to_order boolean DEFAULT false;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS total_cents int DEFAULT 0;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'inr';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_address jsonb;

-- Add status and payment_status if they don't exist (with proper types)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN status public.order_status DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payment_status public.payment_status DEFAULT 'unpaid';
  END IF;
END $$;

-- Add subtotal column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS subtotal int DEFAULT 0;

-- If subtotal exists but has NOT NULL without default, fix it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'subtotal'
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN subtotal SET DEFAULT 0;
    UPDATE public.orders 
    SET subtotal = COALESCE(total_cents, 0)
    WHERE subtotal IS NULL;
  END IF;
END $$;

-- Add subtotal column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS subtotal int DEFAULT 0;

-- If subtotal exists but has NOT NULL without default, fix it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'subtotal'
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN subtotal SET DEFAULT 0;
    UPDATE public.orders 
    SET subtotal = COALESCE(total_cents, 0)
    WHERE subtotal IS NULL;
  END IF;
END $$;

-- Add total column if it doesn't exist (numeric/decimal version of total_cents)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS total numeric DEFAULT 0;

-- If total exists but has NOT NULL without default, fix it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'total'
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN total SET DEFAULT 0;
    UPDATE public.orders 
    SET total = COALESCE(total_cents::numeric / 100.0, 0)
    WHERE total IS NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at 
ON public.orders(deleted_at) 
WHERE deleted_at IS NULL;

-- Refresh PostgREST schema cache (Supabase automatically does this, but this ensures it)
NOTIFY pgrst, 'reload schema';

-- Verify ALL columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'orders' 
ORDER BY ordinal_position;

