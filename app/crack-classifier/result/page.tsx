// app/crack-classifier/result/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navigation from "../../components/navigation";
import ProtectedRoute from "../../components/protectedroute";

// ── STAGE CONFIG ──
const STAGE_CONFIG: Record<string, {
  color: string; bg: string; border: string;
  description: string; emoji: string;
}> = {
  I:   { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25",
         description: "Crack within crown, no ridge involvement",       emoji: "🟢" },
  II:  { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25",
         description: "Extension to distal marginal ridge",             emoji: "🟡" },
  III: { color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/25",
         description: "Extension with pulpal/periapical involvement",   emoji: "🟠" },
  IV:  { color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/25",
         description: "Extension into periodontium (deep pocket)",      emoji: "🔴" },
  V:   { color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/25",
         description: "Complete split tooth — non-restorable",          emoji: "⛔" },
};

const VRF_CONFIG: Record<string, { color: string; bg: string; border: string; title: string }> = {
  low:       { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25",
               title: "Low VRF Suspicion" },
  suspected: { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25",
               title: "VRF Suspected" },
  high:      { color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/25",
               title: "VRF Highly Probable" },
};

const LEVEL_COLOR: Record<string, string> = {
  normal: "#10b981", attachment: "#f59e0b", deep: "#ef4444",
};
const LEVEL_LABEL: Record<string, string> = {
  normal: "Normal",  attachment: "Attachment loss", deep: "Deep ≥5mm",
};

// ── SUCCESS RATE GAUGE ──
function SuccessGauge({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : value >= 40 ? "#f97316" : "#ef4444";
  const r = 44, circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ * 0.75;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ}`}
            strokeDashoffset={0} strokeLinecap="round" transform="rotate(-225 60 60)" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color}
            strokeWidth="8" strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={0} strokeLinecap="round" transform="rotate(-225 60 60)"
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{value}%</span>
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">success</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center mt-2 max-w-[120px]">{label}</p>
    </div>
  );
}

// ── FACTOR ROW ──
function FactorRow({ factor, index }: { factor: string; index: number }) {
  const isHigh = factor.toLowerCase().includes("deep") || factor.toLowerCase().includes("j-shaped") ||
    factor.toLowerCase().includes("apico") || factor.toLowerCase().includes("split");
  const isMed  = factor.toLowerCase().includes("swelling") || factor.toLowerCase().includes("sinus") ||
    factor.toLowerCase().includes("percussion") || factor.toLowerCase().includes("periapical");
  const dot    = isHigh ? "bg-red-500" : isMed ? "bg-amber-500" : "bg-blue-400";
  const badge  = isHigh ? "bg-red-500/15 text-red-400" : isMed ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400";
  const weight = isHigh ? "High impact" : isMed ? "Moderate" : "Contributing";
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/3 rounded-xl border border-white/6">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <p className="text-sm text-gray-300 flex-1">{factor}</p>
      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${badge}`}>
        {weight}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function CrackClassifierResult() {
  const [result, setResult]             = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [caseName, setCaseName]         = useState("");
  const [phoneNumber, setPhoneNumber]   = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [furtherNote, setFurtherNote]   = useState("");
  const [saving, setSaving]             = useState(false);
  const [saveSuccess, setSaveSuccess]   = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { user } = useAuth();
  const router   = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem("lastCrackResult");
    if (raw) {
      try { setResult(JSON.parse(raw)); }
      catch { router.push("/crack-classifier"); }
    } else {
      router.push("/crack-classifier");
    }
  }, [router]);

  if (!result) return (
    <ProtectedRoute><Navigation />
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#10b981]/30 border-t-[#10b981] animate-spin" />
      </div>
    </ProtectedRoute>
  );

  const iowa       = result.iowa;
  const isVRF      = result.isVRF;
  const vrfLevel   = result.vrfLevel ?? "low";
  const vrfCfg     = VRF_CONFIG[vrfLevel];
  const stageCfg   = iowa ? STAGE_CONFIG[iowa.stage] : null;
  const factors    = result.affectingFactors ?? [];
  const sites      = result.sites ?? [];
  const treatRec   = result.treatmentRec ?? "";
  const isPractical = isVRF
    ? (vrfLevel !== "high")
    : iowa ? (iowa.canRetain && iowa.successRate >= 50) : true;

  // ── SAVE ──
  const handleSaveCase = async () => {
    if (!caseName.trim() || !phoneNumber.trim()) {
      alert("Please fill in Case Name and Phone Number.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      // Duplicate check
      const q = query(collection(db, "cases"),
        where("userId",      "==", user!.uid),
        where("toothNumber", "==", result.toothNumber),
        where("type",        "==", "crack-classifier")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const d of snap.docs) {
          const ex = d.data();
          if (ex.iowaStage === (iowa?.stage ?? "") && ex.isVRF === isVRF) {
            alert("This case was already saved. Check My Cases.");
            setSaving(false);
            return;
          }
        }
      }

      await addDoc(collection(db, "cases"), {
        // ── Identity ──
        caseName:       caseName.trim(),
        phoneNumber:    phoneNumber.trim(),
        furtherNote:    furtherNote.trim(),
        followUpDate:   followUpDate || null,
        type:           "crack-classifier",

        // ── My Cases compatibility ──
        toothNumber:    result.toothNumber || "",
        toothType:      result.toothType   || "Molar",
        treatmentStatus:"No Treatment",
        treatmentRec:   treatRec,
        isPractical:    isPractical,
        survivalEstimate: iowa?.successRate ?? (isVRF && vrfLevel === "high" ? 20 : null),
        affectingFactors: factors,

        // ── Crack specific ──
        classification: isVRF ? `VRF — ${vrfCfg.title}` : `COF — Iowa Stage ${iowa?.stage ?? ""}`,
        iowaStage:      iowa?.stage  ?? "",
        isVRF:          isVRF,
        vrfLevel:       vrfLevel,
        vrfScore:       result.vrfScore ?? 0,
        deepCount:      result.deepCount ?? 0,

        // ── Full data ──
        patientInputs: {
          ...result.formData,
          sites: sites,
          deepCount: result.deepCount,
        },
        predictionResult: {
          iowa, isVRF, vrfLevel, vrfScore: result.vrfScore,
          treatmentRec: treatRec, affectingFactors: factors,
        },

        userId:    user!.uid,
        createdAt: serverTimestamp(),
        savedAt:   new Date().toISOString(),
      });

      setSaveSuccess(true);
      setShowSaveModal(false);
      setCaseName(""); setPhoneNumber(""); setFurtherNote(""); setFollowUpDate("");
      localStorage.removeItem("lastCrackResult");
    } catch (err) {
      alert("Failed to save case. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── PDF ──
  const exportAsPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const stageStr   = iowa ? `Iowa Stage ${iowa.stage} — ${iowa.label}` : "";
      const vrfStr     = isVRF ? vrfCfg.title : "";
      const factorRows = factors.map((f: string) =>
        `<li style="padding:6px 0;border-bottom:1px solid #1e293b;font-size:13px;">• ${f}</li>`
      ).join("");
      const siteRows = sites.map((s: any) =>
        `<li style="padding:5px 0;border-bottom:1px solid #1e293b;font-size:12px;">
          <span style="color:${LEVEL_COLOR[s.level]};font-weight:700">${s.label}:</span> ${LEVEL_LABEL[s.level]}
        </li>`
      ).join("");
      const el = document.createElement("div");
      el.innerHTML = [
        '<div style="font-family:system-ui,sans-serif;color:#e2e8f0;background:#0a1428;padding:40px;line-height:1.6;">',
        '<div style="text-align:center;margin-bottom:28px;">',
        '<h1 style="color:#10b981;font-size:26px;margin:0;">Crack Tooth Classification Report</h1>',
        '<p style="color:#64748b;font-size:13px;margin-top:6px;">Tooth #' + result.toothNumber + ' · ' + result.toothType + ' · ' + new Date().toLocaleDateString("en-GB") + '</p>',
        '</div>',
        '<div style="background:' + (isVRF ? '#450a0a' : '#081a10') + ';border:2px solid ' + (isVRF ? '#ef4444' : '#10b981') + ';border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">',
        '<p style="font-size:20px;font-weight:900;color:' + (isVRF ? '#ef4444' : '#10b981') + ';margin:0;">' + (isVRF ? vrfStr : stageStr) + '</p>',
        iowa ? '<p style="color:#94a3b8;font-size:13px;margin-top:8px;">1-year success rate: ' + iowa.successRate + '% · ' + (iowa.canRetain ? "Retain" : "Extract") + '</p>' : '',
        '</div>',
        '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:20px;margin-bottom:24px;">',
        '<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Treatment Recommendation</p>',
        '<p style="font-size:14px;color:#10b981;font-weight:600;">' + treatRec + '</p>',
        '</div>',
        factors.length ? '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:20px;margin-bottom:24px;"><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Key Findings</p><ul style="list-style:none;padding:0;margin:0;">' + factorRows + '</ul></div>' : '',
        sites.length ? '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:20px;margin-bottom:24px;"><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Probing Depths</p><ul style="list-style:none;padding:0;margin:0;">' + siteRows + '</ul></div>' : '',
        '<p style="text-align:center;color:#ef4444;font-size:12px;margin-top:24px;">Clinical decision support only — always apply professional judgment.</p>',
        '<p style="text-align:center;color:#475569;font-size:11px;margin-top:8px;">Endoprognosis · ' + new Date().getFullYear() + '</p>',
        '</div>',
      ].join("\n");
      document.body.appendChild(el);
      await html2pdf().from(el).set({
        margin: [10,15,10,15] as [number,number,number,number],
        filename: `CrackClassifier_Tooth${result.toothNumber}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#0a1428" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      }).save();
      document.body.removeChild(el);
    } catch { alert("Failed to generate PDF."); }
    finally { setIsGeneratingPDF(false); }
  };

  const inputCls = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors";

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white pb-20">

        {/* ── HERO ── */}
        <div className="relative h-[240px] md:h-[280px] overflow-hidden"
          style={{ backgroundImage: "url('https://iili.io/BwkLI0N.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0a1428]" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-[11px] tracking-[4px] text-[#10b981]/70 uppercase mb-2">Classification Result</p>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#10b981] via-white to-[#10b981] bg-clip-text text-transparent mb-2"
              style={{ fontFamily: "Playfair Display, serif" }}>
              Crack Tooth Report
            </h1>
            <p className="text-gray-300 text-sm">
              Tooth <span className="text-[#10b981] font-bold">#{result.toothNumber}</span>
              {" · "}<span className="text-gray-400">{result.toothType}</span>
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

          {/* ── BACK ── */}
          <button onClick={() => router.push("/crack-classifier")}
            className="flex items-center gap-2 text-gray-500 hover:text-[#10b981] text-sm transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New crack case
          </button>

          {/* ── SAVE SUCCESS ── */}
          {saveSuccess && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-2xl text-sm font-medium">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Case saved — view it in My Cases.
            </div>
          )}

          {/* ── MAIN VERDICT ── */}
          {isVRF ? (
            <div className={`${vrfCfg.bg} border-2 ${vrfCfg.border} rounded-3xl p-6 md:p-8`}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Fracture Type</p>
                  <h2 className={`text-2xl md:text-3xl font-black ${vrfCfg.color} mb-1`}>
                    Vertical Root Fracture (VRF)
                  </h2>
                  <p className={`text-sm ${vrfCfg.color} font-semibold`}>{vrfCfg.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">VRF Score</p>
                  <p className={`text-4xl font-black ${vrfCfg.color}`}>{result.vrfScore}<span className="text-sm text-gray-600">/13</span></p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${((result.vrfScore ?? 0) / 13) * 100}%`, background: vrfLevel === "high" ? "#ef4444" : vrfLevel === "suspected" ? "#f59e0b" : "#10b981" }} />
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Note: CBCT has limited reliability in detecting VRF. Confirmation via exploratory surgery or clinical monitoring is recommended.
              </p>
            </div>
          ) : iowa && stageCfg ? (
            <div className={`${stageCfg.bg} border-2 ${stageCfg.border} rounded-3xl p-6 md:p-8`}>
              <div className="flex items-start justify-between flex-wrap gap-6">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Iowa Classification (Krell & Caplan)</p>
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2 className={`text-4xl md:text-5xl font-black ${stageCfg.color}`}>Stage {iowa.stage}</h2>
                    <span className="text-lg font-semibold text-gray-400">{stageCfg.emoji}</span>
                  </div>
                  <p className={`text-sm font-semibold ${stageCfg.color} mb-2`}>{iowa.label}</p>
                  <p className="text-xs text-gray-500">{stageCfg.description}</p>
                </div>
                {iowa.successRate > 0 && (
                  <SuccessGauge value={iowa.successRate} label="1-year success rate with treatment" />
                )}
              </div>

              {/* Retain / Extract badge */}
              <div className="mt-4 flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  iowa.canRetain
                    ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
                    : "bg-red-500/15 border-red-500/25 text-red-400"
                }`}>
                  {iowa.canRetain ? "✅ Tooth can be retained" : "⛔ Extraction indicated"}
                </span>
                {iowa.stage === "V" && (
                  <span className="text-xs text-red-400 font-medium">Split tooth — complete fracture</span>
                )}
              </div>
            </div>
          ) : null}

          {/* ── TREATMENT RECOMMENDATION ── */}
          {treatRec && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Treatment Recommendation</p>
              <div className="flex items-start gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#10b981] flex-shrink-0 mt-0.5">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p className="text-sm font-semibold text-[#10b981] leading-relaxed">{treatRec}</p>
              </div>
            </div>
          )}

          {/* ── SUCCESS RATE CONTEXT (Iowa only) ── */}
          {!isVRF && iowa && iowa.successRate > 0 && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Prognosis Context</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { stage: "I",   rate: 93, label: "Stage I" },
                  { stage: "II",  rate: 84, label: "Stage II" },
                  { stage: "III", rate: 69, label: "Stage III" },
                  { stage: "IV",  rate: 41, label: "Stage IV" },
                  { stage: "V",   rate: 0,  label: "Stage V" },
                ].map(s => {
                  const isCurrent = s.stage === iowa.stage;
                  const color = s.rate >= 80 ? "#10b981" : s.rate >= 60 ? "#f59e0b" : s.rate >= 40 ? "#f97316" : "#ef4444";
                  return (
                    <div key={s.stage} className={`rounded-xl p-3 text-center border transition-all ${
                      isCurrent ? "border-white/30 bg-white/8 scale-105" : "border-white/5 bg-white/3"
                    }`}>
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-lg font-black" style={{ color }}>
                        {s.rate > 0 ? s.rate + "%" : "⛔"}
                      </p>
                      {isCurrent && <p className="text-[8px] text-white/50 mt-0.5">← current</p>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
                Success rates from Krell & Caplan Iowa Classification system. Rates represent 1-year outcomes with appropriate treatment.
              </p>
            </div>
          )}

          {/* ── KEY FINDINGS ── */}
          {factors.length > 0 && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Key Findings That Drove Classification</p>
              <div className="space-y-2">
                {factors.map((f: string, i: number) => <FactorRow key={i} factor={f} index={i} />)}
              </div>
            </div>
          )}

          {/* ── PROBING DEPTH SUMMARY ── */}
          {sites.length > 0 && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Probing Depth Map</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { label: "Normal",     count: sites.filter((s:any) => s.level === "normal").length,     color: "#10b981" },
                  { label: "Attachment", count: sites.filter((s:any) => s.level === "attachment").length, color: "#f59e0b" },
                  { label: "Deep ≥5mm",  count: sites.filter((s:any) => s.level === "deep").length,       color: "#ef4444" },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl py-2 border"
                    style={{ background: s.color + "10", borderColor: s.color + "25" }}>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ACTION BUTTONS ── */}
          <div className="grid md:grid-cols-2 gap-4">
            {user && (
              <button onClick={() => setShowSaveModal(true)}
                className="flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#0ea76e] text-black font-bold py-4 rounded-2xl text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-[#10b981]/20">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Save Case
              </button>
            )}
            <button onClick={exportAsPDF} disabled={isGeneratingPDF}
              className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/15 font-semibold py-4 rounded-2xl text-sm transition-all disabled:opacity-50">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 6v6M5 9l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {isGeneratingPDF ? "Generating..." : "Export PDF"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-600 leading-relaxed">
            ⚠️ Clinical decision support only. Always apply professional judgment.
          </p>
        </div>

        {/* ── SAVE MODAL ── */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] px-4">
            <div className="bg-[#0d1a30] rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/15">
              <h3 className="text-xl font-bold mb-6 text-[#10b981]">Save Case</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Case Name <span className="text-red-400">*</span></label>
                  <input type="text" value={caseName} onChange={e => setCaseName(e.target.value)}
                    className={inputCls} placeholder="e.g. Ahmed - Tooth 36 Crack" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Phone Number <span className="text-red-400">*</span></label>
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
                <button onClick={handleSaveCase} disabled={saving || !caseName.trim() || !phoneNumber.trim()}
                  className="flex-1 py-3.5 bg-[#10b981] hover:bg-[#0ea76e] rounded-2xl text-sm font-bold text-black disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {saving
                    ? <><div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"/>Saving...</>
                    : "Save Case"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/8 bg-black/40 py-6 text-center text-sm text-gray-600 mt-10">
          <p className="text-xs">© 2026 Endoprognosis · All Rights Reserved</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}