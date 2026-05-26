// app/dental-trauma-center/crown-root-fracture/CrownRootFractureClient.tsx
"use client";
import Navigation from "../../components/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTrauma } from "../../context/TraumaContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// ══════════════════════════════════════════════════════════════════
// IADT 2020 ADVANCED FRACTURES PROTOCOL ENGINE
// DiAngelis et al., Dental Traumatology 2012;28:2–12
// Bourguignon et al., Dental Traumatology 2020 (IADT 2020 update)
// ══════════════════════════════════════════════════════════════════

type FractureType    = "crownroot" | "root" | "alveolar";
type RootLocation    = "apical" | "middle" | "cervical";

// ── CROWN-ROOT FRACTURE PROTOCOL ──────────────────────────────────
function getCrownRootManagement(
  pulpExposure: boolean,
  openApex: boolean,
  displaced: boolean
): string[] {
  const steps: string[] = [
    "Obtain periapical radiographs (two angles) + CBCT strongly recommended — the true subgingival extent cannot be assessed from conventional radiographs alone.",
    displaced
      ? "Coronal fragment is displaced — stabilize temporarily by bonding to adjacent teeth with wire and composite before proceeding. This reduces pain and prevents further displacement."
      : "Coronal fragment is not displaced — proceed with assessment without repositioning.",

    // MANDATORY first step for all crown-root fractures
    "⚠️ MANDATORY FIRST STEP: Remove the coronal fragment. The fracture extent below the gingival margin and bone level CANNOT be assessed until the fragment is removed. No definitive management decision should be made before this step (IADT 2020).",
    "After fragment removal: assess the fracture margin location relative to the alveolar crest.",
  ];

  // Pulp management based on apex status and exposure
  if (pulpExposure) {
    if (openApex) {
      steps.push(
        "Pulp exposure + open apex: Vital pulp therapy (partial pulpotomy) is the goal — preserve pulp vitality to allow continued root development.",
        "Partial pulpotomy: remove 2 mm coronal pulp under rubber dam, control bleeding with NaOCl, apply MTA or Biodentine, immediate bonded restoration over capping material.",
        "If VPT fails at follow-up (signs of necrosis): initiate apexification or regenerative endodontic procedure."
      );
    } else {
      steps.push(
        "Pulp exposure + closed apex: Root canal treatment is required. Initiate as soon as the fracture extent is fully assessed and treatment plan confirmed.",
        "Do not delay RCT — open pulp is a direct route for bacterial ingress."
      );
    }
  } else {
    steps.push(
      "No pulp exposure: Immediate dentin sealing is critical. Apply bonding agent or glass ionomer to exposed dentin surfaces to prevent bacterial ingress and pulp inflammation."
    );
  }

  // Definitive management options with decision criteria
  steps.push(
    "Definitive management — choose based on fracture margin location after fragment removal:",
    "  · Fracture margin SUPRACRESTAL (above bone level): gingivectomy or flap surgery to expose margin, then restore with composite or crown.",
    "  · Fracture margin SUBCRESTAL (below bone level, ≤3 mm): surgical crown lengthening (ostectomy/osteoplasty) to establish biologic width, then restore. Alternatively: orthodontic forced eruption (4–12 weeks) to bring margin supragingivally.",
    "  · Fracture margin DEEPLY SUBCRESTAL (>3 mm below bone): prognosis is very poor — extraction with implant-supported restoration is the evidence-supported primary option. Forced eruption is rarely feasible at this depth.",
    "After establishing adequate supragingival margin: restore with composite core + full crown, or bonded fragment reattachment if fragment is available and fits well."
  );

  steps.push("Suture soft tissue if lacerations are present.");
  steps.push("Systemic antibiotics: not routinely required. Consider if soft tissue involvement is extensive or patient is medically compromised.");

  return steps;
}

function getCrownRootFollowUp(pulpExposure: boolean, openApex: boolean) {
  return [
    {
      label: "2–4 weeks",
      days: 14,
      action: "Assess soft tissue healing. If VPT performed: clinical check for signs of failure. Review treatment plan for definitive restoration.",
    },
    {
      label: "6–8 weeks",
      days: 49,
      action: pulpExposure && openApex
        ? "Periapical radiograph: check for hard tissue bridge (VPT success) or signs of inflammatory resorption. Sensibility testing."
        : "Clinical and radiographic control. Assess restoration integrity and periapical status.",
    },
    {
      label: "4 months",
      months: 4,
      action: "If orthodontic extrusion was performed: assess crown lengthening progress and initiate definitive restoration. Radiographic check.",
    },
    {
      label: "6 months",
      months: 6,
      action: "Full clinical and radiographic evaluation. Pulp status, periapical health, restoration integrity.",
    },
    {
      label: "1 year",
      months: 12,
      action: "Comprehensive review. Assess long-term outcome of pulp management and restoration.",
    },
    {
      label: "5 years",
      months: 60,
      action: "Long-term follow-up. Monitor for late pulp necrosis, root resorption, and restoration durability.",
    },
  ];
}

function getCrownRootPrognosis(pulpExposure: boolean, openApex: boolean): string {
  if (!pulpExposure) {
    return "Good to Excellent when fracture margin is supracrestal or can be made supracrestal by surgical/orthodontic means. Prognosis worsens significantly with deeply subcrestal fracture margins — extraction should be discussed if margin is >3 mm below alveolar crest.";
  }
  if (openApex) {
    return "Good for pulp survival if VPT is performed promptly. Open apex provides revascularization advantage. Long-term crown-root prognosis depends on fracture level — deeply subcrestal fractures carry poor prognosis regardless of pulp management.";
  }
  return "Guarded. Pulp necrosis is expected — RCT required. Prognosis for tooth retention depends on ability to achieve restorable margin above the alveolar crest via surgical or orthodontic means.";
}

// ── ROOT FRACTURE PROTOCOL ──────────────────────────────────────
/**
 * IADT 2020 splint specifications for root fractures:
 * Apical/middle third: passive FLEXIBLE splint, 4 weeks
 * Cervical third: RIGID splint, up to 4 months
 * (DiAngelis 2012, Bourguignon 2020)
 */
function getRootManagement(
  rootLocation: RootLocation,
  displaced: boolean,
  openApex: boolean
): string[] {
  const steps: string[] = [
    "Obtain periapical radiographs at minimum two different vertical angulations — root fracture line appears at different positions on each. CBCT recommended for cervical third fractures where conventional radiographs are often inadequate.",
  ];

  if (displaced) {
    steps.push(
      "Coronal fragment is displaced — administer local anesthesia (preferably without vasoconstrictor) and gently reposition the coronal fragment to its original position with slow digital pressure.",
      "Verify correct repositioning clinically and radiographically before splinting."
    );
  } else {
    steps.push("Coronal fragment is not displaced — verify position radiographically before splinting.");
  }

  // Location-specific splint — RIGID vs FLEXIBLE is critical
  if (rootLocation === "cervical") {
    steps.push(
      "CERVICAL THIRD ROOT FRACTURE — RIGID splint required: the cervical segment must be immobilized to allow healing. A flexible splint is insufficient for cervical fractures.",
      "Apply rigid splint (stainless steel wire 0.4–0.6 mm bonded with composite, or composite alone) for up to 4 months. Include at least one stable tooth on each side.",
      "Note: cervical third fractures have the worst prognosis of all root fracture locations due to persistent mobility of the cervical segment. Pulp necrosis rate is significantly higher than apical/middle third."
    );
  } else {
    steps.push(
      `${rootLocation === "apical" ? "APICAL" : "MIDDLE"} THIRD ROOT FRACTURE — passive FLEXIBLE splint: 0.4 mm stainless steel wire or nylon fishing line (0.13–0.25 mm) bonded with composite for 4 weeks.`,
      "Splint on labial surfaces. Keep composite away from gingival margin and proximal areas. Include one stable tooth on each side of the injured tooth."
    );
  }

  steps.push("Verify occlusal contacts after splinting — eliminate any traumatic occlusal interference.");

  // Endodontic protocol per location
  if (rootLocation === "cervical") {
    steps.push(
      openApex
        ? "Open apex: monitor for pulp necrosis at every follow-up. Initiate endodontic treatment of the coronal segment only when necrosis + infection are confirmed — do not treat prophylactically."
        : "Closed apex: pulp necrosis rate is high for cervical third fractures. Monitor closely at every follow-up. Initiate RCT of the coronal segment when necrosis is confirmed.",
      "If the coronal segment is non-restorable: extraction of the coronal fragment + RCT of the remaining root + post-core-crown is a valid management path."
    );
  } else {
    steps.push(
      openApex
        ? "Open apex: excellent healing potential. Monitor for revascularization — do NOT initiate RCT unless pulp necrosis and infection are confirmed at follow-up."
        : "Closed apex: monitor pulp status carefully. Initiate RCT of the CORONAL SEGMENT ONLY (preserve apical segment) if pulp necrosis is confirmed. The apical segment typically maintains its own blood supply."
    );
  }

  steps.push("Soft diet for the duration of splinting. Chlorhexidine 0.12% twice daily for 2 weeks.");

  return steps;
}

function getRootFollowUp(rootLocation: RootLocation) {
  const base = [
    {
      label: "4 weeks",
      days: 28,
      action: rootLocation === "cervical"
        ? "Clinical examination: mobility, percussion, sensibility. Radiographic control — assess for inter-fragmentary healing. Do NOT remove splint at 4 weeks for cervical fractures."
        : "Splint removal. Clinical examination: sensibility testing, percussion, mobility. Periapical radiograph — assess fragment position and early healing.",
    },
    {
      label: "6–8 weeks",
      days: 49,
      action: "Clinical and radiographic control. Assess for inter-fragmentary healing (hard tissue bridge formation — favorable). Check for inflammatory resorption or pulp canal obliteration.",
    },
    {
      label: "4 months",
      months: 4,
      action: rootLocation === "cervical"
        ? "Cervical third: remove rigid splint. Assess segment stability and radiographic healing. This is the key decision point — if healing has not occurred, reassess restorability of coronal segment."
        : "Clinical and radiographic check. Confirm healing type (hard tissue, connective tissue, bone + CT, or granulation tissue).",
    },
    {
      label: "6 months",
      months: 6,
      action: "Full clinical and radiographic evaluation. Pulp status, root development (open apex), fracture healing, periapical health.",
    },
    {
      label: "1 year",
      months: 12,
      action: "Comprehensive review. Long-term healing assessment. Late pulp necrosis can occur — maintain monitoring.",
    },
    {
      label: "5 years",
      months: 60,
      action: "Long-term follow-up. Monitor for late complications: pulp necrosis, root resorption, fracture line widening.",
    },
  ];
  return base;
}

function getRootPrognosis(rootLocation: RootLocation, openApex: boolean): string {
  if (rootLocation === "apical") {
    return openApex
      ? "Excellent. Apical third fractures heal well, especially in immature teeth. Pulp necrosis rate is low. Healing is most commonly by hard tissue bridge formation."
      : "Good. Apical third fractures have the best prognosis. Pulp necrosis rate is low. Most heal by hard tissue or connective tissue union.";
  }
  if (rootLocation === "middle") {
    return openApex
      ? "Good to Excellent. Middle third fractures have good healing potential in immature teeth. Monitor for pulp necrosis — more common than apical third."
      : "Good to Guarded. Pulp necrosis rate is higher than apical third. Prognosis depends on prompt repositioning and adequate splinting.";
  }
  // Cervical
  return openApex
    ? "Guarded. Cervical third fractures have poorer prognosis due to persistent mobility of the cervical segment. Pulp necrosis is common even in open apex teeth. Long-term prognosis depends on segment immobilization."
    : "Poor to Guarded. Cervical third fractures carry the worst prognosis. Pulp necrosis is very common. Cervical segment often remains mobile despite splinting. Consider extraction of coronal fragment if non-healing confirmed.";
}

// ── ALVEOLAR PROCESS FRACTURE PROTOCOL ──────────────────────────
function getAlveolarManagement(
  displaced: boolean,
  teethInvolved: string
): string[] {
  return [
    "Obtain periapical radiographs at two angles + occlusal view. Panoramic radiograph recommended. CBCT strongly recommended — alveolar fracture extent and tooth involvement are frequently underestimated on conventional films.",
    "Note: on radiographs, the fracture line CHANGES POSITION with different beam angulations — this distinguishes alveolar fracture from root fracture (root fracture line stays in the same position).",
    displaced
      ? "Segment is displaced — administer local anesthesia (block preferred for adequate analgesia). Reposition the entire segment with slow digital pressure. If locked apically, first disengage the apical lock by displacing slightly in the direction of displacement, then reposition."
      : "Segment is not displaced — verify position radiographically before splinting.",
    "Verify correct repositioning of the segment clinically (occlusal alignment) and radiographically.",
    `Apply passive FLEXIBLE splint for 4 weeks: 0.4 mm stainless steel wire bonded with composite. Include at least one stable tooth on EACH SIDE of the fractured segment (${teethInvolved === "multiple" ? "extend splint to include all involved teeth plus one stable tooth on each side" : "one stable tooth on each side"}).`,
    "Splint on labial surfaces only — keep composite away from gingival margin and proximal areas.",
    "Suture gingival lacerations if present.",
    "Check occlusion after splinting — occlusal alignment confirms correct segment repositioning.",
    "⚠️ Individual tooth pulp monitoring is mandatory: pulp necrosis rate is HIGH due to vascular compromise of all teeth in the fractured segment. Monitor each tooth separately at every follow-up.",
    "Initiate RCT for any tooth showing confirmed necrosis + infection — do not treat all teeth prophylactically, but do not delay once necrosis is confirmed.",
    "Systemic antibiotics: consider if extensive soft tissue injury or medically compromised patient.",
    "Tetanus: verify immunization status.",
  ];
}

function getAlveolarFollowUp() {
  return [
    {
      label: "4 weeks",
      days: 28,
      action: "Splint removal. Assess segment stability — gently test mobility after splint removal. Clinical examination: sensibility testing of each tooth individually, percussion, mobility. Periapical radiographs.",
    },
    {
      label: "6–8 weeks",
      days: 49,
      action: "Clinical and radiographic control. Bone healing assessment. Pulp sensibility testing of all involved teeth. Check for early resorption or periapical pathology.",
    },
    {
      label: "4 months",
      months: 4,
      action: "Radiographic assessment of bone healing. Pulp status of each tooth. Initiate RCT for any tooth with confirmed necrosis.",
    },
    {
      label: "6 months",
      months: 6,
      action: "Full clinical and radiographic evaluation. Segment stability, alveolar bone height, pulp status of all involved teeth.",
    },
    {
      label: "1 year",
      months: 12,
      action: "Comprehensive clinical and radiographic review. Long-term alveolar bone and pulp outcome assessment.",
    },
    {
      label: "5 years",
      months: 60,
      action: "Long-term monitoring. Late pulp necrosis, bone resorption, and implant considerations if teeth were lost.",
    },
  ];
}

function getAlveolarPrognosis(teethInvolved: string): string {
  return `${teethInvolved === "multiple" ? "Multiple teeth involved — higher complexity." : ""} Periodontal healing is generally good when the segment is promptly and accurately repositioned. Pulp necrosis rate is HIGH — vascular compromise of the alveolar segment affects all teeth within it. Long-term prognosis for individual teeth depends on pulp vitality at follow-up.`;
}

// ── PROTOCOL HTML GENERATOR ──────────────────────────────────────
function generateProtocolHTML(params: {
  patientInfo: any;
  fractureType: FractureType;
  rootLocation: RootLocation;
  teethInvolved: string;
  displaced: boolean;
  pulpExposure: boolean;
  openApex: boolean;
  injuryDate: string;
}): string {
  const { patientInfo, fractureType, rootLocation, teethInvolved, displaced, pulpExposure, openApex, injuryDate } = params;

  const accentHex = fractureType === "crownroot" ? "#fb923c"
    : fractureType === "root" ? "#fbbf24"
    : "#a78bfa";

  let title       = "";
  let definition  = "";
  let clinical    = "";
  let radiographic = "";
  let steps: string[]    = [];
  let followUps: any[]   = [];
  let prognosis   = "";

  if (fractureType === "crownroot") {
    title        = "Crown-Root Fracture";
    definition   = "Fracture involving enamel, dentin, and cementum — with or without pulp exposure. Typically starts mid-crown facially and extends subgingivally palatally/lingually. Management is driven by the fracture extent relative to the alveolar crest, which cannot be determined until the coronal fragment is removed.";
    clinical     = "Mobile coronal fragment causing pain with biting. Tender to percussion. Gingival bleeding around the fragment. Fragment typically held only by gingival attachment.";
    radiographic = "Labio-lingual fractures are often poorly visible on periapical radiographs — only the incisal/labial portion of the fracture may be apparent. Proximal fractures are more visible. CBCT is strongly recommended to assess the full subgingival extent of the fracture.";
    steps        = getCrownRootManagement(pulpExposure, openApex, displaced);
    followUps    = getCrownRootFollowUp(pulpExposure, openApex);
    prognosis    = getCrownRootPrognosis(pulpExposure, openApex);

  } else if (fractureType === "root") {
    const locationLabel = rootLocation === "apical" ? "Apical Third" : rootLocation === "middle" ? "Middle Third" : "Cervical Third";
    title        = `Root Fracture — ${locationLabel}`;
    definition   = "Fracture involving dentin, cementum, and the pulp. Classified by location within the root. Coronal fragment may or may not be displaced. Healing type and prognosis vary significantly by location.";
    clinical     = "Tender to percussion. Coronal fragment may be mobile (cervical/middle) or non-mobile (apical). Initial pulp sensibility testing may be negative — this does not indicate necrosis at initial presentation; it reflects transient neurovascular disruption. Re-test at follow-up.";
    radiographic = `Radiolucent fracture line — take at minimum TWO periapical views at different vertical angulations (the fracture line shifts position with angulation, unlike a root fracture seen in the same position on all views). ${rootLocation !== "apical" ? "CBCT strongly recommended for " + rootLocation + " third fractures." : ""}`;
    steps        = getRootManagement(rootLocation, displaced, openApex);
    followUps    = getRootFollowUp(rootLocation);
    prognosis    = getRootPrognosis(rootLocation, openApex);

  } else {
    title        = "Alveolar Process Fracture";
    definition   = "Fracture of the alveolar bone involving one or more teeth moving as a unit (segment). The segment displaces as a whole rather than individual tooth displacement. Can involve multiple teeth simultaneously.";
    clinical     = "Segmental mobility — the entire segment moves together on palpation. Occlusal interference or malocclusion. Dull percussion sound on affected segment. Gingival lacerations common. Individual teeth within the segment may have compromised pulp vascularity even if not individually displaced.";
    radiographic = "Fracture line changes position with different beam angulations (unlike root fracture). Panoramic radiograph helps assess full extent. CBCT strongly recommended to assess alveolar bone loss and individual root involvement.";
    steps        = getAlveolarManagement(displaced, teethInvolved);
    followUps    = getAlveolarFollowUp();
    prognosis    = getAlveolarPrognosis(teethInvolved);
  }

  const injuryDateObj = new Date(injuryDate);
  const addDays   = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };
  const addMonths = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };

  const stepsHTML = steps.map((step, i) => {
    const isSubStep = step.startsWith("  ·");
    const isWarning = step.startsWith("⚠️");
    const isNote    = step.startsWith("Note:");
    if (isSubStep) {
      return `<div style="padding:4px 0 4px 20px;color:#94a3b8;font-size:13px;border-left:2px solid ${accentHex}30;margin:3px 0 3px 16px;">${step.replace("  · ","")}</div>`;
    }
    return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:${isWarning ? "#fca5a5" : isNote ? "#fbbf24" : "#cbd5e1"};font-size:14px;line-height:1.6;"><span style="color:#64748b;font-size:12px;margin-right:6px;">${i + 1}.</span>${step}</div>`;
  }).join("");

  const followUpHTML = followUps.map((fu: any) => {
    const dateStr = fu.days ? addDays(injuryDateObj, fu.days) : fu.months ? addMonths(injuryDateObj, fu.months) : "Ongoing";
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:13px 0;border-bottom:1px solid rgba(255,255,255,0.06);gap:16px;">
        <div style="flex-shrink:0;min-width:90px;">
          <div style="font-weight:600;color:white;font-size:14px;">${fu.label}</div>
          <div style="color:#60a5fa;font-size:12px;margin-top:2px;">${dateStr}</div>
        </div>
        <div style="color:#94a3b8;font-size:13px;line-height:1.6;text-align:right;">${fu.action}</div>
      </div>`;
  }).join("");

  // Badges for key clinical flags
  const badges = [
    displaced    && `<span style="background:#f8717120;border:1px solid #f8717150;color:#f87171;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-right:6px;">DISPLACED</span>`,
    pulpExposure && `<span style="background:#fbbf2420;border:1px solid #fbbf2450;color:#fbbf24;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-right:6px;">PULP EXPOSED</span>`,
    openApex     && `<span style="background:#34d39920;border:1px solid #34d39950;color:#34d399;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-right:6px;">OPEN APEX</span>`,
  ].filter(Boolean).join("");

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;line-height:1.6;">

      <div style="margin-bottom:24px;">
        <h2 style="font-size:24px;font-weight:700;color:white;margin-bottom:4px;">
          ${patientInfo.patientName || "Patient"} — Tooth ${patientInfo.tooth || "??"}
        </h2>
        <p style="color:#94a3b8;font-size:14px;">
          ${patientInfo.age ? patientInfo.age + " years" : "Age not recorded"} · ${patientInfo.gender || ""} · Case ID: ${patientInfo.phoneNumber || "??"}
        </p>
        <p style="color:#64748b;font-size:13px;margin-top:4px;">
          Injury: ${new Date(injuryDate).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>

      <!-- Fracture classification + clinical flags -->
      <div style="background:rgba(255,255,255,0.04);border:1px solid ${accentHex}40;border-radius:14px;padding:22px;margin-bottom:18px;">
        <h3 style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Diagnosis — IADT 2020</h3>
        <div style="font-size:20px;font-weight:700;color:${accentHex};margin-bottom:10px;">${title}</div>
        ${badges ? `<div style="margin-bottom:12px;">${badges}</div>` : ""}
        <p style="font-size:13px;color:#94a3b8;line-height:1.6;margin-bottom:14px;">${definition}</p>
        <div style="padding-top:12px;border-top:1px solid rgba(255,255,255,0.07);">
          <p style="font-size:13px;color:#cbd5e1;margin-bottom:8px;"><strong style="color:#94a3b8;">Clinical findings:</strong> ${clinical}</p>
          <p style="font-size:13px;color:#cbd5e1;"><strong style="color:#94a3b8;">Radiographic findings:</strong> ${radiographic}</p>
        </div>
      </div>

      <!-- Management Protocol -->
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:22px;margin-bottom:18px;">
        <h3 style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${accentHex};margin-bottom:14px;">Management Protocol — IADT 2020</h3>
        <div>${stepsHTML}</div>
      </div>

      <!-- Prognosis -->
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px;margin-bottom:18px;">
        <h3 style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Prognosis</h3>
        <p style="font-size:14px;color:#cbd5e1;line-height:1.7;">${prognosis}</p>
      </div>

      <!-- Medications -->
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px;margin-bottom:18px;">
        <h3 style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:12px;">Medications & Patient Instructions</h3>
        <p style="font-size:14px;color:#cbd5e1;margin-bottom:8px;"><strong style="color:#94a3b8;">Antibiotics:</strong> Not routinely required. Consider if extensive soft tissue involvement, alveolar fracture, or medically compromised patient.</p>
        <p style="font-size:14px;color:#cbd5e1;margin-bottom:8px;"><strong style="color:#94a3b8;">Chlorhexidine:</strong> 0.12% rinse twice daily for 2 weeks.</p>
        <p style="font-size:14px;color:#cbd5e1;margin-bottom:8px;"><strong style="color:#94a3b8;">Analgesia:</strong> NSAIDs as needed.</p>
        <p style="font-size:14px;color:#cbd5e1;margin-bottom:8px;"><strong style="color:#94a3b8;">Tetanus:</strong> Verify immunization status.</p>
        <ul style="list-style:none;padding:0;margin:12px 0 0;display:flex;flex-direction:column;gap:7px;">
          ${[
            `Soft diet for ${fractureType === "alveolar" ? "4 weeks" : "2 weeks"} — avoid biting on the affected tooth/teeth.`,
            "Gentle brushing with soft toothbrush after each meal.",
            "Avoid contact sports for the duration of splinting.",
            "Return immediately if pain worsens, swelling develops, or the tooth changes color.",
          ].map(i => `<li style="color:#cbd5e1;font-size:14px;display:flex;gap:8px;align-items:flex-start;"><span style="color:${accentHex};flex-shrink:0;">·</span>${i}</li>`).join("")}
        </ul>
      </div>

      <!-- Follow-up Schedule -->
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:22px;">
        <h3 style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${accentHex};margin-bottom:4px;">Follow-up Schedule — IADT 2020</h3>
        <p style="font-size:12px;color:#64748b;margin-bottom:14px;">Personalized for ${title}</p>
        ${followUpHTML}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AdvancedFractures() {
  const { user, loading: authLoading } = useAuth();
  const { patientInfo, saveCase, loadCaseByPhone } = useTrauma();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    fractureType:  "crownroot" as FractureType,
    rootLocation:  "middle"    as RootLocation,
    teethInvolved: "single",
    displaced:     false,
    pulpExposure:  false,
    openApex:      false,
    injuryDate:    new Date().toISOString().slice(0, 16),
  });

  const [result,       setResult]       = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Auth guard ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    const phone = searchParams.get("phone");
    if (phone) loadCaseByPhone(phone);
  }, [user, authLoading, router, searchParams, loadCaseByPhone]);

  // ── Sync injury date ──
  useEffect(() => {
    if (patientInfo?.traumaDate) {
      setFormData(prev => ({ ...prev, injuryDate: patientInfo.traumaDate }));
    }
  }, [patientInfo]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06080f] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
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
        fractureType:  formData.fractureType,
        rootLocation:  formData.rootLocation,
        teethInvolved: formData.teethInvolved,
        displaced:     formData.displaced,
        pulpExposure:  formData.pulpExposure,
        openApex:      formData.openApex,
        injuryDate:    formData.injuryDate,
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
        filename:   `AdvFracture_${(patientInfo.patientName || "Patient").replace(/\s+/g,"_")}_Tooth${patientInfo.tooth || "XX"}.pdf`,
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

  const handleSave = () => saveCase("Advanced Fractures", { ...formData, patientInfo }, result || "");

  // Derived accent for current fracture type
  const accentClass = formData.fractureType === "crownroot" ? "border-orange-500/30 bg-orange-500/8 text-orange-400"
    : formData.fractureType === "root"      ? "border-amber-500/30 bg-amber-500/8 text-amber-400"
    : "border-violet-500/30 bg-violet-500/8 text-violet-400";
  const accentBtnClass = formData.fractureType === "crownroot" ? "bg-orange-700 hover:bg-orange-800 shadow-orange-500/15"
    : formData.fractureType === "root"      ? "bg-amber-700 hover:bg-amber-800 shadow-amber-500/15"
    : "bg-violet-700 hover:bg-violet-800 shadow-violet-500/15";
  const fractureLabel = formData.fractureType === "crownroot" ? "Crown-Root Fracture"
    : formData.fractureType === "root"      ? `Root Fracture — ${formData.rootLocation.charAt(0).toUpperCase() + formData.rootLocation.slice(1)} Third`
    : "Alveolar Process Fracture";

  const selBase   = "w-full bg-[#06080f] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 text-sm appearance-none transition-colors";
  const inputBase = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 text-sm transition-colors";

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#06080f] text-white">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden border-b border-white/8"
          style={{ background: "linear-gradient(135deg, #1a0e00 0%, #06080f 50%, #0e0a00 100%)" }}>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(251,191,36,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.8) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-0 right-1/4 w-80 h-48 opacity-10 rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, #f59e0b 0%, transparent 70%)" }} />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[11px] text-amber-300 font-medium tracking-widest uppercase">COMPLEX · IADT 2020</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1.5"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Advanced Fractures
                </h1>
                <p className="text-amber-200/60 text-base">Crown-Root · Root · Alveolar Process</p>
              </div>
              <div className="text-right text-xs text-gray-600">IADT 2020 · DiAngelis / Bourguignon</div>
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
                <p className="font-mono text-amber-400 text-sm">{patientInfo.phoneNumber || "Not loaded"}</p>
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

              {/* Live fracture type indicator */}
              <div className={`rounded-2xl p-4 border ${accentClass}`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Selected fracture</p>
                <p className="text-sm font-bold">{fractureLabel}</p>
                {formData.fractureType === "root" && formData.rootLocation === "cervical" && (
                  <p className="text-[11px] text-amber-400/80 mt-1">Cervical third — rigid splint 4 months, worst prognosis</p>
                )}
                {formData.fractureType === "crownroot" && (
                  <p className="text-[11px] text-orange-400/80 mt-1">Fragment removal is mandatory step 1 before any treatment decision</p>
                )}
              </div>

              {/* Parameters */}
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 sm:p-6">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Fracture parameters
                </p>

                <div className="space-y-5">

                  {/* Injury date */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Date & Time of Injury
                      <span className="ml-1.5 text-[10px] text-amber-400/70">drives follow-up dates</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.injuryDate}
                      max={new Date().toISOString().slice(0, 16)}
                      onChange={e => setFormData(prev => ({ ...prev, injuryDate: e.target.value }))}
                      className={inputBase}
                    />
                  </div>

                  {/* Fracture type */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Fracture Type <span className="text-rose-400">*</span></label>
                    <select id="fractureType" value={formData.fractureType} onChange={handleChange} className={selBase}>
                      <option value="crownroot">Crown-Root Fracture</option>
                      <option value="root">Root Fracture</option>
                      <option value="alveolar">Alveolar Process Fracture</option>
                    </select>
                  </div>

                  {/* Root location — only for root fractures */}
                  {formData.fractureType === "root" && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Root Fracture Location
                        <span className="ml-1 text-[10px] text-amber-400/70">drives splint type + duration</span>
                      </label>
                      <select id="rootLocation" value={formData.rootLocation} onChange={handleChange} className={selBase}>
                        <option value="apical">Apical third — best prognosis</option>
                        <option value="middle">Middle third</option>
                        <option value="cervical">Cervical third — worst prognosis, rigid splint 4 months</option>
                      </select>
                      {formData.rootLocation === "cervical" && (
                        <p className="text-[11px] text-amber-400 mt-1.5">
                          ⚠️ Cervical third requires RIGID splint for 4 months (not flexible 4 weeks)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Teeth involved — only for alveolar */}
                  {formData.fractureType === "alveolar" && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Teeth Involved in Segment</label>
                      <select id="teethInvolved" value={formData.teethInvolved} onChange={handleChange} className={selBase}>
                        <option value="single">Single tooth</option>
                        <option value="multiple">Multiple teeth (segment)</option>
                      </select>
                    </div>
                  )}

                  {/* Open apex — for crown-root and root */}
                  {formData.fractureType !== "alveolar" && (
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        id="openApex"
                        checked={formData.openApex}
                        onChange={handleChange}
                        className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm text-white group-hover:text-emerald-300 transition-colors">Open apex — immature tooth</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">Affects pulp management and prognosis significantly</p>
                      </div>
                    </label>
                  )}

                  {/* Displaced */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="displaced"
                      checked={formData.displaced}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-amber-500 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm text-white group-hover:text-amber-300 transition-colors">
                        {formData.fractureType === "alveolar" ? "Segment displaced" : "Fragment / coronal segment displaced"}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {formData.fractureType === "alveolar" ? "Repositioning under anesthesia required" : "Repositioning required before splinting"}
                      </p>
                    </div>
                  </label>

                  {/* Pulp exposure — crown-root and relevant for root */}
                  {formData.fractureType !== "root" && (
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        id="pulpExposure"
                        checked={formData.pulpExposure}
                        onChange={handleChange}
                        className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm text-white group-hover:text-rose-300 transition-colors">Pulp exposure present</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          {formData.openApex ? "VPT (partial pulpotomy) indicated" : "RCT required for closed apex"}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full ${accentBtnClass} disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg flex items-center justify-center gap-2`}
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
                      <p className="text-sm text-gray-700 mt-1">IADT 2020-compliant personalized report appears here</p>
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