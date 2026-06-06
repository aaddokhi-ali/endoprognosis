"use client";
import Navigation from "../components/navigation";
import OnboardingTour from "../components/OnboardingTour";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "guestUsesLeft";
const MAX_USES    = 3;

export default function GuestPage() {
  const router = useRouter();
  const [usesLeft, setUsesLeft] = useState<number | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    setUsesLeft(cached !== null ? parseInt(cached) : MAX_USES);
  }, []);

  const usageColor =
    usesLeft === null ? "#10b981"
    : usesLeft >= 2   ? "#10b981"
    : usesLeft === 1  ? "#f59e0b"
    : "#ef4444";

  const usageLabel =
    usesLeft === null  ? "3 of 3 uses remaining"
    : usesLeft === 0   ? "No uses remaining — please sign up"
    : `${usesLeft} of ${MAX_USES} uses remaining this month`;

  return (
    <>
      <Navigation />
      <OnboardingTour />

      <div className="min-h-screen bg-[#0a1428] text-white">

        {/* ── HERO ── */}
        <div className="relative h-[380px] sm:h-[420px] bg-cover bg-center"
          style={{ backgroundImage: "url('https://iili.io/B6uUNfI.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-[#0a1428]" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={260} height={80}
              className="mb-6 h-14 sm:h-16 w-auto"
              priority
            />
            <h1 className="text-4xl sm:text-5xl font-serif mb-3">Guest Mode</h1>
            <p className="text-xl text-amber-400">Limited Access</p>
            <p className="text-gray-300 mt-2 text-base sm:text-lg">Try the tools before creating an account</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

          {/* ── STATUS + USAGE BADGE ── */}
          <div className="text-center mb-12 space-y-3">
            <div className="inline-block bg-amber-500/10 border border-amber-500 text-amber-400 px-6 py-2 rounded-full text-sm">
              You are browsing as Guest
            </div>

            <div id="tour-usage-badge" className="flex justify-center">
              <div
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-medium border"
                style={{
                  background:  `${usageColor}12`,
                  borderColor: `${usageColor}35`,
                  color:        usageColor,
                }}
              >
                <div className="flex gap-1">
                  {Array.from({ length: MAX_USES }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full transition-all"
                      style={{ background: i < (usesLeft ?? MAX_USES) ? usageColor : "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
                <span>{usageLabel}</span>
              </div>
            </div>

            <p className="text-gray-400 max-w-md mx-auto text-sm">
              Try EndoDecide for free. You can always create a free account to save your cases and unlock other features.
            </p>
          </div>

          {/* ── TOOL CARDS ── */}
          <div className="flex flex-col gap-6 sm:gap-8">

            {/* ── ENDODECIDE CARD ── */}
            <div
              id="tour-epp-card"
              onClick={() => router.push("/endodecide")}
              className="group relative bg-white/5 border border-[#10b981]/30 hover:border-[#10b981] rounded-3xl overflow-hidden cursor-pointer transition-all"
            >
              <div className="absolute top-5 right-5 z-20 flex items-center gap-2 bg-[#10b981] text-black text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-black/60" />
                </span>
                New
              </div>

              <div className="flex flex-col md:flex-row">
                <div className="relative h-56 md:h-auto md:w-2/5 flex-shrink-0">
                  <Image src="https://iili.io/Bw4dt99.jpg" alt="EndoDecide" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/60 md:block hidden" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:hidden" />
                </div>
                <div className="p-6 sm:p-10 flex flex-col justify-center flex-1">
                  <p className="text-[11px] tracking-[3px] text-[#10b981]/70 uppercase mb-2">
                    Unified Clinical Decision Tool
                  </p>
                  <h3 className="text-3xl sm:text-4xl font-serif font-semibold mb-3 text-white">
                    EndoDecide
                  </h3>
                  <p className="text-gray-400 leading-relaxed mb-5 max-w-lg text-sm">
                    Prognosis prediction, crack tooth classification, and Iowa staging — unified in one workflow with AAE 2013 terminology.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {["4-Year Survival","AAE 2013 Diagnosis","Iowa Classification","VRF Detection"].map(f => (
                      <span key={f}
                        className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981]">
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="inline-flex items-center gap-2 text-[#10b981] font-bold group-hover:underline text-sm self-start">
                    Try EndoDecide
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                      className="group-hover:translate-x-1 transition-transform">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* ── DENTAL TRAUMA CENTER — locked ── */}
            <div className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden opacity-75 cursor-not-allowed relative">
              <div className="flex flex-col md:flex-row">
                <div className="relative h-56 md:h-auto md:w-2/5 flex-shrink-0">
                  <Image src="https://iili.io/BLMUZYv.jpg" alt="Dental Trauma Center" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/60 md:block hidden" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:hidden" />
                </div>
                <div className="p-6 sm:p-10 flex flex-col justify-center flex-1">
                  <h3 className="text-3xl font-serif font-semibold mb-3 text-white">Dental Trauma Center</h3>
                  <p className="text-gray-400 leading-relaxed mb-5 text-sm">
                    Evidence-based diagnosis, treatment planning, and prognosis tools for traumatic dental injuries.
                  </p>
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-5 py-2.5 rounded-2xl text-sm font-medium self-start">
                    🔒 Create a free account to unlock
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-3xl">
                <button onClick={() => router.push("/login")}
                  className="bg-white text-black px-8 py-3 rounded-2xl font-semibold hover:bg-amber-400 transition">
                  Create Free Account
                </button>
              </div>
            </div>

          </div>

          {/* ── SIGNUP CTA ── */}
          <div className="mt-12 text-center">
            <button
              id="tour-signup-btn"
              onClick={() => router.push("/login")}
              className="bg-[#10b981] hover:bg-white text-black px-10 sm:px-12 py-4 rounded-2xl text-lg font-semibold transition w-full sm:w-auto"
            >
              Create Free Account → Full Access
            </button>
          </div>
        </div>

        {/* ── FOOTER ── */}
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