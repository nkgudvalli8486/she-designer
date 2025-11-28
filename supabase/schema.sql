-- Basic schema aligned with PRD (idempotent)

-- Ensure uuid generator is available
create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- Add optional image URL for categories
alter table public.categories
  add column if not exists image_url text;

-- Soft delete support for categories
alter table public.categories
  add column if not exists deleted_at timestamptz;

-- Seed initial categories (idempotent)
insert into public.categories (name, slug, image_url)
values
  ('Sarees', 'sarees', '/categories/sarees.jpg'),
  ('Kurtis', 'kurtis', '/categories/kurtis.jpg'),
  ('Lehengas', 'lehengas', '/categories/lehengas.jpg'),
  ('Suits', 'suits', '/categories/suits.jpg')
on conflict (slug) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid()
);
-- Ensure required columns exist with correct types
alter table public.products add column if not exists name               text;
alter table public.products add column if not exists slug               text;
alter table public.products add column if not exists sku                text;
alter table public.products add column if not exists description        text;
alter table public.products add column if not exists category_id        uuid references public.categories(id) on delete set null;
alter table public.products add column if not exists price_cents        int;
alter table public.products add column if not exists sale_price_cents   int;
alter table public.products add column if not exists original_price_cents int;
-- Compatibility: optional human-readable prices (some legacy schemas use these)
alter table public.products add column if not exists price              numeric;
alter table public.products add column if not exists original_price     numeric;
alter table public.products add column if not exists stock              int default 0;
alter table public.products add column if not exists created_at         timestamptz default now();
alter table public.products add column if not exists updated_at         timestamptz default now();
alter table public.products add column if not exists deleted_at         timestamptz;
alter table public.products add column if not exists is_active          boolean default true not null;

-- Initialize is_active based on stock for existing rows
update public.products
set is_active = (coalesce(stock, 0) > 0)
where is_active is distinct from (coalesce(stock, 0) > 0);

-- Keep is_active in sync with stock
create or replace function public.sync_is_active_by_stock()
returns trigger
language plpgsql
as $$
begin
  if new.stock is null then
    new.stock := 0;
  end if;
  new.is_active := (new.stock > 0);
  return new;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_products_sync_is_active'
  ) then
    create trigger trg_products_sync_is_active
    before insert or update of stock on public.products
    for each row execute function public.sync_is_active_by_stock();
  end if;
end $$;

-- NOT NULL constraints (add safely if column currently null; leave optional where unknown)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'name' and is_nullable = 'NO'
  ) then
    alter table public.products alter column name set not null;
  end if;
end $$;

-- Ensure a default for legacy price column so inserts without explicit 'price' don't fail
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price'
  ) then
    alter table public.products alter column price set default 0;
  end if;
end $$;

-- If a legacy 'title' column exists, fix it
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'title'
  ) then
    -- If 'name' doesn't exist, rename 'title' -> 'name', else drop the legacy column
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'products' and column_name = 'name'
    ) then
      alter table public.products rename column title to name;
    else
      alter table public.products alter column title drop not null;
      alter table public.products drop column title;
    end if;
  end if;
end $$;

-- Unique constraints for slug and sku (sku optional unique)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_slug_key'
  ) then
    alter table public.products add constraint products_slug_key unique (slug);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_sku_key'
  ) then
    alter table public.products add constraint products_sku_key unique (sku);
  end if;
end $$;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  url text not null,
  position int default 0
);

-- Ensure compatibility column name if legacy schemas used 'image_url'
alter table public.product_images add column if not exists image_url text;
alter table public.product_images add column if not exists alt_text text default '' not null;
alter table public.product_images add column if not exists position int default 0;

-- Customers table must be created first (referenced by other tables)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text,
  email text unique,
  phone text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cart (session-scoped)
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  customer_id uuid references public.customers(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check ((session_id is not null) or (customer_id is not null))
);
create index if not exists idx_cart_session on public.cart_items(session_id);
create index if not exists idx_cart_customer on public.cart_items(customer_id);
create unique index if not exists uniq_cart_session_product on public.cart_items(session_id, product_id) where session_id is not null;
create unique index if not exists uniq_cart_customer_product on public.cart_items(customer_id, product_id) where customer_id is not null;

-- Wishlist (session-scoped)
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  customer_id uuid references public.customers(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  check ((session_id is not null) or (customer_id is not null))
);
create index if not exists idx_wishlist_session on public.wishlist_items(session_id);
create index if not exists idx_wishlist_customer on public.wishlist_items(customer_id);
create unique index if not exists uniq_wishlist_session_product on public.wishlist_items(session_id, product_id) where session_id is not null;
create unique index if not exists uniq_wishlist_customer_product on public.wishlist_items(customer_id, product_id) where customer_id is not null;

-- OTP table for mobile authentication
create table if not exists public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp_code text not null,
  expires_at timestamptz not null,
  verified boolean default false,
  attempts int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_otp_phone on public.otp_verifications(phone);
create index if not exists idx_otp_expires on public.otp_verifications(expires_at);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  label text,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'IN'
);

-- Session-scoped checkout address support (guest users)
alter table public.addresses add column if not exists session_id text;
alter table public.addresses add column if not exists name text;
alter table public.addresses add column if not exists phone text;
alter table public.addresses add column if not exists area text;
alter table public.addresses add column if not exists landmark text;
alter table public.addresses add column if not exists address_type text default 'HOME';
alter table public.addresses add column if not exists is_default boolean default false;
alter table public.addresses add column if not exists created_at timestamptz default now();
create index if not exists idx_addresses_session on public.addresses(session_id);

-- Addresses RLS and open policies for anon (session-scoped guest checkout)
alter table public.addresses enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='addresses' and policyname='Public read addresses') then
    create policy "Public read addresses" on public.addresses for select to anon using (true);
  end if;
end $$;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='addresses' and policyname='Public write addresses') then
    create policy "Public write addresses" on public.addresses for insert to anon with check (true);
  end if;
end $$;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='addresses' and policyname='Public update addresses') then
    create policy "Public update addresses" on public.addresses for update to anon using (true) with check (true);
  end if;
end $$;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='addresses' and policyname='Public delete addresses') then
    create policy "Public delete addresses" on public.addresses for delete to anon using (true);
  end if;
end $$;

-- Contact messages (public submissions)
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  subject text,
  message text not null,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table public.contact_messages enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contact_messages' and policyname='Public insert contact_messages') then
    create policy "Public insert contact_messages" on public.contact_messages for insert to anon with check (true);
  end if;
end $$;

-- Create enum types if they don't already exist
do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('pending','processing','shipped','delivered','cancelled','returned');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('unpaid','paid','refunded');
  end if;
end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  total_cents int not null default 0,
  currency text not null default 'inr',
  shipping_address jsonb,
  made_to_order boolean default false,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  unit_amount_cents int not null,
  quantity int not null default 1,
  attributes jsonb default '{}'::jsonb
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null,
  value int not null,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean default true
);

-- Tell PostgREST to refresh its schema cache (Supabase edge)
select pg_notify('pgrst', 'reload schema');

-- -----------------------------
-- Public read policies for ecommerce
-- -----------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Public read categories') then
    create policy "Public read categories" on public.categories for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='products' and policyname='Public read products') then
    create policy "Public read products" on public.products for select to anon using (deleted_at is null);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='product_images' and policyname='Public read product_images') then
    create policy "Public read product_images" on public.product_images for select to anon using (true);
  end if;
end $$;

-- Simple RBAC scaffold
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  role_id uuid references public.roles(id) on delete cascade
);


-- Variants / Options
create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  name text not null,
  values text[] not null default '{}'
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  sku text,
  attributes jsonb not null default '{}'::jsonb,
  price_cents int,
  stock int default 0,
  is_active boolean default true
);

-- Ensure required columns exist for existing installations
alter table public.product_variants add column if not exists stock int default 0;
alter table public.product_variants add column if not exists is_active boolean default true;

create or replace function public.sync_variant_active()
returns trigger
language plpgsql
as $$
begin
  if new.stock is null then new.stock := 0; end if;
  new.is_active := (new.stock > 0);
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_product_variants_sync_active') then
    create trigger trg_product_variants_sync_active
    before insert or update of stock on public.product_variants
    for each row execute function public.sync_variant_active();
  end if;
end $$;

