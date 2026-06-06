// app/home/page.tsx
"use client";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Navigation from "../components/navigation";
import LoadingScreen from "../components/LoadingScreen";

const ADMIN_EMAIL = "aaddokhi@endoprognosis.org";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const isGuestFlag = localStorage.getItem("isGuest") === "true";
      if (isGuestFlag) {
        localStorage.removeItem("isGuest");
        localStorage.removeItem("guestMode");
      }
    }
  }, [user]);

  if (authLoading) return <LoadingScreen message="Loading dashboard..." />;
  if (!user) return null;

  const isAdmin = user.email === ADMIN_EMAIL;

  return (
    <>
      <Navigation />

      <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">

        {/* Background */}
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

          {/* Hero */}
          <div className="pt-20 pb-16 text-center px-6">
            <h1 className="text-6xl md:text-7xl font-serif tracking-wider text-white mb-6">
              Welcome back, Doctor
            </h1>
            <p className="text-2xl text-gray-300 max-w-2xl mx-auto">
              Your intelligent clinical decision support system is ready.
            </p>

            {/* Admin inbox — visible only to admin */}
            {isAdmin && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => router.push("/inbox/requests")}
                  className="group relative flex items-center gap-3 bg-[#f5d76e]/10 hover:bg-[#f5d76e]/20 border border-[#f5d76e]/40 hover:border-[#f5d76e] text-[#f5d76e] px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5d76e] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f5d76e]" />
                  </span>
                  Patient Requests Inbox
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                    className="group-hover:translate-x-1 transition-transform">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Tools Grid */}
          <div className="max-w-6xl mx-auto px-6 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* ── ENDODECIDE CARD (primary — full width on mobile, spans attention) ── */}
              <div
                onClick={() => router.push("/endodecide")}
                className="group relative bg-white/10 backdrop-blur-xl border border-[#10b981]/30 hover:border-[#10b981] rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 md:col-span-2"
              >
                {/* "New" ribbon */}
                <div className="absolute top-5 right-5 z-20 flex items-center gap-2 bg-[#10b981] text-black text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-black/60" />
                  </span>
                  New
                </div>

                <div className="flex flex-col md:flex-row">

                  {/* Image — uses EPP background as agreed */}
                  <div className="relative h-64 md:h-auto md:w-2/5 flex-shrink-0">
                    <Image
                      src="https://iili.io/Bw4dt99.jpg"
                      alt="EndoDecide"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/60 md:block hidden" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:hidden" />
                  </div>

                  {/* Content */}
                  <div className="p-10 flex flex-col justify-center flex-1">

                    <p className="text-[11px] tracking-[3px] text-[#10b981]/70 uppercase mb-3">
                      Unified Clinical Decision Tool
                    </p>

                    <h3 className="text-4xl md:text-5xl font-serif font-semibold mb-4 text-white"
                      style={{ fontFamily: "Playfair Display, serif" }}>
                      EndoDecide
                    </h3>

                    <p className="text-gray-300 leading-relaxed mb-6 max-w-lg">
                      The complete endodontic assessment platform. Prognosis prediction,
                      crack tooth classification, and Iowa staging — unified in a single
                      intelligent workflow with AAE 2013 terminology.
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {[
                        "4-Year Survival Estimate",
                        "AAE 2013 Diagnosis",
                        "Iowa Classification",
                        "VRF Detection",
                        "Tiered Prognosis",
                      ].map(f => (
                        <span key={f}
                          className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981]">
                          {f}
                        </span>
                      ))}
                    </div>

                    <div className="inline-flex items-center gap-2 bg-[#10b981] text-black px-8 py-3.5 rounded-2xl font-bold group-hover:bg-white transition self-start">
                      Start EndoDecide
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                        className="group-hover:translate-x-1 transition-transform">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── DENTAL TRAUMA CENTER CARD ── */}
              <div
                onClick={() => router.push("/dental-trauma-center")}
                className="group bg-white/10 backdrop-blur-xl border border-white/20 hover:border-[#10b981] rounded-3xl overflow-hidden cursor-pointer transition-all duration-300"
              >
                <div className="relative h-64">
                  <Image
                    src="https://iili.io/BLMUZYv.jpg"
                    alt="Dental Trauma Center"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <div className="p-10">
                  <h3 className="text-3xl font-semibold mb-4 text-white">Dental Trauma Center</h3>
                  <p className="text-gray-400 leading-relaxed mb-8">
                    Comprehensive diagnosis, treatment planning, and prognosis tools for dental trauma cases.
                  </p>
                  <div className="inline-block bg-[#10b981] text-black px-8 py-3.5 rounded-2xl font-semibold group-hover:bg-white transition">
                    Open Trauma Center →
                  </div>
                </div>
              </div>

              {/* ── MY CASES CARD ── */}
              <div
                onClick={() => router.push("/mycases")}
                className="group bg-white/10 backdrop-blur-xl border border-white/20 hover:border-[#10b981] rounded-3xl overflow-hidden cursor-pointer transition-all duration-300"
              >
                <div className="relative h-64">
                  <Image
                    src="https://iili.io/CfO3LZX.jpg"
                    alt="My Cases"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <div className="p-10">
                  <h3 className="text-3xl font-semibold mb-4 text-white">My Cases</h3>
                  <p className="text-gray-400 leading-relaxed mb-8">
                    Review, manage, and follow up on all your saved endodontic and trauma cases in one place.
                  </p>
                  <div className="inline-block bg-[#10b981] text-black px-8 py-3.5 rounded-2xl font-semibold group-hover:bg-white transition">
                    Open My Cases →
                  </div>
                </div>
              </div>

            </div>

            {/* ── Legacy tools note ── */}
            <div className="mt-8 flex items-center justify-center gap-3 text-gray-600 text-xs">
              <div className="h-px flex-1 bg-white/5 max-w-xs" />
              <span>
                Looking for the old tools?{" "}
                <Link href="/predictor" className="text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors">
                  Prognosis Predictor
                </Link>
                {" · "}
                <Link href="/crack-classifier" className="text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors">
                  Crack Classifier
                </Link>
              </span>
              <div className="h-px flex-1 bg-white/5 max-w-xs" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
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