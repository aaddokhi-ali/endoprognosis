// app/forgot-password/page.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import LoadingScreen from "../components/LoadingScreen";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { resetPassword, user, clearError } = useAuth();
  const router = useRouter();

  // Redirect if already logged in - Fixed version
  useEffect(() => {
    if (user) {
      router.push("/home");
    }
  }, [user, router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");
    clearError();

    try {
      await resetPassword(email);
      setMessage("If an account with this email exists, a password reset link has been sent.");
      
      // Auto redirect after success
      setTimeout(() => {
        router.push("/login");
      }, 3000);

    } catch (err: any) {
      setError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show full loading screen while sending email
  if (loading) {
    return <LoadingScreen message="Sending reset link..." />;
  }

  // Prevent flash of content if user is logged in
  if (user) {
    return <LoadingScreen message="Redirecting..." />;
  }

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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-10">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={240}
              height={80}
              className="h-16 w-auto drop-shadow-xl"
              priority
            />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-5xl font-serif tracking-wider text-white mb-3">
              Forgot Password?
            </h1>
            <p className="text-lg text-gray-300">We'll send you a link to reset it</p>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-300 p-4 rounded-2xl mb-6 text-sm">
                {error}
              </div>
            )}

            {message ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-6">📧</div>
                <h2 className="text-2xl font-bold text-[#10b981] mb-4">Reset Link Sent</h2>
                <p className="text-gray-300 leading-relaxed">
                  {message}<br />
                  Please check your inbox and spam folder.
                </p>
                <Link 
                  href="/login"
                  className="mt-8 block bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold py-4 rounded-2xl text-lg transition"
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-[#10b981] hover:bg-[#0ea76e] disabled:bg-gray-600 text-black font-semibold py-4 rounded-2xl text-lg transition"
                >
                  {loading ? "Sending Reset Link..." : "Send Reset Link"}
                </button>
              </form>
            )}

            <div className="mt-8 text-center">
              <Link href="/login" className="text-[#10b981] hover:underline">
                ← Back to Login
              </Link>
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
        <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
      </div>
    </div>
  );
}