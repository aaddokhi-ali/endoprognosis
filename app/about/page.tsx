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
          alt=""
          role="presentation"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10">
        <Navigation />

        <div className="max-w-4xl mx-auto px-6 py-20">
          {/* Logo */}
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

            {/* Page Header */}
            <h1 className="text-5xl font-serif tracking-wider text-white text-center mb-3">
              About Endoprognosis
            </h1>
            <p className="text-center text-gray-400 mb-16 text-lg">
              Helping clinicians make evidence-based decisions in endodontic prognosis.
            </p>

            <div className="space-y-14 text-gray-300 text-[17.5px] leading-relaxed">

              {/* What Is Endoprognosis */}
              <section>
                <h2 className="text-2xl font-bold text-[#10b981] mb-4">What Is Endoprognosis?</h2>
                <p className="mb-4">
                  Endoprognosis is a clinical decision-support tool designed to help dentists and 
                  endodontists systematically evaluate the long-term prognosis of a tooth requiring 
                  endodontic treatment.
                </p>
                <p>
                  Rather than relying on intuition alone, it guides you through the key clinical, 
                  radiographic, and periodontal factors that determine whether a tooth is worth treating.
                </p>
              </section>

              <div className="border-t border-white/10" />

              {/* Why It Exists */}
              <section>
                <h2 className="text-2xl font-bold text-[#10b981] mb-4">Why It Exists</h2>
                <p className="mb-4">
                  Deciding whether to treat, retreat, or extract is one of the most consequential 
                  judgments in clinical dentistry. Too often, that decision is made without a structured 
                  framework, leading to under-treatment, over-treatment, or poor patient expectations.
                </p>
                <p>
                  Endoprognosis was built to change that. By systematically weighing the factors that 
                  matter most, it helps clinicians see the full picture before committing to a treatment path.
                </p>
              </section>

              <div className="border-t border-white/10" />

              {/* Our Approach */}
              <section>
                <h2 className="text-2xl font-bold text-[#10b981] mb-4">Our Approach</h2>
                <p>
                  Endoprognosis provides an evidence-based estimation of endodontic prognosis. 
                  It is designed to support your clinical judgment, not replace it.
                </p>
              </section>

              <div className="border-t border-white/10" />

              {/* Creator */}
              <section>
                <h2 className="text-2xl font-bold text-[#10b981] mb-8">Creator</h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                    <div className="shrink-0">
                      <Image
                        src="https://iili.io/BZoXlr7.jpg"
                        alt="Dr. Ali M. Addokhi"
                        width={150}
                        height={150}
                        className="rounded-full object-cover border-4 border-[#10b981]"
                      />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-2xl font-semibold text-white mb-1">Dr. Ali M. Addokhi</p>
                      <p className="text-[#10b981] font-medium mb-1">Endodontist</p>
                      <p className="text-gray-400 text-sm mb-5">Dammam Specialized Dental Center</p>
                      <p className="text-gray-300 leading-relaxed mb-6">
                        Dr. Addokhi is a certified endodontist and a graduate of the postgraduate 
                        endodontic program at Imam Abdulrahman Bin Faisal University, Dammam. With a 
                        clinical focus on complex root canal treatments and microsurgical endodontics, 
                        he has dedicated his career to preserving natural teeth through precision and 
                        evidence-based care. He is also an active researcher, with published work in 
                        peer-reviewed journals on endodontic techniques and the future of dental technology.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <a
                          href="mailto:aaddokhi@endoprognosis.org"
                          className="inline-flex items-center gap-2 text-[#10b981] hover:underline text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          aaddokhi@endoprognosis.org
                        </a>
                        <span className="hidden sm:inline text-white/20">|</span>
                        <a
                          href="https://www.researchgate.net/profile/Ali-Addokhi"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[#10b981] hover:underline text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View publications on ResearchGate
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="border-t border-white/10" />

              {/* A Note to Clinicians */}
              <section>
                <h2 className="text-2xl font-bold text-[#10b981] mb-4">A Note to Clinicians</h2>
                <p>
                  Endoprognosis is a living project. As the evidence evolves, so will the tool. 
                  If you have feedback, spot an inconsistency, or want to contribute to its 
                  development, we want to hear from you.
                </p>
              </section>

            </div>

            {/* Back Button */}
            <div className="text-center mt-16">
              <Link
                href="/home"
                className="inline-block bg-[#10b981] hover:bg-[#0ea76e] text-black px-12 py-5 rounded-2xl text-xl font-semibold transition"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
          <Link href="/about" className="hover:text-white transition">About</Link>
          <Link href="/references" className="hover:text-white transition">References</Link>
          <Link href="/how-to-use" className="hover:text-white transition">How to Use</Link>
          <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
          <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
        </div>
        <div className="mt-4 text-xs">
          Need help? Contact us at{" "}
          <a href="mailto:support@endoprognosis.org" className="text-[#10b981] hover:underline">
            support@endoprognosis.org
          </a>
        </div>
        <p className="mt-4 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
      </div>
    </div>
  );
}