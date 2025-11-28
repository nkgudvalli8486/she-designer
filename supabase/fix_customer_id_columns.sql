-- Fix: Add customer_id columns to existing tables
-- Run this in Supabase SQL Editor if tables already exist without customer_id

-- Step 1: Ensure customers table exists and has auth_user_id
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text,
  email text unique,
  phone text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add auth_user_id if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'customers' 
    and column_name = 'auth_user_id'
  ) then
    alter table public.customers add column auth_user_id uuid unique;
  end if;
end $$;

-- Step 2: Add customer_id to cart_items if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'cart_items' 
    and column_name = 'customer_id'
  ) then
    alter table public.cart_items add column customer_id uuid references public.customers(id) on delete cascade;
  end if;
end $$;

-- Step 3: Add customer_id to wishlist_items if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'wishlist_items' 
    and column_name = 'customer_id'
  ) then
    alter table public.wishlist_items add column customer_id uuid references public.customers(id) on delete cascade;
  end if;
end $$;

-- Step 4: Add customer_id to addresses if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'addresses' 
    and column_name = 'customer_id'
  ) then
    alter table public.addresses add column customer_id uuid references public.customers(id) on delete cascade;
  end if;
end $$;

-- Step 5: Create indexes (safe - will skip if exists)
create index if not exists idx_cart_customer on public.cart_items(customer_id);
create index if not exists idx_wishlist_customer on public.wishlist_items(customer_id);
create index if not exists idx_addresses_customer on public.addresses(customer_id);

-- Step 6: Create unique indexes for customer_id (safe - will skip if exists)
create unique index if not exists uniq_cart_customer_product on public.cart_items(customer_id, product_id) where customer_id is not null;
create unique index if not exists uniq_wishlist_customer_product on public.wishlist_items(customer_id, product_id) where customer_id is not null;

-- Step 7: Update check constraints (drop old ones if they exist, add new ones)
do $$
begin
  -- For cart_items - drop old constraints if they exist
  alter table public.cart_items drop constraint if exists cart_items_session_id_check;
  alter table public.cart_items drop constraint if exists cart_items_customer_id_check;
  alter table public.cart_items drop constraint if exists cart_items_session_or_customer_check;
  
  -- Add the check constraint if it doesn't exist
  if not exists (
    select 1 from pg_constraint 
    where conname = 'cart_items_session_or_customer_check'
  ) then
    alter table public.cart_items add constraint cart_items_session_or_customer_check 
      check ((session_id is not null) or (customer_id is not null));
  end if;
  
  -- For wishlist_items - drop old constraints if they exist
  alter table public.wishlist_items drop constraint if exists wishlist_items_session_id_check;
  alter table public.wishlist_items drop constraint if exists wishlist_items_customer_id_check;
  alter table public.wishlist_items drop constraint if exists wishlist_items_session_or_customer_check;
  
  -- Add the check constraint if it doesn't exist
  if not exists (
    select 1 from pg_constraint 
    where conname = 'wishlist_items_session_or_customer_check'
  ) then
    alter table public.wishlist_items add constraint wishlist_items_session_or_customer_check 
      check ((session_id is not null) or (customer_id is not null));
  end if;
end $$;

