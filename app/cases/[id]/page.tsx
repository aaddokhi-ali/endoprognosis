// app/cases/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import Navigation from "../../components/navigation";
import ProtectedRoute from "../../components/protectedroute";
import {
  calculateProfitForCase,
  getProcedureDisplayName,
  isImpracticalCase,
} from "../../utils/profitCalculator";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
interface CaseData {
  id: string;
  caseName: string;
  phoneNumber?: string;
  gender?: string;
  ageGroup?: string;
  asa?: string;
  toothNumber: string;
  toothType: string;
  // Diagnosis
  pulpalDiagnosis?: string;
  periapicalDiagnosis?: string;
  periodontalStatus?: string;
  // Structure
  remainingPercent?: number;
  remainingToothStructure?: string;
  walls?: Record<string, string>;
  ferrule?: { label: string; wallsWithFerrule: number };
  // Prognosis
  survivalEstimate?: number;
  survivalRange?: [number, number];
  isPractical?: boolean;
  epPoints?: number;
  threshold?: number;
  affectingFactors?: string[];
  // Treatment
  treatmentRec?: string;
  treatmentStatus: string;
  followUpDate?: string | null;
  furtherNote?: string;
  // Case type
  type?: string;
  toolType?: string;
  urgency?: "low" | "medium" | "high";
  casePresText?: string;
  // Crack / Iowa
  crackConfirmed?: boolean;
  crackPresent?: boolean;
  crackMethods?: Record<string, boolean>;
  iowa?: { stage: string; successRate: number; label: string } | null;
  iowaStage?: string;
  iowaSuccessRate?: number;
  vrfFlag?: boolean;
  isVRF?: boolean;
  // Probing
  sites?: Array<{ id: string; label: string; short: string; level: string }>;
  deepCount?: number;
  // Profit
  actualProcedure?: string;
  revenue?: number;
  cost?: number;
  profit?: number;
  feeMultiplier?: number;
  profitStatus?: "full" | "in-progress";
  // Flags
  vptAgeNote?: string;
  medicationFlag?: string;
  inconsistencyNotes?: string[];
  [key: string]: any;
}

// ════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════
const URGENCY_ACCENT: Record<string, string> = {
  low:    "#10b981",
  medium: "#f59e0b",
  high:   "#ef4444",
};

const LEVEL_COLOR: Record<string, string> = {
  normal:     "#10b981",
  attachment: "#f59e0b",
  deep:       "#ef4444",
};
const LEVEL_LABEL: Record<string, string> = {
  normal:     "Normal (<3mm)",
  attachment: "Attachment loss (3–4mm)",
  deep:       "Deep (≥5mm)",
};

const IOWA_COLOR: Record<string, string> = {
  I:   "#10b981",
  II:  "#f59e0b",
  III: "#f97316",
  IV:  "#ef4444",
};

function survivalColor(v?: number): string {
  if (!v) return "text-gray-500";
  if (v >= 80) return "text-emerald-400";
  if (v >= 65) return "text-amber-400";
  return "text-red-400";
}

// ════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════════════════════════
function InfoRow({ label, value, accent }: {
  label: string; value?: string | null; accent?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold" style={{ color: accent ?? "white" }}>
        {value || <span className="text-gray-600 font-normal italic">Not recorded</span>}
      </p>
    </div>
  );
}

function SectionCard({ title, accent, children }: {
  title: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function CaseDetailPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const { user } = useAuth();

  const [caseData, setCaseData]           = useState<CaseData | null>(null);
  const [profitSettings, setProfitSettings] = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  // Edit states
  const [treatmentStatus, setTreatmentStatus]               = useState("");
  const [followUpDate, setFollowUpDate]                     = useState("");
  const [furtherNote, setFurtherNote]                       = useState("");
  const [actualProcedureOverride, setActualProcedureOverride] = useState("");
  const [profitResult, setProfitResult]                     = useState<any>(null);

  useEffect(() => {
    if (!user || !id) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "cases", id as string));
        if (!snap.exists()) { alert("Case not found"); router.push("/mycases"); return; }
        const data = snap.data() as CaseData;
        setCaseData({ ...data, id: snap.id });
        setTreatmentStatus(data.treatmentStatus || "No Treatment");
        setFollowUpDate(data.followUpDate || "");
        setFurtherNote(data.furtherNote || "");
        setActualProcedureOverride(data.actualProcedure || "");

        const settingsSnap = await getDoc(doc(db, "users", user.uid, "settings", "profitSettings"));
        if (settingsSnap.exists()) setProfitSettings(settingsSnap.data());
      } catch (err) {
        console.error(err);
        alert("Failed to load case details");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, user, router]);

  // Re-calculate profit when inputs change
  useEffect(() => {
    if (!caseData || !profitSettings) return;
    const result = calculateProfitForCase(
      caseData.treatmentRec || "",
      caseData.toothType || "",
      actualProcedureOverride || null,
      treatmentStatus,
      profitSettings,
      caseData.isPractical ?? true
    );
    setProfitResult(result);
  }, [treatmentStatus, actualProcedureOverride, caseData, profitSettings]);

  const handleSave = async () => {
    if (!caseData || !user) return;
    setSaving(true);
    try {
      const updateData: any = {
        treatmentStatus,
        followUpDate: followUpDate || null,
        furtherNote:  furtherNote.trim(),
        updatedAt:    serverTimestamp(),
      };
      if (profitResult) {
        updateData.actualProcedure = profitResult.actualProcedure;
        updateData.revenue         = profitResult.revenue;
        updateData.cost            = profitResult.cost;
        updateData.profit          = profitResult.profit;
        updateData.feeMultiplier   = profitResult.feeMultiplier;
        updateData.profitStatus    = profitResult.profitStatus;
        if (treatmentStatus === "Done" || treatmentStatus === "In-Progress") {
          updateData.completedAt = serverTimestamp();
        }
      }
      await updateDoc(doc(db, "cases", caseData.id), updateData);
      router.push("/mycases");
    } catch (err) {
      console.error(err);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / not found ──
  if (loading) return (
    <ProtectedRoute><Navigation />
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#10b981]/30 border-t-[#10b981] animate-spin" />
      </div>
    </ProtectedRoute>
  );

  if (!caseData) return (
    <ProtectedRoute><Navigation />
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <p className="text-red-400">Case not found.</p>
      </div>
    </ProtectedRoute>
  );

  // ── Derived values ──
  const isEndo   = caseData.type === "endodecide";
  const isCrack  = caseData.type === "crack-classifier";
  const isLegacy = caseData.type === "predictor";
  const isCombined = isEndo && caseData.crackConfirmed;

  const urgency     = caseData.urgency ?? "low";
  const accent      = isEndo ? URGENCY_ACCENT[urgency] : "#10b981";
  const survival    = caseData.survivalEstimate;
  const survColor   = survivalColor(survival);
  const iowa        = caseData.iowa ?? (caseData.iowaStage ? { stage: caseData.iowaStage, successRate: caseData.iowaSuccessRate ?? 0, label: "" } : null);
  const vrfFlag     = caseData.vrfFlag || caseData.isVRF;
  const isImpractical = isImpracticalCase(caseData.treatmentRec || "", caseData.isPractical ?? true);

  const sel = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors";

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white pb-20">

        {/* ── HERO ── */}
        <div className="border-b border-white/8 bg-[#0d1a30]/80 backdrop-blur-sm px-4 sm:px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <button onClick={() => router.push("/mycases")}
              className="flex items-center gap-2 text-gray-500 hover:text-[#10b981] text-sm transition-colors mb-5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Back to My Cases
            </button>

            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-2xl font-bold text-white">{caseData.caseName}</h1>

                  {/* Type badge */}
                  {isEndo && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                      style={{ background: accent + "15", borderColor: accent + "40", color: accent }}>
                      EndoDecide{isCombined ? " · Combined" : ""}
                    </span>
                  )}
                  {isCrack && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400">
                      🦷 Crack Classifier
                    </span>
                  )}
                  {isLegacy && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-gray-500">
                      Legacy Predictor
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm flex items-center gap-3 flex-wrap">
                  <span>🦷 Tooth #{caseData.toothNumber} · {caseData.toothType}</span>
                  {caseData.phoneNumber && <span>📞 {caseData.phoneNumber}</span>}
                  {caseData.gender && <span>{caseData.gender === "Male" ? "♂" : "♀"} {caseData.ageGroup || ""}</span>}
                  {isEndo && caseData.casePresText && (
                    <span className="font-semibold" style={{ color: accent }}>{caseData.casePresText}</span>
                  )}
                </p>
              </div>

              {/* Survival badge */}
              {survival !== undefined && !isCrack && (
                <div className="text-right">
                  <p className={`text-3xl font-black ${survColor}`}>{survival}%</p>
                  {caseData.survivalRange && (
                    <p className="text-[10px] text-gray-600">range {caseData.survivalRange[0]}–{caseData.survivalRange[1]}%</p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-0.5">4-year survival</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

          {/* ── INCONSISTENCY ALERTS ── */}
          {caseData.inconsistencyNotes && caseData.inconsistencyNotes.length > 0 && (
            <div className="space-y-2">
              {caseData.inconsistencyNotes.map((note: string, i: number) => (
                <div key={i} className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/25 rounded-2xl px-4 py-3.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                    <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <p className="text-xs text-amber-300 leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── VERDICT (non-crack cases) ── */}
          {!isCrack && caseData.isPractical !== undefined && (
            <div className={`rounded-2xl p-5 border-2 ${
              caseData.isPractical
                ? "bg-emerald-500/8 border-emerald-500/40"
                : "bg-red-500/8 border-red-500/40"
            }`}>
              <p className={`text-xl font-black ${caseData.isPractical ? "text-emerald-400" : "text-red-400"}`}>
                {caseData.isPractical ? "✅ Practical to Retain" : "⚠️ Impractical to Retain"}
              </p>
              {survival !== undefined && caseData.threshold && (
                <p className="text-sm text-gray-500 mt-1">
                  Survival {survival}% · Threshold {caseData.threshold}% for {caseData.toothType}
                </p>
              )}
              {caseData.treatmentRec && caseData.isPractical && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/8">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-sm font-bold" style={{ color: accent }}>{caseData.treatmentRec}</p>
                </div>
              )}
            </div>
          )}

          {/* ── DIAGNOSIS (EndoDecide + legacy predictor) ── */}
          {!isCrack && (caseData.pulpalDiagnosis || caseData.periapicalDiagnosis) && (
            <SectionCard title={isEndo ? "Working Diagnosis — AAE 2013" : "Clinical Diagnosis"} accent="#3b82f6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/4 rounded-2xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Pulpal Diagnosis</p>
                  <p className="text-sm font-bold text-white">{caseData.pulpalDiagnosis || "—"}</p>
                </div>
                <div className="bg-white/4 rounded-2xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Periapical Diagnosis</p>
                  <p className="text-sm font-bold text-white">{caseData.periapicalDiagnosis || "—"}</p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── PATIENT & CLINICAL INFO ── */}
          <SectionCard title="Clinical Information" accent={accent}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <InfoRow label="Gender" value={caseData.gender} />
              <InfoRow label="Age Group" value={caseData.ageGroup} />
              <InfoRow label="ASA" value={caseData.asa ? `ASA ${caseData.asa}` : undefined} />
              <InfoRow label="Periodontal Status" value={caseData.periodontalStatus} />
              {survival !== undefined && (
                <InfoRow label="4-Year Survival"
                  value={caseData.survivalRange
                    ? `${survival}% (${caseData.survivalRange[0]}–${caseData.survivalRange[1]}%)`
                    : `${survival}%`}
                  accent={survivalColor(survival).replace("text-","")} />
              )}
              {caseData.epPoints !== undefined && (
                <InfoRow label="EP Points (DPI)" value={`${caseData.epPoints} pts`} />
              )}
              {caseData.remainingPercent !== undefined && (
                <InfoRow label="Remaining Structure" value={`${caseData.remainingPercent}%`} accent="#10b981" />
              )}
            </div>

            {/* Wall states */}
            {caseData.walls && Object.keys(caseData.walls).length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Coronal Walls</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(Object.entries(caseData.walls) as [string, string][]).map(([wall, state]) => (
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
                {caseData.ferrule?.label && (
                  <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                    (caseData.ferrule.wallsWithFerrule ?? 0) >= 4
                      ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
                      : (caseData.ferrule.wallsWithFerrule ?? 0) >= 3
                      ? "bg-amber-500/8 border-amber-500/20 text-amber-400"
                      : "bg-red-500/8 border-red-500/20 text-red-400"
                  }`}>
                    <span>⬡</span>
                    <span>{caseData.ferrule.label}</span>
                  </div>
                )}
              </div>
            )}

            {/* Affecting factors */}
            {caseData.affectingFactors && caseData.affectingFactors.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Affecting Factors</p>
                <div className="flex flex-wrap gap-2">
                  {caseData.affectingFactors.map((f, i) => (
                    <span key={i} className="text-[10px] bg-white/5 border border-white/8 px-2.5 py-1 rounded-full text-gray-400">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── PROBING MAP ── */}
          {caseData.sites && caseData.sites.length > 0 && (
            <SectionCard title="Periodontal Probing Map" accent="#3b82f6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {caseData.sites.map((s: any) => {
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
              {(caseData.deepCount ?? 0) >= 1 && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <p className="text-xs text-red-400 font-semibold">
                    {caseData.deepCount} deep pocket{caseData.deepCount! > 1 ? "s" : ""} (≥5mm)
                  </p>
                </div>
              )}
            </SectionCard>
          )}

          {/* ── IOWA CLASSIFICATION (conditional) ── */}
          {iowa && (
            <SectionCard title="Iowa Classification — Krell & Caplan 2018" accent="#f97316">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Stage</p>
                  <p className="text-4xl font-black" style={{ color: IOWA_COLOR[iowa.stage] ?? "#f97316" }}>
                    {iowa.stage}
                  </p>
                  {iowa.label && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{iowa.label}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">1-Year Success</p>
                  <p className="text-3xl font-black" style={{ color: IOWA_COLOR[iowa.stage] ?? "#f97316" }}>
                    {iowa.successRate}%
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Reported independently of EPP survival</p>
                </div>
              </div>

              {/* Crack confirmation methods */}
              {caseData.crackMethods && (
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { key: "transillum", icon: "💡", label: "Transillumination" },
                    { key: "methBlue",   icon: "🔵", label: "Methylene Blue" },
                    { key: "direct",     icon: "🔬", label: "Direct Visualization" },
                  ].map(m => {
                    const used = caseData.crackMethods?.[m.key];
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
              )}
            </SectionCard>
          )}

          {/* ── VRF FLAG (conditional) ── */}
          {vrfFlag && (
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-3xl p-5">
              <p className="text-lg font-black text-red-400 mb-2">⚠️ VRF Cannot Be Excluded</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Previously root canal treated tooth with deep periodontal pocket or sinus tract and significant
                coronal structure loss. Direct visualization required before committing to any treatment plan.
                VRF cannot be confirmed without intraoperative examination.
              </p>
            </div>
          )}

          {/* ── IMPRACTICAL WARNING ── */}
          {isImpractical && (
            <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/25 rounded-2xl px-4 py-3.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-400 flex-shrink-0 mt-0.5">
                <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <p className="text-sm text-red-300 leading-relaxed">
                This case was marked as impractical to retain. No automatic treatment recommendation was generated.
                Select the actual procedure performed manually below.
              </p>
            </div>
          )}

          {/* ── CONTEXTUAL NOTES ── */}
          {(caseData.vptAgeNote || caseData.medicationFlag) && (
            <div className="space-y-3">
              {caseData.vptAgeNote && (
                <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/25 rounded-2xl px-4 py-3.5">
                  <p className="text-sm text-emerald-300 leading-relaxed">{caseData.vptAgeNote}</p>
                </div>
              )}
              {caseData.medicationFlag && (
                <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/25 rounded-2xl px-4 py-3.5">
                  <p className="text-sm text-amber-300 leading-relaxed">{caseData.medicationFlag}</p>
                </div>
              )}
            </div>
          )}

          {/* ── EDIT SECTION ── */}
          <SectionCard title="Update Case" accent={accent}>

            {/* Treatment status + follow-up */}
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Treatment Status</label>
                <select value={treatmentStatus} onChange={e => setTreatmentStatus(e.target.value)} className={sel}>
                  <option value="No Treatment">No Treatment</option>
                  <option value="In-Progress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="Postpone">Postpone</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Follow-up Date</label>
                <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                  className={sel} />
              </div>
            </div>

            {/* Profit calculation — only when status is Done or In-Progress */}
            {(treatmentStatus === "Done" || treatmentStatus === "In-Progress") && profitSettings && (
              <div className="bg-[#0a1428] border border-white/8 rounded-2xl p-5 mb-5">
                <p className="text-[10px] text-[#10b981]/60 uppercase tracking-widest font-semibold mb-4">
                  Profit Calculation
                </p>

                {profitResult ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Procedure</p>
                        <p className="text-base font-bold text-white">{profitResult.procedureName}</p>
                        {profitResult.isAutoDetected && (
                          <p className="text-[10px] text-emerald-400 mt-1">✓ Auto-detected from treatment recommendation</p>
                        )}
                        {profitResult.requiresManualSelection && (
                          <p className="text-[10px] text-amber-400 mt-1">⚠ Manual selection required</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Net Profit</p>
                        <p className="text-3xl font-black text-emerald-400">
                          +{profitResult.profit} {profitSettings.currency}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {profitResult.feeMultiplier === 0.5 ? "50% — In Progress" : "Full amount — Done"}
                        </p>
                      </div>
                    </div>

                    {/* Procedure override */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                        Override Procedure {profitResult.requiresManualSelection && <span className="text-red-400">*</span>}
                      </label>
                      <select value={actualProcedureOverride} onChange={e => setActualProcedureOverride(e.target.value)}
                        className={sel}>
                        <option value="">Use auto-detected</option>
                        <option value="rct-anterior">Root Canal Treatment — Anterior</option>
                        <option value="rct-premolar">Root Canal Treatment — Premolar</option>
                        <option value="rct-molar">Root Canal Treatment — Molar</option>
                        <option value="retreat-anterior">Root Canal Retreatment — Anterior</option>
                        <option value="retreat-premolar">Root Canal Retreatment — Premolar</option>
                        <option value="retreat-molar">Root Canal Retreatment — Molar</option>
                        <option value="vpt">Vital Pulp Therapy</option>
                        <option value="apico">Endodontic Microsurgery (Apicoectomy)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-amber-400 text-sm">Could not calculate profit automatically. Select a procedure above.</p>
                )}
              </div>
            )}

            {/* Further notes */}
            <div className="mb-5">
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Further Clinical Notes</label>
              <textarea value={furtherNote} onChange={e => setFurtherNote(e.target.value)}
                className={sel + " h-28 resize-y"}
                placeholder="Clinical observations, complications, patient feedback..." />
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 font-bold py-4 rounded-2xl text-sm transition-all hover:-translate-y-0.5 shadow-lg disabled:opacity-50 disabled:transform-none text-black"
                style={{ background: accent, boxShadow: `0 8px 24px ${accent}30` }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => router.push("/mycases")}
                className="flex-1 bg-white/8 hover:bg-white/15 border border-white/10 py-4 rounded-2xl text-sm font-semibold transition-all">
                Cancel
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </ProtectedRoute>
  );
}