// app/login/page.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import LoadingScreen from "../components/LoadingScreen";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);

  const { login, user, loading: authLoading, error: authError, clearError } = useAuth();
  const router = useRouter();

  // Sync auth context error with local error state
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/home");
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearError(); // Clear any previous error from context

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      router.push("/home");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    setGuestLoading(true);
    
    localStorage.setItem("isGuest", "true");
    localStorage.setItem("guestMode", "true");

    setTimeout(() => {
      router.push("/guest");
    }, 700);
  };

  // Clear error when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  // Show full loading screen while signing in
  if (loading) {
    return <LoadingScreen message="Signing you in..." />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
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
          {/* Logo */}
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
              Welcome Back
            </h1>
            <p className="text-lg text-gray-300">Sign in to access your tools</p>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-300 p-4 rounded-2xl mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
                  placeholder="••••••••"
                />
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link 
                  href="/forgot-password" 
                  className="text-[#10b981] hover:underline text-sm"
                >
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold py-4 rounded-2xl text-lg transition disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-gray-400 text-sm">OR</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            <button
              onClick={handleGuestAccess}
              disabled={guestLoading}
              className="w-full border border-white/40 hover:border-white/70 text-white font-medium py-4 rounded-2xl transition disabled:opacity-70"
            >
              {guestLoading ? "Entering as Guest..." : "Continue as Guest"}
            </button>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-[#10b981] hover:underline">
                  Register here
                </Link>
              </p>
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