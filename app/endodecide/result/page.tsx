"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navigation from "../../components/navigation";
import ProtectedRoute from "../../components/protectedroute";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
type Urgency = "low" | "medium" | "high";

const URGENCY_ACCENT: Record<Urgency, string> = {
  low:    "#10b981",
  medium: "#f59e0b",
  high:   "#ef4444",
};

const IOWA_CONFIG: Record<string, {
  color: string; bg: string; border: string; label: string;
}> = {
  I:   { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Excellent prognosis" },
  II:  { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Favourable prognosis" },
  III: { color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  label: "Moderate prognosis" },
  IV:  { color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30",     label: "Guarded prognosis" },
};

const LEVEL_COLOR: Record<string, string> = {
  normal: "#10b981", attachment: "#f59e0b", deep: "#ef4444",
};
const LEVEL_LABEL: Record<string, string> = {
  normal:     "Normal (<3mm)",
  attachment: "Attachment loss (3–4mm)",
  deep:       "Deep (≥5mm)",
};

// ════════════════════════════════════════════════════════════
// SURVIVAL GAUGE
// ════════════════════════════════════════════════════════════
function SurvivalGauge({ value, range, accent }: {
  value: number; range: [number, number]; accent: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const color   = clamped >= 80 ? "#10b981" : clamped >= 65 ? "#f59e0b" : clamped >= 50 ? "#f97316" : "#ef4444";
  const r       = 56;
  const circ    = 2 * Math.PI * r;
  const dash    = (clamped / 100) * circ * 0.75;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 168, height: 168 }}>
        <svg width="168" height="168" viewBox="0 0 168 168">
          {/* Track */}
          <circle cx="84" cy="84" r={r} fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth="10" strokeDasharray={`${circ * 0.75} ${circ}`}
            strokeLinecap="round" transform="rotate(-225 84 84)" />
          {/* Fill */}
          <circle cx="84" cy="84" r={r} fill="none" stroke={color}
            strokeWidth="10" strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round" transform="rotate(-225 84 84)"
            style={{ filter: `drop-shadow(0 0 10px ${color}60)`, transition: "stroke-dasharray 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color }}>{clamped}%</span>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">4-year survival</span>
          <span className="text-[9px] text-gray-600 mt-0.5">{range[0]}–{range[1]}% range</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// IOWA STAGE GAUGE
// ════════════════════════════════════════════════════════════
function IowaGauge({ successRate }: { successRate: number }) {
  const color = successRate >= 80 ? "#10b981" : successRate >= 65 ? "#f59e0b" : successRate >= 50 ? "#f97316" : "#ef4444";
  const r     = 40;
  const circ  = 2 * Math.PI * r;
  const dash  = (successRate / 100) * circ * 0.75;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 110, height: 110 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ}`}
            strokeLinecap="round" transform="rotate(-225 55 55)" />
          <circle cx="55" cy="55" r={r} fill="none" stroke={color}
            strokeWidth="8" strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round" transform="rotate(-225 55 55)"
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{successRate}%</span>
          <span className="text-[8px] text-gray-600 uppercase tracking-wider">1-yr success</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DPI GAUGE BAR
// ════════════════════════════════════════════════════════════
function getDPILabel(dpi: number): { label: string; color: string; bg: string; border: string; desc: string } {
  if (dpi <= 4)  return { label: "Low",      color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", desc: "Favourable prognosis complexity" };
  if (dpi <= 9)  return { label: "Moderate", color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   desc: "Moderate complexity — careful case selection" };
  if (dpi <= 16) return { label: "High",     color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  desc: "High complexity — advanced clinical skill required" };
  return               { label: "Critical",  color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30",     desc: "Critical — consider extraction and alternative restoration" };
}

function DPIBar({ value }: { value: number }) {
  const cfg    = getDPILabel(value);
  const maxDPI = 32;
  const pct    = Math.min(100, (value / maxDPI) * 100);
  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className={`text-4xl font-black ${cfg.color}`}>{value}</span>
          <span className="text-gray-500 text-sm ml-1">pts</span>
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-white/8 overflow-hidden mb-2">
        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: cfg.color.replace("text-","").replace("-400",""),
            boxShadow: `0 0 8px currentColor` }} />
      </div>
      <div className="flex justify-between text-[9px] text-gray-600">
        <span>0</span><span>4</span><span>9</span><span>16</span><span>32+</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{cfg.desc}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FACTOR SEVERITY
// ════════════════════════════════════════════════════════════
function getFactorSeverity(factor: string): { dot: string; badge: string; weight: string } {
  const f = factor.toLowerCase();
  if (f.includes("no ferrule") || f.includes("advanced") || f.includes("instrument sep") || f.includes("perforation") || f.includes("impractical"))
    return { dot: "bg-red-500",    badge: "bg-red-500/15 text-red-400",     weight: "High impact" };
  if (f.includes("periapical") || f.includes("insufficient ferrule") || f.includes("high endo") || f.includes("prosthodontic") || f.includes("moderate"))
    return { dot: "bg-amber-500",  badge: "bg-amber-500/15 text-amber-400", weight: "Moderate impact" };
  return   { dot: "bg-blue-400",   badge: "bg-blue-500/15 text-blue-400",   weight: "Contributing" };
}

// ════════════════════════════════════════════════════════════
// PANEL WRAPPER
// ════════════════════════════════════════════════════════════
function Panel({ title, accent, children, conditional }: {
  title: string; accent: string; children: React.ReactNode; conditional?: boolean;
}) {
  return (
    <div className={`bg-[#0d1a30] border rounded-3xl p-6 transition-all ${
      conditional ? "border-orange-500/20" : "border-white/10"
    }`}>
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">{title}</p>
        {conditional && (
          <span className="ml-auto text-[9px] bg-orange-500/15 border border-orange-500/25 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Conditional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TIER BREAKDOWN (compact)
// ════════════════════════════════════════════════════════════
function TierBreakdown({ t1, t2, t3, baseline }: {
  t1: number; t2: number; t3: number; baseline: number;
}) {
  const items = [
    { label: "Baseline", value: baseline, color: "#10b981", positive: true },
    { label: "Tier 1 — Tooth factors",    value: -t1, color: t1 > 0 ? "#f59e0b" : "#10b981" },
    { label: "Tier 2 — Patient factors",  value: -t2, color: t2 > 0 ? "#f97316" : "#10b981" },
    { label: "Tier 3 — Procedural",       value: -t3, color: t3 > 0 ? "#ef4444" : "#10b981" },
  ];
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/3">
          <span className="text-xs text-gray-400">{item.label}</span>
          <span className="text-xs font-bold" style={{ color: item.color }}>
            {item.value > 0 ? "+" : ""}{item.value}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// INCONSISTENCY ALERT
// ════════════════════════════════════════════════════════════
function InconsistencyAlert({ notes }: { notes: string[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="space-y-2">
      {notes.map((note, i) => (
        <div key={i} className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/25 rounded-2xl px-4 py-3.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
            <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="text-xs font-bold text-amber-400 mb-0.5">Inconsistent Finding</p>
            <p className="text-xs text-amber-300/80 leading-relaxed">{note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function EndoDecideResult() {
  const [result, setResult]               = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [caseName, setCaseName]           = useState("");
  const [phoneNumber, setPhoneNumber]     = useState("");
  const [followUpDate, setFollowUpDate]   = useState("");
  const [furtherNote, setFurtherNote]     = useState("");
  const [saving, setSaving]               = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showTierBreakdown, setShowTierBreakdown] = useState(false);

  const { user } = useAuth();
  const router   = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem("lastEndoDecideResult");
    if (raw) {
      try { setResult(JSON.parse(raw)); }
      catch { router.push("/endodecide"); }
    } else {
      router.push("/endodecide");
    }
  }, [router]);

  if (!result) return (
    <ProtectedRoute><Navigation />
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#10b981]/30 border-t-[#10b981] animate-spin" />
      </div>
    </ProtectedRoute>
  );

  // ── Derived display values ──
  const urgency    = (result.urgency ?? "low") as Urgency;
  const accent     = URGENCY_ACCENT[urgency];
  const survival   = result.survivalPercentage ?? 0;
  const range      = result.survivalRange ?? [survival - 3, survival + 3];
  const isPractical = result.isPractical ?? false;
  const iowa        = result.iowa;
  const vrfFlag     = result.vrfFlag ?? false;
  const isCombined  = result.toolType === "combined";
  const dpiCfg      = getDPILabel(result.totalDPI ?? 0);
  const sites       = result.sites ?? [];
  const threshold   = result.threshold ?? 65;
  const toothType   = result.toothType ?? "Molar";
  const factors     = result.affectingFactors ?? [];
  const inconsistencies = result.inconsistencyNotes ?? [];

  // Iowa config
  const iowaCfg = iowa ? IOWA_CONFIG[iowa.stage] : null;

  // ════════════════════════════════════════════════════════════
  // SAVE CASE
  // ════════════════════════════════════════════════════════════
  const handleSaveCase = async () => {
    if (!caseName.trim() || !phoneNumber.trim()) {
      alert("Please fill in Case Name and Phone Number.");
      return;
    }
    if (!user) { alert("Please log in to save cases."); return; }
    if (saving) return;
    setSaving(true);

    try {
      // Duplicate check
      const q = query(collection(db, "cases"),
        where("userId",      "==", user.uid),
        where("toothNumber", "==", result.toothNumber),
        where("type",        "==", "endodecide")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const d of snap.docs) {
          const ex = d.data();
          if (
            ex.survivalEstimate   === survival &&
            ex.pulpalDiagnosis    === result.pulpalDiagnosis &&
            ex.periapicalDiagnosis === result.periapicalDiagnosis
          ) {
            alert("This case was already saved. Check My Cases.");
            setSaving(false);
            return;
          }
        }
      }

      await addDoc(collection(db, "cases"), {
        // ── Identity ──
        type:          "endodecide",
        toolType:      result.toolType ?? "predictor",
        caseName:      caseName.trim(),
        phoneNumber:   phoneNumber.trim(),
        followUpDate:  followUpDate || null,
        furtherNote:   furtherNote.trim(),

        // ── Patient ──
        toothNumber:   result.toothNumber  ?? "",
        toothType:     result.toothType    ?? "Molar",
        gender:        result.gender       ?? "",
        ageGroup:      result.ageGroup     ?? "",
        asa:           result.formData?.medical ?? "0",

        // ── Urgency ──
        urgency,
        casePresText:  result.casePresText ?? "",

        // ── Diagnosis (AAE 2013) ──
        pulpalDiagnosis:     result.pulpalDiagnosis     ?? "",
        periapicalDiagnosis: result.periapicalDiagnosis ?? "",
        inconsistencyNotes:  inconsistencies,

        // ── Prognosis ──
        survivalEstimate:    survival,
        survivalRange:       range,
        epPoints:            result.totalDPI    ?? 0,
        isPractical,
        threshold,
        treatmentRec:        result.treatmentRec ?? "",
        procedureCategory:   result.procedureCategory ?? "",
        affectingFactors:    factors,
        treatmentStatus:     "No Treatment",

        // ── Structure ──
        remainingStructure:  result.remainingPercent ?? 0,
        walls:               result.walls    ?? {},
        occlusal:            result.occlusal ?? "access_only",
        ferrule:             result.ferrule  ?? {},

        // ── Periodontal ──
        periodontalStatus:   result.formData?.perio ?? "0",
        sites:               sites,
        deepCount:           result.deepCount ?? 0,

        // ── Crack (present only when triggered) ──
        crackPresent:    result.crackPresent    ?? false,
        crackConfirmed:  result.crackConfirmed  ?? false,
        crackMethods:    result.crackMethods    ?? {},
        iowa:            iowa ?? null,
        iowaStage:       iowa?.stage  ?? null,
        iowaSuccessRate: iowa?.successRate ?? null,

        // ── VRF ──
        vrfFlag,

        // ── Snapshot ──
        patientInputs:    result.formData ?? {},
        predictionResult: {
          survivalPercentage: survival,
          survivalRange:      range,
          totalDPI:           result.totalDPI ?? 0,
          tier1:              result.tier1Deductions ?? 0,
          tier2:              result.tier2Deductions ?? 0,
          tier3:              result.tier3Deductions ?? 0,
          affectingFactors:   factors,
          pulpalDiagnosis:    result.pulpalDiagnosis,
          periapicalDiagnosis: result.periapicalDiagnosis,
          iowa,
          vrfFlag,
        },

        userId:    user.uid,
        createdAt: serverTimestamp(),
        savedAt:   new Date().toISOString(),
      });

      setSaveSuccess(true);
      setShowSaveModal(false);
      setCaseName(""); setPhoneNumber(""); setFollowUpDate(""); setFurtherNote("");
      localStorage.removeItem("lastEndoDecideResult");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save case. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // PDF EXPORT
  // ════════════════════════════════════════════════════════════
  const exportAsPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const pdfDate    = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const verdictBg  = isPractical ? "#052e16" : "#450a0a";
      const verdictBd  = isPractical ? "#10b981" : "#ef4444";
      const verdictCol = isPractical ? "#10b981" : "#ef4444";

      const factorRows = factors.map((f: string) =>
        `<li style="padding:6px 0;border-bottom:1px solid #1e293b;font-size:12px;color:#e2e8f0;">• ${f}</li>`
      ).join("");

      const iowaBlock = iowa ? `
        <div style="background:${iowaCfg?.bg.replace("bg-","").replace("/10","") ?? "#0d1a30"};border:2px solid ${
          iowa.stage === "I" ? "#10b981" : iowa.stage === "II" ? "#f59e0b" : iowa.stage === "III" ? "#f97316" : "#ef4444"
        };border-radius:12px;padding:20px;margin-bottom:16px;">
          <p style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Iowa Classification — Krell & Caplan 2018</p>
          <p style="font-size:28px;font-weight:900;color:${iowa.stage === "I" ? "#10b981" : iowa.stage === "II" ? "#f59e0b" : iowa.stage === "III" ? "#f97316" : "#ef4444"};margin:0;">Stage ${iowa.stage}</p>
          <p style="color:#94a3b8;font-size:13px;margin-top:6px;">${iowa.label}</p>
          <p style="color:#94a3b8;font-size:13px;margin-top:4px;">1-year success rate: <strong>${iowa.successRate}%</strong> — reported independently of EPP survival estimate</p>
        </div>` : "";

      const vrfBlock = vrfFlag ? `
        <div style="background:#1a0808;border:2px solid #ef4444;border-radius:12px;padding:16px;margin-bottom:16px;">
          <p style="font-size:16px;font-weight:900;color:#ef4444;margin:0;">⚠️ VRF Cannot Be Excluded</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:6px;">Previously root canal treated tooth with deep periodontal pocket or sinus tract and significant coronal structure loss. Direct visualization required before committing to treatment plan.</p>
        </div>` : "";

      const inconsistBlock = inconsistencies.length > 0 ? `
        <div style="background:#1a1200;border:1px solid #92400e;border-radius:10px;padding:14px;margin-bottom:16px;">
          ${inconsistencies.map((n: string) => `<p style="color:#fbbf24;font-size:12px;margin:4px 0;">⚠ ${n}</p>`).join("")}
        </div>` : "";

      const siteRows = sites.map((s: any) =>
        `<li style="padding:5px 0;border-bottom:1px solid #1e293b;font-size:11px;color:${LEVEL_COLOR[s.level] ?? "#64748b"};">${s.label}: ${LEVEL_LABEL[s.level]}</li>`
      ).join("");

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="font-family:system-ui,sans-serif;color:#e2e8f0;background:#0a1428;padding:40px 30px;line-height:1.6;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:32px;font-weight:900;color:#10b981;margin:0;">EndoDecide</h1>
            <p style="color:#64748b;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Clinical Decision Report</p>
            <p style="color:#64748b;font-size:12px;margin-top:4px;">Tooth #${result.toothNumber} · ${result.toothType} · ${pdfDate}</p>
          </div>

          ${inconsistBlock}

          <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;margin-bottom:16px;">
            <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Clinical Summary</p>
            <p style="font-size:13px;line-height:1.8;">${result.introParagraph ?? ""}</p>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;text-align:center;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">4-Year Survival</p>
              <p style="font-size:48px;font-weight:900;color:${survival >= 80 ? "#10b981" : survival >= 65 ? "#f59e0b" : "#ef4444"};margin:0;">${survival}%</p>
              <p style="color:#64748b;font-size:11px;margin-top:4px;">Range: ${range[0]}–${range[1]}%</p>
            </div>
            <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;text-align:center;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">EP Points (DPI)</p>
              <p style="font-size:48px;font-weight:900;color:#3b82f6;margin:0;">${result.totalDPI ?? 0}</p>
              <p style="color:#64748b;font-size:11px;margin-top:4px;">${dpiCfg.label} Complexity</p>
            </div>
          </div>

          <div style="background:${verdictBg};border:3px solid ${verdictBd};border-radius:16px;padding:20px;text-align:center;margin-bottom:16px;">
            <p style="font-size:22px;font-weight:900;color:${verdictCol};margin:0;">${isPractical ? "✅ Practical to Retain" : "⚠️ Impractical to Retain"}</p>
            <p style="color:#94a3b8;font-size:13px;margin-top:6px;">Threshold: ${threshold}% survival required for ${toothType}</p>
          </div>

          <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;margin-bottom:16px;">
            <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Working Diagnosis (AAE 2013)</p>
            <p style="font-size:16px;font-weight:700;color:#e2e8f0;">${result.pulpalDiagnosis ?? "—"}</p>
            <p style="font-size:14px;color:#94a3b8;margin-top:4px;">${result.periapicalDiagnosis ?? "—"}</p>
            ${result.treatmentRec ? `<p style="margin-top:12px;padding:10px 16px;background:#0a1428;border-radius:10px;font-size:14px;color:#10b981;">Treatment: ${result.treatmentRec}</p>` : ""}
          </div>

          ${factorRows ? `<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;margin-bottom:16px;"><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Factors Affecting Survivability</p><ul style="list-style:none;padding:0;margin:0;">${factorRows}</ul></div>` : ""}

          ${iowaBlock}
          ${vrfBlock}

          ${sites.length > 0 ? `<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;margin-bottom:16px;"><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Periodontal Probing</p><ul style="list-style:none;padding:0;margin:0;">${siteRows}</ul></div>` : ""}

          ${result.vptAgeNote ? `<div style="background:#0c1a0c;border:1px solid #166534;border-radius:12px;padding:16px;margin-bottom:12px;"><p style="font-size:12px;color:#86efac;">ℹ ${result.vptAgeNote}</p></div>` : ""}
          ${result.medicationFlag ? `<div style="background:#1a1000;border:1px solid #78350f;border-radius:12px;padding:16px;margin-bottom:12px;"><p style="font-size:12px;color:#fbbf24;">⚠ ${result.medicationFlag}</p></div>` : ""}

          <div style="margin-top:20px;padding:14px;border:1px solid #ef4444;border-radius:10px;text-align:center;">
            <p style="color:#ef4444;font-size:11px;">Clinical decision support only. Always apply professional judgment. Iowa and EPP survival rates are independent metrics from different study populations — do not combine them.</p>
          </div>
          <p style="text-align:center;color:#475569;font-size:10px;margin-top:10px;">Generated by Endoprognosis · EndoDecide · ${pdfDate}</p>
        </div>
      `;

      document.body.appendChild(el);
      await html2pdf().from(el).set({
        margin:     [10, 15, 10, 15] as [number, number, number, number],
        filename:   `EndoDecide_Tooth${result.toothNumber}_${new Date().toISOString().slice(0,10)}.pdf`,
        image:      { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#0a1428" },
        jsPDF:      { unit: "mm", format: "a4", orientation: "portrait" as const },
      }).save();
      document.body.removeChild(el);
    } catch {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const inputCls = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors";

  // ── Navigate to restorative recommendation ──
  const goToRestorative = () => {
    if (!result?.toothNumber) return;
    localStorage.setItem("restorativeData", JSON.stringify({
      toothNumber:      result.toothNumber,
      remainingPercent: result.remainingPercent ?? 100,
      walls:            result.walls ?? {},
      occlusal:         result.occlusal ?? "access_only",
      ferrule:          result.ferrule ?? {},
      oralHygiene:      result.formData?.oralHygiene ?? "0",
      perio:            result.formData?.perio ?? "0",
      fullResult:       result,
      sourceRoute:      "/endodecide/result",
    }));
    router.push("/restorative");
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white pb-20">

        {/* ── HERO — urgency-reactive ── */}
        <div className="relative h-[240px] md:h-[280px] overflow-hidden"
          style={{ backgroundImage: "url('https://iili.io/Bw4dt99.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="absolute inset-0"
            style={{
              background: urgency === "low"
                ? "linear-gradient(to bottom, rgba(6,78,59,0.7), rgba(10,20,40,0.95))"
                : urgency === "medium"
                ? "linear-gradient(to bottom, rgba(120,53,15,0.7), rgba(10,20,40,0.95))"
                : "linear-gradient(to bottom, rgba(127,29,29,0.7), rgba(10,20,40,0.95))"
            }} />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: accent + "99" }}>
              EndoDecide Report
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2"
              style={{
                fontFamily: "Playfair Display, serif",
                background: `linear-gradient(135deg, ${accent}, white, ${accent})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
              Clinical Decision Summary
            </h1>
            <p className="text-gray-300 text-sm">
              Tooth <span className="font-bold" style={{ color: accent }}>#{result.toothNumber}</span>
              {" · "}<span className="text-gray-400">{result.toothType}</span>
              {" · "}<span className="text-gray-500 text-xs">{result.casePresText}</span>
            </p>
            {isCombined && (
              <div className="mt-3 flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 text-orange-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Combined — Prognosis & Iowa Classification
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

          {/* Back */}
          <button onClick={() => router.push("/endodecide")}
            className="flex items-center gap-2 text-gray-500 hover:text-[#10b981] text-sm transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New case
          </button>

          {/* Save success */}
          {saveSuccess && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-2xl text-sm font-medium">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Case saved — view it in My Cases.
            </div>
          )}

          {/* Inconsistency alerts */}
          <InconsistencyAlert notes={inconsistencies} />

          {/* ── PANEL 1: CLINICAL SUMMARY ── */}
          <Panel title="Clinical Summary" accent={accent}>
            {result.introParagraph && (
              <p className="text-sm text-gray-300 leading-relaxed mb-0"
                dangerouslySetInnerHTML={{ __html: result.introParagraph }} />
            )}
          </Panel>

          {/* ── PANEL 2: PROGNOSIS ── */}
          <Panel title="Endodontic Prognosis — 4-Year Survival" accent={accent}>

            {/* Main metrics */}
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div className="flex flex-col items-center justify-center bg-white/3 rounded-2xl p-5">
                <SurvivalGauge value={survival} range={range} accent={accent} />
              </div>
              <div className="bg-white/3 rounded-2xl p-5 flex flex-col justify-between">
                <p className="text-[10px] text-gray-500 tracking-[2px] uppercase mb-4">EP Points (Dental Prognosis Index)</p>
                <DPIBar value={result.totalDPI ?? 0} />
              </div>
            </div>

            {/* Verdict */}
            <div className={`rounded-2xl p-5 border-2 mb-4 ${
              isPractical
                ? "bg-emerald-500/8 border-emerald-500/40"
                : "bg-red-500/8 border-red-500/40"
            }`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className={`text-2xl font-black ${isPractical ? "text-emerald-400" : "text-red-400"}`}>
                    {isPractical ? "✅ Practical to Retain" : "⚠️ Impractical to Retain"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {isPractical
                      ? `Survival (${survival}%) meets the ${threshold}% threshold for ${toothType} retention.`
                      : `Survival (${survival}%) falls below the ${threshold}% threshold for ${toothType} retention.`}
                  </p>
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                  isPractical
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/15 border-red-500/30 text-red-400"
                }`}>{toothType}</span>
              </div>
              {result.explanationNote && (
                <p className="text-sm text-gray-400 mt-4 pt-4 border-t border-white/8 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: result.explanationNote }} />
              )}
              {result.isImpracticalOverride && result.overrideReason && (
                <div className="mt-3 flex items-start gap-2 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-orange-400 leading-relaxed">{result.overrideReason}</p>
                </div>
              )}
            </div>

            {/* Tier breakdown toggle */}
            <button
              onClick={() => setShowTierBreakdown(v => !v)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
                className={`transition-transform ${showTierBreakdown ? "rotate-180" : ""}`}>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {showTierBreakdown ? "Hide" : "Show"} score breakdown
            </button>
            {showTierBreakdown && (
              <TierBreakdown
                baseline={result.periapicalDiagnosis !== "Normal Apical Tissues" ? 87 : 92}
                t1={result.tier1Deductions ?? 0}
                t2={result.tier2Deductions ?? 0}
                t3={result.tier3Deductions ?? 0}
              />
            )}
          </Panel>

          {/* ── PANEL 2: DIAGNOSIS ── */}
          <Panel title="Working Diagnosis — AAE 2013" accent="#3b82f6">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white/4 rounded-2xl p-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Pulpal Diagnosis</p>
                <p className="text-sm font-bold text-white">{result.pulpalDiagnosis ?? "—"}</p>
              </div>
              <div className="bg-white/4 rounded-2xl p-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Periapical Diagnosis</p>
                <p className="text-sm font-bold text-white">{result.periapicalDiagnosis ?? "—"}</p>
              </div>
            </div>

            {result.treatmentRec && isPractical && (
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border"
                style={{ background: accent + "12", borderColor: accent + "40" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Recommended Treatment</p>
                  <p className="text-sm font-bold" style={{ color: accent }}>{result.treatmentRec}</p>
                </div>
              </div>
            )}

            {/* Derivation logic visible to clinician */}
            <div className="mt-4 bg-white/2 border border-white/6 rounded-2xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">How the diagnosis was derived</p>
              <div className="space-y-1.5">
                {[
                  result.formData?.rootTreated === "yes" && { label: "Root canal treated tooth", value: "→ Previously Treated" },
                  result.formData?.rootAccessed === "yes" && { label: "Treatment initiated but incomplete", value: "→ Previously Initiated Therapy" },
                  result.formData?.coldTest === "none" && { label: "No cold test response", value: "→ Pulp Necrosis axis" },
                  result.formData?.coldTest === "lingering_long" && { label: "Cold response lingering >30 seconds", value: "→ Irreversible Pulpitis" },
                  result.formData?.spontaneous === "yes" && { label: "Spontaneous pain present", value: "→ Irreversible Pulpitis" },
                  result.formData?.nocturnal === "yes" && { label: "Nocturnal pain (wakes patient)", value: "→ Irreversible Pulpitis" },
                  result.formData?.swelling === "yes" && { label: "Swelling present (priority rule)", value: "→ Acute Apical Abscess" },
                  result.formData?.sinus === "yes" && { label: "Sinus tract present", value: "→ Chronic Apical Abscess" },
                  result.formData?.percussion === "yes" && { label: "Percussion tenderness", value: "→ Periapical axis" },
                  result.formData?.palpation === "yes" && { label: "Palpation tenderness", value: "→ Periapical axis" },
                  result.formData?.periApical === "yes" && { label: "Periapical lesion on radiograph", value: "→ Periapical involvement" },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="text-[#10b981] font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* ── PANEL 3: AFFECTING FACTORS ── */}
          {factors.length > 0 && (
            <Panel title="Factors Affecting Survivability" accent="#f59e0b">
              <div className="space-y-2">
                {factors.map((factor: string, i: number) => {
                  const sev = getFactorSeverity(factor);
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white/3 rounded-xl border border-white/6">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${sev.dot}`} />
                      <p className="text-sm text-gray-300 flex-1">{factor}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-wider flex-shrink-0 px-2 py-0.5 rounded-full ${sev.badge}`}>
                        {sev.weight}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* ── PANEL 4A: IOWA CLASSIFICATION (conditional) ── */}
          {iowa && iowaCfg && result.crackConfirmed && (
            <Panel title="Iowa Classification — Krell & Caplan 2018" accent="#f97316" conditional>

              {/* Important disclaimer */}
              <div className="flex items-start gap-3 bg-blue-500/8 border border-blue-500/20 rounded-2xl px-4 py-3 mb-5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-400 flex-shrink-0 mt-0.5">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <p className="text-xs text-blue-300 leading-relaxed">
                  The Iowa success rate ({iowa.successRate}%) and the EPP survival estimate ({survival}%) come from different study populations with different follow-up periods and outcome definitions.
                  <strong className="text-blue-200"> They are reported independently and must not be mathematically combined.</strong>
                </p>
              </div>

              {/* Stage verdict */}
              <div className={`${iowaCfg.bg} border-2 ${iowaCfg.border} rounded-2xl p-5 mb-5`}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Iowa Stage</p>
                    <p className={`text-5xl font-black ${iowaCfg.color}`}>{iowa.stage}</p>
                    <p className={`text-sm font-semibold ${iowaCfg.color} mt-1`}>{iowaCfg.label}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{iowa.label}</p>
                  </div>
                  <IowaGauge successRate={iowa.successRate} />
                </div>
              </div>

              {/* Iowa stage reference table */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { stage: "I",   rate: 93, pct: "37% of cases" },
                  { stage: "II",  rate: 84, pct: "39% of cases" },
                  { stage: "III", rate: 69, pct: "15% of cases" },
                  { stage: "IV",  rate: 41, pct: "8% of cases"  },
                ].map(s => {
                  const isCurrent = s.stage === iowa.stage;
                  const color = s.rate >= 80 ? "#10b981" : s.rate >= 65 ? "#f59e0b" : s.rate >= 50 ? "#f97316" : "#ef4444";
                  return (
                    <div key={s.stage} className={`rounded-xl p-3 text-center border transition-all ${
                      isCurrent ? "border-white/30 bg-white/8 scale-105 shadow-lg" : "border-white/5 bg-white/3"
                    }`}>
                      <p className="text-[9px] text-gray-600 mb-1 uppercase">Stage {s.stage}</p>
                      <p className="text-xl font-black" style={{ color }}>{s.rate}%</p>
                      <p className="text-[9px] text-gray-600 mt-0.5">{s.pct}</p>
                      {isCurrent && <p className="text-[8px] text-white/40 mt-0.5">← current</p>}
                    </div>
                  );
                })}
              </div>

              {/* Crack confirmation methods */}
              {result.crackMethods && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Confirmation Methods Used</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "transillum", icon: "💡", label: "Transillumination" },
                      { key: "methBlue",   icon: "🔵", label: "Methylene Blue" },
                      { key: "direct",     icon: "🔬", label: "Direct Visualization" },
                    ].map(m => {
                      const used = result.crackMethods[m.key];
                      return (
                        <div key={m.key} className={`rounded-xl p-3 text-center border ${
                          used ? "bg-emerald-500/10 border-emerald-500/25" : "bg-white/3 border-white/8"
                        }`}>
                          <p className="text-base mb-1">{m.icon}</p>
                          <p className={`text-[10px] font-bold ${used ? "text-emerald-400" : "text-gray-600"}`}>{m.label}</p>
                          <p className={`text-[9px] mt-0.5 ${used ? "text-emerald-500" : "text-gray-700"}`}>
                            {used ? "Confirmed" : "Not used"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-600 mt-4 leading-relaxed">
                1-year success rates for orthograde root canal treatment — Krell & Caplan, J Endod 2018 (n=363 cracked teeth).
              </p>
            </Panel>
          )}

          {/* Crack suspected but not confirmed */}
          {result.crackPresent && !result.crackConfirmed && (
            <div className="flex items-start gap-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl px-5 py-4">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Crack Suspected — Iowa Classification Not Applied</p>
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  A crack was reported but not confirmed by transillumination, methylene blue, or direct visualization.
                  Iowa staging requires confirmed crack visualization. Findings are recorded but no stage has been assigned.
                </p>
              </div>
            </div>
          )}

          {/* ── PANEL 4B: VRF FLAG (conditional) ── */}
          {vrfFlag && (
            <Panel title="Vertical Root Fracture Alert" accent="#ef4444" conditional>
              <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-5 mb-4">
                <p className="text-xl font-black text-red-400 mb-2">⚠️ VRF Cannot Be Excluded</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  This tooth is previously root canal treated with a deep periodontal pocket or sinus tract present,
                  and more than 50% of coronal structure is lost. This combination raises significant concern for
                  vertical root fracture.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  "VRF cannot be confirmed without direct or microscopic visualization during treatment or exploratory surgery",
                  "CBCT has limited and variable reliability for VRF detection — a negative CBCT does not rule out VRF",
                  "Direct visualization required before committing to the treatment plan",
                  "The patient should be informed of this possibility and provide informed consent before treatment begins",
                ].map((note, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-white/3 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* ── CORONAL STRUCTURE ── */}
          {result.walls && (
            <Panel title="Coronal Structure Assessment" accent="#10b981">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black text-[#10b981]">{result.remainingPercent ?? 0}% remaining</span>
                <span className="text-xs text-gray-500">{100 - (result.remainingPercent ?? 0)}% lost</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {(Object.entries(result.walls) as [string, string][]).map(([wall, state]) => (
                  <div key={wall} className={`rounded-xl p-3 text-center border ${
                    state === "intact"   ? "bg-emerald-500/10 border-emerald-500/25" :
                    state === "moderate" ? "bg-amber-500/10 border-amber-500/25" :
                                          "bg-red-500/10 border-red-500/25"
                  }`}>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 capitalize">{wall}</p>
                    <p className={`text-xs font-bold capitalize ${
                      state === "intact" ? "text-emerald-400" : state === "moderate" ? "text-amber-400" : "text-red-400"
                    }`}>{state}</p>
                  </div>
                ))}
              </div>
              {result.ferrule?.label && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                  result.ferrule.wallsWithFerrule >= 4 ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400" :
                  result.ferrule.wallsWithFerrule >= 3 ? "bg-amber-500/8 border-amber-500/20 text-amber-400" :
                                                         "bg-red-500/8 border-red-500/20 text-red-400"
                }`}>
                  <span>⬡</span>
                  <span>{result.ferrule.label}</span>
                </div>
              )}
            </Panel>
          )}

          {/* ── PROBING MAP ── */}
          {sites.length > 0 && (
            <Panel title="Periodontal Probing Map" accent="#3b82f6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {sites.map((s: any) => {
                  const color = LEVEL_COLOR[s.level] ?? "#64748b";
                  return (
                    <div key={s.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                      style={{ background: color + "10", borderColor: color + "30" }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <div>
                        <p className="text-xs font-semibold text-white">{s.label}</p>
                        <p className="text-[10px]" style={{ color }}>{LEVEL_LABEL[s.level]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Normal",     count: sites.filter((s: any) => s.level === "normal").length,     color: "#10b981" },
                  { label: "Attachment", count: sites.filter((s: any) => s.level === "attachment").length, color: "#f59e0b" },
                  { label: "Deep ≥5mm",  count: sites.filter((s: any) => s.level === "deep").length,       color: "#ef4444" },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl py-2 border"
                    style={{ background: s.color + "10", borderColor: s.color + "25" }}>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* ── CONTEXTUAL NOTES ── */}
          {(result.vptAgeNote || result.medicationFlag) && (
            <div className="space-y-3">
              {result.vptAgeNote && (
                <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/25 rounded-2xl px-4 py-3.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-400 flex-shrink-0 mt-0.5">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <p className="text-sm text-emerald-300 leading-relaxed">{result.vptAgeNote}</p>
                </div>
              )}
              {result.medicationFlag && (
                <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/25 rounded-2xl px-4 py-3.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                    <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <p className="text-sm text-amber-300 leading-relaxed">{result.medicationFlag}</p>
                </div>
              )}
            </div>
          )}

          {/* ── ACTIONS ── */}
          <div className="grid md:grid-cols-2 gap-4">
            {user ? (
              <button onClick={() => setShowSaveModal(true)}
                className="flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-sm transition-all hover:-translate-y-0.5 shadow-lg text-black"
                style={{ background: accent, boxShadow: `0 8px 24px ${accent}30` }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Save Case
              </button>
            ) : (
              <button onClick={() => router.push("/login")}
                className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/20 text-gray-400 font-bold py-4 rounded-2xl text-sm transition-all">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Sign In to Save
              </button>
            )}
            <button onClick={exportAsPDF} disabled={isGeneratingPDF}
              className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/15 font-semibold py-4 rounded-2xl text-sm transition-all disabled:opacity-50">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 6v6M5 9l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isGeneratingPDF ? "Generating..." : "Export PDF"}
            </button>
          </div>

          {/* ── RESTORATIVE RECOMMENDATION BUTTON (only when practical) ── */}
          {isPractical && (
            <button onClick={goToRestorative}
              className="w-full flex items-center justify-center gap-3 bg-[#0f6cbd]/20 hover:bg-[#0f6cbd]/35 border border-[#0f6cbd]/40 hover:border-[#0f6cbd] text-[#60a5fa] font-bold py-4 rounded-2xl text-sm transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              View Restorative Recommendation
            </button>
          )}

          <p className="text-center text-xs text-gray-600 leading-relaxed">
            ⚠️ Clinical decision support only. Always apply professional judgment.<br />
            AAE 2013 terminology · Iowa Classification (Krell & Caplan 2018)
          </p>
        </div>

        {/* ── SAVE MODAL ── */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] px-4">
            <div className="bg-[#0d1a30] rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/15">
              <h3 className="text-xl font-bold mb-1" style={{ color: accent }}>Save Case</h3>
              <p className="text-xs text-gray-500 mb-6">
                {isCombined ? "Combined EndoDecide case — prognosis + Iowa classification" : "EndoDecide prognosis case"}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                    Case Name <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={caseName} onChange={e => setCaseName(e.target.value)}
                    className={inputCls} placeholder={`e.g. Ahmed — Tooth ${result.toothNumber ?? ""}`} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                    className={inputCls} placeholder="+966 50 123 4567" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Follow-up Date</label>
                  <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Further Notes</label>
                  <textarea value={furtherNote} onChange={e => setFurtherNote(e.target.value)}
                    className={inputCls + " h-20 resize-y"}
                    placeholder="Clinical observations, follow-up notes..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-3.5 bg-white/8 hover:bg-white/15 rounded-2xl text-sm font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={handleSaveCase}
                  disabled={saving || !caseName.trim() || !phoneNumber.trim()}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  style={{ background: accent }}>
                  {saving
                    ? <><div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />Saving...</>
                    : "Save Case"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-white/8 bg-black/40 py-6 text-center mt-10">
          <p className="text-xs text-gray-600">© 2026 Endoprognosis · All Rights Reserved</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}