// app/dental-trauma-center/avulsion/AvulsionClient.tsx
"use client";
import Navigation from "../../components/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTrauma } from "../../context/TraumaContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// ══════════════════════════════════════════════════════════════════
// IADT 2020 PDL CLASSIFICATION ENGINE
// Fouad et al., Dental Traumatology 2020;36:331–342, Section 3
// ══════════════════════════════════════════════════════════════════

type PDLGroup = 1 | 2 | 3;

/**
 * Classify PDL viability per IADT 2020 (p.333):
 * Group 1 – replanted immediately / <~15 min → most likely viable
 * Group 2 – physiologic storage, dry time <60 min → may be viable but compromised
 * Group 3 – dry time >60 min regardless of storage → non-viable
 *
 * Note: water is NOT a physiologic medium (IADT 2020, p.333).
 * Dry storage = non-physiologic. Even with milk/HBSS, >60 min = Group 3.
 */
function classifyPDL(dryTime: number, storageMedia: string): PDLGroup {
  const isPhysiologic = ["hanks", "milk", "saliva", "saline"].includes(storageMedia);
  if (dryTime <= 15) return 1;
  if (isPhysiologic && dryTime < 60) return 2;
  return 3; // dry time >=60 min regardless of media, or non-physiologic at any time
}

function pdlGroupLabel(group: PDLGroup): string {
  if (group === 1) return "Group 1 — PDL most likely viable";
  if (group === 2) return "Group 2 — PDL may be viable but compromised";
  return "Group 3 — PDL non-viable (delayed replantation)";
}

function pdlGroupColor(group: PDLGroup): string {
  if (group === 1) return "text-emerald-400";
  if (group === 2) return "text-amber-400";
  return "text-red-400";
}

function pdlGroupBg(group: PDLGroup): string {
  if (group === 1) return "bg-emerald-500/10 border-emerald-500/30";
  if (group === 2) return "bg-amber-500/10 border-amber-500/30";
  return "bg-red-500/10 border-red-500/30";
}

/**
 * Prognosis per IADT 2020 + apex status.
 * Open apex has better prognosis due to revascularization potential.
 */
function getPrognosis(group: PDLGroup, apex: string): string {
  if (group === 1) return apex === "open" ? "Excellent — revascularization highly likely" : "Excellent — PDL healing expected";
  if (group === 2) return apex === "open" ? "Good to Guarded — revascularization possible" : "Good to Guarded — PDL healing possible";
  return "Poor — PDL non-viable; ankylosis-related (replacement) resorption expected";
}

/**
 * Splint duration per IADT 2020.
 * All avulsion cases: 2 weeks flexible splint.
 * Alveolar/jawbone fracture: rigid splint 4 weeks.
 * (IADT 2020 sections 3.1.1–3.2.3 — all groups, both apex types)
 */
function getSplintDuration(alveolarFracture: boolean): string {
  return alveolarFracture ? "4 weeks (rigid splint — alveolar fracture present)" : "2 weeks (passive flexible splint: 0.4 mm wire or nylon 0.13–0.25 mm)";
}

/**
 * Antibiotic recommendation per IADT 2020 (Section 5, p.336).
 * First-line: amoxicillin or penicillin (all ages).
 * Doxycycline: appropriate but contraindicated <12 years (tooth discoloration risk).
 * Age drives selection.
 */
function getAntibioticRec(age: string): string {
  const ageNum = parseInt(age || "0");
  if (!ageNum) return "Amoxicillin or Penicillin V (age not provided — defaulting to safe first-line choice) × 7 days. If ≥12 years, doxycycline may be preferred due to anti-resorptive properties.";
  if (ageNum < 12) return `Amoxicillin (age ${ageNum} < 12 years — doxycycline and tetracyclines are CONTRAINDICATED due to permanent tooth discoloration risk) × 7 days, weight-appropriate dose.`;
  return `Doxycycline preferred (age ${ageNum} ≥ 12 years) — antimicrobial, anti-inflammatory, and anti-resorptive effects. Alternative: Amoxicillin or Penicillin V × 7 days. Penicillin allergy: appropriate alternative antibiotic.`;
}

/**
 * Endodontic protocol per IADT 2020 (Section 10, p.337).
 * Closed apex: initiate RCT within 2 weeks post-replantation (all groups).
 * Open apex:
 *   - Groups 1 & 2: monitor for revascularization; initiate treatment ONLY if
 *     clinical/radiographic signs of pulp necrosis + infection confirmed.
 *   - Group 3: revascularization still the goal, but inflammatory resorption
 *     risk is high in children — very frequent monitoring required; initiate
 *     endodontic treatment as soon as necrosis/infection identified.
 */
function getEndoProtocol(apex: string, group: PDLGroup): string {
  if (apex === "closed") {
    return `Initiate root canal treatment within 2 weeks after replantation (IADT 2020, Section 10). Use dental dam, placing retainer on neighboring uninjured teeth. Intracanal medicament: calcium hydroxide for up to 1 month, followed by root canal filling. Do NOT delay endodontic treatment in closed apex teeth — infection-related resorption progresses rapidly.`;
  }
  // Open apex
  if (group === 1 || group === 2) {
    return `Open apex — spontaneous pulp space revascularization is the primary goal. Do NOT initiate root canal treatment unless there is clinical or radiographic evidence of pulp necrosis and infection at follow-up examinations (IADT 2020, Section 10). Monitor closely for: continued root formation (favorable), pulp canal obliteration (expected favorable outcome), or signs of inflammatory resorption (initiate treatment immediately if identified). Inflammatory resorption is very rapid in children.`;
  }
  // Group 3, open apex
  return `Open apex — despite non-viable PDL, revascularization of the pulp space remains the goal when replanting immature teeth. The risk of infection-related (inflammatory) root resorption must be weighed against revascularization chances (IADT 2020, section 3.2.3). Inflammatory resorption is very rapid in children. Monitor at 1 and 2 months (more frequent than closed apex). Initiate apexification, pulp revitalization/revascularization, or root canal treatment as soon as pulp necrosis and infection are identified. Do NOT wait for scheduled follow-up if symptoms develop.`;
}

/**
 * Follow-up schedule per IADT 2020 (Section 11.1, p.337).
 * Closed apex: 2 weeks, 4 weeks, 3 months, 6 months, 1 year, yearly × 5 yrs.
 * Open apex: 2 weeks, 1 month, 2 months, 3 months, 6 months, 1 year, yearly × 5 yrs.
 * (Open apex needs more frequent monitoring due to rapid inflammatory resorption risk)
 */
function getFollowUpSchedule(apex: string): Array<{ label: string; days?: number; months?: number; action: string }> {
  const base = [
    {
      label: "2 weeks",
      days: 14,
      action: "Remove splint (unless alveolar fracture — remove at 4 weeks). Clinical examination: mobility, percussion test (high-pitched metallic sound = ankylosis), sensibility testing. Periapical radiograph — verify position, assess for early resorption. If closed apex: initiate root canal treatment at this visit if not yet done.",
    },
    {
      label: "4 weeks",
      days: 28,
      action: "Clinical examination: pulp sensibility, percussion, mobility. Periapical radiograph — assess for early signs of inflammatory resorption or ankylosis.",
    },
    {
      label: "3 months",
      months: 3,
      action: "Clinical and radiographic control. Closed apex: assess root canal treatment success. Open apex: check for pulp canal obliteration (favorable) or inflammatory resorption. If inflammatory resorption identified: initiate treatment immediately.",
    },
    {
      label: "6 months",
      months: 6,
      action: "Full clinical and radiographic evaluation. Assess for: inflammatory resorption, replacement resorption (ankylosis — absence of PDL space, bone replacing root structure), and pulp status. Growing patient: assess for infra-occlusion if ankylosis suspected.",
    },
    {
      label: "1 year",
      months: 12,
      action: "Comprehensive review. Assess long-term healing, tooth survival, and any late complications.",
    },
    {
      label: "Yearly up to 5 years",
      months: 24,
      action: "Annual clinical and radiographic review for minimum 5 years. Monitor: inflammatory resorption, replacement resorption, infra-position in growing patients, pulp status, alveolar bone height.",
    },
  ];

  if (apex === "open") {
    // Insert 1-month and 2-month appointments after 2 weeks
    const openExtra = [
      {
        label: "1 month",
        months: 1,
        action: "OPEN APEX — more frequent monitoring required. Clinical examination, periapical radiograph. Look for early signs of inflammatory resorption (very rapid in children). Any signs of infection: initiate endodontic treatment immediately. Do not wait for next scheduled visit.",
      },
      {
        label: "2 months",
        months: 2,
        action: "OPEN APEX — clinical examination and radiograph. Compare to 1-month radiograph for signs of continued root formation (favorable), pulp canal obliteration (expected favorable), or root resorption (requires immediate intervention).",
      },
    ];
    return [base[0], ...openExtra, ...base.slice(1)];
  }

  return base;
}

// ══════════════════════════════════════════════════════════════════
// PROTOCOL GENERATOR
// ══════════════════════════════════════════════════════════════════

function generateProtocolHTML(params: {
  patientInfo: any;
  dryTime: number;
  storageMedia: string;
  apex: string;
  alveolarFracture: boolean;
  injuryDate: string;
}): string {
  const { patientInfo, dryTime, storageMedia, apex, alveolarFracture, injuryDate } = params;

  const pdlGroup  = classifyPDL(dryTime, storageMedia);
  const prognosis = getPrognosis(pdlGroup, apex);
  const splint    = getSplintDuration(alveolarFracture);
  const abx       = getAntibioticRec(patientInfo.age || "");
  const endo      = getEndoProtocol(apex, pdlGroup);
  const followUps = getFollowUpSchedule(apex);

  const storageMap: Record<string, string> = {
    hanks:  "Hank's Balanced Salt Solution — optimal physiologic medium",
    milk:   "Cold milk — excellent osmolality-balanced medium",
    saliva: "Saliva — acceptable physiologic medium",
    saline: "Normal saline — acceptable",
    water:  "Water — POOR (not osmolality-balanced; damages PDL cells)",
    dry:    "Dry storage — NON-PHYSIOLOGIC (PDL cell death begins within minutes)",
  };
  const storageLabel = storageMap[storageMedia] || storageMedia;

  const injuryDateObj = new Date(injuryDate);
  const addDays   = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };
  const addMonths = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };

  const pdlGroupColors: Record<PDLGroup, string> = { 1: "#34d399", 2: "#fbbf24", 3: "#f87171" };
  const pdlColor = pdlGroupColors[pdlGroup];

  // Management steps — from IADT 2020 section 3 (adapted from Group 1/2/3 × apex)
  const managementSteps = pdlGroup === 1 ? [
    "Administer local anesthesia, preferably without vasoconstrictor (IADT 2020, section 4).",
    "Clean the injured area with water, saline, or chlorhexidine.",
    "Verify the correct position of the replanted tooth both clinically and radiographically.",
    "If malpositioned or in wrong socket: reposition with slight digital pressure (can be corrected up to 48 hours post-trauma).",
    `Stabilize: ${splint}. Place splint on labial surfaces; keep composite away from gingival margins and proximal areas.`,
    "Suture gingival lacerations if present.",
    apex === "closed" ? "Initiate root canal treatment within 2 weeks (see Endodontic Protocol below)." : "Open apex: do not initiate endodontic treatment unless signs of pulp necrosis confirmed at follow-up.",
    `Systemic antibiotics: ${abx}`,
    "Verify tetanus immunization status — refer to physician if uncertain.",
  ] : pdlGroup === 2 ? [
    "Administer local anesthesia, preferably without vasoconstrictor (IADT 2020, section 4).",
    "If visible contamination: rinse root surface gently with stream of saline or osmolality-balanced medium. Do NOT scrub root surface.",
    "Keep tooth in storage medium while taking history, examining, and preparing patient.",
    "Irrigate the socket with sterile saline.",
    "Examine alveolar socket — if wall fracture present: reposition fractured fragment with suitable instrument.",
    "Remove coagulum with saline stream if necessary to allow better repositioning.",
    "Replant tooth slowly with slight digital pressure. Do not force.",
    "Verify correct position clinically and radiographically.",
    `Stabilize: ${splint}. Splint on labial surfaces; composite away from gingival margins.`,
    "Suture gingival lacerations if present.",
    apex === "closed" ? "Initiate root canal treatment within 2 weeks (see Endodontic Protocol below)." : "Open apex: monitor for revascularization — do not initiate endodontic treatment unless infection confirmed.",
    `Systemic antibiotics: ${abx}`,
    "Verify tetanus immunization status.",
  ] : [
    "Delayed replantation (PDL non-viable). Goal: restore esthetics and function temporarily while maintaining alveolar bone contour, width, and height (IADT 2020, section 3.1.3).",
    "Administer local anesthesia, preferably without vasoconstrictor.",
    "Remove loose debris by agitating tooth gently in physiologic medium or with saline-soaked gauze. Tooth may remain in storage medium during patient examination.",
    "Irrigate socket with sterile saline. Remove coagulum if necessary.",
    "Examine alveolar socket — reposition any fracture of socket wall.",
    "Replant tooth slowly with slight digital pressure. Do not force.",
    "Verify correct position clinically and radiographically.",
    `Stabilize: ${splint}. Splint on labial surfaces.`,
    "Suture gingival lacerations if present.",
    apex === "closed" ? "Root canal treatment within 2 weeks (see Endodontic Protocol). PDL non-viable — ankylosis-related resorption expected regardless." : "Open apex: monitor as per protocol below. Inflammatory resorption risk very high — initiate treatment at first sign of infection.",
    `Systemic antibiotics: ${abx}`,
    "Verify tetanus immunization status.",
    "⚠️ Inform patient and guardian: expected outcome is ankylosis-related (replacement) resorption. Replantation preserves alveolar bone and keeps options open. In growing patients: monitor for infra-occlusion; decoronation or autotransplantation may be necessary later.",
  ];

  const managementHTML = managementSteps
    .map((step, i) => `<li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${step.startsWith("⚠️") ? "#fca5a5" : "#cbd5e1"}; font-size: 14px; line-height: 1.6;"><strong style="color: #94a3b8; margin-right: 6px;">${i + 1}.</strong>${step}</li>`)
    .join("");

  const followUpHTML = followUps.map(fu => {
    const dateStr = fu.days ? addDays(injuryDateObj, fu.days) : fu.months ? addMonths(injuryDateObj, fu.months) : "Ongoing";
    return `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 16px;">
        <div style="flex-shrink: 0; min-width: 100px;">
          <div style="font-weight: 600; color: white; font-size: 14px;">${fu.label}</div>
          <div style="color: #60a5fa; font-size: 12px; margin-top: 2px;">${dateStr}</div>
        </div>
        <div style="color: #94a3b8; font-size: 13px; line-height: 1.6; text-align: right;">${fu.action}</div>
      </div>`;
  }).join("");

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #e2e8f0; line-height: 1.6;">

      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 26px; font-weight: 700; color: white; margin-bottom: 4px;">
          ${patientInfo.patientName || "Patient"} — Tooth ${patientInfo.tooth || "??"}
        </h2>
        <p style="color: #94a3b8; font-size: 15px;">
          ${patientInfo.age ? patientInfo.age + " years" : "Age not recorded"} · ${patientInfo.gender || ""} · Case ID: ${patientInfo.phoneNumber || "??"}
        </p>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">
          Injury: ${new Date(injuryDate).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>

      <!-- PDL Group Classification -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid ${pdlColor}40; border-radius: 14px; padding: 24px; margin-bottom: 20px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-bottom: 14px;">PDL Viability Classification — IADT 2020</h3>
        <div style="display: inline-block; background: ${pdlColor}15; border: 1px solid ${pdlColor}50; border-radius: 8px; padding: 8px 16px; margin-bottom: 14px;">
          <span style="font-weight: 700; font-size: 16px; color: ${pdlColor};">${pdlGroupLabel(pdlGroup)}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px;">
          <div><span style="color: #64748b;">Extra-oral dry time:</span> <strong style="color: white;">${dryTime} minutes</strong></div>
          <div><span style="color: #64748b;">Storage medium:</span> <strong style="color: white;">${storageLabel}</strong></div>
          <div><span style="color: #64748b;">Root apex:</span> <strong style="color: white;">${apex === "open" ? "Open (immature)" : "Closed (mature)"}</strong></div>
          <div><span style="color: #64748b;">Alveolar fracture:</span> <strong style="color: white;">${alveolarFracture ? "Yes" : "No"}</strong></div>
        </div>
        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.07);">
          <span style="color: #94a3b8;">Overall prognosis: </span>
          <strong style="color: ${pdlColor};">${prognosis}</strong>
        </div>
        ${pdlGroup === 3 ? `<p style="margin-top: 10px; color: #fca5a5; font-size: 13px;">⚠️ Delayed replantation: PDL has become necrotic and is not expected to regenerate. Expected outcome is ankylosis-related (replacement) root resorption. Replantation is still the correct decision — it preserves alveolar bone and keeps future treatment options open.</p>` : ""}
      </div>

      <!-- Management Protocol -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin-bottom: 20px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #f87171; margin-bottom: 16px;">Management Protocol — IADT 2020</h3>
        <ol style="list-style: none; padding: 0; margin: 0;">${managementHTML}</ol>
      </div>

      <!-- Endodontic Protocol -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin-bottom: 20px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #f87171; margin-bottom: 12px;">Endodontic Protocol</h3>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7;">${endo}</p>
      </div>

      <!-- Medications -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin-bottom: 20px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #f87171; margin-bottom: 12px;">Medications</h3>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7; margin-bottom: 10px;"><strong style="color: #94a3b8;">Systemic antibiotics:</strong> ${abx}</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7; margin-bottom: 10px;"><strong style="color: #94a3b8;">Tetanus:</strong> Check tetanus immunization status — refer to physician if vaccination status is uncertain.</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.7;"><strong style="color: #94a3b8;">Chlorhexidine:</strong> 0.12% mouth rinse twice daily for 2 weeks.</p>
      </div>

      <!-- Patient Instructions -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin-bottom: 20px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #f87171; margin-bottom: 12px;">Patient Instructions — IADT 2020</h3>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
          ${["Avoid contact sports — use a mouthguard when returning to physical activity.", "Soft diet for up to 2 weeks according to patient tolerance.", "Brush teeth gently with a soft toothbrush after each meal.", "Use chlorhexidine 0.12% mouth rinse twice daily for 2 weeks.", "Return for ALL scheduled follow-up visits — do not miss appointments.", "If tooth becomes painful, discolored, swollen, or mobile: contact the clinic immediately — do not wait for scheduled appointment."]
            .map(i => `<li style="color: #cbd5e1; font-size: 14px; display: flex; gap: 8px; align-items: flex-start;"><span style="color: #fb7185; flex-shrink: 0;">·</span>${i}</li>`)
            .join("")}
        </ul>
      </div>

      <!-- Follow-up Schedule -->
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px;">
        <h3 style="font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #f87171; margin-bottom: 4px;">Follow-up Schedule — IADT 2020</h3>
        ${apex === "open" ? `<p style="font-size: 12px; color: #fbbf24; margin-bottom: 14px;">⚠️ Open apex teeth require MORE FREQUENT monitoring due to rapid infection-related inflammatory resorption risk.</p>` : `<p style="font-size: 12px; color: #64748b; margin-bottom: 14px;">Closed apex follow-up schedule.</p>`}
        ${followUpHTML}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AvulsionClient() {
  const { user, loading: authLoading } = useAuth();
  const { patientInfo, saveCase, loadCaseByPhone } = useTrauma();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    dryTime:          15,
    storageMedia:     "milk",
    apex:             "closed",
    alveolarFracture: false,
    injuryDate:       new Date().toISOString().slice(0, 16),
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
        <div className="w-10 h-10 rounded-full border-2 border-rose-500/30 border-t-rose-400 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [id]: type === "checkbox" ? (e.target as HTMLInputElement).checked
            : id === "dryTime"  ? parseInt(value)
            : value,
    }));
  };

  const pdlGroup = classifyPDL(formData.dryTime, formData.storageMedia);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const html = generateProtocolHTML({
        patientInfo,
        dryTime:          formData.dryTime,
        storageMedia:     formData.storageMedia,
        apex:             formData.apex,
        alveolarFracture: formData.alveolarFracture,
        injuryDate:       formData.injuryDate,
      });
      setResult(html);
      setIsGenerating(false);
    }, 400);
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
        filename:   `Avulsion_${(patientInfo.patientName || "Patient").replace(/\s+/g,"_")}_Tooth${patientInfo.tooth || "XX"}.pdf`,
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

  const handleSave = () => saveCase("Avulsion", { ...formData, patientInfo }, result || "");

  // Derived live PDL display
  const pdlColor = pdlGroupColor(pdlGroup);
  const pdlBg    = pdlGroupBg(pdlGroup);

  const selBase = "w-full bg-[#06080f] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-rose-500/50 text-sm appearance-none transition-colors";
  const inputBase = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-rose-500/50 text-sm transition-colors";

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#06080f] text-white">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden border-b border-white/8"
          style={{ background: "linear-gradient(135deg, #1a0a0a 0%, #06080f 50%, #0f0a14 100%)" }}>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(251,113,133,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(251,113,133,0.8) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-0 left-0 w-96 h-48 opacity-15 rounded-full blur-3xl"
            style={{ background: "radial-gradient(ellipse, #f87171 0%, transparent 70%)" }} />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/25 rounded-full px-3 py-1 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span className="text-[11px] text-rose-300 font-medium tracking-widest uppercase">MOST URGENT · IADT 2020</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1.5"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Avulsion of Permanent Teeth
                </h1>
                <p className="text-rose-200/60 text-base">Personalized evidence-based protocol · Fouad et al. 2020</p>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p>IADT 2020 · AAE Guidelines</p>
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
                <p className="font-mono text-rose-400 text-sm">{patientInfo.phoneNumber || "Not loaded"}</p>
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
                    { label: "Tooth (FDI)", value: patientInfo.tooth },
                    { label: "Age", value: patientInfo.age ? `${patientInfo.age} yrs` : "—" },
                    { label: "Gender", value: patientInfo.gender || "—" },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] text-gray-600 mb-1">{f.label}</p>
                      <p className="text-sm text-white font-medium">{f.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PDL group live indicator */}
              <div className={`rounded-2xl p-4 border ${pdlBg}`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Live PDL Classification</p>
                <p className={`text-sm font-bold ${pdlColor}`}>{pdlGroupLabel(pdlGroup)}</p>
                <p className="text-[11px] text-gray-600 mt-1">Updates as you adjust parameters below</p>
              </div>

              {/* Critical avulsion parameters */}
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 sm:p-6">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Critical avulsion parameters
                </p>

                <div className="space-y-6">

                  {/* Injury date — editable, sourced from trauma center */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Date & Time of Injury
                      <span className="ml-1.5 text-[10px] text-rose-400/70">drives follow-up dates</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.injuryDate}
                      max={new Date().toISOString().slice(0, 16)}
                      onChange={e => setFormData(prev => ({ ...prev, injuryDate: e.target.value }))}
                      className={inputBase}
                    />
                    <p className="text-[10px] text-gray-700 mt-1">Editing here affects follow-up dates only, not the master case record</p>
                  </div>

                  {/* Dry time slider */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-3">
                      Extra-oral dry time (minutes)
                      <span className="ml-1.5 text-[10px] text-rose-400/70">
                        — IADT: &gt;30 min most PDL non-viable; &gt;60 min = Group 3
                      </span>
                    </label>
                    <input
                      id="dryTime"
                      type="range"
                      min="0"
                      max="300"
                      value={formData.dryTime}
                      onChange={handleChange}
                      className="w-full accent-rose-500"
                    />
                    <div className="flex justify-between text-xs mt-1.5">
                      <span className="text-emerald-500">0 min</span>
                      <span className={`font-bold text-base ${
                        formData.dryTime <= 15 ? "text-emerald-400" :
                        formData.dryTime < 60  ? "text-amber-400" : "text-red-400"
                      }`}>{formData.dryTime} min</span>
                      <span className="text-red-500">300 min</span>
                    </div>
                    {/* PDL threshold markers */}
                    <div className="relative h-1 rounded-full bg-white/5 mt-2 overflow-hidden">
                      <div className="absolute left-0 top-0 h-full rounded-full bg-emerald-500/40" style={{ width: "5%" }} />
                      <div className="absolute top-0 h-full rounded-full bg-amber-500/40" style={{ left: "5%", width: "15%" }} />
                      <div className="absolute top-0 h-full rounded-full bg-red-500/40" style={{ left: "20%", right: "0" }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-700 mt-1">
                      <span>Group 1</span><span>Group 2 (&lt;60 min)</span><span>Group 3</span>
                    </div>
                  </div>

                  {/* Storage medium */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Storage Medium</label>
                    <select id="storageMedia" value={formData.storageMedia} onChange={handleChange} className={selBase}>
                      <option value="hanks">Hank's Balanced Salt Solution — optimal</option>
                      <option value="milk">Cold milk — excellent</option>
                      <option value="saliva">Saliva — acceptable</option>
                      <option value="saline">Normal saline — acceptable</option>
                      <option value="water">Water — POOR (osmotic damage)</option>
                      <option value="dry">Dry storage — NON-PHYSIOLOGIC</option>
                    </select>
                    {(formData.storageMedia === "water" || formData.storageMedia === "dry") && (
                      <p className="text-rose-400 text-[11px] mt-1.5">
                        ⚠️ {formData.storageMedia === "dry" ? "Dry storage — PDL cells begin dying within minutes. Classify as non-physiologic." : "Water is not osmolality-balanced — causes PDL cell death. Non-physiologic medium."}
                      </p>
                    )}
                  </div>

                  {/* Apex */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Root Apex Maturity</label>
                    <select id="apex" value={formData.apex} onChange={handleChange} className={selBase}>
                      <option value="open">Open apex — immature (revascularization possible)</option>
                      <option value="closed">Closed apex — mature (RCT within 2 weeks)</option>
                    </select>
                  </div>

                  {/* Alveolar fracture */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="alveolarFracture"
                      checked={formData.alveolarFracture}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm text-white group-hover:text-rose-300 transition-colors">Alveolar / jawbone fracture present</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Splint duration → 4 weeks rigid (instead of 2 weeks)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
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
                      <p className="text-sm text-gray-700 mt-1">IADT 2020-compliant personalized report will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: result }} />
                )}
              </div>

              {/* Action buttons */}
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