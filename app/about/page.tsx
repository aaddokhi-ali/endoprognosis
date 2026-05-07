// app/about/page.tsx
"use client";
import Navigation from "../components/navigation";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
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
              About Endoprognosis
            </h1>
            <p className="text-center text-gray-400 mb-12">Supporting Better Clinical Decisions in Endodontics</p>

            <div className="prose prose-invert max-w-none text-gray-300 space-y-8 text-[17.5px] leading-relaxed">
              <p>
                When receiving a case that requires endodontic management, making the right decision is never simple. 
                It requires a thorough understanding of all the factors that determine the long-term survivability of the tooth.
              </p>

              <p>
                Endodontic treatment cannot prevent the progression of periodontal disease or accelerate bone healing. 
                It is a necessary intervention that aims to reduce the microbial load within the root canal system that initiates or sustains endodontic disease.
              </p>

              <h2 className="text-3xl font-bold text-[#10b981] mt-16 mb-6">Our Mission</h2>
              <p>
                The Endodontic Prognosis Calculator is not just about numbers. It is about helping the clinician replicate 
                the systematic thinking needed to see the full picture.
              </p>
              <p>
                This project is a growing movement supported by evidence, designed to assist both clinicians and patients 
                in making informed decisions about whether to proceed with treatment or consider alternative modalities.
              </p>

              <h2 className="text-3xl font-bold text-[#10b981] mt-16 mb-6">Creator</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                <Image
                  src="https://iili.io/BZoXlr7.jpg"
                  alt="Dr. Ali M. Addokhi"
                  width={180}
                  height={180}
                  className="mx-auto rounded-full mb-6 object-cover border-4 border-[#10b981]"
                />
                <p className="text-2xl font-semibold mb-2">Dr. Ali M. Addokhi</p>
                <p className="text-[#94a3b8] mb-6">Endodontist</p>
                <a 
                  href="mailto:aaddokhi@endoprognosis.org" 
                  className="text-[#10b981] hover:underline text-lg"
                >
                  aaddokhi@endoprognosis.org
                </a>
              </div>

              <div className="mt-16 p-10 bg-white/5 border border-white/10 rounded-2xl text-center">
                <p className="italic text-lg text-gray-300">
                  Thank you for visiting the Endoprognosis Project.<br />
                  Your feedback is highly valued and will help us improve the tool.
                </p>
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

        {/* Support Email */}
  <div className="mt-6 text-xs">
    Need help? Contact us at{" "}
    <a href="mailto:support@endoprognosis.org" className="text-[#10b981] hover:underline">
      support@endoprognosis.org
    </a>
  </div>
  
        <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
      </div>
    </div>
  );
}