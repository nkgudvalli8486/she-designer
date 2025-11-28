import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Topbar } from '@/components/topbar';
import { Footer } from '@/components/footer';
import { CurrencyProvider } from '@/components/currency-context';

export const metadata: Metadata = {
  title: 'She Designer – Shop',
  description: 'Premium ethnic wear and made-to-order fashion.'
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-black via-neutral-900 to-black text-white">
        <CurrencyProvider>
          <Topbar />
          <Navbar />
          {props.children}
          <Footer />
        </CurrencyProvider>
      </body>
    </html>
  );
}


