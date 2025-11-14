import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const SEED = [
  { name: 'Sarees', slug: 'sarees', image_url: '/categories/sarees.jpg' },
  { name: 'Kurtis', slug: 'kurtis', image_url: '/categories/kurtis.jpg' },
  { name: 'Lehengas', slug: 'lehengas', image_url: '/categories/lehengas.jpg' },
  { name: 'Suits', slug: 'suits', image_url: '/categories/suits.jpg' }
];

export async function POST() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from('categories').upsert(SEED, { onConflict: 'slug' }).select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}


