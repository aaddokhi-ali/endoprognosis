// app/terms/page.tsx
"use client";
import Image from "next/image";
import Link from "next/link";

export default function TermsOfService() {
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

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
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
            Terms of Service
          </h1>
          <p className="text-center text-gray-400 mb-12">Last Updated: May 05, 2026</p>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Endoprognosis, you agree to be bound by these Terms of Service 
                and our Privacy Policy. If you do not agree, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Purpose of the Tool</h2>
              <p>
                Endoprognosis is an assistive decision-support tool designed to aid dental professionals 
                in endodontic prognosis prediction, cracked tooth classification, and dental trauma management. 
                It is <strong>NOT</strong> a substitute for professional clinical judgment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You are solely responsible for all clinical decisions made regarding patient care.</li>
                <li>You must exercise your own professional clinical judgment at all times.</li>
                <li>You are fully responsible for any patient data you enter into the tool.</li>
                <li>You agree to use the tool only for legitimate professional purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. No Medical Advice</h2>
              <p className="text-rose-300">
                The outputs provided by Endoprognosis are for informational and supportive purposes only. 
                Endoprognosis and its owners shall bear no liability for any diagnosis, treatment, or clinical 
                outcome resulting from the use or non-use of this tool.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Account and Security</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account and password. 
                You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Endoprognosis shall not be liable for any direct, 
                indirect, incidental, special, consequential, or punitive damages arising out of your use 
                of the tool.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Governing Law</h2>
              <p>
                These Terms shall be governed by the laws of the Kingdom of Saudi Arabia. 
                Any disputes shall be subject to the exclusive jurisdiction of the courts in Dammam.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of significant 
                changes by posting the new Terms on this page.
              </p>
            </section>
          </div>

          <div className="mt-16 text-center">
            <Link 
              href="/register"
              className="inline-block bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold px-12 py-4 rounded-2xl text-lg transition"
            >
              Back to Registration
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
        </div>
        <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
      </div>
    </div>
  );
}