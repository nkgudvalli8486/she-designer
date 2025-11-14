import { createClient } from '@supabase/supabase-js';

let client:
  | ReturnType<typeof createClient<Database>>
  | undefined;

type Database = any; // Replace with generated types if available

export function getSupabaseBrowserClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase env vars are not set');
  }
  client = createClient<Database>(url, anon);
  return client;
}


