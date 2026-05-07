// app/contact/page.tsx
"use client";
import Navigation from "../components/navigation";
import Image from "next/image";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://iili.io/B6uUNfI.jpg"
          alt="Endoprognosis Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10">
        <Navigation />

        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="flex justify-center mb-10">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={240}
              height={80}
              className="h-16 w-auto drop-shadow-lg"
              priority
            />
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-2xl">
            <h1 className="text-5xl font-serif tracking-wider text-white text-center mb-4">
              Contact Us
            </h1>
            <p className="text-center text-gray-400 mb-12">We'd love to hear from you</p>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Left Column - Contact Info */}
              <div>
                <h2 className="text-3xl font-semibold mb-8 text-[#10b981]">Get in Touch</h2>
                
                <div className="space-y-10">
                  <div>
                    <h3 className="text-xl font-medium mb-4 text-white">Project Owner &amp; Clinical Inquiries</h3>
                    <a 
                      href="mailto:aaddokhi@endoprognosis.org" 
                      className="text-lg text-white hover:text-[#10b981] transition flex items-center gap-3"
                    >
                      ✉️ aaddokhi@endoprognosis.org
                    </a>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium mb-4 text-white">General Support</h3>
                    <a 
                      href="mailto:support@endoprognosis.org" 
                      className="text-lg text-white hover:text-[#10b981] transition flex items-center gap-3"
                    >
                      ✉️ support@endoprognosis.org
                    </a>
                  </div>

                  <div>
                    <h3 className="text-xl font-medium mb-4 text-white">Information &amp; Partnership</h3>
                    <a 
                      href="mailto:info@endoprognosis.org" 
                      className="text-lg text-white hover:text-[#10b981] transition flex items-center gap-3"
                    >
                      ✉️ info@endoprognosis.org
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Column - Message Box */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
                <h3 className="text-2xl font-medium mb-6 text-white">Send us a message</h3>
                <p className="text-gray-400 leading-relaxed mb-8">
                  Whether you have questions about the tools, feedback, partnership inquiries, 
                  or clinical suggestions, feel free to reach out. We typically respond within 48 hours.
                </p>
                
                <div className="text-sm text-gray-400 space-y-4">
                  <p>📍 Dammam, Kingdom of Saudi Arabia</p>
                  <p>⏰ Business Hours: 9:00 AM – 5:00 PM (KSA Time)</p>
                  <p>📧 We reply to all emails as soon as possible</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link 
              href="/home" 
              className="inline-block bg-[#10b981] hover:bg-[#0ea76e] text-black px-12 py-5 rounded-2xl text-xl font-semibold transition"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
          <Link href="/about" className="hover:text-white transition">About</Link>
          <Link href="/references" className="hover:text-white transition">References</Link>
          <Link href="/how-to-use" className="hover:text-white transition">How to Use</Link>
          <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
          <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
        </div>
        <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
      </div>
    </div>
  );
}