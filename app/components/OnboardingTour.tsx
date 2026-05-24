"use client";
import { useEffect } from "react";

const TOUR_KEY = "guestOnboardingSeen";

export default function OnboardingTour() {
  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;

    // Inject styles directly into <head> so they apply globally
    // (Driver.js appends the popover to <body>, outside React's tree)
    const styleEl = document.createElement("style");
    styleEl.id = "endoprognosis-tour-styles";
    styleEl.innerHTML = `
      /* ── Popover container ── */
      #driver-popover-content,
      .driver-popover {
        background: #0d1a30 !important;
        border: 1px solid rgba(16,185,129,0.35) !important;
        border-radius: 20px !important;
        box-shadow: 0 24px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(16,185,129,0.1) !important;
        padding: 0 !important;
        max-width: 320px !important;
        font-family: 'DM Sans', system-ui, sans-serif !important;
        color: #cbd5e1 !important;
      }

      /* ── Arrow ── */
      .driver-popover-arrow-side-top .driver-popover-arrow    { border-bottom-color: #0d1a30 !important; }
      .driver-popover-arrow-side-bottom .driver-popover-arrow { border-top-color: #0d1a30 !important; }
      .driver-popover-arrow-side-left .driver-popover-arrow   { border-right-color: #0d1a30 !important; }
      .driver-popover-arrow-side-right .driver-popover-arrow  { border-left-color: #0d1a30 !important; }

      /* ── Inner wrapper ── */
      .driver-popover-inner {
        background: transparent !important;
        padding: 22px 22px 18px !important;
      }

      /* ── Title ── */
      .driver-popover-title {
        background: transparent !important;
        color: #10b981 !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        margin: 0 0 10px !important;
        padding: 0 !important;
        border: none !important;
        line-height: 1.4 !important;
      }

      /* ── Description ── */
      .driver-popover-description {
        background: transparent !important;
        color: #cbd5e1 !important;
        font-size: 13px !important;
        line-height: 1.75 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .driver-popover-description strong,
      .driver-popover-description b {
        color: #ffffff !important;
        font-weight: 600 !important;
      }

      /* ── Footer ── */
      .driver-popover-footer {
        background: transparent !important;
        border-top: 1px solid rgba(255,255,255,0.07) !important;
        margin: 14px 0 0 !important;
        padding: 14px 22px 18px !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      /* ── Progress text ── */
      .driver-popover-progress-text {
        color: #475569 !important;
        font-size: 11px !important;
        flex: 1 !important;
      }

      /* ── Next button ── */
      .driver-popover-next-btn {
        background: #10b981 !important;
        color: #000000 !important;
        border: none !important;
        border-radius: 10px !important;
        padding: 7px 16px !important;
        font-weight: 700 !important;
        font-size: 12px !important;
        cursor: pointer !important;
        text-shadow: none !important;
        box-shadow: none !important;
        outline: none !important;
      }
      .driver-popover-next-btn:hover {
        background: #0ea76e !important;
        color: #000000 !important;
      }

      /* ── Prev button ── */
      .driver-popover-prev-btn {
        background: rgba(255,255,255,0.07) !important;
        color: #94a3b8 !important;
        border: 1px solid rgba(255,255,255,0.12) !important;
        border-radius: 10px !important;
        padding: 7px 16px !important;
        font-size: 12px !important;
        cursor: pointer !important;
        text-shadow: none !important;
        box-shadow: none !important;
        outline: none !important;
      }
      .driver-popover-prev-btn:hover {
        background: rgba(255,255,255,0.12) !important;
        color: #e2e8f0 !important;
      }

      /* ── Close (×) button ── */
      .driver-popover-close-btn {
        background: transparent !important;
        color: #475569 !important;
        font-size: 20px !important;
        line-height: 1 !important;
        border: none !important;
        cursor: pointer !important;
        position: absolute !important;
        top: 14px !important;
        right: 16px !important;
        padding: 2px 6px !important;
      }
      .driver-popover-close-btn:hover {
        color: #94a3b8 !important;
        background: rgba(255,255,255,0.08) !important;
        border-radius: 6px !important;
      }

      /* ── Dark overlay ── */
      .driver-overlay {
        background: rgba(0,0,10,0.78) !important;
      }
    `;
    document.head.appendChild(styleEl);

    const runTour = async () => {
      const { driver } = await import("driver.js");
      await import("driver.js/dist/driver.css");

      const driverObj = driver({
        animate:      true,
        smoothScroll: true,
        allowClose:   true,
        overlayOpacity: 0.78,
        stagePadding:   12,
        stageRadius:    20,
        progressText:  "{{current}} of {{total}}",
        showProgress:  true,
        nextBtnText:   "Next →",
        prevBtnText:   "← Back",
        doneBtnText:   "Got it ✓",
        onDestroyed: () => {
          localStorage.setItem(TOUR_KEY, "true");
        },
        steps: [
          {
            element: "#tour-epp-card",
            popover: {
              title: "🦷 Endodontic Prognosis Predictor",
              description:
                "Enter clinical and radiographic data for a tooth to get a <strong>4-year survival estimate</strong> and treatment recommendation. Uses the Dental Prognosis Index (DPI) scoring system.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-ctc-card",
            popover: {
              title: "🔍 Crack Tooth Classifier",
              description:
                "Input symptoms, probing depths, and radiographic findings to classify a cracked tooth using the <strong>Iowa Classification (Stage I–V)</strong> and detect vertical root fractures.",
              side: "left",
              align: "start",
            },
          },
          {
            element: "#tour-usage-badge",
            popover: {
              title: "⏳ Guest Usage Limit",
              description:
                "As a guest, you have <strong>3 free uses per month</strong> across both tools. The counter resets every 30 days. Each time you generate a result, one use is consumed.",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "#tour-signup-btn",
            popover: {
              title: "🚀 Unlock Everything — Free",
              description:
                "Create a free account to get <strong>unlimited access</strong>, save cases, export PDFs, and unlock the Dental Trauma Center and all future tools.",
              side: "top",
              align: "center",
            },
          },
        ],
      });

      setTimeout(() => driverObj.drive(), 600);
    };

    runTour();

    // Cleanup styles on unmount
    return () => {
      document.getElementById("endoprognosis-tour-styles")?.remove();
    };
  }, []);

  return null;
}