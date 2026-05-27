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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const guestFlag = localStorage.getItem("isGuest") === "true";
    setIsGuest(guestFlag);
  }, [pathname]);

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
  const effectiveIsGuest = isGuest && !user;

  const handleLogout = async () => {
    localStorage.removeItem("isGuest");
    localStorage.removeItem("guestMode");
    setIsMobileMenuOpen(false);
    await logout();
  };

  if (isLoginPage) return null;

  // ── Tool links (always visible) ──
  const publicTools = [
    { href: "/predictor", label: "Prognosis Predictor" },
    { href: "/crack-classifier", label: "Crack Tooth Classifier" },
  ];

  // ── Tool links (logged-in only) ──
  const privateTools = [
    { href: "/dental-trauma-center", label: "Dental Trauma Center" },
    { href: "/trauma-cases", label: "Trauma Cases" },
    { href: "/mycases", label: "My Cases" },
    { href: "/profit-tracker", label: "Profit Tracker" },
  ];

  const isActive = (href: string) =>
    href === "/home" || href === "/guest"
      ? pathname === "/home" || pathname === "/guest"
      : pathname.startsWith(href);

  return (
    <>
      {/* ══════════════════════ TOP NAV ══════════════════════ */}
      <nav className="sticky top-0 z-50 bg-[#050d1a]/95 backdrop-blur-lg border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link
              href={effectiveIsGuest ? "/guest" : "/home"}
              className="flex items-center flex-shrink-0 mr-6"
            >
              <Image
                src="https://iili.io/B6RcxlS.png"
                alt="Endoprognosis Logo"
                width={180}
                height={60}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* ── Desktop nav ── */}
            <div className="hidden md:flex items-center gap-1 flex-1">

              {/* Public tool links */}
              <div className="flex items-center gap-1">
                {publicTools.map((t) => (
                  <NavLink key={t.href} href={t.href} active={isActive(t.href)} tool>
                    {t.label}
                  </NavLink>
                ))}
              </div>

              {/* Private tool links */}
              {!effectiveIsGuest && user && (
                <>
                  {/* Divider */}
                  <div className="w-px h-5 bg-white/15 mx-2" />
                  <div className="flex items-center gap-1">
                    {privateTools.map((t) => (
                      <NavLink key={t.href} href={t.href} active={isActive(t.href)} tool>
                        {t.label}
                      </NavLink>
                    ))}
                  </div>
                </>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Utility links */}
              <div className="flex items-center gap-1">
                <NavLink
                  href={effectiveIsGuest ? "/guest" : "/home"}
                  active={isActive(effectiveIsGuest ? "/guest" : "/home")}
                >
                  Home
                </NavLink>

                {user && (
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150"
                  >
                    Logout
                  </button>
                )}

                {effectiveIsGuest && (
                  <Link
                    href="/login"
                    className="ml-2 bg-amber-400 hover:bg-amber-300 text-black px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
                  >
                    Sign Up
                  </Link>
                )}

                {!user && !effectiveIsGuest && (
                  <Link
                    href="/login"
                    className="ml-2 bg-[#10b981] hover:bg-[#0ea76e] text-black px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center text-white hover:text-[#10b981] transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#050d1a]/98 backdrop-blur-lg border-t border-white/8">
            <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">

              {/* Tools label */}
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 px-3 mb-1">
                Clinical Tools
              </p>

              {publicTools.map((t) => (
                <MobileNavLink
                  key={t.href}
                  href={t.href}
                  active={isActive(t.href)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  tool
                >
                  {t.label}
                </MobileNavLink>
              ))}

              {!effectiveIsGuest && user && (
                <>
                  {privateTools.map((t) => (
                    <MobileNavLink
                      key={t.href}
                      href={t.href}
                      active={isActive(t.href)}
                      onClick={() => setIsMobileMenuOpen(false)}
                      tool
                    >
                      {t.label}
                    </MobileNavLink>
                  ))}
                </>
              )}

              {/* Divider */}
              <div className="h-px bg-white/10 my-3" />

              {/* Utility label */}
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 px-3 mb-1">
                Navigation
              </p>

              <MobileNavLink
                href={effectiveIsGuest ? "/guest" : "/home"}
                active={isActive(effectiveIsGuest ? "/guest" : "/home")}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </MobileNavLink>

              {user && (
                <button
                  onClick={handleLogout}
                  className="text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                >
                  Logout
                </button>
              )}

              {effectiveIsGuest && (
                <Link
                  href="/login"
                  className="mt-2 bg-amber-400 hover:bg-amber-300 text-black px-5 py-3 rounded-xl font-semibold transition text-center text-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              )}

              {!user && !effectiveIsGuest && (
                <Link
                  href="/login"
                  className="mt-2 bg-[#10b981] hover:bg-[#0ea76e] text-black px-5 py-3 rounded-xl font-semibold transition text-center text-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════ BOTTOM NAV (mobile only) ══════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#050d1a]/95 backdrop-blur-lg border-t border-white/8 py-3 md:hidden">
        <div className="max-w-7xl mx-auto px-6 flex justify-center">
          <div className="flex items-center gap-5 text-[12px] font-medium text-gray-400">
            <Link href="/about" className="hover:text-[#10b981] transition-colors">About</Link>
            <Link href="/references" className="hover:text-[#10b981] transition-colors">References</Link>
            <Link href="/how-to-use" className="hover:text-[#10b981] transition-colors">How to Use</Link>
            <Link href="/contact" className="hover:text-[#10b981] transition-colors">Contact</Link>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}

/* ── Desktop NavLink ── */
function NavLink({
  href,
  active,
  tool,
  children,
}: {
  href: string;
  active: boolean;
  tool?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`
        relative px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150
        ${active
          ? tool
            ? "text-[#10b981] bg-[#10b981]/10"
            : "text-white bg-white/8"
          : tool
            ? "text-gray-300 hover:text-[#10b981] hover:bg-[#10b981]/8"
            : "text-gray-400 hover:text-white hover:bg-white/6"
        }
      `}
    >
      {tool && active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#10b981] rounded-full" />
      )}
      <span className={tool && active ? "pl-1.5" : ""}>{children}</span>
    </Link>
  );
}

/* ── Mobile NavLink ── */
function MobileNavLink({
  href,
  active,
  tool,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  tool?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150
        ${active
          ? tool
            ? "text-[#10b981] bg-[#10b981]/10"
            : "text-white bg-white/8"
          : tool
            ? "text-gray-300 hover:text-[#10b981] hover:bg-[#10b981]/8"
            : "text-gray-400 hover:text-white hover:bg-white/6"
        }
      `}
    >
      {tool && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "bg-[#10b981]" : "bg-white/20"}`} />
      )}
      {children}
    </Link>
  );
}