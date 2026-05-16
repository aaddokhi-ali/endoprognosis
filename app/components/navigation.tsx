// app/components/navigation.tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const guestFlag = localStorage.getItem("isGuest") === "true";
    setIsGuest(guestFlag);
  }, [pathname]);

  // Additional effect to sync with auth state changes
  useEffect(() => {
    if (user) {
      const guestFlag = localStorage.getItem("isGuest") === "true";
      if (guestFlag) {
        localStorage.removeItem("isGuest");
        localStorage.removeItem("guestMode");
        setIsGuest(false);
      }
    }
  }, [user]);

  const isLoginPage = pathname === "/login";

  const handleLogout = async () => {
    localStorage.removeItem("isGuest");
    localStorage.removeItem("guestMode");
    await logout();
  };

  // Safety: Never treat a real logged-in user as guest
  const effectiveIsGuest = isGuest && !user;

  if (isLoginPage) return null;

  return (
    <>
      {/* ====================== TOP NAVIGATION ====================== */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo */}
          <Link href={effectiveIsGuest ? "/guest" : "/home"} className="flex items-center">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={200}
              height={70}
              className="h-12 w-auto"
              priority
            />
          </Link>

          {/* Main Menu */}
          <div className="flex items-center gap-8 text-sm font-medium">
            <Link 
              href="/predictor" 
              className={`hover:text-[#10b981] transition-colors ${pathname.includes("/predictor") ? "text-[#10b981] font-semibold" : ""}`}
            >
              Endodontic Prognosis Predictor (EPP)
            </Link>
            
            <Link 
              href="/crack-classifier" 
              className={`hover:text-[#10b981] transition-colors ${pathname.includes("/crack-classifier") ? "text-[#10b981] font-semibold" : ""}`}
            >
              Crack Tooth Classifier (CTC)
            </Link>

            {/* Dental Trauma Center - Only for logged-in users */}
            {!effectiveIsGuest && user && (
              <Link 
                href="/dental-trauma-center" 
                className={`hover:text-[#10b981] transition-colors ${pathname.includes("/dental-trauma-center") ? "text-[#10b981] font-semibold" : ""}`}
              >
                Dental Trauma Center
              </Link>
            )}

            {/* Trauma Cases - Only for logged-in users */}
            {!effectiveIsGuest && user && (
              <Link 
                href="/trauma-cases" 
                className={`hover:text-[#10b981] transition-colors ${pathname === "/trauma-cases" ? "text-[#10b981] font-semibold" : ""}`}
              >
                Trauma Cases
              </Link>
            )}

            {/* My Cases - Only for logged-in users */}
            {!effectiveIsGuest && user && (
              <Link 
                href="/mycases" 
                className={`hover:text-[#10b981] transition-colors ${pathname === "/mycases" ? "text-[#10b981] font-semibold" : ""}`}
              >
                My Cases
              </Link>
            )}

            {/* Profit Tracker - Only for logged-in users */}
            {!effectiveIsGuest && user && (
              <Link 
                href="/profit-tracker" 
                className={`hover:text-[#10b981] transition-colors ${pathname === "/profit-tracker" ? "text-[#10b981] font-semibold" : ""}`}
              >
                💰 Profit Tracker
              </Link>
            )}

            <Link 
              href={effectiveIsGuest ? "/guest" : "/home"} 
              className={`hover:text-[#10b981] transition-colors ${(pathname === "/home" || pathname === "/guest") ? "text-[#10b981] font-semibold" : ""}`}
            >
              Home
            </Link>

            {/* Logout - Only for real logged-in users */}
            {user && (
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-500 transition-colors font-medium"
              >
                Logout
              </button>
            )}

            {/* Sign Up - Only show for guests */}
            {effectiveIsGuest && (
              <Link 
                href="/login" 
                className="bg-amber-400 hover:bg-amber-300 text-black px-5 py-2 rounded-xl font-semibold transition"
              >
                Sign Up
              </Link>
            )}   

            {/* Login Button - Show when user is not logged in and not in guest mode */}
            {!user && !effectiveIsGuest && (
              <Link 
                href="/login" 
                className="bg-[#10b981] hover:bg-[#0ea76e] text-black px-5 py-2 rounded-xl font-semibold transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ====================== BOTTOM NAVIGATION ====================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-t border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-center">
          <div className="flex items-center gap-8 text-sm">
            <Link href="/about" className="hover:text-[#10b981] transition-colors">About</Link>
            <Link href="/references" className="hover:text-[#10b981] transition-colors">References</Link>
            <Link href="/how-to-use" className="hover:text-[#10b981] transition-colors">How to Use</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="h-20"></div>
    </>
  );
}