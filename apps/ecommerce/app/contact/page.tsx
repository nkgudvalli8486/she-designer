import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { Button } from '@nts/ui';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us – Blush by Mounika',
  description: 'Get in touch with our team for support, orders, and partnerships.'
};

async function submitContact(prevState: any, formData: FormData) {
  'use server';
  const firstName = String(formData.get('firstName') || '').trim();
  const lastName = String(formData.get('lastName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const subject = String(formData.get('subject') || '').trim();
  const message = String(formData.get('message') || '').trim();

  if (!firstName || !email || !subject || !message) {
    return { ok: false, error: 'Please fill all required fields.' };
  }

  // Placeholder: you can insert into Supabase or send email here.
  console.log('Contact message', { firstName, lastName, email, subject, message });

  revalidatePath('/contact');
  return { ok: true };
}

export default async function ContactPage() {
  return (
    <div className="container py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Contact Us</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            <Link href="/">Home</Link> / <span>Contact Us</span>
          </div>
          <p className="mt-6 text-lg">Get in Touch</p>
          <p className="mt-2 text-muted-foreground">
            You can contact us anytime via email or fill up the contact form to get in touch with
            us.
          </p>
        </div>

        <form action={submitContact} className="mt-8 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name *</label>
              <input
                name="firstName"
                required
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="First Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <input
                name="lastName"
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="Last Name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email *</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Email Address"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject *</label>
            <select name="subject" required className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">– Select –</option>
              <option>Order Status</option>
              <option>Return / Exchange</option>
              <option>Custom / Made-to-Order</option>
              <option>Partnerships</option>
              <option>Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Message *</label>
            <textarea
              name="message"
              required
              className="min-h-40 w-full rounded-md border bg-background px-3 py-2"
              placeholder="Your Message"
            />
          </div>
          <Button type="submit" className="px-6">Submit Form</Button>
        </form>
      </div>
    </div>
  );
}


