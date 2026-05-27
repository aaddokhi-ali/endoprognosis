"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [hovering, setHovering] = useState<"patient" | "doctor" | null>(null);
  const [butterflyReady, setButterflyReady] = useState(false);

  // ── Fade in ──
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Butterfly lands after title appears
  useEffect(() => {
    const t = setTimeout(() => setButterflyReady(true), 2200);
    return () => clearTimeout(t);
  }, []);

  // ── PARTICLE CANVAS ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", resize);

    const COUNT = 120;
    const colors = ["#f5d76e", "#d4af37", "#f0c14d", "#ffffff", "#c8a96e"];
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const CONNECT_DIST = 120;

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const opacity = (1 - dist / CONNECT_DIST) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(245,215,110,${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        const hex = p.color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050d1f] text-white overflow-hidden relative flex flex-col select-none">

      {/* ── BACKGROUND PHOTO ── */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://iili.io/C9c9AXV.jpg')",
          filter: "brightness(0.28) contrast(1.3) saturate(0.6)",
          transform: "scale(1.05)",
          animation: "bgZoom 20s ease-in-out infinite alternate",
        }}
      />

      {/* ── GRADIENT LAYERS ── */}
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-[#050d1f]/40 via-transparent to-[#050d1f]/95" />
      <div className="absolute inset-0 z-1 bg-gradient-to-r from-[#050d1f]/60 via-transparent to-[#050d1f]/60" />

      {/* Gold radial glow */}
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 45%, rgba(245,215,110,0.07) 0%, transparent 70%)",
        }}
      />

      {/* ── PARTICLE CANVAS ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-2 pointer-events-none"
        style={{ opacity: 0.7 }}
      />

      {/* ── MAIN ── */}
      <main
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6"
        style={{
          opacity: ready ? 1 : 0,
          transform: ready ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 1.2s ease, transform 1.2s ease",
        }}
      >

        {/* ── EYEBROW ── */}
        <div
          className="flex items-center gap-3 mb-10"
          style={{ animation: "fadeSlideDown 1s ease 0.2s both" }}
        >
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#f5d76e]/50" />
          <span className="text-[10px] tracking-[5px] text-[#f5d76e]/60 uppercase font-medium">
            Welcome to
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#f5d76e]/50" />
        </div>

        {/* ══════════════════════════════════════
            3D EXTRUSION TITLE + BUTTERFLY
        ══════════════════════════════════════ */}
        <div
          className="relative mb-4 text-center"
          style={{ animation: "fadeSlideDown 1s ease 0.4s both", perspective: "900px" }}
        >
          {/* 3D extrusion — side shadow layers */}
          {[...Array(12)].map((_, i) => (
            <h1
              key={`shadow-${i}`}
              aria-hidden="true"
              className="absolute inset-0 font-black tracking-tighter text-center leading-none pointer-events-none"
              style={{
                fontFamily: "Playfair Display, Georgia, serif",
                fontSize: "clamp(3rem, 10vw, 9rem)",
                transform: `translate3d(${(i + 1) * 1.5}px, ${(i + 1) * 2.5}px, 0)`,
                color: `rgba(15, 25, 50, ${0.95 - i * 0.06})`,
                zIndex: -i - 1,
              }}
            >
              ENDOPROGNOSIS
            </h1>
          ))}

          {/* 3D highlight edge — top-left bevel */}
          <h1
            aria-hidden="true"
            className="absolute inset-0 font-black tracking-tighter text-center leading-none pointer-events-none"
            style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "clamp(3rem, 10vw, 9rem)",
              transform: "translate3d(-1px, -1px, 0)",
              color: "rgba(255, 248, 224, 0.15)",
              zIndex: 20,
            }}
          >
            ENDOPROGNOSIS
          </h1>

          {/* Gloss layer — blurred glow behind */}
          <h1
            aria-hidden="true"
            className="absolute inset-0 font-black tracking-tighter text-center leading-none pointer-events-none blur-2xl"
            style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "clamp(3rem, 10vw, 9rem)",
              background: "linear-gradient(135deg, #f5d76e, #d4af37)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              opacity: 0.35,
              transform: "translate3d(0, 4px, 0) scale(1.02)",
              zIndex: -13,
            }}
          >
            ENDOPROGNOSIS
          </h1>

          {/* Shimmer sweep layer */}
          <h1
            aria-hidden="true"
            className="absolute inset-0 font-black tracking-tighter text-center leading-none pointer-events-none"
            style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "clamp(3rem, 10vw, 9rem)",
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% 100%",
              animation: "shimmerSweep 4s ease-in-out infinite",
              zIndex: 19,
            }}
          >
            ENDOPROGNOSIS
          </h1>

          {/* ── BUTTERFLY ── */}
          <div
            className="absolute pointer-events-none"
            style={{
              right: "2%",
              top: "-18%",
              zIndex: 30,
              opacity: butterflyReady ? 1 : 0,
              transform: butterflyReady
                ? "translate3d(0, 0, 40px) rotate(-12deg)"
                : "translate3d(80px, -60px, 0) rotate(-30deg)",
              transition: "opacity 1.5s ease, transform 2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              filter: "drop-shadow(0 4px 20px rgba(245,215,110,0.4)) drop-shadow(0 0 60px rgba(212,175,55,0.2))",
            }}
          >
            <svg
              width="90"
              height="80"
              viewBox="0 0 120 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ animation: "butterflyFloat 4s ease-in-out infinite" }}
            >
              {/* Left wing — upper */}
              <path
                d="M60 45 C45 20, 10 5, 8 30 C6 50, 30 55, 60 50Z"
                fill="url(#wingGoldL)"
                stroke="rgba(245,215,110,0.6)"
                strokeWidth="0.8"
              />
              {/* Left wing — lower */}
              <path
                d="M60 52 C40 55, 15 65, 18 82 C22 95, 45 75, 60 58Z"
                fill="url(#wingGoldL2)"
                stroke="rgba(245,215,110,0.5)"
                strokeWidth="0.8"
              />
              {/* Right wing — upper */}
              <path
                d="M60 45 C75 20, 110 5, 112 30 C114 50, 90 55, 60 50Z"
                fill="url(#wingGoldR)"
                stroke="rgba(245,215,110,0.6)"
                strokeWidth="0.8"
              />
              {/* Right wing — lower */}
              <path
                d="M60 52 C80 55, 105 65, 102 82 C98 95, 75 75, 60 58Z"
                fill="url(#wingGoldR2)"
                stroke="rgba(245,215,110,0.5)"
                strokeWidth="0.8"
              />
              {/* Wing patterns — left upper */}
              <circle cx="30" cy="32" r="6" fill="rgba(255,248,224,0.3)" />
              <circle cx="38" cy="28" r="3" fill="rgba(255,248,224,0.2)" />
              <circle cx="22" cy="38" r="3.5" fill="rgba(212,175,55,0.3)" />
              {/* Wing patterns — right upper */}
              <circle cx="90" cy="32" r="6" fill="rgba(255,248,224,0.3)" />
              <circle cx="82" cy="28" r="3" fill="rgba(255,248,224,0.2)" />
              <circle cx="98" cy="38" r="3.5" fill="rgba(212,175,55,0.3)" />
              {/* Wing patterns — left lower */}
              <circle cx="32" cy="72" r="4" fill="rgba(255,248,224,0.2)" />
              {/* Wing patterns — right lower */}
              <circle cx="88" cy="72" r="4" fill="rgba(255,248,224,0.2)" />
              {/* Body */}
              <ellipse cx="60" cy="55" rx="3" ry="14" fill="#d4af37" />
              <ellipse cx="60" cy="55" rx="1.8" ry="12" fill="url(#bodyShine)" />
              {/* Antennae */}
              <path d="M58 42 C54 30, 48 22, 44 18" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="44" cy="18" r="2" fill="#f5d76e" />
              <path d="M62 42 C66 30, 72 22, 76 18" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="76" cy="18" r="2" fill="#f5d76e" />
              {/* Gradients */}
              <defs>
                <linearGradient id="wingGoldL" x1="8" y1="5" x2="60" y2="50" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f5d76e" />
                  <stop offset="40%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
                <linearGradient id="wingGoldL2" x1="18" y1="55" x2="60" y2="58" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#8b6914" />
                </linearGradient>
                <linearGradient id="wingGoldR" x1="112" y1="5" x2="60" y2="50" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f5d76e" />
                  <stop offset="40%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
                <linearGradient id="wingGoldR2" x1="102" y1="55" x2="60" y2="58" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#8b6914" />
                </linearGradient>
                <linearGradient id="bodyShine" x1="60" y1="42" x2="60" y2="68" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="rgba(255,248,224,0.6)" />
                  <stop offset="50%" stopColor="rgba(245,215,110,0.3)" />
                  <stop offset="100%" stopColor="rgba(184,134,11,0.4)" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* ── MAIN FACE ── */}
          <h1
            className="relative font-black tracking-tighter text-center leading-none"
            style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "clamp(3rem, 10vw, 9rem)",
              background: "linear-gradient(160deg, #fff8e0 0%, #f5d76e 30%, #d4af37 60%, #b8860b 85%, #8b6914 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              WebkitTextStroke: "0px",
              filter: "drop-shadow(0 0 40px rgba(245,215,110,0.5)) drop-shadow(0 0 80px rgba(212,175,55,0.25))",
              position: "relative",
              zIndex: 15,
              transform: "translate3d(0, 0, 30px)",
            }}
          >
            ENDOPROGNOSIS
          </h1>

          {/* 3D shadow on surface */}
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              bottom: "-18px",
              width: "80%",
              height: "20px",
              background: "radial-gradient(ellipse, rgba(245,215,110,0.12) 0%, transparent 70%)",
              filter: "blur(8px)",
              transform: "perspective(300px) rotateX(60deg) translate3d(0,0,-5px)",
              zIndex: -14,
            }}
          />
        </div>

        {/* ── ARABIC SUBTITLE ── */}
        <p
          className="text-xl md:text-3xl font-light text-gray-300 mb-3 mt-2"
          style={{
            fontFamily: "Tajawal, Arial, sans-serif",
            direction: "rtl",
            animation: "fadeSlideDown 1s ease 0.6s both",
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          أهلاً بك في منصة إندوبروجنوسيس
        </p>

        {/* ── TAGLINE ── */}
        <p
          className="text-gray-500 text-xs md:text-sm tracking-[2px] uppercase mb-16"
          style={{ animation: "fadeSlideDown 1s ease 0.75s both" }}
        >
          Endodontic Clinical Intelligence Platform
        </p>

        {/* ── ENTER BUTTONS ── */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4"
          style={{ animation: "fadeSlideDown 1s ease 0.95s both" }}
        >

          {/* Patient button */}
          <button
            onClick={() => router.push("/patients/checker")}
            onMouseEnter={() => setHovering("patient")}
            onMouseLeave={() => setHovering(null)}
            className="group relative overflow-hidden rounded-full px-10 py-4 text-sm font-bold tracking-[1.5px] uppercase transition-all duration-500"
            style={{
              background: "linear-gradient(135deg, #f5d76e, #d4af37)",
              color: "#050d1f",
              boxShadow: hovering === "patient"
                ? "0 0 40px rgba(245,215,110,0.7), 0 0 80px rgba(245,215,110,0.3), inset 0 1px 0 rgba(255,255,255,0.3)"
                : "0 0 20px rgba(245,215,110,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
              transform: hovering === "patient" ? "translateY(-3px) scale(1.04)" : "translateY(0) scale(1)",
            }}
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: hovering === "patient" ? "shimmerBtn 0.6s ease forwards" : "none",
              }}
            />
            <span className="relative flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C9 2 7 4 7 7c0 4 5 10 5 10s5-6 5-10c0-3-2-5-5-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>
                <circle cx="12" cy="7" r="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              تفضل عزيزي المراجع
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

          {/* Divider */}
          <span className="text-gray-700 text-xs hidden sm:block">|</span>

          {/* Doctor button */}
          <button
            onClick={() => router.push("/login")}
            onMouseEnter={() => setHovering("doctor")}
            onMouseLeave={() => setHovering(null)}
            className="group relative overflow-hidden rounded-full px-10 py-4 text-sm font-bold tracking-[1.5px] uppercase transition-all duration-500"
            style={{
              background: "transparent",
              color: hovering === "doctor" ? "#f5d76e" : "#8a9ab8",
              border: `1.5px solid ${hovering === "doctor" ? "#f5d76e" : "#1e2e4a"}`,
              boxShadow: hovering === "doctor"
                ? "0 0 24px rgba(245,215,110,0.25), inset 0 0 24px rgba(245,215,110,0.05)"
                : "none",
              transform: hovering === "doctor" ? "translateY(-3px)" : "translateY(0)",
            }}
          >
            <span className="relative flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Doctor Login
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>
        </div>

        {/* ── SCROLL HINT ── */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30"
          style={{ animation: "fadeSlideDown 1s ease 1.4s both" }}
        >
          <div className="w-5 h-8 rounded-full border border-gray-500 flex items-start justify-center p-1">
            <div
              className="w-1 h-2 rounded-full bg-gray-400"
              style={{ animation: "scrollDot 2s ease infinite" }}
            />
          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 py-6 border-t border-white/5 bg-black/40 text-center">
        <p className="text-gray-700 text-xs tracking-wider">
          endoprognosis project 2026. Copyrights reserved
        </p>
      </footer>

      {/* ── KEYFRAMES ── */}
      <style jsx>{`
        @keyframes bgZoom {
          0%   { transform: scale(1.05) translateY(0px); }
          100% { transform: scale(1.12) translateY(-12px); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerSweep {
          0%   { background-position: 200% center; }
          40%  { background-position: -200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes shimmerBtn {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes scrollDot {
          0%   { transform: translateY(0);   opacity: 1; }
          60%  { transform: translateY(10px); opacity: 0; }
          61%  { transform: translateY(0);   opacity: 0; }
          100% { transform: translateY(0);   opacity: 1; }
        }
        @keyframes butterflyFloat {
          0%   { transform: translateY(0px) rotate(0deg); }
          25%  { transform: translateY(-4px) rotate(1deg); }
          50%  { transform: translateY(0px) rotate(0deg); }
          75%  { transform: translateY(-2px) rotate(-1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>

    </div>
  );
}
