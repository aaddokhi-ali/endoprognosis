// app/dental-trauma-center/luxation/LuxationInjuriesClient.tsx
"use client";
import Navigation from "../../components/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTrauma } from "../../context/TraumaContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// ══════════════════════════════════════════════════════════════════
// IADT 2020 LUXATION CLASSIFICATION ENGINE
// DiAngelis et al., Dental Traumatology 2012;28:2–12
// Bourguignon et al., Dental Traumatology 2020 (IADT 2020 update)
// ══════════════════════════════════════════════════════════════════

type LuxationType = "concussion" | "subluxation" | "extrusive" | "lateral" | "intrusive";

interface DiagnosticInputs {
  displaced: "none" | "axial" | "lateral" | "apical";
  mobility: "normal" | "increased" | "marked" | "locked";
  percussion: "tender_normal" | "tender_dull" | "metallic";
  sulcularBleeding: boolean;
  openApex: boolean;
  crownFracture: boolean;
}

interface ClassificationResult {
  type: LuxationType;
  confidence: "definitive" | "likely" | "possible";
  label: string;
  reasoning: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * IADT 2020 diagnostic criteria (DiAngelis 2012, Bourguignon 2020):
 *
 * Concussion:  no displacement, normal mobility, tender to percussion (normal tone),
 *              no sulcular bleeding
 * Subluxation: no displacement, increased mobility, sulcular bleeding,
 *              tender to percussion (normal tone)
 * Extrusive:   axial outward displacement, marked mobility,
 *              dull/tender percussion tone, sulcular bleeding
 * Lateral:     eccentric/sideways displacement, immobile (locked in bone),
 *              HIGH METALLIC percussion tone, sulcular bleeding
 * Intrusive:   apical displacement (shortened crown), immobile (locked),
 *              HIGH METALLIC percussion tone, sulcular bleeding
 *
 * Key differentiators:
 * - Percussion tone separates extrusive (dull) from lateral/intrusive (metallic)
 * - Displacement direction separates lateral from intrusive
 * - Mobility+displacement together determine classification — not either alone
 */
function classifyLuxation(inputs: DiagnosticInputs): ClassificationResult {
  const { displaced, mobility, percussion, sulcularBleeding } = inputs;

  const isMetallic  = percussion === "metallic";
  const isDull      = percussion === "tender_dull" || percussion === "tender_normal";
  const isLocked    = mobility === "locked";
  const isMarked    = mobility === "marked";
  const isIncreased = mobility === "increased";
  const isNormal    = mobility === "normal";
  const noDisplace  = displaced === "none";
  const axialOut    = displaced === "axial";
  const eccentric   = displaced === "lateral";
  const apical      = displaced === "apical";

  // ── INTRUSIVE ──
  // Apical displacement + immobile + metallic percussion = definitive
  // Apical + immobile without metallic = likely (metallic may not always be noted)
  if (apical && isLocked) {
    return {
      type: "intrusive", confidence: "definitive",
      label: "Intrusive Luxation",
      reasoning: "Apical (shortened) displacement + immobile/locked in bone + metallic percussion confirms intrusion into alveolar bone.",
      color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/40",
    };
  }
  if (apical && !isLocked) {
    return {
      type: "intrusive", confidence: "likely",
      label: "Intrusive Luxation (likely)",
      reasoning: "Apical displacement present. Mobility may not yet register as fully locked — reassess clinically. Intrusion is the most consistent diagnosis with apical displacement.",
      color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/40",
    };
  }

  // ── LATERAL ──
  // Eccentric displacement + locked + metallic = definitive
  if (eccentric && isLocked && isMetallic) {
    return {
      type: "lateral", confidence: "definitive",
      label: "Lateral Luxation",
      reasoning: "Eccentric displacement + immobile (locked in alveolar bone) + high metallic percussion tone — all three cardinal signs of lateral luxation confirmed.",
      color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/40",
    };
  }
  if (eccentric && isLocked) {
    return {
      type: "lateral", confidence: "likely",
      label: "Lateral Luxation (likely)",
      reasoning: "Eccentric displacement + locked in bone. Metallic percussion not confirmed but lateral luxation is the most consistent diagnosis. Verify percussion tone clinically.",
      color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/40",
    };
  }
  if (eccentric && isMetallic) {
    return {
      type: "lateral", confidence: "likely",
      label: "Lateral Luxation (likely)",
      reasoning: "Eccentric displacement + metallic percussion. Mobility may not be fully assessed yet. Lateral luxation is the most consistent diagnosis.",
      color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/40",
    };
  }
  if (eccentric) {
    return {
      type: "lateral", confidence: "possible",
      label: "Lateral Luxation (possible — verify)",
      reasoning: "Eccentric displacement present. Confirm locking in bone and metallic percussion tone clinically before proceeding.",
      color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/40",
    };
  }

  // ── EXTRUSIVE ──
  // Axial outward + marked mobility + dull/tender percussion = definitive
  if (axialOut && isMarked) {
    return {
      type: "extrusive", confidence: isMetallic ? "likely" : "definitive",
      label: "Extrusive Luxation" + (isMetallic ? " (verify — metallic tone unexpected)" : ""),
      reasoning: axialOut && isMarked
        ? "Partial axial outward displacement (elongated crown) + marked mobility = classic extrusive luxation. PDL is torn, allowing the tooth to be displaced coronally."
        : "Axial displacement with marked mobility consistent with extrusion.",
      color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/40",
    };
  }
  if (axialOut && isIncreased) {
    return {
      type: "extrusive", confidence: "likely",
      label: "Extrusive Luxation (likely)",
      reasoning: "Axial outward displacement with increased mobility. Mobility may be underestimated in a guarded patient. Extrusive luxation is the most consistent diagnosis.",
      color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/40",
    };
  }

  // ── SUBLUXATION ──
  // No displacement + increased mobility + sulcular bleeding = definitive
  if (noDisplace && (isIncreased || isMarked) && sulcularBleeding) {
    return {
      type: "subluxation", confidence: "definitive",
      label: "Subluxation",
      reasoning: "No displacement + increased mobility + sulcular bleeding = subluxation. PDL fibres are partially torn but the tooth remains in socket.",
      color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/40",
    };
  }
  if (noDisplace && (isIncreased || isMarked) && !sulcularBleeding) {
    return {
      type: "subluxation", confidence: "likely",
      label: "Subluxation (likely)",
      reasoning: "No displacement + increased mobility. Sulcular bleeding not noted but may have stopped. Subluxation is the most consistent diagnosis — rule out concussion if mobility is only mildly increased.",
      color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/40",
    };
  }
  if (noDisplace && isNormal && sulcularBleeding) {
    return {
      type: "subluxation", confidence: "likely",
      label: "Subluxation (likely)",
      reasoning: "Sulcular bleeding with no displacement. Mobility may be normal early post-trauma. Subluxation more likely than concussion when sulcular bleeding is present.",
      color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/40",
    };
  }

  // ── CONCUSSION ──
  // No displacement, normal mobility, tender percussion (normal tone), no sulcular bleeding
  return {
    type: "concussion", confidence: isMetallic ? "possible" : "definitive",
    label: isMetallic ? "Concussion (verify — metallic tone inconsistent)" : "Concussion",
    reasoning: isMetallic
      ? "Clinical signs suggest concussion but metallic percussion is atypical. Consider whether the tooth has pre-existing ankylosis or if percussion technique needs reassessment."
      : "No displacement, normal mobility, tender to percussion with normal tone — consistent with concussion. PDL is damaged but tooth is not displaced.",
    color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/40",
  };
}

// ── Per-type follow-up schedules per IADT 2020 ──
function getFollowUp(type: LuxationType): Array<{ label: string; days?: number; months?: number; action: string }> {
  switch (type) {
    case "concussion":
      return [
        { label: "4 weeks",  days: 28,  action: "Clinical examination: pulp sensibility testing, percussion, mobility. Periapical radiograph." },
        { label: "6–8 weeks", days: 49, action: "Clinical sensibility + radiographic control. Assess periapical status." },
        { label: "1 year",   months: 12, action: "Clinical and radiographic review. Pulp sensibility — late necrosis is rare but must be excluded." },
        { label: "5 years",  months: 60, action: "Long-term clinical and radiographic review." },
      ];
    case "subluxation":
      return [
        { label: "4 weeks",  days: 28,  action: "Splint removal (if used). Clinical examination: sensibility, percussion, mobility. Periapical radiograph." },
        { label: "6–8 weeks", days: 49, action: "Clinical sensibility + radiographic control. Assess periapical status and early resorption." },
        { label: "6 months", months: 6,  action: "Full clinical and radiographic evaluation. Pulp vitality, root development (open apex), periapical health." },
        { label: "1 year",   months: 12, action: "Clinical and radiographic review. Monitor for late pulp necrosis." },
        { label: "5 years",  months: 60, action: "Long-term review." },
      ];
    case "extrusive":
      return [
        { label: "2 weeks",  days: 14,  action: "Splint removal. Clinical examination: sensibility, percussion, mobility. Periapical radiograph — verify position, check for resorption. Closed apex: initiate RCT now if not yet done." },
        { label: "4 weeks",  days: 28,  action: "Clinical sensibility + radiographic control. Open apex: check for continued root development. Closed apex: verify RCT." },
        { label: "6–8 weeks", days: 49, action: "Clinical and radiographic control. Assess for inflammatory resorption or ankylosis." },
        { label: "6 months", months: 6,  action: "Full evaluation: pulp status, root development, periapical health, resorption." },
        { label: "1 year",   months: 12, action: "Clinical and radiographic review." },
        { label: "5 years",  months: 60, action: "Long-term review. Monitor for late complications." },
      ];
    case "lateral":
      return [
        { label: "4 weeks",  days: 28,  action: "Splint removal. Clinical examination: sensibility, percussion (metallic tone = ankylosis developing), mobility. Periapical radiograph." },
        { label: "6–8 weeks", days: 49, action: "Clinical sensibility + radiographic control. Check for inflammatory resorption or pulp necrosis (very common in closed apex — initiate RCT when confirmed)." },
        { label: "6 months", months: 6,  action: "Full clinical and radiographic evaluation. Pulp status, root development (open apex), resorption types." },
        { label: "1 year",   months: 12, action: "Comprehensive review. Late necrosis and resorption assessment." },
        { label: "5 years",  months: 60, action: "Long-term monitoring." },
      ];
    case "intrusive":
      return [
        { label: "2 weeks",  days: 14,  action: "Assess spontaneous re-eruption (open apex). Closed apex: verify repositioning. Clinical + radiographic check." },
        { label: "4 weeks",  days: 28,  action: "Open apex: check re-eruption progress. Closed apex: initiate RCT if not yet started (IADT: 2–3 weeks after repositioning). Radiographic assessment." },
        { label: "6–8 weeks", days: 49, action: "Clinical sensibility + radiographic control. Open apex: if no re-eruption, initiate orthodontic/surgical repositioning. Assess for inflammatory resorption." },
        { label: "6 months", months: 6,  action: "Full evaluation: repositioning success, pulp status, root development, resorption types." },
        { label: "1 year",   months: 12, action: "Comprehensive review. Long-term outcome assessment." },
        { label: "5 years",  months: 60, action: "Long-term monitoring. Intrusion has high risk of ankylosis and replacement resorption." },
      ];
  }
}

// ── Per-type management steps per IADT 2020 ──
function getManagementSteps(
  type: LuxationType,
  openApex: boolean,
  crownFracture: boolean
): string[] {
  switch (type) {

    case "concussion":
      return [
        "Obtain periapical radiographs (two angles: mesial and distal) to exclude displacement or root fracture.",
        "No active repositioning required — tooth is not displaced.",
        "No splinting required for concussion.",
        "Check occlusion — reduce any occlusal interference if present (selective grinding of antagonist or affected tooth).",
        "Soft diet for 1–2 weeks to allow PDL healing.",
        crownFracture ? "Associated crown fracture: manage separately per crown fracture protocol." : "Monitor pulp vitality at follow-up — pulp complications are rare but must be excluded.",
        "Reassure patient — prognosis is excellent.",
      ];

    case "subluxation":
      return [
        "Obtain periapical radiographs (two angles) to exclude displacement or root fracture.",
        "No repositioning required — tooth is in normal position.",
        "Splinting: optional flexible splint for up to 2 weeks if patient has discomfort or mobility affects function. Not mandatory per IADT 2020.",
        "If splint placed: 0.4 mm stainless steel wire or nylon (0.13–0.25 mm) passive flexible splint, bonded with composite.",
        "Check occlusion — reduce any traumatic occlusal contacts.",
        "Soft diet for 2 weeks.",
        crownFracture ? "Associated crown fracture: higher risk of pulp necrosis — increase monitoring frequency." : "Monitor pulp vitality closely — pulp necrosis rate is low but elevated vs concussion.",
      ];

    case "extrusive":
      return [
        "Obtain periapical radiographs (one occlusal + two periapical angles). Widened PDL space at apical third expected.",
        "Administer local anesthesia, preferably without vasoconstrictor.",
        "Gently reposition tooth with slow axial digital pressure — guide tooth back into socket to original position.",
        "Verify correct position clinically and radiographically after repositioning.",
        "Stabilize with passive flexible splint: 0.4 mm wire or nylon fishing line (0.13–0.25 mm) bonded with composite for 2 weeks.",
        "Splint on labial surface only — keep composite away from gingival margin and proximal areas.",
        openApex
          ? "Open apex: revascularization is the goal — do NOT initiate RCT unless pulp necrosis confirmed at follow-up. Monitor closely."
          : "Closed apex: initiate root canal treatment within 2 weeks of repositioning. Pulp necrosis is common — do not wait for symptoms.",
        crownFracture ? "Associated crown fracture: manage per crown fracture protocol concurrently." : "",
        "Soft diet for 2 weeks. Chlorhexidine 0.12% rinse twice daily.",
      ].filter(s => s !== "");

    case "lateral":
      return [
        "Obtain periapical radiographs (one occlusal + two periapical) + CBCT recommended to assess alveolar fracture extent.",
        "Administer regional anesthesia (block preferred for adequate analgesia — the tooth is locked under bone).",
        "To reposition: first DISPLACE the tooth FURTHER in the direction of displacement to disengage it from the bony lock, THEN reposition with digital pressure back to original position. Do not force directly — this risks alveolar fracture.",
        "If alveolar bone fractured: reposition the bony fragment concurrently.",
        "Verify correct position clinically and radiographically — both periapical and occlusal views.",
        "Stabilize with passive flexible splint: 0.4 mm wire or nylon (0.13–0.25 mm) for 4 weeks.",
        openApex
          ? "Open apex: revascularization is possible — monitor closely. Initiate endodontic treatment only when pulp necrosis + infection confirmed."
          : "Closed apex: pulp necrosis is very common. Monitor at follow-up — initiate RCT when necrosis is confirmed (do not delay once confirmed).",
        "Suture any gingival lacerations if present.",
        crownFracture ? "Associated crown fracture: manage per crown fracture protocol." : "",
        "Soft diet for 4 weeks. Chlorhexidine 0.12% twice daily for 2 weeks.",
      ].filter(s => s !== "");

    case "intrusive":
      return [
        "Obtain periapical radiographs (one occlusal + two periapical). PDL space may be absent or very narrow at apex. CBCT highly recommended to assess depth of intrusion and alveolar wall integrity.",
        "Do NOT attempt forceful repositioning at initial presentation.",
        openApex
          ? "Open apex — management by intrusion depth:\n  · Mild intrusion (≤7 mm): allow spontaneous re-eruption. Monitor at 2 and 4 weeks — if no eruption movement, initiate orthodontic repositioning.\n  · Severe intrusion (>7 mm): surgical or orthodontic repositioning recommended; do not wait for spontaneous eruption.\n  · Revascularization is the goal — do NOT initiate RCT unless pulp necrosis confirmed. Inflammatory resorption is very rapid in children — monitor closely."
          : "Closed apex — surgical or orthodontic repositioning required:\n  · Surgical: reposition under local anesthesia with forceps, stabilize with flexible splint 4–8 weeks.\n  · Orthodontic: extrusive force applied; preferred when surgical access is difficult or bone remodeling time is needed.\n  · Initiate root canal treatment 2–3 weeks after repositioning — pulp necrosis is nearly universal in closed apex intrusion.",
        "After repositioning (if surgical): verify position radiographically. Flexible splint 4–8 weeks.",
        crownFracture ? "Associated crown fracture: manage per crown fracture protocol after repositioning." : "",
        "Soft diet. Chlorhexidine 0.12% twice daily for 2 weeks.",
        "⚠️ Intrusive luxation carries the highest risk of pulp necrosis, ankylosis, and replacement resorption of all luxation types. Inform patient and guardian of guarded long-term prognosis.",
      ].filter(s => s !== "");
  }
}

function getPrognosis(type: LuxationType, openApex: boolean, crownFracture: boolean): string {
  switch (type) {
    case "concussion":
      return "Excellent. Pulp complications rare. Root resorption very rare. Repair-related resorption may occur transiently but resolves.";
    case "subluxation":
      return crownFracture
        ? "Good to Guarded. Pulp necrosis rate is higher when crown fracture is associated. Root resorption rate is low."
        : "Good. Low pulp necrosis rate. Root resorption rare.";
    case "extrusive":
      return openApex
        ? "Good to Excellent. Open apex: revascularization potential is high. PDL healing is possible."
        : "Guarded. Closed apex: pulp necrosis is common. Repair-related resorption possible. Prognosis depends on promptness of RCT.";
    case "lateral":
      return openApex
        ? "Guarded. Revascularization is possible in open apex but not guaranteed. Monitor closely for inflammatory resorption."
        : "Poor to Guarded. Pulp necrosis is expected in most closed apex cases. Ankylosis-related (replacement) resorption is a common long-term complication.";
    case "intrusive":
      return openApex
        ? "Guarded. Revascularization is possible. However, inflammatory resorption is very rapid in children — close monitoring is essential."
        : "Poor. Pulp necrosis is nearly universal. High risk of ankylosis and replacement resorption. Long-term tooth survival is uncertain.";
  }
}

// ── Protocol HTML generator ──
function generateProtocolHTML(params: {
  patientInfo: any;
  classification: ClassificationResult;
  inputs: DiagnosticInputs;
  injuryDate: string;
}): string {
  const { patientInfo, classification, inputs, injuryDate } = params;
  const { type, label, color: accentColorClass, reasoning } = classification;
  const { openApex, crownFracture } = inputs;

  const accentHex = type === "concussion" ? "#34d399"
    : type === "subluxation" ? "#60a5fa"
    : type === "extrusive"   ? "#fbbf24"
    : type === "lateral"     ? "#fb923c"
    : "#f87171"; // intrusive

  const managementSteps = getManagementSteps(type, openApex, crownFracture);
  const prognosis        = getPrognosis(type, openApex, crownFracture);
  const followUps        = getFollowUp(type);

  const injuryDateObj = new Date(injuryDate);
  const addDays   = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };
  const addMonths = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };

  const managementHTML = managementSteps.map((step, i) => {
    const isSubStep = step.includes("\n  ·");
    const isWarning = step.startsWith("⚠️");
    if (isSubStep) {
      const [main, ...subs] = step.split("\n");
      const subLines = subs.map(s => `<div style="padding: 4px 0 4px 20px; color: #94a3b8; font-size: 13px; border-left: 2px solid ${accentHex}30; margin: 3px 0 3px 16px;">${s.replace("  · ", "")}</div>`).join("");
      return `<div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);"><span style="color: #64748b; font-size: 12px; margin-right: 6px;">${i + 1}.</span><span style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">${main}</span>${subLines}</div>`;
    }
    return `<div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${isWarning ? "#fca5a5" : "#cbd5e1"}; font-size: 14px; line-height: 1.6;"><span style="color: #64748b; font-size: 12px; margin-right: 6px;">${i + 1}.</span>${step}</div>`;
  }).join("");

  const followUpHTML = followUps.map(fu => {
    const dateStr = fu.days ? addDays(injuryDateObj, fu.days) : fu.months ? addMonths(injuryDateObj, fu.months) : "Ongoing";
    return `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 13px 0; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 16px;">
        <div style="flex-shrink: 0; min-width: 90px;">
          <div style="font-weight: 600; color: white; font-size: 14px;">${fu.label}</div>
          <div style="color: #60a5fa; font-size: 12px; margin-top: 2px;">${dateStr}</div>
        </div>
        <div style="color: #94a3b8; font-size: 13px; line-height: 1.6; text-align: right;">${fu.action}</div>
      </div>`;
  }).join("");

  const confidenceBadge = classification.confidence === "definitive"
    ? `<span style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:${accentHex}20;border:1px solid ${accentHex}50;color:${accentHex};">DEFINITIVE</span>`
    : classification.confidence === "likely"
      ? `<span style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:#fbbf2420;border:1px solid #fbbf2450;color:#fbbf24;">LIKELY</span>`
      : `<span style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:#f8717120;border:1px solid #f8717150;color:#f87171;">VERIFY CLINICALLY</span>`;

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

      <!-- Diagnosis -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid ${accentHex}40; border-radius: 14px; padding: 22px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #64748b;">Diagnosis — IADT 2020</h3>
          ${confidenceBadge}
        </div>
        <div style="font-size: 22px; font-weight: 700; color: ${accentHex}; margin-bottom: 10px;">${label}</div>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 14px;">${reasoning}</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.07);">
          <div><span style="color:#64748b;">Displacement:</span> <strong style="color:white;">${inputs.displaced === "none" ? "None" : inputs.displaced === "axial" ? "Axial outward" : inputs.displaced === "lateral" ? "Eccentric/sideways" : "Apical (shortened)"}</strong></div>
          <div><span style="color:#64748b;">Mobility:</span> <strong style="color:white;">${inputs.mobility === "normal" ? "Normal" : inputs.mobility === "increased" ? "Increased" : inputs.mobility === "marked" ? "Markedly increased" : "Immobile/locked"}</strong></div>
          <div><span style="color:#64748b;">Percussion:</span> <strong style="color:white;">${inputs.percussion === "tender_normal" ? "Tender (normal tone)" : inputs.percussion === "tender_dull" ? "Tender (dull tone)" : "High metallic tone"}</strong></div>
          <div><span style="color:#64748b;">Sulcular bleeding:</span> <strong style="color:white;">${inputs.sulcularBleeding ? "Present" : "Absent"}</strong></div>
          <div><span style="color:#64748b;">Root apex:</span> <strong style="color:white;">${openApex ? "Open (immature)" : "Closed (mature)"}</strong></div>
          <div><span style="color:#64748b;">Crown fracture:</span> <strong style="color:${crownFracture ? "#fbbf24" : "white"};">${crownFracture ? "⚠️ Yes — increased necrosis risk" : "No"}</strong></div>
        </div>
      </div>

      <!-- Prognosis -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin-bottom: 18px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-bottom: 10px;">Prognosis</h3>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7;">${prognosis}</p>
        ${(type === "lateral" || type === "intrusive") ? `<p style="font-size: 13px; color: #fca5a5; margin-top: 8px;">⚠️ High-risk injury — elevated chance of ankylosis and replacement resorption. Inform patient and guardian of long-term prognosis at initial visit.</p>` : ""}
      </div>

      <!-- Management Protocol -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 22px; margin-bottom: 18px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #818cf8; margin-bottom: 14px;">Management Protocol — IADT 2020</h3>
        <div>${managementHTML}</div>
      </div>

      <!-- Medications -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin-bottom: 18px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #818cf8; margin-bottom: 12px;">Medications & Post-operative Care</h3>
        <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 8px;"><strong style="color: #94a3b8;">Antibiotics:</strong> ${
          type === "concussion" || type === "subluxation"
            ? "Not routinely indicated for concussion/subluxation."
            : "Not routinely required. Consider if soft tissue laceration, alveolar fracture, or medically compromised patient."
        }</p>
        <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 8px;"><strong style="color: #94a3b8;">Chlorhexidine:</strong> 0.12% mouth rinse twice daily for 2 weeks.</p>
        <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 8px;"><strong style="color: #94a3b8;">Analgesia:</strong> NSAIDs as needed.</p>
        <p style="font-size: 14px; color: #cbd5e1;"><strong style="color: #94a3b8;">Tetanus:</strong> ${
          type === "concussion" || type === "subluxation"
            ? "Verify tetanus status if any skin laceration or soil contamination."
            : "Verify tetanus immunization status — refer to physician if uncertain."
        }</p>
      </div>

      <!-- Patient Instructions -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin-bottom: 18px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #818cf8; margin-bottom: 12px;">Patient Instructions</h3>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px;">
          ${[
            type === "concussion" ? "Soft diet for 1–2 weeks — avoid biting on the injured tooth." : `Soft diet for ${type === "lateral" ? "4 weeks" : "2 weeks"} — avoid biting on the repositioned tooth.`,
            "Brush gently with a soft toothbrush after each meal — keep the area clean.",
            "Chlorhexidine 0.12% mouth rinse twice daily for 2 weeks.",
            "Avoid contact sports. Use a mouthguard when returning to physical activity.",
            "Return immediately if the tooth becomes painful, mobile, changes color, or swelling develops.",
            "Do not miss any scheduled follow-up appointments — complications can develop without symptoms.",
          ].map(i => `<li style="color:#cbd5e1;font-size:14px;display:flex;gap:8px;align-items:flex-start;"><span style="color:#818cf8;flex-shrink:0;">·</span>${i}</li>`).join("")}
        </ul>
      </div>

      <!-- Follow-up Schedule -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 22px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #818cf8; margin-bottom: 4px;">Follow-up Schedule — IADT 2020</h3>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 14px;">Personalized for ${label}</p>
        ${followUpHTML}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function LuxationInjuriesClient() {
  const { user, loading: authLoading } = useAuth();
  const { patientInfo, saveCase, loadCaseByPhone } = useTrauma();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    injuryDate:       new Date().toISOString().slice(0, 16),
    displaced:        "none"          as DiagnosticInputs["displaced"],
    mobility:         "normal"        as DiagnosticInputs["mobility"],
    percussion:       "tender_normal" as DiagnosticInputs["percussion"],
    sulcularBleeding: false,
    openApex:         false,
    crownFracture:    false,
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
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  // ── Live classification from current inputs ──
  const liveClassification = classifyLuxation({
    displaced:        formData.displaced,
    mobility:         formData.mobility,
    percussion:       formData.percussion,
    sulcularBleeding: formData.sulcularBleeding,
    openApex:         formData.openApex,
    crownFracture:    formData.crownFracture,
  });

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
        classification: liveClassification,
        inputs: {
          displaced:        formData.displaced,
          mobility:         formData.mobility,
          percussion:       formData.percussion,
          sulcularBleeding: formData.sulcularBleeding,
          openApex:         formData.openApex,
          crownFracture:    formData.crownFracture,
        },
        injuryDate: formData.injuryDate,
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
        filename:   `Luxation_${(patientInfo.patientName || "Patient").replace(/\s+/g,"_")}_Tooth${patientInfo.tooth || "XX"}.pdf`,
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

  const handleSave = () => saveCase("Luxation Injuries", { ...formData, patientInfo }, result || "");

  const selBase  = "w-full bg-[#06080f] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500/50 text-sm appearance-none transition-colors";
  const inputBase = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500/50 text-sm transition-colors";

  // Live indicator colors
  const lc = liveClassification;
  const confidenceText = lc.confidence === "definitive" ? "text-emerald-400"
    : lc.confidence === "likely" ? "text-amber-400" : "text-red-400";
  const confidenceLabel = lc.confidence === "definitive" ? "Definitive"
    : lc.confidence === "likely" ? "Likely" : "Possible — verify";

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#06080f] text-white">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden border-b border-white/8"
          style={{ background: "linear-gradient(135deg, #080a1e 0%, #06080f 50%, #0a0814 100%)" }}>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(129,140,248,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.8) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-0 left-1/3 w-80 h-48 opacity-10 rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, #818cf8 0%, transparent 70%)" }} />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-3 py-1 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span className="text-[11px] text-indigo-300 font-medium tracking-widest uppercase">ASSESS SEVERITY · IADT 2020</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1.5"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Luxation Injuries
                </h1>
                <p className="text-indigo-200/60 text-base">Concussion · Subluxation · Extrusive · Lateral · Intrusive</p>
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
                <p className="font-mono text-indigo-400 text-sm">{patientInfo.phoneNumber || "Not loaded"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">

            {/* ── LEFT DIAGNOSTIC PANEL ── */}
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

              {/* ── LIVE CLASSIFICATION INDICATOR ── */}
              <div className={`rounded-2xl p-4 border ${lc.borderColor} ${lc.bgColor}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Live diagnosis</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${confidenceText}`}>
                    {confidenceLabel}
                  </span>
                </div>
                <p className={`text-sm font-bold ${lc.color} mb-1`}>{lc.label}</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">{lc.reasoning}</p>
              </div>

              {/* Diagnostic inputs */}
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 sm:p-6">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Clinical findings — answer all fields
                </p>

                <div className="space-y-5">

                  {/* Injury date */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Date & Time of Injury</label>
                    <input
                      type="datetime-local"
                      value={formData.injuryDate}
                      max={new Date().toISOString().slice(0, 16)}
                      onChange={e => setFormData(prev => ({ ...prev, injuryDate: e.target.value }))}
                      className={inputBase}
                    />
                  </div>

                  {/* 1. Displacement */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      1. Displacement of the tooth
                      <span className="ml-1 text-[10px] text-indigo-400/70">primary classifier</span>
                    </label>
                    <select id="displaced" value={formData.displaced} onChange={handleChange} className={selBase}>
                      <option value="none">None — tooth in normal position</option>
                      <option value="axial">Axial outward — crown appears elongated</option>
                      <option value="lateral">Eccentric / sideways displacement</option>
                      <option value="apical">Apical — crown appears shortened / intruded</option>
                    </select>
                  </div>

                  {/* 2. Mobility */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">2. Mobility</label>
                    <select id="mobility" value={formData.mobility} onChange={handleChange} className={selBase}>
                      <option value="normal">Normal</option>
                      <option value="increased">Increased (slight)</option>
                      <option value="marked">Markedly increased</option>
                      <option value="locked">Immobile / locked in bone</option>
                    </select>
                  </div>

                  {/* 3. Percussion tone — critical for lateral vs intrusive vs others */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      3. Percussion tone
                      <span className="ml-1 text-[10px] text-indigo-400/70">key lateral/intrusive differentiator</span>
                    </label>
                    <select id="percussion" value={formData.percussion} onChange={handleChange} className={selBase}>
                      <option value="tender_normal">Tender — normal tone</option>
                      <option value="tender_dull">Tender — dull tone (extrusive)</option>
                      <option value="metallic">High metallic tone (lateral / intrusive)</option>
                    </select>
                    {formData.percussion === "metallic" && (
                      <p className="text-[11px] text-orange-400/80 mt-1.5">
                        Metallic percussion = tooth locked in bone — indicates lateral or intrusive luxation
                      </p>
                    )}
                  </div>

                  {/* 4. Sulcular bleeding */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="sulcularBleeding"
                      checked={formData.sulcularBleeding}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-indigo-500 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm text-white group-hover:text-indigo-300 transition-colors">Sulcular bleeding present</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Indicates PDL tearing — present in subluxation, extrusive, lateral, and intrusive</p>
                    </div>
                  </label>

                  {/* 5. Open apex */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="openApex"
                      checked={formData.openApex}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-indigo-500 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm text-white group-hover:text-indigo-300 transition-colors">Open apex — immature tooth</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Revascularization potential affects management and prognosis</p>
                    </div>
                  </label>

                  {/* 6. Crown fracture */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="crownFracture"
                      checked={formData.crownFracture}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-amber-500 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm text-white group-hover:text-amber-300 transition-colors">Associated crown fracture</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Increases pulp necrosis risk — manage per crown fracture protocol concurrently</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/15 flex items-center justify-center gap-2"
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
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-medium text-gray-500">Complete the diagnostic fields</p>
                      <p className="text-sm text-gray-700 mt-1">Live diagnosis updates above — generate to produce full IADT 2020 protocol</p>
                    </div>
                    {/* Live preview in result panel too */}
                    <div className={`mt-4 px-5 py-3 rounded-xl border ${lc.borderColor} ${lc.bgColor} text-center`}>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Current live diagnosis</p>
                      <p className={`text-sm font-bold ${lc.color}`}>{lc.label}</p>
                      <p className={`text-[10px] mt-1 ${confidenceText}`}>{confidenceLabel}</p>
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