"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface GuestLimitModalProps {
  onClose?: () => void;
}

export default function GuestLimitModal({ onClose }: GuestLimitModalProps) {
  const router = useRouter();

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"
         style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}>

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/10 overflow-hidden"
        style={{ background: "#0d1a30" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #10b981, #3b82f6)" }} />

        <div className="p-8 text-center">

          {/* Icon */}
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#ef4444" strokeWidth="1.6"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="#ef4444"/>
            </svg>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-white mb-2">
            You've used your 3 free attempts
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Guest access is limited to <span className="text-white font-semibold">3 uses per month</span>.
            Create a free account to get unlimited access to EPP, CTC, and all future tools.
          </p>

          {/* Benefits list */}
          <div className="mb-7 rounded-2xl p-4 text-left space-y-2.5"
               style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
            {[
              "Unlimited EPP & CTC use",
              "Save and revisit past cases",
              "Access to Dental Trauma Center",
              "PDF export for every result",
              "Early access to new tools",
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: "rgba(16,185,129,0.2)" }}>
                  <svg width="8" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-sm text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <button
            onClick={() => router.push("/login?mode=signup")}
            className="w-full py-4 rounded-2xl font-bold text-black text-sm mb-3 transition-all hover:-translate-y-0.5"
            style={{ background: "#10b981", boxShadow: "0 8px 24px rgba(16,185,129,0.25)" }}
          >
            Create Free Account →
          </button>

          <button
            onClick={() => router.push("/login")}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-gray-300 transition-all hover:text-white"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Log In to Existing Account
          </button>

          {/* Dismiss */}
          {onClose && (
            <button onClick={onClose}
              className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}