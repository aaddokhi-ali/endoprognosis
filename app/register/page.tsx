// app/register/page.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import LoadingScreen from "../components/LoadingScreen";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    profession: "dentist",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const { register, user, error: authError, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (user && user.emailVerified) {
      router.push("/home");
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    clearError();

    if (!agreed) {
      setError("You must agree to the User Agreement before creating an account.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password);
      
      localStorage.removeItem("isGuest");
      localStorage.removeItem("guestMode");
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== AGREEMENT COMPONENT ====================
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
        <p>
          You are fully responsible for any patient data you enter. You confirm that you have obtained all necessary patient consents and comply with applicable data protection laws.<br/><br/>
          We do not sell, share, or use patient data for our own commercial interest. However, anonymized and aggregated data may be used for research and tool improvement.
        </p>
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
  // ============================================================

  if (loading) {
    return <LoadingScreen message="Creating your account..." />;
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
              width={220}
              height={80}
              className="h-16 w-auto drop-shadow-lg"
              priority
            />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-5xl font-serif tracking-wider text-[#10b981] mb-3">
              Join Endoprognosis
            </h1>
            <p className="text-lg text-gray-300">Create your account to save cases</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl">
            {!success ? (
              <>
                {error && (
                  <div className="bg-red-500/10 border border-red-500 text-red-300 p-4 rounded-2xl mb-6 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
                      placeholder="Dr. John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Profession</label>
                    <select
                      name="profession"
                      value={formData.profession}
                      onChange={handleChange}
                      className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#10b981]"
                    >
                      <option value="dental_student">Dental Student</option>
                      <option value="dentist">General Dentist</option>
                      <option value="endodontist">Endodontist</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/10 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 w-5 h-5 accent-[#10b981]"
                      />
                      <span className="text-sm text-gray-300">
                        I have read and agree to the{" "}
                        <button
                          type="button"
                          onClick={() => setShowAgreement(true)}
                          className="text-[#10b981] hover:underline font-medium"
                        >
                          User Agreement
                        </button>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-[#10b981] hover:underline font-medium">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !agreed}
                    className="w-full bg-[#10b981] hover:bg-[#0ea76e] disabled:bg-gray-600 text-black font-semibold py-4 rounded-2xl text-lg transition disabled:cursor-not-allowed"
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </button>
                </form>

                <div className="mt-8 text-center text-gray-400">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#10b981] hover:underline">
                    Sign in here
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-7xl mb-8">📧</div>
                <h2 className="text-3xl font-bold text-[#10b981] mb-4">Account Created Successfully!</h2>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                  <p className="text-gray-300 text-lg">
                    A verification email has been sent to<br />
                    <strong className="text-white">{formData.email}</strong>
                  </p>
                  <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                    Please check your inbox and <strong>spam/junk folder</strong>.<br />
                    Click the verification link inside the email to activate your account.<br />
                    Once verified, you can log in.
                  </p>
                </div>

                <div className="space-y-4">
                  <Link 
                    href="/login"
                    className="block bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold py-4 rounded-2xl text-lg transition"
                  >
                    Go to Login Page
                  </Link>

                  <button
                    onClick={() => {
                      setSuccess(false);
                      setError("");
                      setFormData(prev => ({
                        ...prev,
                        password: "",
                        confirmPassword: ""
                      }));
                    }}
                    className="block w-full text-gray-400 hover:text-white py-3 transition"
                  >
                    Register another account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agreement Modal */}
      {showAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#0f1b2e] border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-80px)]">
              <UserAgreementText />
            </div>
            <div className="border-t border-white/10 p-6 flex justify-end">
              <button
                onClick={() => setShowAgreement(false)}
                className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-2xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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