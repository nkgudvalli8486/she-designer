import { createClient } from '@supabase/supabase-js';

type Database = any; // Replace with generated types if available

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase env vars are not set');
  }
  return createClient<Database>(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}


