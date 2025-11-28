-- Make session_id nullable in cart_items table (for authenticated users)

do $$
begin
  -- Check if session_id has NOT NULL constraint
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'cart_items' 
    and column_name = 'session_id'
    and is_nullable = 'NO'
  ) then
    -- Make session_id nullable
    alter table public.cart_items alter column session_id drop not null;
  end if;
end $$;

-- Also fix wishlist_items if needed
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'wishlist_items' 
    and column_name = 'session_id'
    and is_nullable = 'NO'
  ) then
    alter table public.wishlist_items alter column session_id drop not null;
  end if;
end $$;

