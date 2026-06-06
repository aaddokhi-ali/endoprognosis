"use client";
import { useEffect } from "react";

const TOUR_KEY = "guestOnboardingSeen";

export default function OnboardingTour() {
  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;

    const styleEl = document.createElement("style");
    styleEl.id = "endoprognosis-tour-styles";
    styleEl.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');

      /* ── Popover container ── */
      #driver-popover-content,
      .driver-popover {
        background: #0a1428 !important;
        border: 1px solid rgba(16,185,129,0.30) !important;
        border-radius: 24px !important;
        box-shadow:
          0 32px 80px rgba(0,0,0,0.90),
          0 0 0 1px rgba(16,185,129,0.08),
          inset 0 1px 0 rgba(255,255,255,0.04) !important;
        padding: 0 !important;
        max-width: 340px !important;
        font-family: 'DM Sans', system-ui, sans-serif !important;
        color: #cbd5e1 !important;
        overflow: hidden !important;
      }

      /* ── Accent bar at top ── */
      .driver-popover::before {
        content: '' !important;
        display: block !important;
        height: 3px !important;
        background: linear-gradient(90deg, #10b981, #3b82f6) !important;
        border-radius: 24px 24px 0 0 !important;
      }

      /* ── Arrow ── */
      .driver-popover-arrow-side-top .driver-popover-arrow    { border-bottom-color: #0a1428 !important; }
      .driver-popover-arrow-side-bottom .driver-popover-arrow { border-top-color: #0a1428 !important; }
      .driver-popover-arrow-side-left .driver-popover-arrow   { border-right-color: #0a1428 !important; }
      .driver-popover-arrow-side-right .driver-popover-arrow  { border-left-color: #0a1428 !important; }

      /* ── Inner wrapper ── */
      .driver-popover-inner {
        background: transparent !important;
        padding: 22px 24px 18px !important;
      }

      /* ── Title ── */
      .driver-popover-title {
        background: transparent !important;
        color: #f8fafc !important;
        font-family: 'Playfair Display', Georgia, serif !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        margin: 0 0 10px !important;
        padding: 0 !important;
        border: none !important;
        line-height: 1.35 !important;
        letter-spacing: -0.01em !important;
      }

      /* ── Description ── */
      .driver-popover-description {
        background: transparent !important;
        color: #94a3b8 !important;
        font-family: 'DM Sans', system-ui, sans-serif !important;
        font-size: 13px !important;
        line-height: 1.8 !important;
        margin: 0 !important;
        padding: 0 !important;
        font-weight: 400 !important;
      }
      .driver-popover-description strong,
      .driver-popover-description b {
        color: #e2e8f0 !important;
        font-weight: 600 !important;
      }
      .driver-popover-description em {
        color: #10b981 !important;
        font-style: normal !important;
        font-weight: 600 !important;
      }

      /* ── Footer ── */
      .driver-popover-footer {
        background: rgba(255,255,255,0.02) !important;
        border-top: 1px solid rgba(255,255,255,0.06) !important;
        margin: 16px 0 0 !important;
        padding: 14px 24px 18px !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      /* ── Progress text ── */
      .driver-popover-progress-text {
        color: #334155 !important;
        font-size: 11px !important;
        font-family: 'DM Sans', system-ui, sans-serif !important;
        letter-spacing: 0.05em !important;
        flex: 1 !important;
      }

      /* ── Next button ── */
      .driver-popover-next-btn {
        background: #10b981 !important;
        color: #000000 !important;
        border: none !important;
        border-radius: 10px !important;
        padding: 8px 18px !important;
        font-family: 'DM Sans', system-ui, sans-serif !important;
        font-weight: 700 !important;
        font-size: 12px !important;
        cursor: pointer !important;
        text-shadow: none !important;
        box-shadow: 0 4px 12px rgba(16,185,129,0.25) !important;
        outline: none !important;
        letter-spacing: 0.01em !important;
        transition: background 0.15s ease !important;
      }
      .driver-popover-next-btn:hover {
        background: #0ea76e !important;
        color: #000000 !important;
      }

      /* ── Prev button ── */
      .driver-popover-prev-btn {
        background: rgba(255,255,255,0.05) !important;
        color: #64748b !important;
        border: 1px solid rgba(255,255,255,0.10) !important;
        border-radius: 10px !important;
        padding: 8px 16px !important;
        font-family: 'DM Sans', system-ui, sans-serif !important;
        font-size: 12px !important;
        cursor: pointer !important;
        text-shadow: none !important;
        box-shadow: none !important;
        outline: none !important;
        transition: all 0.15s ease !important;
      }
      .driver-popover-prev-btn:hover {
        background: rgba(255,255,255,0.10) !important;
        color: #e2e8f0 !important;
        border-color: rgba(255,255,255,0.20) !important;
      }

      /* ── Close button ── */
      .driver-popover-close-btn {
        background: transparent !important;
        color: #334155 !important;
        font-size: 18px !important;
        line-height: 1 !important;
        border: none !important;
        cursor: pointer !important;
        position: absolute !important;
        top: 16px !important;
        right: 18px !important;
        padding: 3px 7px !important;
        border-radius: 7px !important;
        transition: all 0.15s ease !important;
      }
      .driver-popover-close-btn:hover {
        color: #94a3b8 !important;
        background: rgba(255,255,255,0.08) !important;
      }

      /* ── Dark overlay ── */
      .driver-overlay {
        background: rgba(0,4,16,0.82) !important;
      }

      /* ── Stage highlight ring ── */
      .driver-active-element,
      .driver-highlighted-element {
        outline: 2px solid rgba(16,185,129,0.5) !important;
        outline-offset: 4px !important;
        border-radius: 24px !important;
      }
    `;
    document.head.appendChild(styleEl);

    const runTour = async () => {
      const { driver } = await import("driver.js");
      await import("driver.js/dist/driver.css");

      const driverObj = driver({
        animate:        true,
        smoothScroll:   true,
        allowClose:     true,
        overlayOpacity: 0.82,
        stagePadding:   14,
        stageRadius:    24,
        progressText:   "{{current}} of {{total}}",
        showProgress:   true,
        nextBtnText:    "Next →",
        prevBtnText:    "← Back",
        doneBtnText:    "Got it ✓",
        onDestroyed: () => {
          localStorage.setItem(TOUR_KEY, "true");
        },
        steps: [
          {
            element: "#tour-epp-card",
            popover: {
              title: "EndoDecide — Your Clinical Co-Pilot",
              description:
                "The unified endodontic decision tool. Enter clinical findings to get a <strong>4-year survival estimate</strong>, <em>AAE 2013 diagnosis</em>, and treatment recommendation — all in one workflow.",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "#tour-epp-card",
            popover: {
              title: "Iowa Classification Built In",
              description:
                "If a crack is detected and confirmed, EndoDecide automatically applies the <strong>Iowa Staging Index (Krell & Caplan 2018)</strong> — Stage I through IV — with 1-year success rates and VRF detection.",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "#tour-usage-badge",
            popover: {
              title: "Guest Usage Limit",
              description:
                "As a guest you have <strong>3 free uses per month</strong>. Each time you generate a result, one use is consumed. The counter resets every 30 days.",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "#tour-signup-btn",
            popover: {
              title: "Unlock Everything — Free",
              description:
                "Create a free account for <strong>unlimited access</strong>, case saving, PDF export, follow-up tracking, profit analytics, and the Dental Trauma Center.",
              side: "top",
              align: "center",
            },
          },
        ],
      });

      setTimeout(() => driverObj.drive(), 700);
    };

    runTour();

    return () => {
      document.getElementById("endoprognosis-tour-styles")?.remove();
    };
  }, []);

  return null;
}