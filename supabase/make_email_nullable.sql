-- Make email column nullable in customers table (for phone-only authentication)

do $$
begin
  -- Check if email column exists and is NOT NULL
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'customers' 
    and column_name = 'email'
    and is_nullable = 'NO'
  ) then
    -- Make email nullable
    alter table public.customers alter column email drop not null;
    
    -- Remove unique constraint on email if it exists (since we want to allow nulls)
    -- We'll keep unique constraint but allow multiple nulls
    -- PostgreSQL allows multiple NULLs in unique columns by default
  end if;
end $$;

