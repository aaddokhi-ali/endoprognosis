// app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [hovering, setHovering] = useState<"patient" | "doctor" | null>(null);

  // ── Auth redirect ──
  useEffect(() => {
    if (loading) return;
    if (user) router.push("/home");
  }, [user, loading, router]);

  // ── Fade in ──
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
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

    // Particles
    const COUNT = 120;
    type P = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string };
    const colors = ["#f5d76e", "#d4af37", "#f0c14d", "#ffffff", "#c8a96e"];
    const particles: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    // Connection lines
    const CONNECT_DIST = 120;

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Draw connections
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

      // Draw particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(")", `,${p.alpha})`).replace("rgb", "rgba").replace("#", "rgba(").replace("rgba(", "rgba(");
        // Simple hex → rgba
        const hex = p.color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();

        // Move
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

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050d1f] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-[#f5d76e]/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-[#f5d76e]/40 animate-spin border-t-[#f5d76e]" />
          </div>
          <p className="text-[#f5d76e]/70 text-sm tracking-[3px] uppercase">Loading Endoprognosis...</p>
        </div>
      </div>
    );
  }

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

      {/* Gold radial glow — center */}
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
            3D EXTRUSION TITLE
        ══════════════════════════════════════ */}
        <div
          className="relative mb-4 text-center"
          style={{ animation: "fadeSlideDown 1s ease 0.4s both" }}
        >
          {/* Deep extrusion layers — offset copies */}
          {[...Array(18)].map((_, i) => (
            <h1
              key={i}
              aria-hidden="true"
              className="absolute inset-0 font-black tracking-tighter text-center leading-none pointer-events-none"
              style={{
                fontFamily: "Playfair Display, Georgia, serif",
                fontSize: "clamp(3rem, 10vw, 9rem)",
                transform: `translate(${(i + 1) * 1.2}px, ${(i + 1) * 1.2}px)`,
                color: `rgba(${Math.round(80 - i * 3)}, ${Math.round(60 - i * 2)}, ${Math.round(10 - i * 0.3)}, ${0.9 - i * 0.04})`,
                WebkitTextStroke: "0px",
                zIndex: -i,
              }}
            >
              ENDOPROGNOSIS
            </h1>
          ))}

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
              transform: "translate(0, 4px) scale(1.02)",
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
            }}
          >
            ENDOPROGNOSIS
          </h1>

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
              textShadow: "none",
              position: "relative",
              zIndex: 10,
            }}
          >
            ENDOPROGNOSIS
          </h1>
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
              background: hovering === "patient"
                ? "linear-gradient(135deg, #f5d76e, #d4af37)"
                : "linear-gradient(135deg, #f5d76e, #d4af37)",
              color: "#050d1f",
              boxShadow: hovering === "patient"
                ? "0 0 40px rgba(245,215,110,0.7), 0 0 80px rgba(245,215,110,0.3), inset 0 1px 0 rgba(255,255,255,0.3)"
                : "0 0 20px rgba(245,215,110,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
              transform: hovering === "patient" ? "translateY(-3px) scale(1.04)" : "translateY(0) scale(1)",
            }}
          >
            {/* Shimmer on hover */}
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
              Enter as Patient
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
          <div
            className="w-5 h-8 rounded-full border border-gray-500 flex items-start justify-center p-1"
          >
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
      `}</style>

    </div>
  );
}