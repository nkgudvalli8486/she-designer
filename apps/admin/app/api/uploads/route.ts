import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const BUCKET_ID = 'product-images';

export async function POST(req: NextRequest) {
	const supabase = getSupabaseAdminClient(); // requires SUPABASE_SERVICE_ROLE_KEY

	// Ensure bucket exists (first run bootstrap)
	const { data: bucketInfo } = await supabase.storage.getBucket(BUCKET_ID);
	if (!bucketInfo) {
		const { error: createErr } = await supabase.storage.createBucket(BUCKET_ID, {
			public: true
		});
		if (createErr) {
			return NextResponse.json({ error: `Bucket init failed: ${createErr.message}` }, { status: 400 });
		}
	}

	const form = await req.formData();
	const files = form.getAll('files') as File[];
	if (!files.length) {
		return NextResponse.json({ error: 'No files provided' }, { status: 400 });
	}
	const bucket = supabase.storage.from(BUCKET_ID);
	const uploaded: string[] = [];
	for (const file of files) {
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const safeName = (file.name || 'image').replace(/[^\w.\-]/g, '_');
		const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
		const { error } = await bucket.upload(path, buffer, {
			contentType: file.type || 'application/octet-stream',
			upsert: false
		});
		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		const { data } = bucket.getPublicUrl(path);
		uploaded.push(data.publicUrl);
	}
	return NextResponse.json({ urls: uploaded }, { status: 201 });
}


