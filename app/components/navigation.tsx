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

  // ── Primary tool — EndoDecide (replaces predictor + crack classifier) ──
  const primaryTool = { href: "/endodecide", label: "EndoDecide" };

  // ── Legacy tools — kept for existing case links, not promoted ──
  const legacyTools = [
    { href: "/predictor",        label: "Prognosis Predictor" },
    { href: "/crack-classifier", label: "Crack Classifier" },
  ];

  // ── Private tools (logged-in only) ──
  const privateTools = [
    { href: "/dental-trauma-center", label: "Dental Trauma Center" },
    { href: "/trauma-cases",         label: "Trauma Cases"         },
    { href: "/mycases",              label: "My Cases"              },
    { href: "/profit-tracker",       label: "Profit Tracker"       },
  ];

  const isActive = (href: string) =>
    href === "/home" || href === "/guest"
      ? pathname === "/home" || pathname === "/guest"
      : pathname.startsWith(href);

  // Is user currently on a legacy tool page?
  const onLegacyPage = legacyTools.some(t => pathname.startsWith(t.href));

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

              {/* ── PRIMARY: EndoDecide ── */}
              <NavLink
                href={primaryTool.href}
                active={isActive(primaryTool.href)}
                tool
                primary
              >
                {primaryTool.label}
              </NavLink>

              {/* ── LEGACY tools — only highlighted when on those pages ── */}
              {onLegacyPage && (
                <>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  {legacyTools.map(t => (
                    <NavLink key={t.href} href={t.href} active={isActive(t.href)} tool legacy>
                      {t.label}
                    </NavLink>
                  ))}
                </>
              )}

              {/* ── Private tools ── */}
              {!effectiveIsGuest && user && (
                <>
                  <div className="w-px h-5 bg-white/15 mx-2" />
                  <div className="flex items-center gap-1">
                    {privateTools.map(t => (
                      <NavLink key={t.href} href={t.href} active={isActive(t.href)} tool>
                        {t.label}
                      </NavLink>
                    ))}
                  </div>
                </>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* ── Utility links ── */}
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

              {/* Primary tool */}
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 px-3 mb-1">
                Clinical Tools
              </p>

              <MobileNavLink
                href={primaryTool.href}
                active={isActive(primaryTool.href)}
                onClick={() => setIsMobileMenuOpen(false)}
                tool
                primary
              >
                {primaryTool.label}
              </MobileNavLink>

              {/* Legacy tools — only shown when on those pages */}
              {onLegacyPage && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-3 mt-3 mb-1">
                    Legacy Tools
                  </p>
                  {legacyTools.map(t => (
                    <MobileNavLink
                      key={t.href}
                      href={t.href}
                      active={isActive(t.href)}
                      onClick={() => setIsMobileMenuOpen(false)}
                      tool
                      legacy
                    >
                      {t.label}
                    </MobileNavLink>
                  ))}
                </>
              )}

              {/* Private tools */}
              {!effectiveIsGuest && user && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-3 mt-3 mb-1">
                    My Account
                  </p>
                  {privateTools.map(t => (
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

              {/* Navigation */}
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
            <Link href="/about"      className="hover:text-[#10b981] transition-colors">About</Link>
            <Link href="/references" className="hover:text-[#10b981] transition-colors">References</Link>
            <Link href="/how-to-use" className="hover:text-[#10b981] transition-colors">How to Use</Link>
            <Link href="/contact"    className="hover:text-[#10b981] transition-colors">Contact</Link>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}

// ════════════════════════════════════════════════════════════
// DESKTOP NAV LINK
// ════════════════════════════════════════════════════════════
function NavLink({
  href,
  active,
  tool,
  primary,
  legacy,
  children,
}: {
  href: string;
  active: boolean;
  tool?: boolean;
  primary?: boolean;
  legacy?: boolean;
  children: React.ReactNode;
}) {
  // Primary tool gets a distinct treatment — always highlighted in green
  if (primary) {
    return (
      <Link
        href={href}
        className={`
          relative px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150
          ${active
            ? "text-[#10b981] bg-[#10b981]/15 ring-1 ring-[#10b981]/30"
            : "text-[#10b981] bg-[#10b981]/8 hover:bg-[#10b981]/15"
          }
        `}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#10b981] rounded-full" />
        )}
        <span className={active ? "pl-1.5" : ""}>{children}</span>
      </Link>
    );
  }

  // Legacy tools get a muted appearance
  if (legacy) {
    return (
      <Link
        href={href}
        className={`
          px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
          ${active
            ? "text-gray-300 bg-white/8"
            : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
          }
        `}
      >
        {children}
      </Link>
    );
  }

  // Standard tool or utility link
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

// ════════════════════════════════════════════════════════════
// MOBILE NAV LINK
// ════════════════════════════════════════════════════════════
function MobileNavLink({
  href,
  active,
  tool,
  primary,
  legacy,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  tool?: boolean;
  primary?: boolean;
  legacy?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  if (primary) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`
          flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-all duration-150
          ${active
            ? "text-[#10b981] bg-[#10b981]/15 ring-1 ring-[#10b981]/25"
            : "text-[#10b981] bg-[#10b981]/8 hover:bg-[#10b981]/15"
          }
        `}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-[#10b981]" : "bg-[#10b981]/50"}`} />
        {children}
        {!active && (
          <span className="ml-auto text-[10px] bg-[#10b981]/15 text-[#10b981] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            New
          </span>
        )}
      </Link>
    );
  }

  if (legacy) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
          ${active ? "text-gray-300 bg-white/8" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}
        `}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white/20" />
        {children}
        <span className="ml-auto text-[9px] text-gray-600 uppercase tracking-wider">Legacy</span>
      </Link>
    );
  }

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