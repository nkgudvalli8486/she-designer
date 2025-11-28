'use client';

import Link from 'next/link';

export function Footer() {
	return (
		<footer className="mt-16 border-t border-neutral-800 text-neutral-200">
			<section className="container py-8 sm:py-12 px-4 sm:px-6">
				<div className="grid gap-4 sm:gap-6 md:grid-cols-3">
					<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
						<div className="text-xl font-semibold">E-mail</div>
						<p className="mt-2 text-sm text-neutral-400">
							Email: <a href="mailto:blushbymounika@gmail.com">blushbymounika@gmail.com</a>
						</p>
					</div>
					<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
						<div className="text-xl font-semibold">Mobile</div>
						<p className="mt-2 text-sm text-neutral-400">
							Calls only btw (11AM–8PM IST Mon–Sat): <a href="tel:+918688198880">+91‑8688198880</a>
						</p>
					</div>
					<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
						<div className="text-xl font-semibold">Operational Address</div>
						<p className="mt-2 text-sm text-neutral-400">
							Shop No:1, Jayaramaiah complex, Opp. IOB bank, Apsara circle,<br />
							Kadapa – 516002
						</p>
					</div>
				</div>
			</section>

			<section className="border-t border-neutral-800 bg-neutral-900">
				<div className="container py-8 sm:py-12 px-4 sm:px-6">
					<div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
						<div>
							<div className="text-xl font-semibold">She Designer</div>
							<p className="mt-2 text-sm text-neutral-400">
								Premium ethnic wear & made‑to‑order fashion.
							</p>
						</div>
						<div>
							<div className="mb-3 font-semibold">USEFUL LINKS</div>
							<ul className="space-y-2 text-sm text-neutral-400">
								<li><Link href={"/policies/cookie-policy" as any} className="hover:text-white">Cookie Policy</Link></li>
								<li><Link href={"/policies/privacy-policy" as any} className="hover:text-white">Privacy Policy</Link></li>
								<li><Link href={"/policies/shipping-policy" as any} className="hover:text-white">Shipping Policy</Link></li>
								<li><Link href={"/policies/terms" as any} className="hover:text-white">Terms & Conditions</Link></li>
								<li><Link href={"/policies/refunds" as any} className="hover:text-white">Refunds & Returns</Link></li>
							</ul>
						</div>
						<div>
							<div className="mb-3 font-semibold">QUICK LINKS</div>
							<ul className="space-y-2 text-sm text-neutral-400">
								<li><Link href={"/about" as any} className="hover:text-white">About Us</Link></li>
								<li><Link href="/collections/clothing" className="hover:text-white">Clothing</Link></li>
								<li><Link href="/collections/accessories" className="hover:text-white">Accessories</Link></li>
							</ul>
						</div>
						<div>
							<div className="mb-3 font-semibold">ORDER INFORMATION</div>
							<ul className="space-y-2 text-sm text-neutral-400">
								<li><Link href="/account" className="hover:text-white">My Account</Link></li>
								<li><Link href={"/gift-card" as any} className="hover:text-white">Gift Cards</Link></li>
								<li><Link href="/collections/offers" className="hover:text-white">Latest Offers</Link></li>
								<li><Link href={"/order-tracking" as any} className="hover:text-white">Order Tracking</Link></li>
							</ul>
						</div>
					</div>

					<div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800 pt-6 text-xs sm:text-sm text-neutral-400">
						<div>© {new Date().getFullYear()} — All Rights Reserved</div>
						<div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 opacity-80">
							<span>GPay</span>
							<span>UPI</span>
							<span>VISA</span>
							<span>Mastercard</span>
							<span>RuPay</span>
						</div>
					</div>
				</div>
			</section>
		</footer>
	);
}


