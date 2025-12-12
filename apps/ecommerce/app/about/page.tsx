export default function AboutPage() {
  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-6">About Us</h1>
        
        <div className="space-y-6 text-neutral-300">
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-neutral-200">Welcome to She Designer</h2>
            <p className="text-sm sm:text-base leading-relaxed">
              She Designer is your premier destination for premium ethnic wear and made-to-order fashion. 
              We specialize in creating beautiful, high-quality traditional and contemporary clothing that 
              celebrates your unique style and heritage.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-neutral-200">Our Mission</h2>
            <p className="text-sm sm:text-base leading-relaxed">
              Our mission is to provide you with exquisite ethnic wear that combines traditional craftsmanship 
              with modern design sensibilities. We believe that every piece of clothing should tell a story 
              and make you feel confident and beautiful.
            </p>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-neutral-200">What We Offer</h2>
            <ul className="space-y-3 text-sm sm:text-base">
              <li className="flex items-start gap-3">
                <span className="text-pink-600 mt-1">•</span>
                <span><strong className="text-neutral-200">Premium Ethnic Wear:</strong> From elegant sarees and lehengas to stylish kurtis and suits, we offer a wide range of traditional clothing.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-pink-600 mt-1">•</span>
                <span><strong className="text-neutral-200">Made-to-Order Options:</strong> Customize your outfits to perfectly fit your style and measurements.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-pink-600 mt-1">•</span>
                <span><strong className="text-neutral-200">Quality Craftsmanship:</strong> Each piece is carefully crafted with attention to detail and quality.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-pink-600 mt-1">•</span>
                <span><strong className="text-neutral-200">Worldwide Shipping:</strong> We ship our products globally, bringing our designs to customers around the world.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-neutral-200">Our Commitment</h2>
            <p className="text-sm sm:text-base leading-relaxed">
              At She Designer, we are committed to providing exceptional customer service, high-quality products, 
              and a seamless shopping experience. Your satisfaction is our priority, and we strive to exceed your 
              expectations with every order.
            </p>
          </section>

          <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-neutral-200">Get in Touch</h2>
            <div className="space-y-3 text-sm sm:text-base text-neutral-400">
              <p>
                <strong className="text-neutral-200">Email:</strong>{' '}
                <a href="mailto:blushbymounika@gmail.com" className="text-pink-600 hover:text-pink-500 underline">
                  blushbymounika@gmail.com
                </a>
              </p>
              <p>
                <strong className="text-neutral-200">Phone:</strong>{' '}
                <a href="tel:+918688198880" className="text-pink-600 hover:text-pink-500 underline">
                  +91‑8688198880
                </a>
                {' '}(Calls only between 11AM–8PM IST, Mon–Sat)
              </p>
              <p>
                <strong className="text-neutral-200">Address:</strong><br />
                Shop No:1, Jayaramaiah complex, Opp. IOB bank, Apsara circle,<br />
                Kadapa – 516002
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

