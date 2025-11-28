-- Add name column to customers table if it doesn't exist

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'customers' 
    and column_name = 'name'
  ) then
    alter table public.customers add column name text;
  end if;
end $$;

