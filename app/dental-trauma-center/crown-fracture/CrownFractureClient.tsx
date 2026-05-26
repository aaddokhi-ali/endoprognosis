// app/dental-trauma-center/crown-fracture/CrownFractureClient.tsx
"use client";
import Navigation from "../../components/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTrauma } from "../../context/TraumaContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// ══════════════════════════════════════════════════════════════════
// IADT 2020 CROWN FRACTURE PROTOCOL ENGINE
// DiAngelis et al., Dental Traumatology 2012;28:2–12
// Bourguignon et al., Dental Traumatology 2020 (IADT 2020 update)
// ══════════════════════════════════════════════════════════════════

type FractureClass = "enamel" | "uncomplicated" | "complicated";
type TimeSince = "immediate" | "short" | "delayed";

/**
 * Prognosis per IADT 2020.
 * For complicated fractures: partial pulpotomy success is high regardless
 * of apex stage when treatment is prompt. Open apex has additional
 * advantage of revascularization potential.
 * The key prognostic factor is pulp bleeding characteristics at the time
 * of treatment — not elapsed time alone (IADT 2020).
 */
function getPrognosis(
  fractureClass: FractureClass,
  apex: string,
  timeSince: TimeSince,
  luxation: boolean
): string {
  if (fractureClass === "enamel") {
    return luxation ? "Excellent (monitor for pulp vitality due to associated luxation)" : "Excellent";
  }
  if (fractureClass === "uncomplicated") {
    return luxation ? "Good to Excellent (monitor closely — associated luxation increases pulp necrosis risk)" : "Excellent";
  }
  // Complicated
  if (timeSince === "delayed") {
    return apex === "open"
      ? "Good to Guarded — delayed presentation, but open apex retains some revascularization potential. Assess pulp at treatment."
      : "Guarded — delayed presentation increases risk of irreversible pulpitis. Assess pulp bleeding carefully.";
  }
  // Immediate or short delay
  return apex === "open"
    ? "Excellent — partial pulpotomy highly successful at all apex stages. Open apex has additional revascularization advantage."
    : "Excellent to Good — partial pulpotomy has very high success rates for closed apex teeth when treatment is prompt.";
}

/**
 * Management protocol per IADT 2020.
 * Three distinct fracture classes with different protocols.
 * Dentin proximity tiers for uncomplicated fractures.
 * Bleeding assessment drives VPT decision for complicated fractures.
 */
function getManagementSteps(
  fractureClass: FractureClass,
  timeSince: TimeSince,
  fragmentAvailable: boolean,
  luxation: boolean,
  apex: string
): string[] {
  if (fractureClass === "enamel") {
    return [
      "Obtain baseline periapical radiograph to rule out associated root fracture or luxation.",
      "Smooth sharp enamel edges with a fine finishing bur to prevent soft tissue laceration.",
      fragmentAvailable
        ? "If fragment is available and fits well: bond with composite resin (acid etch technique)."
        : "Restore with composite resin or accept smoothed edge if minimal loss.",
      "No pulp treatment required for enamel-only fractures.",
      luxation
        ? "Associated luxation present: assess pulp vitality and follow luxation protocol — pulp necrosis risk is increased."
        : "Monitor pulp vitality at follow-up appointments.",
    ];
  }

  if (fractureClass === "uncomplicated") {
    return [
      "Obtain baseline periapical radiograph — rule out associated root fracture, crown-root fracture, or luxation before restoring.",
      "Assess dentin exposure depth clinically (proximity to pulp).",
      "Immediate dentin sealing is critical — exposed dentin provides direct bacterial pathway to pulp.",
      fragmentAvailable
        ? "First choice: Rehydrate tooth fragment in water or saline for minimum 20 minutes, then bond with composite resin (acid etch technique). Assess fragment fit — if poor fit, proceed with direct composite."
        : "Fragment not available: restore with direct composite resin using immediate dentin bonding.",
      "Dentin proximity management:",
      "  · Dentin exposure >0.5 mm from pulp: Apply bonding agent directly, restore with composite.",
      "  · Dentin exposure 0.5–1 mm from pulp: Place thin calcium hydroxide or resin-modified glass ionomer liner before bonding.",
      "  · Dentin exposure <0.5 mm from pulp (near-exposure): Pulp capping with hydraulic calcium silicate cement (MTA or Biodentine) — consider partial pulpotomy if pulp health is uncertain.",
      "If definitive restoration is not immediately possible: place glass ionomer cement as temporary dentin seal to prevent bacterial ingress.",
      luxation
        ? "Associated luxation: follow luxation protocol concurrently. Pulp necrosis risk is significantly elevated — increase follow-up frequency and lower threshold for pulp intervention."
        : "Verify occlusal contacts after restoration — avoid traumatic occlusion.",
    ];
  }

  // Complicated — pulp exposed
  const steps = [
    "Obtain baseline periapical radiograph — mandatory before any pulp treatment. Rule out root fracture or luxation.",
    "Administer local anesthesia.",
    "Rubber dam isolation is mandatory — asepsis is critical for pulp survival.",
    "Assess pulp exposure size: small (<1 mm, pinpoint) = pulp capping consideration; larger exposure = partial pulpotomy (preferred).",
    "Partial pulpotomy (preferred treatment — IADT 2020):",
    "  · Remove approximately 2 mm of coronal pulp tissue using a diamond bur under copious sterile saline irrigation.",
    "  · Control bleeding with sterile cotton pellets soaked in 0.5–5% sodium hypochlorite (NaOCl) for 1–2 minutes.",
  ];

  if (timeSince === "delayed") {
    steps.push(
      "DELAYED PRESENTATION — critical assessment: If pulp bleeding does not stop within 5 minutes with NaOCl, this indicates irreversible pulpitis or pulp necrosis. In this case: full pulpotomy or root canal treatment is indicated instead of partial pulpotomy.",
      "If bleeding is controlled within 5 minutes: proceed with hydraulic calcium silicate cement placement."
    );
  } else {
    steps.push(
      "Bleeding assessment — key prognostic indicator: If bleeding stops within 5 minutes with NaOCl, the remaining pulp is healthy and VPT will likely succeed. If bleeding persists >5 minutes: consider full pulpotomy or RCT."
    );
  }

  steps.push(
    "Apply hydraulic calcium silicate cement (MTA or Biodentine — both are equally acceptable) when bleeding is controlled. Ensure direct contact with vital pulp tissue.",
    "Place bonded restoration immediately over the calcium silicate cement — immediate restoration is important to seal the cavity.",
    apex === "open"
      ? "Open apex advantage: revascularization potential is present — monitor for continued root development at follow-up."
      : "Closed apex: monitor for pulp necrosis at follow-up. RCT if necrosis is confirmed.",
    "If VPT is not possible (uncontrolled bleeding, signs of irreversible pulpitis): initiate root canal treatment.",
    luxation
      ? "Associated luxation: combined injury significantly increases pulp necrosis risk. Consider lower threshold for RCT. Follow luxation protocol concurrently and increase follow-up frequency."
      : "Verify occlusal contacts post-restoration.",
    "Systemic antibiotics: not routinely indicated for isolated crown fractures. Consider if associated deep luxation, soft tissue injury, or medically compromised patient."
  );

  return steps;
}

/**
 * Follow-up schedule per IADT 2020.
 * Uncomplicated: 6–8 weeks, 1 year, 5 years.
 * Complicated (VPT): 6–8 weeks, 3 months, 6 months, 1 year, 5 years.
 * Enamel only: 1 year minimum (luxation: add 6–8 weeks).
 * Note: 2-week early check for complicated fractures in children (rapid resorption risk).
 */
function getFollowUpSchedule(
  fractureClass: FractureClass,
  apex: string,
  luxation: boolean
): Array<{ label: string; action: string }> {
  if (fractureClass === "enamel") {
    const schedule = [
      {
        label: "6–8 weeks",
        action: luxation
          ? "Clinical examination: pulp sensibility testing, percussion, mobility (due to associated luxation). Periapical radiograph. Assess restoration integrity."
          : "Clinical check: verify restoration integrity, check for any pulp symptoms.",
      },
      {
        label: "1 year",
        action: "Clinical and radiographic review. Pulp sensibility testing. Assess for late pulp necrosis (particularly if associated luxation was present).",
      },
      {
        label: "5 years",
        action: "Final long-term clinical and radiographic review.",
      },
    ];
    return schedule;
  }

  if (fractureClass === "uncomplicated") {
    return [
      {
        label: "6–8 weeks",
        action: "Clinical examination: pulp sensibility testing, percussion test, mobility assessment. Periapical radiograph — check periapical status and restoration seal. Assess for symptoms of pulp pathology.",
      },
      {
        label: "1 year",
        action: "Clinical and radiographic review. Pulp sensibility testing — compare to baseline. Radiographic check for periapical pathology or root resorption. Assess restoration integrity.",
      },
      {
        label: "5 years",
        action: "Long-term clinical and radiographic review. Monitor for late pulp necrosis, crown discoloration, and restoration durability.",
      },
    ];
  }

  // Complicated — VPT performed
  const schedule = [
    {
      label: "2 weeks",
      action: "Early clinical check — particularly important in children (rapid infection progression). Assess for pain, swelling, or signs of early treatment failure. No radiograph needed unless symptomatic.",
    },
    {
      label: "6–8 weeks",
      action: `Periapical radiograph: assess for hard tissue bridge formation (favorable — confirms pulp survival). Clinical examination: sensibility testing, percussion, mobility. ${apex === "open" ? "Open apex: check for continued root development (favorable outcome)." : "Closed apex: assess pulp vitality."}`,
    },
    {
      label: "3 months",
      action: `Periapical radiograph and clinical examination. ${apex === "open" ? "Check for pulp canal obliteration (expected favorable outcome) or inflammatory resorption (requires immediate intervention)." : "Assess for pulp necrosis — initiate RCT if confirmed."} Assess restoration integrity.`,
    },
    {
      label: "6 months",
      action: "Full clinical and radiographic evaluation. Compare to previous radiographs. Assess restoration, pulp status, root development (open apex), and periapical health.",
    },
    {
      label: "1 year",
      action: "Comprehensive review. Long-term pulp status assessment. Radiographic evidence of hard tissue bridge and root development confirms successful VPT.",
    },
    {
      label: "5 years",
      action: "Long-term follow-up. Monitor for late pulp necrosis, crown discoloration, root resorption, and restoration durability.",
    },
  ];

  if (luxation) {
    schedule[0].action += " LUXATION ASSOCIATED: increased frequency monitoring — pulp necrosis risk is significantly elevated with combined injury.";
  }

  return schedule;
}

// ── Protocol HTML generator ──
function generateProtocolHTML(params: {
  patientInfo: any;
  fractureClass: FractureClass;
  apex: string;
  timeSince: TimeSince;
  fragmentAvailable: boolean;
  luxation: boolean;
  injuryDate: string;
}): string {
  const { patientInfo, fractureClass, apex, timeSince, fragmentAvailable, luxation, injuryDate } = params;

  const prognosis      = getPrognosis(fractureClass, apex, timeSince, luxation);
  const managementSteps = getManagementSteps(fractureClass, timeSince, fragmentAvailable, luxation, apex);
  const followUpSchedule = getFollowUpSchedule(fractureClass, apex, luxation);

  const fractureLabels: Record<FractureClass, string> = {
    enamel:        "Enamel fracture only",
    uncomplicated: "Uncomplicated crown fracture (enamel + dentin, no pulp exposure)",
    complicated:   "Complicated crown fracture (enamel + dentin + pulp exposure)",
  };
  const fractureColors: Record<FractureClass, string> = {
    enamel:        "#34d399",
    uncomplicated: "#60a5fa",
    complicated:   "#fb7185",
  };
  const accentColor = fractureColors[fractureClass];

  const prognosisColor = prognosis.startsWith("Excellent") ? "#34d399"
    : prognosis.startsWith("Good") ? "#60a5fa"
    : "#fbbf24";

  const timeSinceLabel: Record<TimeSince, string> = {
    immediate: "Immediate (<2 hours)",
    short:     "Short delay (2–24 hours)",
    delayed:   "Delayed (>24 hours)",
  };

  const managementHTML = managementSteps.map((step, i) => {
    const isSubStep = step.startsWith("  ·");
    const isWarning = step.startsWith("DELAYED") || step.startsWith("Associated luxation");
    return isSubStep
      ? `<li style="padding: 5px 0 5px 20px; color: #94a3b8; font-size: 13px; list-style: none; border-left: 2px solid ${accentColor}30; margin: 4px 0 4px 16px;">${step.replace("  · ", "")}</li>`
      : `<li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${isWarning ? "#fca5a5" : "#cbd5e1"}; font-size: 14px; line-height: 1.6; list-style: none;"><strong style="color: #64748b; margin-right: 6px; font-size: 12px;">${i + 1}.</strong>${step}</li>`;
  }).join("");

  const followUpHTML = followUpSchedule.map(fu => `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 16px;">
      <div style="flex-shrink: 0; min-width: 80px;">
        <div style="font-weight: 600; color: white; font-size: 14px;">${fu.label}</div>
      </div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.6; text-align: right;">${fu.action}</div>
    </div>`
  ).join("");

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #e2e8f0; line-height: 1.6;">

      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: 700; color: white; margin-bottom: 4px;">
          ${patientInfo.patientName || "Patient"} — Tooth ${patientInfo.tooth || "??"}
        </h2>
        <p style="color: #94a3b8; font-size: 14px;">
          ${patientInfo.age ? patientInfo.age + " years" : "Age not recorded"} · ${patientInfo.gender || ""} · Case ID: ${patientInfo.phoneNumber || "??"}
        </p>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">
          Injury: ${new Date(injuryDate).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>

      <!-- Fracture Classification -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid ${accentColor}40; border-radius: 14px; padding: 22px; margin-bottom: 18px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-bottom: 12px;">Fracture Classification — IADT 2020</h3>
        <div style="display: inline-block; background: ${accentColor}15; border: 1px solid ${accentColor}50; border-radius: 8px; padding: 8px 14px; margin-bottom: 14px;">
          <span style="font-weight: 700; font-size: 15px; color: ${accentColor};">${fractureLabels[fractureClass]}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 14px;">
          <div><span style="color: #64748b;">Root apex:</span> <strong style="color: white;">${apex === "open" ? "Open (immature)" : "Closed (mature)"}</strong></div>
          <div><span style="color: #64748b;">Time since injury:</span> <strong style="color: white;">${timeSinceLabel[timeSince]}</strong></div>
          <div><span style="color: #64748b;">Fragment available:</span> <strong style="color: white;">${fragmentAvailable ? "Yes" : "No"}</strong></div>
          <div><span style="color: #64748b;">Associated luxation:</span> <strong style="color: ${luxation ? "#fbbf24" : "white"};">${luxation ? "⚠️ Yes — increases monitoring frequency" : "No"}</strong></div>
        </div>
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.07);">
          <span style="color: #94a3b8;">Prognosis: </span>
          <strong style="color: ${prognosisColor};">${prognosis}</strong>
        </div>
      </div>

      <!-- Management Protocol -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 22px; margin-bottom: 18px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #60a5fa; margin-bottom: 14px;">Management Protocol — IADT 2020</h3>
        <ol style="list-style: none; padding: 0; margin: 0;">${managementHTML}</ol>
      </div>

      ${fractureClass === "complicated" ? `
      <!-- VPT Outcome -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 22px; margin-bottom: 18px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #60a5fa; margin-bottom: 12px;">Vital Pulp Therapy — Expected Outcomes</h3>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7; margin-bottom: 10px;">
          Long-term studies show high success rates for partial pulpotomy with respect to pulp survival, <strong style="color: white;">irrespective of the stage of root development</strong>. Radiographic evidence of hard tissue bridge formation can be seen at 6–8 weeks. Pulp canal obliteration may occur over time in open apex teeth and is considered a favorable outcome.
        </p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7;">
          <strong style="color: white;">Key success indicator:</strong> bleeding controlled within 5 minutes at the time of treatment = healthy pulp tissue at the cut site = favorable prognosis for pulp survival.
        </p>
        ${apex === "open" ? `<p style="font-size: 14px; color: #34d399; line-height: 1.7; margin-top: 10px;">Open apex advantage: continued root development following successful VPT is expected and confirms pulp vitality.</p>` : ""}
      </div>` : ""}

      <!-- Medications -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 22px; margin-bottom: 18px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #60a5fa; margin-bottom: 12px;">Medications & Post-operative Care</h3>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7; margin-bottom: 8px;">
          <strong style="color: #94a3b8;">Systemic antibiotics:</strong> ${
            luxation
              ? "Consider systemic antibiotics if associated deep luxation injury, soft tissue lacerations, or medically compromised patient. Not routinely required for isolated crown fracture."
              : "Not routinely indicated for isolated crown fractures without soft tissue involvement."
          }
        </p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7; margin-bottom: 8px;">
          <strong style="color: #94a3b8;">Chlorhexidine:</strong> 0.12% mouth rinse twice daily for 1–2 weeks.
        </p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7; margin-bottom: 8px;">
          <strong style="color: #94a3b8;">Analgesia:</strong> Non-steroidal anti-inflammatory drugs (NSAIDs) as needed for pain.
        </p>
        <ul style="list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 7px;">
          ${["Soft diet for 1–2 weeks — avoid biting on the restored tooth.",
             "Brush gently with a soft toothbrush after each meal.",
             "Avoid temperature extremes (very hot or cold foods/drinks) until pulp sensitivity resolves.",
             "Return immediately if pain, swelling, or tooth darkening develops — do not wait for scheduled appointment.",
             "Wear a mouthguard when returning to contact sports."]
            .map(i => `<li style="color: #cbd5e1; font-size: 14px; display: flex; gap: 8px; align-items: flex-start;"><span style="color: #60a5fa; flex-shrink: 0;">·</span>${i}</li>`)
            .join("")}
        </ul>
      </div>

      <!-- Follow-up Schedule -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 22px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #60a5fa; margin-bottom: 4px;">Follow-up Schedule — IADT 2020</h3>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 14px;">
          ${fractureClass === "enamel"
            ? "Enamel fracture: clinical review at 1 year minimum."
            : fractureClass === "uncomplicated"
              ? "Uncomplicated fracture: 6–8 weeks, 1 year, 5 years."
              : "Complicated fracture (VPT): 2 weeks, 6–8 weeks, 3 months, 6 months, 1 year, 5 years."}
        </p>
        ${followUpHTML}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function CrownFractureClient() {
  const { user, loading: authLoading } = useAuth();
  const { patientInfo, saveCase, loadCaseByPhone } = useTrauma();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    fractureClass:     "uncomplicated" as FractureClass,
    apex:              "closed",
    timeSince:         "immediate" as TimeSince,
    fragmentAvailable: false,
    luxation:          false,
    injuryDate:        new Date().toISOString().slice(0, 16),
  });

  const [result,       setResult]       = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Auth guard — wait for Firebase ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    const phone = searchParams.get("phone");
    if (phone) loadCaseByPhone(phone);
  }, [user, authLoading, router, searchParams, loadCaseByPhone]);

  // ── Sync injury date from trauma context ──
  useEffect(() => {
    if (patientInfo?.traumaDate) {
      setFormData(prev => ({ ...prev, injuryDate: patientInfo.traumaDate }));
    }
  }, [patientInfo]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06080f] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [id]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const html = generateProtocolHTML({
        patientInfo,
        fractureClass:     formData.fractureClass,
        apex:              formData.apex,
        timeSince:         formData.timeSince,
        fragmentAvailable: formData.fragmentAvailable,
        luxation:          formData.luxation,
        injuryDate:        formData.injuryDate,
      });
      setResult(html);
      setIsGenerating(false);
    }, 300);
  };

  const exportPDF = async () => {
    if (!result) { alert("Generate the protocol first."); return; }
    try {
      setIsGenerating(true);
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const el = document.createElement("div");
      el.innerHTML = `<div style="font-family:system-ui,sans-serif;color:#e2e8f0;background:#06080f;padding:40px 30px;line-height:1.6;">${result}</div>`;
      document.body.appendChild(el);
      await html2pdf().from(el).set({
        margin:     [12, 15, 12, 15] as [number,number,number,number],
        filename:   `Crown_Fracture_${(patientInfo.patientName || "Patient").replace(/\s+/g,"_")}_Tooth${patientInfo.tooth || "XX"}.pdf`,
        image:      { type: "jpeg" as const, quality: 0.97 },
        html2canvas:{ scale: 2, useCORS: true, backgroundColor: "#06080f" },
        jsPDF:      { unit: "mm", format: "a4", orientation: "portrait" as const },
      }).save();
      document.body.removeChild(el);
    } catch (err) {
      alert("PDF generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => saveCase("Crown Fracture", { ...formData, patientInfo }, result || "");

  // Fracture class accent colors for live UI feedback
  const classColors: Record<FractureClass, { text: string; border: string; bg: string }> = {
    enamel:        { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/8" },
    uncomplicated: { text: "text-blue-400",    border: "border-blue-500/30",    bg: "bg-blue-500/8"    },
    complicated:   { text: "text-rose-400",    border: "border-rose-500/30",    bg: "bg-rose-500/8"    },
  };
  const cc = classColors[formData.fractureClass];

  const selBase  = "w-full bg-[#06080f] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 text-sm appearance-none transition-colors";
  const inputBase = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 text-sm transition-colors";

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#06080f] text-white">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden border-b border-white/8"
          style={{ background: "linear-gradient(135deg, #021a0f 0%, #06080f 50%, #020c1a 100%)" }}>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(52,211,153,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.8) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-0 right-0 w-80 h-48 opacity-10 rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, #34d399 0%, transparent 70%)" }} />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-medium tracking-widest uppercase">TIME-SENSITIVE · IADT 2020</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1.5"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Crown Fractures
                </h1>
                <p className="text-emerald-200/60 text-base">Enamel · Uncomplicated · Complicated (pulp exposure)</p>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p>IADT 2020 · Bourguignon et al.</p>
              </div>
            </div>

            {/* Current case strip */}
            <div className="bg-white/[0.04] border border-white/8 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Current case</p>
                <p className="font-semibold text-white text-sm">
                  {patientInfo.patientName || "Unknown Patient"} — Tooth {patientInfo.tooth || "??"}
                  {patientInfo.age && <span className="text-gray-400"> · {patientInfo.age} yrs</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Case ID</p>
                <p className="font-mono text-emerald-400 text-sm">{patientInfo.phoneNumber || "Not loaded"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">

            {/* ── LEFT INPUT PANEL ── */}
            <div className="lg:col-span-5 space-y-5">

              {/* Read-only patient info */}
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4">Patient (from trauma center)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Patient name", value: patientInfo.patientName },
                    { label: "Tooth (FDI)",  value: patientInfo.tooth },
                    { label: "Age",          value: patientInfo.age ? `${patientInfo.age} yrs` : "—" },
                    { label: "Gender",       value: patientInfo.gender || "—" },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] text-gray-600 mb-1">{f.label}</p>
                      <p className="text-sm text-white font-medium">{f.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live fracture class indicator */}
              <div className={`rounded-2xl p-4 border ${cc.border} ${cc.bg}`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Selected fracture type</p>
                <p className={`text-sm font-bold ${cc.text}`}>
                  {formData.fractureClass === "enamel"        ? "Enamel fracture only — no dentin exposure"
                   : formData.fractureClass === "uncomplicated" ? "Uncomplicated — enamel + dentin exposed, no pulp"
                   : "Complicated — pulp exposure present"}
                </p>
                {formData.fractureClass === "complicated" && (
                  <p className="text-[11px] text-rose-400/80 mt-1">Vital pulp therapy indicated — time-sensitive</p>
                )}
              </div>

              {/* Parameters */}
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 sm:p-6">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Fracture parameters
                </p>

                <div className="space-y-5">

                  {/* Injury date */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Date & Time of Injury
                      <span className="ml-1.5 text-[10px] text-emerald-400/70">drives follow-up dates</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.injuryDate}
                      max={new Date().toISOString().slice(0, 16)}
                      onChange={e => setFormData(prev => ({ ...prev, injuryDate: e.target.value }))}
                      className={inputBase}
                    />
                    <p className="text-[10px] text-gray-700 mt-1">Editing here affects follow-up dates only</p>
                  </div>

                  {/* Fracture classification — THREE types */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Fracture Classification <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="fractureClass"
                      value={formData.fractureClass}
                      onChange={handleChange}
                      className={selBase}
                    >
                      <option value="enamel">Enamel only — no dentin exposure</option>
                      <option value="uncomplicated">Uncomplicated — enamel + dentin, no pulp exposure</option>
                      <option value="complicated">Complicated — pulp exposure present</option>
                    </select>
                  </div>

                  {/* Root maturity */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Root Apex Maturity</label>
                    <select id="apex" value={formData.apex} onChange={handleChange} className={selBase}>
                      <option value="open">Open apex — immature (revascularization potential)</option>
                      <option value="closed">Closed apex — mature</option>
                    </select>
                  </div>

                  {/* Time since injury — affects VPT decision */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Time Since Injury
                      {formData.fractureClass === "complicated" && (
                        <span className="ml-1.5 text-[10px] text-rose-400/70">affects VPT success assessment</span>
                      )}
                    </label>
                    <select id="timeSince" value={formData.timeSince} onChange={handleChange} className={selBase}>
                      <option value="immediate">Immediate (&lt;2 hours)</option>
                      <option value="short">Short delay (2–24 hours)</option>
                      <option value="delayed">Delayed (&gt;24 hours)</option>
                    </select>
                    {formData.fractureClass === "complicated" && formData.timeSince === "delayed" && (
                      <p className="text-amber-400 text-[11px] mt-1.5">
                        ⚠️ Delayed presentation — assess pulp bleeding carefully at treatment. Persistent bleeding (&gt;5 min) = full pulpotomy or RCT indicated.
                      </p>
                    )}
                  </div>

                  {/* Fragment available */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="fragmentAvailable"
                      checked={formData.fragmentAvailable}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm text-white group-hover:text-emerald-300 transition-colors">Tooth fragment available for reattachment</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Rehydrate in water/saline ≥20 min before bonding</p>
                    </div>
                  </label>

                  {/* Associated luxation */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="luxation"
                      checked={formData.luxation}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-amber-500 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm text-white group-hover:text-amber-300 transition-colors">Associated luxation injury</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Increases pulp necrosis risk — elevates monitoring frequency</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Generating...
                  </>
                ) : "Generate Protocol"}
              </button>
            </div>

            {/* ── RIGHT RESULT PANEL ── */}
            <div className="lg:col-span-7">
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 sm:p-8 min-h-[500px]">
                {!result ? (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center text-gray-600 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-medium text-gray-500">Set parameters and generate protocol</p>
                      <p className="text-sm text-gray-700 mt-1">IADT 2020-compliant report appears here</p>
                    </div>
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: result }} />
                )}
              </div>

              {result && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={exportPDF}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl text-sm transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M8 6v6M5 9l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {isGenerating ? "Generating..." : "Export PDF"}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 rounded-2xl text-sm transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Save Case
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}