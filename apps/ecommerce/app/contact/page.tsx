import { ContactForm } from '@/components/contact-form';

export default function ContactPage() {
  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <h1 className="text-xl sm:text-2xl font-semibold">Contact Us</h1>
      <p className="mt-2 text-sm sm:text-base text-neutral-400">We usually respond within 24 hours.</p>
      <ContactForm />
    </div>
  );
}


