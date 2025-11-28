import { redirect } from 'next/navigation';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { ProfileEditForm } from '@/components/account/profile-edit-form';

async function getCustomerData(userId: string) {
  const adminSupabase = getSupabaseAdminClient();
  
  // Try with name first, fallback to without name if column doesn't exist
  let result = await adminSupabase
    .from('customers')
    .select('id, name, email, phone, created_at')
    .eq('id', userId)
    .maybeSingle();
  
  if (result.error && (result.error.message?.includes('name') || result.error.code === '42703')) {
    // Try without name column
    result = await adminSupabase
      .from('customers')
      .select('id, email, phone, created_at')
      .eq('id', userId)
      .maybeSingle();
  }
  
  if (result.error || !result.data) return null;
  
  // Ensure name field exists
  const customer = result.data as any;
  if (!('name' in customer)) {
    customer.name = null;
  }
  
  return customer;
}

export default async function ProfileEditPage() {
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?redirect=/account/profile');
  }

  const authPayload = await verifyAuthToken(token);
  if (!authPayload?.userId) {
    redirect('/login?redirect=/account/profile');
  }

  const customer = await getCustomerData(authPayload.userId);

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <div className="mb-4">
        <a href="/account" className="text-sm text-neutral-400 hover:text-white">
          ← Back to Account
        </a>
      </div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Edit Profile</h1>
      
      {customer ? (
        <ProfileEditForm initialData={customer} />
      ) : (
        <p className="text-sm text-neutral-400">Loading profile...</p>
      )}
    </div>
  );
}

