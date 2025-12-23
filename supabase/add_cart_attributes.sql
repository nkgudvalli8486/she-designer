-- Add attributes column to cart_items table for storing custom measurements
-- This migration is idempotent and safe to run multiple times
-- The attributes column stores:
--   - size (mandatory): XS, S, M, L, XL, XXL, XXXL
--   - height (mandatory): 5'0" to 5'11"
--   - Custom measurements (optional): skirtLength, blouseLength, chest, waist, etc.
--   - additionalSpecifications (optional): free text

alter table public.cart_items 
  add column if not exists attributes jsonb default '{}'::jsonb;

-- Add index on attributes for better query performance (optional but recommended)
create index if not exists idx_cart_items_attributes on public.cart_items using gin (attributes);

