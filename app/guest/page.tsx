"use client";
import Navigation from "../components/navigation";
import OnboardingTour from "../components/OnboardingTour";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY  = "guestUsesLeft";
const MAX_USES     = 3;

export default function GuestPage() {
  const router = useRouter();
  const [usesLeft, setUsesLeft] = useState<number | null>(null);

  // Read cached uses from localStorage (set by useGuestUsage hook after each result)
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    setUsesLeft(cached !== null ? parseInt(cached) : MAX_USES);
  }, []);

  const usageColor =
    usesLeft === null   ? "#10b981"
    : usesLeft >= 2     ? "#10b981"
    : usesLeft === 1    ? "#f59e0b"
    : "#ef4444";

  const usageLabel =
    usesLeft === null   ? "3 of 3 uses remaining"
    : usesLeft === 0    ? "No uses remaining — please sign up"
    : `${usesLeft} of ${MAX_USES} uses remaining this month`;

  return (
    <>
      <Navigation />
      <OnboardingTour />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Hero */}
        <div className="relative h-[380px] sm:h-[420px] bg-cover bg-center"
             style={{ backgroundImage: "url('https://iili.io/B6uUNfI.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-[#0a1428]" />

          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={260}
              height={80}
              className="mb-6 h-14 sm:h-16 w-auto"
              priority
            />
            <h1 className="text-4xl sm:text-5xl font-serif mb-3">Guest Mode</h1>
            <p className="text-xl text-amber-400">Limited Access</p>
            <p className="text-gray-300 mt-2 text-base sm:text-lg">Try the tools before creating an account</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

          {/* Status + Usage Badge */}
          <div className="text-center mb-12 space-y-3">
            <div className="inline-block bg-amber-500/10 border border-amber-500 text-amber-400 px-6 py-2 rounded-full text-sm">
              You are browsing as Guest
            </div>

            {/* Usage badge — tour target */}
            <div id="tour-usage-badge" className="flex justify-center">
              <div
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-medium border"
                style={{
                  background: `${usageColor}12`,
                  borderColor: `${usageColor}35`,
                  color: usageColor,
                }}
              >
                {/* Pip indicators */}
                <div className="flex gap-1">
                  {Array.from({ length: MAX_USES }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{
                        background: i < (usesLeft ?? MAX_USES) ? usageColor : "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
                <span>{usageLabel}</span>
              </div>
            </div>

            <p className="text-gray-400 max-w-md mx-auto text-sm">
              You can use EPP and CTC. Create a free account to save cases and unlock future tools.
            </p>
          </div>

          {/* Tool Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

            {/* EPP Card — tour target */}
            <div
              id="tour-epp-card"
              onClick={() => router.push("/predictor")}
              className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-[#10b981] cursor-pointer transition-all"
            >
              <div className="relative h-64">
                <Image src="https://iili.io/Bw4dt99.jpg" alt="EPP" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <div className="p-6 sm:p-10">
                <h3 className="text-3xl font-semibold mb-4">Endodontic Prognosis Predictor</h3>
                <p className="text-gray-400">4-year survival estimation and treatment recommendations</p>
                <div className="mt-8 text-[#10b981] font-semibold group-hover:underline">Try EPP →</div>
              </div>
            </div>

            {/* Dental Trauma Center — locked */}
            <div className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden opacity-75 cursor-not-allowed relative">
              <div className="relative h-64">
                <Image
                  src="https://iili.io/BLMUZYv.jpg"
                  alt="Dental Trauma Center"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <div className="p-6 sm:p-10">
                <h3 className="text-3xl font-semibold mb-4">Dental Trauma Center</h3>
                <p className="text-gray-400">Evidence-based guides for traumatic dental injuries</p>
                <div className="mt-8 inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-5 py-2.5 rounded-2xl text-sm font-medium">
                  🔒 Sign up to unlock
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-3xl">
                <button
                  onClick={() => router.push("/login")}
                  className="bg-white text-black px-8 py-3 rounded-2xl font-semibold hover:bg-amber-400 transition"
                >
                  Create Free Account
                </button>
              </div>
            </div>

            {/* CTC Card — tour target */}
            <div
              id="tour-ctc-card"
              onClick={() => router.push("/crack-classifier")}
              className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-[#10b981] cursor-pointer transition-all"
            >
              <div className="relative h-64">
                <Image src="https://iili.io/BwkLI0N.jpg" alt="CTC" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <div className="p-6 sm:p-10">
                <h3 className="text-3xl font-semibold mb-4">Crack Tooth Classifier</h3>
                <p className="text-gray-400">Crack detection and Iowa classification</p>
                <div className="mt-8 text-[#10b981] font-semibold group-hover:underline">Try CTC →</div>
              </div>
            </div>
          </div>

          {/* Signup CTA — tour target */}
          <div className="mt-16 text-center">
            <button
              id="tour-signup-btn"
              onClick={() => router.push("/login")}
              className="bg-[#10b981] hover:bg-white text-black px-10 sm:px-12 py-4 rounded-2xl text-lg font-semibold transition w-full sm:w-auto"
            >
              Create Free Account → Full Access
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap justify-center gap-x-6 sm:gap-x-8 gap-y-2">
            <Link href="/about"      className="hover:text-white transition">About</Link>
            <Link href="/references" className="hover:text-white transition">References</Link>
            <Link href="/how-to-use" className="hover:text-white transition">How to Use</Link>
            <Link href="/contact"    className="hover:text-white transition">Contact Us</Link>
            <Link href="/privacy"    className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms"      className="hover:text-white transition">Terms of Service</Link>
          </div>
          <div className="mt-6 text-xs">
            Need help? Contact us at{" "}
            <a href="mailto:support@endoprognosis.org" className="text-[#10b981] hover:underline">
              support@endoprognosis.org
            </a>
          </div>
          <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
        </div>
      </div>
    </>
  );
}