import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function GET() {
	const supabase = getSupabaseAdminClient();
	const { data, error } = await supabase.storage.from('product-images').list('', {
		limit: 100,
		sortBy: { column: 'name', order: 'asc' }
	});
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	const urls = (data ?? []).map((f) => supabase.storage.from('product-images').getPublicUrl(f.name).data.publicUrl);
	return NextResponse.json({ data: urls });
}


