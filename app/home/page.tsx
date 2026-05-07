// app/home/page.tsx
"use client";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Navigation from "../components/navigation";
import LoadingScreen from "../components/LoadingScreen";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if user is not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Clear any leftover guest flags
  useEffect(() => {
    if (user) {
      const isGuestFlag = localStorage.getItem("isGuest") === "true";
      if (isGuestFlag) {
        localStorage.removeItem("isGuest");
        localStorage.removeItem("guestMode");
      }
    }
  }, [user]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  // Safety: Don't render anything if no user
  if (!user) {
    return null;
  }

  return (
    <>
      <Navigation />

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
          {/* Hero Section */}
          <div className="pt-20 pb-16 text-center px-6">
            <h1 className="text-6xl md:text-7xl font-serif tracking-wider text-white mb-6">
              Welcome back, Doctor
            </h1>
            <p className="text-2xl text-gray-300 max-w-2xl mx-auto">
              Your intelligent clinical decision support system is ready.
            </p>
          </div>

          {/* Tools Grid */}
          <div className="max-w-6xl mx-auto px-6 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* EPP Card */}
              <div 
                onClick={() => router.push("/predictor")}
                className="group bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:border-[#10b981] cursor-pointer transition-all duration-300"
              >
                <div className="relative h-64">
                  <Image
                    src="https://iili.io/Bw4dt99.jpg"
                    alt="Endodontic Prognosis Predictor"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <div className="p-10">
                  <h3 className="text-3xl font-semibold mb-4 text-white">Endodontic Prognosis Predictor</h3>
                  <p className="text-gray-400 leading-relaxed mb-8">
                    Advanced 4-year survival estimation with detailed analysis and restorative recommendations.
                  </p>
                  <div className="inline-block bg-[#10b981] text-black px-8 py-3.5 rounded-2xl font-semibold group-hover:bg-white transition">
                    Start New Case →
                  </div>
                </div>
              </div>

              {/* Dental Trauma Center Card */}
              <div 
                onClick={() => router.push("/dental-trauma-center")}
                className="group bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:border-[#10b981] cursor-pointer transition-all duration-300"
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

              {/* Crack Tooth Classifier Card */}
              <div 
                onClick={() => router.push("/crack-classifier")}
                className="group bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:border-[#10b981] cursor-pointer transition-all duration-300"
              >
                <div className="relative h-64">
                  <Image
                    src="https://iili.io/BwkLI0N.jpg"
                    alt="Crack Tooth Classifier"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <div className="p-10">
                  <h3 className="text-3xl font-semibold mb-4 text-white">Crack Tooth Classifier</h3>
                  <p className="text-gray-400 leading-relaxed mb-8">
                    Accurate detection and classification of cracked teeth with VRF suspicion assessment.
                  </p>
                  <div className="inline-block bg-[#10b981] text-black px-8 py-3.5 rounded-2xl font-semibold group-hover:bg-white transition">
                    Open Classifier →
                  </div>
                </div>
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
    </>
  );
}