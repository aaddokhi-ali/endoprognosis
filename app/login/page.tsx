// app/login/page.tsx
"use client";
import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebaseConfig";

// ── Firebase error → friendly message ──
function friendlyError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "No account found with this email. Please check or register.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a few minutes and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function extractCode(err: any): string {
  return err?.code || err?.message?.match(/\(([^)]+)\)/)?.[1] || "unknown";
}

// ── Eye icon ──
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ── Spinner ──
function Spinner({ dark }: { dark?: boolean }) {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke={dark ? "#000" : "currentColor"} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

// ── Suspense wrapper — required by Next.js for useSearchParams ──
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#10b981]/30 border-t-[#10b981] animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

// ══════════════════════════════════════════════
// MAIN CONTENT
// ══════════════════════════════════════════════
function LoginContent() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError]       = useState("");
  const [verifyBanner, setVerifyBanner] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent]       = useState(false);

  const { login, user, loading: authLoading, clearError } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isSignupMode = searchParams.get("mode") === "signup";

  // Auto-redirect verified users
  useEffect(() => {
    if (!authLoading && user?.emailVerified) {
      router.replace("/home");
    }
  }, [user, authLoading, router]);

  // ── Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setVerifyBanner(false);
    clearError();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);

      // Check email verification after login
      const currentUser = auth.currentUser;
      if (currentUser && !currentUser.emailVerified) {
        setVerifyBanner(true);
        setLoading(false);
        return;
      }

      router.replace("/home");
    } catch (err: any) {
      setError(friendlyError(extractCode(err)));
    } finally {
      setLoading(false);
    }
  };

  // ── Resend verification email ──
  const handleResendVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || resendLoading) return;
    setResendLoading(true);
    try {
      await sendEmailVerification(currentUser);
      setResendSent(true);
    } catch {
      setError("Failed to resend. Please try again in a few minutes.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Guest access ──
  const handleGuestAccess = async () => {
    // Warn if a user is already signed in
    if (user) {
      const confirmed = window.confirm(
        "You are currently signed in. Continuing as guest will sign you out. Are you sure?"
      );
      if (!confirmed) return;
    }

    setGuestLoading(true);
    try {
      await signOut(auth).catch(() => {});
      localStorage.setItem("isGuest", "true");
      localStorage.setItem("guestMode", "true");
    } catch (err) {
      console.error("Guest transition error:", err);
    }
    setTimeout(() => router.push("/guest"), 400);
  };

  // Clear error on typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError("");
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const anyLoading = loading || guestLoading;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://iili.io/B6uUNfI.jpg"
          alt="Background"
          fill className="object-cover" priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex justify-center mb-8 sm:mb-10">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={240} height={80}
              className="h-14 sm:h-16 w-auto drop-shadow-xl"
              priority
            />
          </div>

          {/* Heading — changes based on mode */}
          <div className="text-center mb-8 sm:mb-10">
            {isSignupMode ? (
              <>
                <h1 className="text-4xl sm:text-5xl font-serif tracking-wider text-white mb-3">
                  Join Free
                </h1>
                <p className="text-base sm:text-lg text-gray-300">
                  Create an account for unlimited access
                </p>
                {/* Signup mode callout */}
                <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 text-amber-400 px-4 py-2 rounded-full text-sm">
                  You've used your 3 guest uses — sign up to continue
                </div>
              </>
            ) : (
              <>
                <h1 className="text-4xl sm:text-5xl font-serif tracking-wider text-white mb-3">
                  Welcome Back
                </h1>
                <p className="text-base sm:text-lg text-gray-300">
                  Sign in to access your tools
                </p>
              </>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-10 shadow-2xl">

            {/* ── Email verification banner ── */}
            {verifyBanner && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 mb-6">
                <p className="text-amber-300 text-sm font-semibold mb-1">
                  📧 Please verify your email
                </p>
                <p className="text-amber-200/70 text-xs leading-relaxed mb-3">
                  We sent a verification link to <span className="font-medium text-amber-300">{email}</span>. Check your inbox and click the link before signing in.
                </p>
                {resendSent ? (
                  <p className="text-emerald-400 text-xs font-medium">✓ Verification email resent!</p>
                ) : (
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                  >
                    {resendLoading && <Spinner />}
                    {resendLoading ? "Sending..." : "Resend verification email →"}
                  </button>
                )}
              </div>
            )}

            {/* ── Error banner ── */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-4 rounded-2xl mb-6 text-sm">
                {error}
              </div>
            )}

            {/* ── Login form ── */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  disabled={anyLoading}
                  className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981] transition-colors disabled:opacity-60"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    disabled={anyLoading}
                    className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 pr-14 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981] transition-colors disabled:opacity-60"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link href="/forgot-password" className="text-[#10b981] hover:underline text-sm">
                  Forgot Password?
                </Link>
              </div>

              {/* Sign In button — spinner inside, no full-screen loader */}
              <button
                type="submit"
                disabled={anyLoading}
                className="w-full bg-[#10b981] hover:bg-[#0ea76e] disabled:bg-[#10b981]/60 text-black font-semibold py-4 rounded-2xl text-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Spinner dark /> Signing in...</>
                ) : "Sign In"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-gray-400 text-sm">OR</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* Guest button — amber-tinted to signal "try first" */}
            <button
              onClick={handleGuestAccess}
              disabled={anyLoading}
              className="w-full border border-amber-500/50 hover:border-amber-400 bg-amber-500/8 hover:bg-amber-500/15 text-amber-300 hover:text-amber-200 font-medium py-4 rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {guestLoading ? (
                <><Spinner /> Loading guest mode...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Continue as Guest
                  <span className="text-xs text-amber-500/70 font-normal">— 3 free uses</span>
                </>
              )}
            </button>

            {/* Register link */}
            <div className="mt-7 text-center">
              <p className="text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-[#10b981] hover:underline font-medium">
                  Create one free →
                </Link>
              </p>
            </div>
          </div>
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
        <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
      </div>
    </div>
  );
}