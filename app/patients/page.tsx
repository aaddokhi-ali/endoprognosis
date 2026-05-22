// app/patients/page.tsx  ← LANDING PAGE (2 cards)
"use client";

import { useRouter } from "next/navigation";

export default function PatientsLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050d1f] text-white overflow-hidden relative flex flex-col">

      {/* ── BACKGROUND ── */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://iili.io/C9c9AXV.jpg')",
          filter: "brightness(0.4) contrast(1.3) saturate(0.8)",
        }}
      />
      {/* Gradient overlay — deeper at bottom */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/70 to-black/90" />
      {/* Subtle gold vignette */}
      <div className="absolute inset-0 z-10"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(245,215,110,0.06) 0%, transparent 70%)",
        }}
      />

      {/* ── HEADER ── */}
      <header className="relative z-20 flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/8">
        {/* Back */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-[#f5d76e] transition-colors text-sm group"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="group-hover:underline underline-offset-2">Back</span>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="17" fill="#0d1a30" stroke="#f5d76e" strokeWidth="1" />
            <path d="M11 14 C11 10, 14 8, 18 8 C22 8, 25 10, 25 14 C25 20, 21 26, 18 28 C15 26, 11 20, 11 14Z" fill="#f5d76e" opacity="0.2" />
            <path d="M13 15 C13 12, 15 10, 18 10 C21 10, 23 12, 23 15 C23 20, 20 25, 18 27 C16 25, 13 20, 13 15Z" stroke="#f5d76e" strokeWidth="1.2" fill="none" />
            <circle cx="18" cy="18" r="2" fill="#f5d76e" opacity="0.6" />
          </svg>
          <span
            className="font-bold text-[#f5d76e] text-lg tracking-tight"
            style={{ fontFamily: "Playfair Display, Georgia, serif" }}
          >
            EndoPrognosis
          </span>
        </div>

        {/* Spacer */}
        <div className="w-16" />
      </header>

      {/* ── HERO ── */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20">

        {/* Welcome text */}
        <div className="text-center mb-14 md:mb-16 max-w-3xl">

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#f5d76e]/50" />
            <span className="text-[11px] tracking-[4px] text-[#f5d76e]/70 uppercase font-medium">
              Patient & Physician Portal
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#f5d76e]/50" />
          </div>

          {/* English headline */}
          <h1
            className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-br from-[#f5d76e] via-[#f0c14d] to-[#d4af37] bg-clip-text text-transparent leading-tight mb-3"
            style={{ fontFamily: "Playfair Display, Georgia, serif" }}
          >
            Welcome
          </h1>

          {/* Arabic headline */}
          <p
            className="text-3xl md:text-5xl font-semibold text-gray-200 mb-6 leading-snug"
            style={{ fontFamily: "Tajawal, Arial, sans-serif", direction: "rtl" }}
          >
            أهلاً وسهلاً بكم
          </p>

          {/* Bilingual sub */}
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Choose your path below to get started.{" "}
            <span
              className="text-gray-500"
              style={{ fontFamily: "Tajawal, Arial, sans-serif", direction: "rtl", display: "inline" }}
            >
              اختر مسارك أدناه للبدء
            </span>
          </p>
        </div>

        {/* ── TWO CARDS ── */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl">

          {/* ── PATIENTS CARD ── */}
          <div
            onClick={() => router.push("/patients/checker")}
            className="group relative rounded-3xl overflow-hidden cursor-pointer h-[380px] md:h-[440px] flex flex-col justify-end border border-white/10 hover:border-[#f5d76e]/60 transition-all duration-700 hover:scale-[1.03] hover:shadow-2xl hover:shadow-[#f5d76e]/20"
            style={{
              backgroundImage: "url('https://iili.io/C9amzeR.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 group-hover:from-black/80 transition-all duration-700" />

            {/* Gold shimmer on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              style={{ background: "linear-gradient(135deg, rgba(245,215,110,0.07) 0%, transparent 60%)" }}
            />

            {/* Content */}
            <div className="relative z-10 p-7 md:p-8">
              {/* Icon */}
              <div className="w-10 h-10 rounded-2xl bg-[#f5d76e]/15 border border-[#f5d76e]/30 flex items-center justify-center mb-4 group-hover:bg-[#f5d76e]/25 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C9 2 7 4 7 7c0 4 5 10 5 10s5-6 5-10c0-3-2-5-5-5Z" stroke="#f5d76e" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="12" cy="7" r="2" stroke="#f5d76e" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Arabic label */}
              <p
                className="text-[#f5d76e]/70 text-xs tracking-[2px] uppercase mb-1"
                style={{ fontFamily: "Tajawal, Arial, sans-serif", direction: "rtl" }}
              >
                محطة المراجع
              </p>

              {/* English title */}
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[#f5d76e] transition-colors duration-300"
                style={{ fontFamily: "Playfair Display, Georgia, serif" }}
              >
                Patients
              </h2>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed mb-5 group-hover:text-gray-300 transition-colors">
                Describe your symptoms and find a trusted dentist near you.{" "}
                <span style={{ fontFamily: "Tajawal, Arial, sans-serif" }}>
                  صِف أعراضك وابحث عن طبيب موثوق
                </span>
              </p>

              {/* CTA */}
              <div className="flex items-center gap-2 text-[#f5d76e] text-sm font-semibold group-hover:gap-3 transition-all">
                <span>Start Assessment</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── DOCTORS CARD ── */}
          <div
            onClick={() => router.push("/login")}
            className="group relative rounded-3xl overflow-hidden cursor-pointer h-[380px] md:h-[440px] flex flex-col justify-end border border-white/10 hover:border-[#f5d76e]/60 transition-all duration-700 hover:scale-[1.03] hover:shadow-2xl hover:shadow-[#f5d76e]/20"
            style={{
              backgroundImage: "url('https://iili.io/ByEowhJ.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10 group-hover:from-black/80 transition-all duration-700" />

            {/* Gold shimmer on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              style={{ background: "linear-gradient(135deg, rgba(245,215,110,0.07) 0%, transparent 60%)" }}
            />

            {/* Content */}
            <div className="relative z-10 p-7 md:p-8">
              {/* Icon */}
              <div className="w-10 h-10 rounded-2xl bg-[#f5d76e]/15 border border-[#f5d76e]/30 flex items-center justify-center mb-4 group-hover:bg-[#f5d76e]/25 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="#f5d76e" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M9 14h2m4 0h-2m-2 0v2m0-2v-2" stroke="#f5d76e" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* Arabic label */}
              <p
                className="text-[#f5d76e]/70 text-xs tracking-[2px] uppercase mb-1"
                style={{ fontFamily: "Tajawal, Arial, sans-serif", direction: "rtl" }}
              >
                بوابة الأطباء
              </p>

              {/* English title */}
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[#f5d76e] transition-colors duration-300"
                style={{ fontFamily: "Playfair Display, Georgia, serif" }}
              >
                Doctors
              </h2>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed mb-5 group-hover:text-gray-300 transition-colors">
                Access clinical tools, patient records, and endodontic resources.{" "}
                <span style={{ fontFamily: "Tajawal, Arial, sans-serif" }}>
                  الأدوات السريرية وسجلات المرضى
                </span>
              </p>

              {/* CTA */}
              <div className="flex items-center gap-2 text-[#f5d76e] text-sm font-semibold group-hover:gap-3 transition-all">
                <span>Sign In</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom note */}
        <p className="text-gray-600 text-xs mt-10 text-center max-w-md">
          This platform is for informational purposes only and does not replace professional dental diagnosis.
        </p>

      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-20 py-6 border-t border-gray-800/60 bg-black/50 text-center">
        <p className="text-gray-600 text-xs">
          endoprognosis project 2026. Copyrights reserved
        </p>
      </footer>

    </div>
  );
}
