import { createClient } from '@supabase/supabase-js';

type Database = any; // Replace with generated types if available

export function getSupabaseAdminClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !service) {
		throw new Error('Supabase admin env vars are not set');
	}
	return createClient<Database>(url, service, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}


