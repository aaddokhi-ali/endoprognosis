// app/contact/page.tsx
"use client";
import { useState } from "react";
import Navigation from "../components/navigation";
import Image from "next/image";
import Link from "next/link";

const contacts = [
  {
    icon: "🦷",
    role: "Project Owner & Clinical Inquiries",
    desc: "Questions about clinical logic, tool methodology, or academic collaboration.",
    email: "aaddokhi@endoprognosis.org",
  },
  {
    icon: "🛠️",
    role: "General Support",
    desc: "Technical issues, bug reports, or questions about how to use the tools.",
    email: "support@endoprognosis.org",
  },
  {
    icon: "🤝",
    role: "Information & Partnership",
    desc: "Partnership proposals, media inquiries, or institutional licensing.",
    email: "info@endoprognosis.org",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.message) return;
    const to = "support@endoprognosis.org";
    const subject = encodeURIComponent(formData.subject || "Message from Endoprognosis Contact Form");
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">

        {/* Hero — consistent with other pages */}
        <div
          className="relative h-[460px] bg-cover bg-center"
          style={{ backgroundImage: "url('https://iili.io/B6uUNfI.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#0a1428]" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={280}
              height={90}
              className="mb-8 drop-shadow-2xl"
              priority
            />
            <h1 className="text-5xl md:text-6xl font-serif tracking-wider mb-4">Contact Us</h1>
            <p className="text-xl text-gray-300">We'd love to hear from you</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-16 space-y-10">

          {/* ── Contact Role Cards ── */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Get in Touch</h2>
            <p className="text-gray-400 mb-8">
              Choose the right contact based on the nature of your inquiry.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {contacts.map((c) => (
                <div
                  key={c.email}
                  className="bg-white/8 backdrop-blur border border-white/15 rounded-2xl p-7 flex flex-col gap-4 hover:border-[#10b981]/50 hover:bg-white/12 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#10b981]/15 flex items-center justify-center text-2xl">
                    {c.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base mb-1">{c.role}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{c.desc}</p>
                  </div>
                  <a
                    href={`mailto:${c.email}`}
                    className="mt-auto inline-flex items-center gap-2 text-[#10b981] text-sm font-medium hover:underline group-hover:gap-3 transition-all"
                  >
                    <span>✉</span>
                    {c.email}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* ── Two Column: Form + Info ── */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

            {/* Contact Form — 3/5 width */}
            <div className="md:col-span-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-white mb-2">Send a Message</h2>
              <p className="text-gray-400 text-sm mb-8">
                Fill in the form below and your default email client will open with your message pre-filled.
              </p>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#10b981]/20 flex items-center justify-center text-3xl">✓</div>
                  <h3 className="text-xl font-semibold text-[#10b981]">Email Client Opened</h3>
                  <p className="text-gray-400 text-sm">Your message has been prepared. Please send it from your email client.</p>
                  <button
                    onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", subject: "", message: "" }); }}
                    className="mt-4 text-sm text-gray-400 hover:text-white underline transition"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-300">
                        Full Name <span className="text-[#10b981]">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Dr. Jane Smith"
                        className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#10b981]/60 focus:bg-white/8 transition"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-300">
                        Email Address <span className="text-[#10b981]">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#10b981]/60 focus:bg-white/8 transition"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Subject</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#10b981]/60 focus:bg-white/8 transition text-white [&>option]:bg-[#0a1428] [&>option]:text-white"
                    >
                      <option value="">Select a subject…</option>
                      <option value="Clinical Inquiry">Clinical Inquiry</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Partnership Proposal">Partnership Proposal</option>
                      <option value="Academic Collaboration">Academic Collaboration</option>
                      <option value="Feedback">Feedback</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">
                      Message <span className="text-[#10b981]">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Write your message here…"
                      className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#10b981]/60 focus:bg-white/8 transition resize-none"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.name || !formData.email || !formData.message}
                    className="w-full py-4 rounded-xl font-semibold text-base transition-all duration-200
                      bg-[#10b981] text-black hover:bg-white
                      disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#10b981] disabled:hover:text-black"
                  >
                    Open Email Client →
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    Fields marked <span className="text-[#10b981]">*</span> are required
                  </p>
                </div>
              )}
            </div>

            {/* Info Panel — 2/5 width */}
            <div className="md:col-span-2 flex flex-col gap-5">

              {/* Location & Hours */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 flex flex-col gap-6">
                <h3 className="text-lg font-bold text-white">Location & Availability</h3>
                <div className="space-y-5">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-lg bg-[#10b981]/15 flex items-center justify-center text-lg flex-shrink-0">📍</div>
                    <div>
                      <p className="text-white text-sm font-medium">Dammam</p>
                      <p className="text-gray-400 text-sm">Kingdom of Saudi Arabia</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-lg bg-[#10b981]/15 flex items-center justify-center text-lg flex-shrink-0">⏰</div>
                    <div>
                      <p className="text-white text-sm font-medium">Business Hours</p>
                      <p className="text-gray-400 text-sm">9:00 AM – 5:00 PM (KSA Time)</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-lg bg-[#10b981]/15 flex items-center justify-center text-lg flex-shrink-0">💬</div>
                    <div>
                      <p className="text-white text-sm font-medium">Response Time</p>
                      <p className="text-gray-400 text-sm">We reply to all emails within 48 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-[#450a0a] border border-red-500/30 rounded-3xl p-8">
                <p className="text-[#fda4af] text-sm leading-relaxed">
                  <strong className="text-white block mb-2">Clinical Disclaimer</strong>
                  This platform provides decision-support tools only. For urgent clinical matters,
                  consult current guidelines and qualified specialists directly.
                </p>
              </div>

            </div>
          </div>

          {/* Back button */}
          <div className="text-center pt-4 pb-8">
            <Link
              href="/home"
              className="inline-block bg-[#10b981] hover:bg-white text-black px-12 py-5 rounded-2xl text-xl font-semibold transition"
            >
              ← Back to Home
            </Link>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
          <Link href="/about" className="hover:text-white transition">About</Link>
          <Link href="/references" className="hover:text-white transition">References</Link>
          <Link href="/how-to-use" className="hover:text-white transition">How to Use</Link>
          <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
          <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
        </div>
        <div className="mt-6 text-xs">
          Need help? Contact us at{" "}
          <a href="mailto:support@endoprognosis.org" className="text-[#10b981] hover:underline">
            support@endoprognosis.org
          </a>
        </div>
        <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
      </div>
    </>
  );
}