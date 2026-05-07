// app/privacy/page.tsx
"use client";
import Image from "next/image";
import Link from "next/link";

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="text-center text-gray-400 mb-12">Last Updated: May 04, 2026</p>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p>
                Welcome to Endoprognosis. We are committed to protecting your privacy and ensuring the security of your data. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, password (encrypted), and profession when you register.</li>
                <li><strong>Case Data:</strong> Dental case information you voluntarily input (tooth number, clinical findings, etc.). This data is stored securely.</li>
                <li><strong>Usage Data:</strong> How you interact with the tool (anonymized analytics).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and improve the Endoprognosis decision-support tool</li>
                <li>Send email verification and important service notifications</li>
                <li>Save your cases so you can access them later</li>
                <li>Analyze usage patterns to improve the tool (anonymized)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Patient Data &amp; Responsibility</h2>
              <p className="text-rose-300 font-medium">
                You are fully responsible for any patient data you enter into Endoprognosis. 
                We strongly recommend using anonymized or fictional data for testing and demonstration purposes.
              </p>
              <p className="mt-4">
                We do not access, review, or use your patient data for any purpose other than providing the service. 
                Anonymized and aggregated data may be used for research and tool improvement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Data Sharing</h2>
              <p>We do <strong>not</strong> sell, rent, or share your personal or case data with third parties for marketing purposes.</p>
              <p>We may share data only in these cases:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect the rights and safety of Endoprognosis and its users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your data, including encryption, 
                secure servers, and regular security reviews. However, no system is completely impenetrable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access, update, or delete your account data</li>
                <li>Request deletion of your cases</li>
                <li>Withdraw consent where applicable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:<br />
                <strong className="text-white">support@endoprognosis.com</strong>
              </p>
            </section>
          </div>

          <div className="mt-16 text-center">
            <Link 
              href="/home"
              className="inline-block bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold px-12 py-4 rounded-2xl text-lg transition"
            >
              Back to Home
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