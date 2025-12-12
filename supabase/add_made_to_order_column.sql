-- Add made_to_order column to orders table if it doesn't exist
-- This migration ensures the column exists for existing databases

alter table public.orders add column if not exists made_to_order boolean default false;

-- Add comment for documentation
comment on column public.orders.made_to_order is 'Indicates if the order is a made-to-order item';

