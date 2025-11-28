import { redirect } from 'next/navigation';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import Link from 'next/link';

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

export default async function AccountPage() {
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?redirect=/account');
  }

  const authPayload = await verifyAuthToken(token);
  if (!authPayload?.userId) {
    redirect('/login?redirect=/account');
  }

  const customer = await getCustomerData(authPayload.userId);

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">My Account</h1>
      
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          {customer ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-neutral-400">Name:</span>
                <span className="ml-2">{customer.name || 'Not set'}</span>
              </div>
              <div>
                <span className="text-neutral-400">Phone:</span>
                <span className="ml-2">{customer.phone || 'Not set'}</span>
              </div>
              <div>
                <span className="text-neutral-400">Email:</span>
                <span className="ml-2">{customer.email || 'Not set'}</span>
              </div>
              <div className="pt-4 border-t border-neutral-800">
                <Link
                  href="/account/profile"
                  className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">Loading profile...</p>
          )}
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            <Link href="/cart" className="block text-sm text-neutral-400 hover:text-white">
              View Cart
            </Link>
            <Link href="/checkout" className="block text-sm text-neutral-400 hover:text-white">
              Checkout
            </Link>
            <Link href="/contact" className="block text-sm text-neutral-400 hover:text-white">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

