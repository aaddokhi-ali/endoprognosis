// app/register/page.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { sendEmailVerification } from "firebase/auth";

// ── Firebase error → friendly message ──
function friendlyError(err: any): string {
  const code = err?.code || err?.message?.match(/\(([^)]+)\)/)?.[1] || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// ── Password strength ──
function getStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pwd.length === 0) return { level: 0, label: "",        color: "" };
  if (pwd.length < 6)   return { level: 1, label: "Weak",   color: "#ef4444" };
  const medium = pwd.length >= 8 && /[0-9]/.test(pwd);
  const strong = medium && /[^a-zA-Z0-9]/.test(pwd);
  if (strong)  return { level: 3, label: "Strong", color: "#10b981" };
  if (medium)  return { level: 2, label: "Medium", color: "#f59e0b" };
  return             { level: 1, label: "Weak",   color: "#ef4444" };
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
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName:        "",
    email:           "",
    password:        "",
    confirmPassword: "",
    profession:      "dentist",
  });

  const [showPass,        setShowPass]        = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState(false);
  const [agreed,          setAgreed]          = useState(false);
  const [showAgreement,   setShowAgreement]   = useState(false);
  const [resendLoading,   setResendLoading]   = useState(false);
  const [resendSent,      setResendSent]      = useState(false);

  const { register, user, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.emailVerified) router.push("/home");
  }, [user, router]);

  // ── Derived ──
  const strength      = getStrength(formData.password);
  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;
  const passwordsMismatch =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  // ── Register ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearError();

    if (!agreed) {
      setError("Please read and accept the User Agreement to continue.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!formData.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      await register(formData.email, formData.password);

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Registration failed — please try again.");

      // 2. Save profile to Firestore users/{uid}
      await setDoc(doc(db, "users", currentUser.uid), {
        fullName:   formData.fullName.trim(),
        email:      formData.email.toLowerCase().trim(),
        profession: formData.profession,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
      });

      // 3. Clear guest flags
      localStorage.removeItem("isGuest");
      localStorage.removeItem("guestMode");
      localStorage.removeItem("guestUsesLeft");

      setSuccess(true);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Resend verification ──
  const handleResend = async () => {
    if (resendLoading) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setResendLoading(true);
    try {
      await sendEmailVerification(currentUser);
      setResendSent(true);
    } catch {
      setError("Failed to resend. Please wait a few minutes and try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const inputCls = "w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981] transition-colors disabled:opacity-60";

  // ── Agreement text ──
  const UserAgreementText = () => (
    <div className="text-sm leading-relaxed space-y-6 text-gray-300">
      <h3 className="text-white text-xl font-semibold">Endoprognosis User Agreement &amp; Disclaimer</h3>
      <p><strong>Last Updated:</strong> May 2026</p>
      <section>
        <h4 className="text-white font-medium mb-2">1. Purpose of the Tool</h4>
        <p>Endoprognosis is an assistive decision-support tool designed to aid dental professionals in endodontic prognosis prediction, cracked tooth classification, and dental trauma management. It is <strong>NOT</strong> a substitute for professional clinical judgment.</p>
      </section>
      <section>
        <h4 className="text-white font-medium mb-2">2. No Medical Advice / Clinical Responsibility</h4>
        <p className="text-rose-300">You acknowledge and agree that:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>You are solely responsible for all clinical decisions made regarding patient care.</li>
          <li>You must exercise your own professional clinical judgment at all times.</li>
          <li>The outputs provided by this tool are for informational and supportive purposes only.</li>
          <li>Endoprognosis and its owner shall bear <strong>no liability</strong> for any diagnosis, treatment, or clinical outcome resulting from the use or non-use of this tool.</li>
        </ul>
      </section>
      <section>
        <h4 className="text-white font-medium mb-2">3. No Warranty</h4>
        <p>The tool is provided "AS IS" without any warranties, express or implied. We do not guarantee the accuracy, completeness, reliability, or timeliness of any prediction, classification, or information provided.</p>
      </section>
      <section>
        <h4 className="text-white font-medium mb-2">4. Patient Data &amp; Privacy</h4>
        <p>You are fully responsible for any patient data you enter. You confirm that you have obtained all necessary patient consents and comply with applicable data protection laws.<br/><br/>We do not sell, share, or use patient data for our own commercial interest. However, anonymized and aggregated data may be used for research and tool improvement.</p>
      </section>
      <section>
        <h4 className="text-white font-medium mb-2">5. Limitation of Liability</h4>
        <p>To the maximum extent permitted by law, the owner, developers, and operators of Endoprognosis shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of your use of this tool.</p>
      </section>
      <section>
        <h4 className="text-white font-medium mb-2">6. Indemnification</h4>
        <p>You agree to indemnify and hold harmless the owner and operators from any claims, losses, liabilities, damages, and expenses (including legal fees) arising from your use of the tool or violation of this agreement.</p>
      </section>
      <section>
        <h4 className="text-white font-medium mb-2">7. Governing Law</h4>
        <p>This agreement shall be governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be subject to the exclusive jurisdiction of the courts in Dammam.</p>
      </section>
      <p className="text-xs pt-4 border-t border-white/10">
        By creating an account, you confirm that you have read, understood, and agree to be bound by this User Agreement and Disclaimer.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="https://iili.io/B6uUNfI.jpg" alt="Background" fill className="object-cover" priority/>
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex justify-center mb-8 sm:mb-10">
            <Image src="https://iili.io/B6RcxlS.png" alt="Endoprognosis Logo"
              width={220} height={80} className="h-14 sm:h-16 w-auto drop-shadow-lg" priority/>
          </div>

          {/* Heading */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-wider text-[#10b981] mb-3">
              Join Endoprognosis
            </h1>
            <p className="text-lg text-gray-300">Create your free account</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-10 shadow-2xl">

            {/* ── SUCCESS STATE ── */}
            {success ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-6">📧</div>
                <h2 className="text-2xl font-bold text-[#10b981] mb-3">Account Created!</h2>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    A verification email was sent to{" "}
                    <span className="font-semibold text-white">{formData.email}</span>.
                    Click the link inside to activate your account.
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Can't find it? Check your spam or junk folder.
                  </p>
                </div>

                {/* Resend button */}
                <div className="mb-6">
                  {resendSent ? (
                    <p className="text-emerald-400 text-sm font-medium">✓ Verification email resent!</p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="flex items-center justify-center gap-2 mx-auto text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
                    >
                      {resendLoading && <Spinner />}
                      {resendLoading ? "Sending..." : "Resend verification email →"}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <Link href="/login"
                    className="block bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold py-4 rounded-2xl text-base transition text-center">
                    Go to Login →
                  </Link>
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setError("");
                      setResendSent(false);
                      setFormData(p => ({ ...p, password: "", confirmPassword: "" }));
                    }}
                    className="block w-full text-gray-500 hover:text-gray-300 py-3 text-sm transition">
                    Register another account
                  </button>
                </div>
              </div>

            ) : (
              /* ── FORM STATE ── */
              <>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-4 rounded-2xl mb-6 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-5">

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Full Name</label>
                    <input type="text" name="fullName" value={formData.fullName}
                      onChange={handleChange} required disabled={loading}
                      className={inputCls} placeholder="Dr. John Smith"/>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Email Address</label>
                    <input type="email" name="email" value={formData.email}
                      onChange={handleChange} required disabled={loading}
                      className={inputCls} placeholder="your@email.com"/>
                  </div>

                  {/* Profession */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Profession</label>
                    <select name="profession" value={formData.profession}
                      onChange={handleChange} disabled={loading}
                      className="w-full bg-[#0a1428] border border-white/30 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#10b981] transition-colors appearance-none disabled:opacity-60">
                      <option value="dental_student">Dental Student</option>
                      <option value="dentist">General Dentist</option>
                      <option value="endodontist">Endodontist</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Password</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} name="password"
                        value={formData.password} onChange={handleChange}
                        required disabled={loading}
                        className={inputCls + " pr-14"} placeholder="••••••••"/>
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1">
                        <EyeIcon open={showPass}/>
                      </button>
                    </div>

                    {/* Password strength bar */}
                    {formData.password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i <= strength.level ? strength.color : "rgba(255,255,255,0.1)" }}/>
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                      </div>
                    )}

                    {/* Min length hint */}
                    <p className="text-xs text-gray-600 mt-1.5">
                      Minimum 6 characters. Use numbers and symbols for a stronger password.
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Confirm Password</label>
                    <div className="relative">
                      <input type={showConfirmPass ? "text" : "password"} name="confirmPassword"
                        value={formData.confirmPassword} onChange={handleChange}
                        required disabled={loading}
                        className={inputCls + " pr-14"} placeholder="••••••••"/>
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowConfirmPass(p => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1">
                        <EyeIcon open={showConfirmPass}/>
                      </button>
                    </div>

                    {/* Real-time match indicator */}
                    {formData.confirmPassword.length > 0 && (
                      <p className={`text-xs mt-1.5 flex items-center gap-1 ${passwordsMatch ? "text-emerald-400" : "text-red-400"}`}>
                        {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>

                  {/* Agreement checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={agreed}
                        onChange={e => setAgreed(e.target.checked)}
                        className="mt-1 w-5 h-5 accent-[#10b981] flex-shrink-0"/>
                      <span className="text-sm text-gray-300">
                        I have read and agree to the{" "}
                        <button type="button" onClick={() => setShowAgreement(true)}
                          className="text-[#10b981] hover:underline font-medium">
                          User Agreement
                        </button>{" "}and{" "}
                        <Link href="/privacy" className="text-[#10b981] hover:underline font-medium">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {/* Helper text when not agreed */}
                    {!agreed && (
                      <p className="text-xs text-gray-600 mt-1.5 ml-8">
                        You must accept the agreement before creating an account.
                      </p>
                    )}
                  </div>

                  {/* Submit button */}
                  <button type="submit"
                    disabled={loading || !agreed || passwordsMismatch}
                    className="w-full bg-[#10b981] hover:bg-[#0ea76e] disabled:bg-[#10b981]/40 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-2xl text-lg transition flex items-center justify-center gap-2">
                    {loading ? <><Spinner /> Creating account...</> : "Create Account"}
                  </button>
                </form>

                <div className="mt-7 text-center text-gray-400 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#10b981] hover:underline font-medium">
                    Sign in here
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Agreement Modal */}
      {showAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#0f1b2e] border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-80px)]">
              <UserAgreementText />
            </div>
            <div className="border-t border-white/10 p-5 flex gap-3 justify-end">
              <button onClick={() => { setAgreed(true); setShowAgreement(false); }}
                className="bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold px-8 py-3 rounded-2xl transition text-sm">
                I Agree
              </button>
              <button onClick={() => setShowAgreement(false)}
                className="bg-white/8 hover:bg-white/15 px-8 py-3 rounded-2xl transition text-sm text-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
  );
}