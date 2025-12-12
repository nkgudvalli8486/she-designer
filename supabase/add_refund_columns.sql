-- Add refund tracking columns to orders table
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists stripe_charge_id text;
alter table public.orders add column if not exists stripe_session_id text;
alter table public.orders add column if not exists refund_amount_cents int default 0;
alter table public.orders add column if not exists refund_amount numeric default 0;
alter table public.orders add column if not exists refund_id text;
alter table public.orders add column if not exists refund_reason text;

-- Refresh schema cache
notify pgrst, 'reload schema';

