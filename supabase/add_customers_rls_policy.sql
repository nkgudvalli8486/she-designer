-- Add RLS policies for customers table to allow inserts during authentication
-- This allows anonymous users to create customer records during OTP verification

-- Enable RLS on customers table
alter table public.customers enable row level security;

-- Allow anonymous users to insert customer records (for OTP signup)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'customers' 
    and policyname = 'Allow anonymous insert customers'
  ) then
    create policy "Allow anonymous insert customers" 
    on public.customers 
    for insert 
    to anon 
    with check (true);
  end if;
end $$;

-- Allow users to read their own customer record
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'customers' 
    and policyname = 'Users can read own customer'
  ) then
    create policy "Users can read own customer" 
    on public.customers 
    for select 
    to authenticated 
    using (auth.uid() = auth_user_id);
  end if;
end $$;

-- Allow users to update their own customer record
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'customers' 
    and policyname = 'Users can update own customer'
  ) then
    create policy "Users can update own customer" 
    on public.customers 
    for update 
    to authenticated 
    using (auth.uid() = auth_user_id)
    with check (auth.uid() = auth_user_id);
  end if;
end $$;

