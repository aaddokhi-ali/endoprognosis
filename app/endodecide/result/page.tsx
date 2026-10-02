"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import ProtectedRoute from "../../components/protectedroute";
import Navigation from "../../components/navigation";

// ════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ════════════════════════════════════════════════════════════

interface ResultData {
  resultId?: string;
  generatedAt?: string;
  toolType?: string;
  toothNumber?: string;
  toothType?: string;
  gender?: string;
  ageGroup?: string;
  pulpalDiagnosis?: string;
  periapicalDiagnosis?: string;
  treatmentRec?: string;
  casePresText?: string;
  survivalPercentage?: number;
  survivalRange?: [number, number];
  totalDPI?: number;
  tier1Deductions?: number;
  tier2Deductions?: number;
  tier3Deductions?: number;
  procedureCategory?: string;
  affectingFactors?: string[];
  remainingPercent?: number;
  walls?: Record<string, string>;
  occlusal?: string;
  ferrule?: any;
  restorationStatus?: string;
  crownPrepLabel?: string;
  crownAssessmentPending?: boolean;
  formData?: Record<string, any>;
  introParagraph?: string;
  explanationNote?: string;
  isImpracticalOverride?: boolean;
  overrideReason?: string;
  crackPresent?: boolean;
  crackConfirmed?: boolean;
  crackMethods?: Record<string, boolean>;
  vptAgeNote?: string;
  medicationFlag?: string;
  previousAttempts?: string;
  existingObturation?: string;
  restorationQuality?: string;
  postWithoutCrown?: string;
  obturationNarrative?: string;
  deepCount?: number;
}

interface IowaType {
  stage?: string;
  label?: string;
  successRate?: number;
}

const CROWN_PREP_DISPLAY: Record<string, any> = {
  minimal: { label: "Minimal Prep", sublabel: "Enamel/dentin boundary", evidence: "Highest survival potential", hex: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/25", color: "text-emerald-400" },
  moderate: { label: "Moderate Prep", sublabel: "Half coronal structure", evidence: "Moderate crown success", hex: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/25", color: "text-amber-400" },
  severe: { label: "Severe Loss", sublabel: ">50% lost, ferrule present", evidence: "Post and crown required", hex: "#f97316", bg: "bg-orange-500/10", border: "border-orange-500/25", color: "text-orange-400" },
  aggressive: { label: "Post Without Crown", sublabel: "Decoronated tooth", evidence: "25.6% survival — 100% fracture-related", hex: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/25", color: "text-red-400" },
};

const RESTO_LABEL: Record<string, string> = {
  crown: "Crown",
  endocrown: "Endocrown",
  veneer: "Veneer/Inlay",
  onlay: "Onlay",
};

const LEVEL_COLOR: Record<string, string> = {
  normal: "#10b981",
  attachment: "#f59e0b",
  deep: "#ef4444",
};

const LEVEL_LABEL: Record<string, string> = {
  normal: "Normal (<3mm)",
  attachment: "Attachment Loss",
  deep: "Deep ≥5mm",
};

// ════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════

function SurvivalGauge({ value, range, accent }: { value: number; range: [number, number]; accent: string }) {
  const size = 140;
  const r = 55;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a2744" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={accent} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black" style={{ color: accent }}>{value}</span>
        <span className="text-xs text-gray-500 mt-1">%</span>
        <span className="text-[10px] text-gray-600 mt-1">{range[0]}–{range[1]}%</span>
      </div>
    </div>
  );
}

function DPIBar({ value }: { value: number }) {
  const getColor = (v: number) => {
    if (v <= 10) return "#10b981";
    if (v <= 20) return "#f59e0b";
    if (v <= 30) return "#f97316";
    return "#ef4444";
  };
  const color = getColor(value);
  return (
    <div className="w-full">
      <div className="flex items-end gap-1">
        {[10, 20, 30, 40].map(threshold => {
          const active = value >= threshold;
          return (
            <div
              key={threshold}
              className="flex-1 rounded-t transition-all"
              style={{
                height: active ? "48px" : "12px",
                background: active ? color : "#1a2744",
              }}
            />
          );
        })}
      </div>
      <div className="text-center mt-2">
        <p className="text-lg font-black" style={{ color }}>{value}</p>
        <p className="text-[9px] text-gray-600">DPI Score</p>
      </div>
    </div>
  );
}

function IowaGauge({ successRate }: { successRate: number }) {
  const size = 120;
  const r = 45;
  const circ = 2 * Math.PI * r;
  const dash = (successRate / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a2744" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#3b82f6" strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-blue-400">{successRate}%</span>
        <span className="text-[9px] text-gray-600 mt-1">1-yr success</span>
      </div>
    </div>
  );
}

function TierBreakdown({ baseline, t1, t2, t3, t4, isRetreatment }: any) {
  const final = baseline - t1 - t2 - t3 - (t4 || 0);
  return (
    <div className="bg-white/3 rounded-2xl p-4 mb-4 text-sm space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Baseline ({baseline}%)</span>
        <span className="text-white font-bold">{baseline}%</span>
      </div>
      {t1 > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Tier 1 Deduction</span><span className="text-red-400">−{t1}%</span></div>}
      {t2 > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Tier 2 Deduction</span><span className="text-red-400">−{t2}%</span></div>}
      {t3 > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Tier 3 Deduction</span><span className="text-red-400">−{t3}%</span></div>}
      {isRetreatment && t4 > 0 && <div className="flex justify-between text-xs"><span className="text-gray-400">Tier 4 Deduction (Retreatment)</span><span className="text-red-400">−{t4}%</span></div>}
      <div className="border-t border-white/10 pt-2 flex justify-between text-xs font-bold">
        <span className="text-gray-300">Final Survival Estimate</span>
        <span className={final >= 80 ? "text-emerald-400" : final >= 65 ? "text-amber-400" : "text-red-400"}>{final}%</span>
      </div>
    </div>
  );
}

function Panel({ title, accent, children, conditional }: any) {
  if (conditional && !children) return null;
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl px-6 py-5">
      <h2 className="text-base font-bold mb-4" style={{ color: accent }}>{title}</h2>
      {children}
    </div>
  );
}

function InconsistencyAlert({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl px-5 py-4">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
        <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <div className="flex-1">
        <p className="text-sm font-bold text-amber-400 mb-1">Inconsistencies Noted</p>
        <div className="space-y-0.5">
          {notes.map((n, i) => <p key={i} className="text-xs text-amber-300/90">{n}</p>)}
        </div>
      </div>
    </div>
  );
}

function CrownPrepResultCard({ crownPrep }: { crownPrep: string }) {
  const cfg = CROWN_PREP_DISPLAY[crownPrep] || CROWN_PREP_DISPLAY.minimal;
  return (
    <div className={`rounded-2xl p-5 mb-4 border ${cfg.bg} ${cfg.border}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Crown Preparation Assessed</p>
      <p className={`text-lg font-black mb-1 ${cfg.color}`}>{cfg.label}</p>
      <p className="text-sm text-gray-400 mb-1">{cfg.sublabel}</p>
      <p className={`text-xs ${cfg.color}`}>{cfg.evidence}</p>
      {crownPrep === "aggressive" && (
        <p className="text-xs text-red-400 mt-2">⚠ Decoronated tooth — post and crown lengthening required.</p>
      )}
    </div>
  );
}

function RetreatmentSummaryPanel({ result }: { result: ResultData }) {
  return (
    <Panel title="Retreatment History — Tier 4" accent="#0891b2">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/3 rounded-xl p-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Previous Attempts</p>
            <p className="text-sm font-bold text-white">{result.previousAttempts === "first" ? "First Retreatment" : result.previousAttempts === "second" ? "Second Retreatment" : "Third or More"}</p>
          </div>
          <div className="bg-white/3 rounded-xl p-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Existing Obturation</p>
            <p className={`text-sm font-bold ${result.existingObturation === "adequate" ? "text-emerald-400" : "text-amber-400"}`}>
              {result.existingObturation === "adequate" ? "Adequate" : "Inadequate"}
            </p>
          </div>
          <div className="bg-white/3 rounded-xl p-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Restoration Quality</p>
            <p className={`text-sm font-bold ${result.restorationQuality === "good" ? "text-emerald-400" : "text-red-400"}`}>
              {result.restorationQuality === "good" ? "Good" : "Poor"}
            </p>
          </div>
        </div>
        {result.obturationNarrative && (
          <p className="text-xs text-gray-400 italic">{result.obturationNarrative}</p>
        )}
      </div>
    </Panel>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function ResultPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [result, setResult] = useState<ResultData | null>(null);
  const [caseName, setCaseName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [furtherNote, setFurtherNote] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showTierBreakdown, setShowTierBreakdown] = useState(false);

  const isSavingRef = useRef(false);

  // Load result from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lastEndoDecideResult");
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse result:", err);
        router.push("/endodecide");
      }
    } else {
      router.push("/endodecide");
    }
  }, [router]);

  if (!result) return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white">Loading report...</p>
        </div>
      </div>
    </ProtectedRoute>
  );

  // ════════════════════════════════════════════════════════════
  // COMPUTE VALUES
  // ════════════════════════════════════════════════════════════

  const survival = result.survivalPercentage ?? 75;
  const range: [number, number] = result.survivalRange ?? [65, 85];
  const isPractical = (result as any).isPractical ?? (survival >= ((result as any).threshold ?? 65));
  const toothType = result.toothType || "Molar";
  const threshold = (result as any).threshold ?? 65;
  const urgency = (result as any).urgency ?? "low";
  const accent = urgency === "low" ? "#10b981" : urgency === "medium" ? "#f59e0b" : "#ef4444";

  const factors = (result.affectingFactors || []).filter(Boolean);
  const isRetreatmentCase = (result as any).isRetreatmentCase ?? false;
  const tier4Deductions = (result as any).tier4Deductions ?? 0;
  const vrfFlag = (result as any).vrfFlag ?? false;
  const iowa = (result as any).iowa as IowaType | null;
  const iowaCfg = iowa ? {
    bg: iowa.stage === "I" ? "bg-emerald-500/8" : iowa.stage === "II" ? "bg-amber-500/8" : iowa.stage === "III" ? "bg-orange-500/8" : "bg-red-500/8",
    border: iowa.stage === "I" ? "border-emerald-500/30" : iowa.stage === "II" ? "border-amber-500/30" : iowa.stage === "III" ? "border-orange-500/30" : "border-red-500/30",
    color: iowa.stage === "I" ? "text-emerald-400" : iowa.stage === "II" ? "text-amber-400" : iowa.stage === "III" ? "text-orange-400" : "text-red-400",
    label: iowa.stage === "I" ? "Minimal damage" : iowa.stage === "II" ? "Moderate damage" : iowa.stage === "III" ? "Extensive damage" : "Severe damage",
  } : null;

  const sites = (result as any).sites ?? [];
  const inconsistencies = (result as any).inconsistencyNotes ?? [];
  const dpiCfg = { label: result.totalDPI && result.totalDPI > 20 ? "High" : result.totalDPI && result.totalDPI > 10 ? "Moderate" : "Low" };

  const isCombined = !!iowa && result.crackConfirmed;
  const restorationStatus = (result as any).restorationStatus ?? "crown";
  const showRestoLabel = ["endocrown", "veneer", "onlay"].includes(restorationStatus);
  const restorationNote = (result as any).restorationNote;
  const crownAccessible = (result as any).crownAccessible;
  const crownRemoved = (result as any).crownRemoved;
  const crownPrep = (result as any).crownPrep ?? "minimal";
  const showCrownPrep = (result as any).crownAssessmentPending !== true;

  // ════════════════════════════════════════════════════════════
  // SAVE CASE (WITH RADIOGRAPH REDIRECT)
  // ════════════════════════════════════════════════════════════

  const handleSaveCase = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    if (!caseName.trim() || !phoneNumber.trim()) {
      isSavingRef.current = false;
      alert("Please fill in Case Name and Phone Number.");
      return;
    }
    if (!user) {
      isSavingRef.current = false;
      alert("Please log in to save cases.");
      return;
    }
    setSaving(true);

    try {
      // Check for duplicates
      if (result.resultId) {
        const q = query(
          collection(db, "cases"),
          where("userId",   "==", user.uid),
          where("resultId", "==", result.resultId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert("This exact report has already been saved. Check My Cases.");
          return;
        }
      }

      // ✅ CAPTURE THE DOCUMENT REFERENCE & GET CASEID
      const docRef = await addDoc(collection(db, "cases"), {
        type:         "endodecide",
        toolType:     result.toolType ?? "predictor",
        resultId:     result.resultId   ?? null,
        generatedAt:  result.generatedAt ?? null,
        caseName:     caseName.trim(),
        phoneNumber:  phoneNumber.trim(),
        followUpDate: followUpDate || null,
        furtherNote:  furtherNote.trim(),

        toothNumber:  result.toothNumber  ?? "",
        toothType:    result.toothType    ?? "Molar",
        gender:       result.gender       ?? "",
        ageGroup:     result.ageGroup     ?? "",
        asa:          result.formData?.medical ?? "0",

        urgency,
        casePresText: result.casePresText ?? "",

        pulpalDiagnosis:     result.pulpalDiagnosis     ?? "",
        periapicalDiagnosis: result.periapicalDiagnosis ?? "",
        inconsistencyNotes:  inconsistencies,

        survivalEstimate:  survival,
        survivalRange:     range,
        epPoints:          result.totalDPI  ?? 0,
        isPractical,
        threshold,
        treatmentRec:      result.treatmentRec ?? "",
        procedureCategory: result.procedureCategory ?? "",
        affectingFactors:  factors,
        treatmentStatus:   "No Treatment",

        remainingStructure: result.remainingPercent ?? 0,
        walls:              result.walls    ?? {},
        occlusal:           result.occlusal ?? "access_only",
        ferrule:            result.ferrule  ?? {},

        restorationStatus:      restorationStatus,
        restorationNote:        restorationNote        || null,
        crownAccessible:        crownAccessible        || null,
        crownRemoved:           crownRemoved           || null,
        crownPrep:              crownPrep,
        crownPrepLabel:         result.crownPrepLabel         ?? null,
        crownAssessmentPending: result.crownAssessmentPending ?? false,

        periodontalStatus: result.formData?.perio ?? "0",
        sites,
        deepCount:         result.deepCount ?? 0,

        crackPresent:    result.crackPresent    ?? false,
        crackConfirmed:  result.crackConfirmed  ?? false,
        crackMethods:    result.crackMethods    ?? {},
        iowa:            iowa ?? null,
        iowaStage:       iowa?.stage      ?? null,
        iowaSuccessRate: iowa?.successRate ?? null,

        vrfFlag,

        isRetreatmentCase,
        previousAttempts:    result.previousAttempts    ?? null,
        existingObturation:  result.existingObturation  ?? null,
        restorationQuality:  result.restorationQuality  ?? null,
        postWithoutCrown:    result.postWithoutCrown     ?? null,
        tier4Deductions,
        obturationNarrative: result.obturationNarrative ?? null,

        patientInputs:    result.formData ?? {},
        predictionResult: {
          survivalPercentage:  survival,
          survivalRange:       range,
          totalDPI:            result.totalDPI ?? 0,
          tier1:               result.tier1Deductions ?? 0,
          tier2:               result.tier2Deductions ?? 0,
          tier3:               result.tier3Deductions ?? 0,
          tier4:               tier4Deductions,
          affectingFactors:    factors,
          pulpalDiagnosis:     result.pulpalDiagnosis,
          periapicalDiagnosis: result.periapicalDiagnosis,
          iowa,
          vrfFlag,
          isRetreatmentCase,
        },

        userId:    user.uid,
        createdAt: serverTimestamp(),
        savedAt:   new Date().toISOString(),
      });

      // ✅ GET THE CASEID AND REDIRECT TO RADIOGRAPHS PAGE
      const caseId = docRef.id;
      
      // Close modal and clear form
      setShowSaveModal(false);
      setCaseName(""); 
      setPhoneNumber(""); 
      setFollowUpDate(""); 
      setFurtherNote("");

      // ✅ REDIRECT TO RADIOGRAPHS UPLOAD PAGE
      router.push(`/endodecide/radiographs?caseId=${caseId}`);

    } catch (err: any) {
      console.error("Save failed:", err);
      const code = err?.code ? ` (${err.code})` : "";
      alert(`Failed to save case${code}. Please try again — see the browser console for details.`);
    } finally {
      setSaving(false);
      isSavingRef.current = false;
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

      const pdfDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const verdictBg = isPractical ? "#052e16" : "#450a0a";
      const verdictBd = isPractical ? "#10b981" : "#ef4444";
      const verdictCol = isPractical ? "#10b981" : "#ef4444";

      const el = document.createElement("div");
      el.innerHTML = `
        <div style="font-family:system-ui,sans-serif;color:#e2e8f0;background:#0a1428;padding:40px 30px;line-height:1.6;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:32px;font-weight:900;color:#10b981;margin:0;">EndoDecide</h1>
            <p style="color:#64748b;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Clinical Decision Report</p>
            <p style="color:#64748b;font-size:12px;margin-top:4px;">Tooth #${result.toothNumber} · ${result.toothType} · ${pdfDate}</p>
          </div>
          <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;margin-bottom:16px;">
            <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Clinical Summary</p>
            <p style="font-size:13px;line-height:1.8;">${result.introParagraph ?? ""}</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;text-align:center;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">4-Year Survival</p>
              <p style="font-size:48px;font-weight:900;color:${survival >= 80 ? "#10b981" : survival >= 65 ? "#f59e0b" : "#ef4444"};margin:0;">${survival}%</p>
            </div>
            <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:20px;text-align:center;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Verdict</p>
              <p style="font-size:20px;font-weight:900;color:${verdictCol};margin:0;">${isPractical ? "✅ Retain" : "⚠️ Impractical"}</p>
            </div>
          </div>
          <p style="text-align:center;color:#475569;font-size:10px;margin-top:10px;">Generated by Endoprognosis · EndoDecide · ${pdfDate}</p>
        </div>`;

      document.body.appendChild(el);
      await html2pdf().from(el).set({
        margin:      [10, 15, 10, 15],
        filename:    `EndoDecide_Tooth${result.toothNumber}_${new Date().toISOString().slice(0,10)}.pdf`,
        image:       { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#0a1428" },
        jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
      }).save();
      document.body.removeChild(el);
    } catch {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const inputCls = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors";

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white pb-20">

        {/* HERO SECTION */}
        <div className="relative h-[240px] md:h-[280px] overflow-hidden"
          style={{ backgroundImage: "url('https://iili.io/Bw4dt99.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="absolute inset-0" style={{
            background: urgency === "low"
              ? "linear-gradient(to bottom, rgba(6,78,59,0.7), rgba(10,20,40,0.95))"
              : urgency === "medium"
              ? "linear-gradient(to bottom, rgba(120,53,15,0.7), rgba(10,20,40,0.95))"
              : "linear-gradient(to bottom, rgba(127,29,29,0.7), rgba(10,20,40,0.95))"
          }} />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: accent + "99" }}>EndoDecide Report</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: "Playfair Display, serif", background: `linear-gradient(135deg, ${accent}, white, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Clinical Decision Summary
            </h1>
            <p className="text-gray-300 text-sm">
              Tooth <span className="font-bold" style={{ color: accent }}>#{result.toothNumber}</span> · <span className="text-gray-400">{result.toothType}</span>
            </p>
            {isCombined && (
              <div className="flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 text-orange-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mt-3">
                Combined — Prognosis & Iowa
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

          {/* Back button */}
          <button onClick={() => router.push("/endodecide")}
            className="flex items-center gap-2 text-gray-500 hover:text-[#10b981] text-sm transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New case
          </button>

          <InconsistencyAlert notes={inconsistencies} />

          {/* Panel 1: Clinical Summary */}
          <Panel title="Clinical Summary" accent={accent}>
            {result.introParagraph && (
              <p className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: result.introParagraph }} />
            )}
          </Panel>

          {/* Panel 2: Prognosis */}
          <Panel title="Endodontic Prognosis — 4-Year Survival" accent={accent}>
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
            <div className={`rounded-2xl p-5 border-2 mb-4 ${isPractical ? "bg-emerald-500/8 border-emerald-500/40" :"bg-red-500/8 border-red-500/40"}`}>
              <p className={`text-2xl font-black ${isPractical ? "text-emerald-400" : "text-red-400"}`}>
                {isPractical ? "✅ Practical to Retain" : "⚠️ Impractical to Retain"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isPractical
                  ? `Survival (${survival}%) meets the ${threshold}% threshold for ${toothType} retention.`
                  : `Survival (${survival}%) falls below the ${threshold}% threshold for ${toothType} retention.`}
              </p>
              {result.explanationNote && (
                <p className="text-sm text-gray-400 mt-4 pt-4 border-t border-white/8 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: result.explanationNote }} />
              )}
            </div>

            {/* Tier breakdown */}
            <button onClick={() => setShowTierBreakdown(v => !v)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2">
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
                t4={tier4Deductions}
                isRetreatment={isRetreatmentCase}
              />
            )}
          </Panel>

          {/* Panel 3: Diagnosis */}
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
          </Panel>

          {/* Panel 4: Affecting Factors */}
          {factors.length > 0 && (
            <Panel title="Factors Affecting Survivability" accent="#f59e0b">
              <div className="space-y-2">
                {factors.map((factor: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white/3 rounded-xl border border-white/6">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-amber-400" />
                    <p className="text-sm text-gray-300">{factor}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Panel 5: Retreatment */}
          {isRetreatmentCase && <RetreatmentSummaryPanel result={result} />}

          {/* Panel 6: Iowa Classification */}
          {iowa && iowaCfg && result.crackConfirmed && (
            <Panel title="Iowa Classification — Krell & Caplan 2018" accent="#f97316">
              <div className={`${iowaCfg.bg} border-2 ${iowaCfg.border} rounded-2xl p-5 mb-5`}>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Iowa Stage</p>
                    <p className={`text-5xl font-black ${iowaCfg.color}`}>{iowa.stage}</p>
                    <p className={`text-sm font-semibold ${iowaCfg.color} mt-1`}>{iowaCfg.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{iowa.label}</p>
                  </div>
                  <IowaGauge successRate={iowa.successRate ?? 0} />
                </div>
              </div>
            </Panel>
          )}

          {/* Panel 7: VRF */}
          {vrfFlag && (
            <Panel title="Vertical Root Fracture Alert" accent="#ef4444">
              <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-5">
                <p className="text-xl font-black text-red-400 mb-2">⚠️ VRF Cannot Be Excluded</p>
                <p className="text-sm text-gray-300">Previously root canal treated tooth with significant coronal loss. Direct visualization required before treatment.</p>
              </div>
            </Panel>
          )}

          {/* Panel 8: Coronal Structure */}
          {result.walls && (
            <Panel title="Coronal Structure Assessment" accent="#10b981">
              {showCrownPrep && <CrownPrepResultCard crownPrep={crownPrep} />}
              {showRestoLabel && !showCrownPrep && restorationStatus !== "crown" && (
                <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 border mb-4 ${restorationStatus === "endocrown" ? "bg-amber-500/8 border-amber-500/25" : "bg-violet-500/8 border-violet-500/20"}`}>
                  <div>
                    <p className="text-[10px] font-bold mb-0.5" style={{color: restorationStatus === "endocrown" ? "#f59e0b" : "#a78bfa"}}>{RESTO_LABEL[restorationStatus]}</p>
                    {restorationNote && <p className="text-[11px]" style={{color: restorationStatus === "endocrown" ? "#fbbf24" : "#c4b5fd"}}>{restorationNote}</p>}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-black text-[#10b981]">{result.remainingPercent ?? 0}% remaining</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.entries(result.walls) as [string, string][]).map(([wall, state]) => (
                  <div key={wall} className={`rounded-xl p-3 text-center border ${
                    state === "intact"   ? "bg-emerald-500/10 border-emerald-500/25" :
                    state === "moderate" ? "bg-amber-500/10 border-amber-500/25" :
                    "bg-red-500/10 border-red-500/25"
                  }`}>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{wall}</p>
                    <p className={`text-xs font-bold capitalize ${
                      state === "intact" ? "text-emerald-400" : state === "moderate" ? "text-amber-400" : "text-red-400"
                    }`}>{state}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Panel 9: Probing */}
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
            </Panel>
          )}

          {/* Notes */}
          {(result.vptAgeNote || result.medicationFlag) && (
            <div className="space-y-3">
              {result.vptAgeNote && (
                <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/25 rounded-2xl px-4 py-3.5">
                  <p className="text-sm text-emerald-300">{result.vptAgeNote}</p>
                </div>
              )}
              {result.medicationFlag && (
                <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/25 rounded-2xl px-4 py-3.5">
                  <p className="text-sm text-amber-300">{result.medicationFlag}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
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
                Sign In to Save
              </button>
            )}
            <button onClick={exportAsPDF} disabled={isGeneratingPDF}
              className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/15 font-semibold py-4 rounded-2xl text-sm transition-all disabled:opacity-50">
              {isGeneratingPDF ? "Generating..." : "Export PDF"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-600 leading-relaxed">
            ⚠️ Clinical decision support only. Always apply professional judgment.
          </p>
        </div>

        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] px-4">
            <div className="bg-[#0d1a30] rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/15">
              <h3 className="text-xl font-bold mb-1" style={{ color: accent }}>Save Case</h3>
              <p className="text-xs text-gray-500 mb-6">EndoDecide prognosis case</p>
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
                    : "Save & Upload Radiographs"}
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