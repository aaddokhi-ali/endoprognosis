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
  color: string; bg: string; border: string; emoji: string; label: string;
}> = {
  I:   { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", emoji: "🟢", label: "Excellent prognosis" },
  II:  { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   emoji: "🟡", label: "Favourable prognosis" },
  III: { color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  emoji: "🟠", label: "Moderate prognosis" },
  IV:  { color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30",     emoji: "🔴", label: "Guarded prognosis" },
};

const VRF_CONFIG: Record<string, {
  color: string; bg: string; border: string; title: string;
}> = {
  low:       { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", title: "Low VRF Suspicion" },
  suspected: { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   title: "VRF Suspected" },
  high:      { color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/25",     title: "VRF Highly Probable" },
};

const LEVEL_COLOR: Record<string, string> = {
  normal: "#10b981", attachment: "#f59e0b", deep: "#ef4444",
};
const LEVEL_LABEL: Record<string, string> = {
  normal: "Normal", attachment: "Attachment loss", deep: "Deep ≥5mm",
};

// ── IOWA STAGE GAUGE ──
function StageGauge({ stage, successRate }: { stage: string; successRate: number }) {
  const color = successRate >= 80 ? "#10b981" : successRate >= 65 ? "#f59e0b" : successRate >= 50 ? "#f97316" : "#ef4444";
  const r = 44, circ = 2 * Math.PI * r;
  const dash = (successRate / 100) * circ * 0.75;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ}`}
            strokeLinecap="round" transform="rotate(-225 60 60)" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color}
            strokeWidth="8" strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round" transform="rotate(-225 60 60)"
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{successRate}%</span>
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">1-yr success</span>
        </div>
      </div>
    </div>
  );
}

// ── FACTOR ROW ──
function FactorRow({ factor }: { factor: string }) {
  const f = factor.toLowerCase();
  const isHigh = f.includes("deep") || f.includes("j-shaped") || f.includes("apico") || f.includes("cap") || f.includes("aaa");
  const isMed  = f.includes("swelling") || f.includes("sinus") || f.includes("percussion") || f.includes("distal");
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
  const [result, setResult]               = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [caseName, setCaseName]           = useState("");
  const [phoneNumber, setPhoneNumber]     = useState("");
  const [followUpDate, setFollowUpDate]   = useState("");
  const [furtherNote, setFurtherNote]     = useState("");
  const [saving, setSaving]               = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);
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

  const iowa         = result.iowa;
  const isVRF        = result.isVRF;
  const vrfLevel     = result.vrfLevel ?? "low";
  const vrfCfg       = VRF_CONFIG[vrfLevel];
  const stageCfg     = iowa ? STAGE_CONFIG[iowa.stage] : null;
  const factors      = result.affectingFactors ?? [];
  const sites        = result.sites ?? [];
  const rec          = result.recommendation ?? { primary: "", note: "" };
  const crackVisible = result.crackVisible;
  const periDx       = result.periDx;
  const crackMethods = result.crackMethods ?? {};

  // ── SAVE ──
  const handleSaveCase = async () => {
    if (!caseName.trim() || !phoneNumber.trim()) {
      alert("Please fill in Case Name and Phone Number.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
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
        caseName:        caseName.trim(),
        phoneNumber:     phoneNumber.trim(),
        furtherNote:     furtherNote.trim(),
        followUpDate:    followUpDate || null,
        type:            "crack-classifier",
        toothNumber:     result.toothNumber || "",
        toothType:       result.toothType   || "Molar",
        treatmentStatus: "No Treatment",
        treatmentRec:    result.treatmentRec || "",
        isPractical:     result.isPractical  ?? true,
        survivalEstimate: iowa?.successRate  ?? null,
        affectingFactors: factors,
        classification:  isVRF
          ? `VRF — ${vrfCfg.title}`
          : iowa ? `Iowa Stage ${iowa.stage}` : "Crack not confirmed",
        iowaStage:   iowa?.stage   ?? "",
        isVRF,
        vrfLevel,
        vrfScore:    result.vrfScore ?? 0,
        deepCount:   result.deepCount ?? 0,
        crackVisible,
        patientInputs: {
          ...result.formData,
          sites,
          deepCount: result.deepCount,
        },
        predictionResult: {
          iowa, isVRF, vrfLevel,
          vrfScore:     result.vrfScore,
          treatmentRec: result.treatmentRec,
          affectingFactors: factors,
          recommendation: rec,
        },
        userId:    user!.uid,
        createdAt: serverTimestamp(),
        savedAt:   new Date().toISOString(),
      });

      setSaveSuccess(true);
      setShowSaveModal(false);
      setCaseName(""); setPhoneNumber(""); setFurtherNote(""); setFollowUpDate("");
      localStorage.removeItem("lastCrackResult");
    } catch {
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

      const stageBlock = iowa
        ? `<div style="background:${iowa.stage==="I"?"#081a10":iowa.stage==="II"?"#1a1208":iowa.stage==="III"?"#1a0e00":"#1a0808"};border:2px solid ${iowa.stage==="I"?"#10b981":iowa.stage==="II"?"#f59e0b":iowa.stage==="III"?"#f97316":"#ef4444"};border-radius:12px;padding:20px;margin-bottom:20px;">
            <p style="font-size:28px;font-weight:900;color:${iowa.stage==="I"?"#10b981":iowa.stage==="II"?"#f59e0b":iowa.stage==="III"?"#f97316":"#ef4444"};margin:0;">Iowa Stage ${iowa.stage}</p>
            <p style="color:#94a3b8;font-size:13px;margin-top:6px;">${iowa.label}</p>
            <p style="color:#94a3b8;font-size:13px;margin-top:4px;">1-year success rate: ${iowa.successRate}%</p>
          </div>` : "";

      const vrfBlock = isVRF
        ? `<div style="background:${vrfLevel==="high"?"#1a0808":"#1a1208"};border:2px solid ${vrfLevel==="high"?"#ef4444":"#f59e0b"};border-radius:12px;padding:20px;margin-bottom:20px;">
            <p style="font-size:22px;font-weight:900;color:${vrfLevel==="high"?"#ef4444":"#f59e0b"};margin:0;">Vertical Root Fracture — ${vrfCfg.title}</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:6px;">VRF Score: ${result.vrfScore}/13</p>
            <p style="color:#94a3b8;font-size:11px;margin-top:4px;">Note: VRF cannot be confirmed without direct or microscopic visualization.</p>
          </div>` : "";

      const crackNote = !crackVisible
        ? `<div style="background:#1a1200;border:1px solid #92400e;border-radius:10px;padding:14px;margin-bottom:16px;">
            <p style="color:#fbbf24;font-size:12px;">⚠️ Crack was not confirmed by transillumination — Iowa Classification was not applied.</p>
          </div>` : "";

      const factorRows = factors.map((f: string) =>
        `<li style="padding:6px 0;border-bottom:1px solid #1e293b;font-size:12px;">• ${f}</li>`
      ).join("");

      const siteRows = sites.map((s: any) =>
        `<li style="padding:5px 0;border-bottom:1px solid #1e293b;font-size:11px;color:${LEVEL_COLOR[s.level] ?? "#64748b"};">${s.label}: ${LEVEL_LABEL[s.level]}</li>`
      ).join("");

      const el = document.createElement("div");
      el.innerHTML = [
        '<div style="font-family:system-ui,sans-serif;color:#e2e8f0;background:#0a1428;padding:40px;line-height:1.6;">',
        '<div style="text-align:center;margin-bottom:28px;">',
        '<h1 style="color:#10b981;font-size:24px;margin:0;">Crack Tooth Classification Report</h1>',
        '<p style="color:#64748b;font-size:13px;margin-top:6px;">Iowa Staging Index — Krell & Caplan 2018</p>',
        '<p style="color:#64748b;font-size:12px;">Tooth #' + result.toothNumber + ' · ' + result.toothType + ' · ' + new Date().toLocaleDateString("en-GB") + '</p>',
        '</div>',
        crackNote,
        stageBlock,
        vrfBlock,
        '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:20px;margin-bottom:20px;">',
        '<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Clinical Guidance</p>',
        '<p style="font-size:13px;color:#e2e8f0;margin-bottom:10px;">' + rec.primary + '</p>',
        '<p style="font-size:11px;color:#f59e0b;font-style:italic;">' + rec.note + '</p>',
        '</div>',
        factors.length ? '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Key Findings</p><ul style="list-style:none;padding:0;margin:0;">' + factorRows + '</ul></div>' : '',
        sites.length ? '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Probing Depths</p><ul style="list-style:none;padding:0;margin:0;">' + siteRows + '</ul></div>' : '',
        '<p style="text-align:center;color:#ef4444;font-size:11px;margin-top:20px;">Clinical decision support only. Patient should be informed and provide informed consent before treatment.</p>',
        '<p style="text-align:center;color:#475569;font-size:11px;margin-top:6px;">Endoprognosis · ' + new Date().getFullYear() + '</p>',
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
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#10b981] via-white to-[#10b981] bg-clip-text text-transparent mb-2"
              style={{ fontFamily: "Playfair Display, serif" }}>
              Crack Tooth Report
            </h1>
            <p className="text-gray-300 text-sm">
              Tooth <span className="text-[#10b981] font-bold">#{result.toothNumber}</span>
              {" · "}<span className="text-gray-400">{result.toothType}</span>
              {" · "}<span className="text-gray-500 text-xs">Iowa Staging Index — Krell & Caplan 2018</span>
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
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-2xl text-sm">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Case saved — view it in My Cases.
            </div>
          )}

          {/* ── CRACK NOT CONFIRMED WARNING ── */}
          {!crackVisible && (
            <div className="flex items-start gap-3 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl px-5 py-4">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
                <path d="M8 2L14 13H2L8 2Z" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M8 7v3M8 11.5v.5" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Crack Not Confirmed — Iowa Classification Not Applied</p>
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  The Iowa Staging Index requires direct or microscopic visualization of the crack (definite shadow blocking transillumination light). Clinical findings are recorded but no stage has been assigned. Confirm crack visibility before applying the classification.
                </p>
              </div>
            </div>
          )}

          {/* ── IOWA STAGE VERDICT ── */}
          {iowa && stageCfg && crackVisible && (
            <div className={`${stageCfg.bg} border-2 ${stageCfg.border} rounded-3xl p-6 md:p-8`}>
              <div className="flex items-start justify-between flex-wrap gap-6">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Iowa Classification — Krell & Caplan 2018</p>
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2 className={`text-4xl md:text-5xl font-black ${stageCfg.color}`}>Stage {iowa.stage}</h2>
                    <span className="text-2xl">{stageCfg.emoji}</span>
                  </div>
                  <p className={`text-sm font-semibold ${stageCfg.color} mb-1`}>{stageCfg.label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{iowa.label}</p>
                </div>
                <StageGauge stage={iowa.stage} successRate={iowa.successRate} />
              </div>
            </div>
          )}

          {/* ── VRF VERDICT ── */}
          {isVRF && (
            <div className={`${vrfCfg.bg} border-2 ${vrfCfg.border} rounded-3xl p-6 md:p-8`}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">VRF Assessment</p>
                  <h2 className={`text-2xl md:text-3xl font-black ${vrfCfg.color} mb-1`}>
                    Vertical Root Fracture (VRF)
                  </h2>
                  <p className={`text-sm font-semibold ${vrfCfg.color}`}>{vrfCfg.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">VRF Score</p>
                  <p className={`text-4xl font-black ${vrfCfg.color}`}>
                    {result.vrfScore}<span className="text-sm text-gray-600">/13</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${((result.vrfScore ?? 0) / 13) * 100}%`,
                    background: vrfLevel === "high" ? "#ef4444" : "#f59e0b",
                  }} />
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                VRF cannot be confirmed without direct or microscopic visualization during treatment or exploratory surgery. CBCT has limited reliability for VRF detection.
              </p>
            </div>
          )}

          {/* ── CLINICAL GUIDANCE ── */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Clinical Guidance</p>
            <p className="text-sm text-gray-200 leading-relaxed mb-4">{rec.primary}</p>
            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <p className="text-xs text-amber-400 leading-relaxed">{rec.note}</p>
            </div>
          </div>

          {/* ── IOWA STAGE COMPARISON ── */}
          {iowa && crackVisible && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Iowa Stage Reference</p>
              <div className="grid grid-cols-4 gap-2">
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
                      <p className="text-[9px] text-gray-600 mb-1 uppercase tracking-wider">Stage {s.stage}</p>
                      <p className="text-xl font-black" style={{ color }}>{s.rate}%</p>
                      <p className="text-[9px] text-gray-600 mt-0.5">{s.pct}</p>
                      {isCurrent && <p className="text-[8px] text-white/40 mt-0.5">← current</p>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-600 mt-3">
                1-year success rates for orthograde root canal treatment — Krell & Caplan, J Endod 2018 (n=363 cracked teeth).
              </p>
            </div>
          )}

          {/* ── KEY FINDINGS ── */}
          {factors.length > 0 && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Key Findings</p>
              <div className="space-y-2">
                {factors.map((f: string, i: number) => <FactorRow key={i} factor={f} />)}
              </div>
            </div>
          )}

          {/* ── DERIVED PERIAPICAL DIAGNOSIS ── */}
          {periDx && (
            <div className={`bg-[#0d1a30] border rounded-2xl p-5 ${
              periDx.isIowaStageIIITrigger ? "border-orange-500/25" : "border-white/10"
            }`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">
                Auto-derived Periapical Diagnosis
              </p>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className={`text-base font-bold mb-1 ${
                    periDx.isIowaStageIIITrigger ? "text-orange-400" : "text-emerald-400"
                  }`}>{periDx.label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-md">{periDx.derivationReason}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full border ${
                  periDx.isIowaStageIIITrigger
                    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                }`}>
                  {periDx.isIowaStageIIITrigger ? "Iowa Stage III trigger ✓" : "Not a Stage III trigger"}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/8">
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Derived automatically from: percussion tenderness ({result.formData?.percussion === "1" ? "yes" : "no"}),
                  apical lesion ({result.formData?.periLesion === "1" ? "yes" : "no"}),
                  swelling ({result.formData?.swelling === "1" ? "yes" : "no"}),
                  sinus tract ({result.formData?.sinus === "1" ? "yes" : "no"})
                </p>
              </div>
            </div>
          )}

          {/* ── CRACK CONFIRMATION METHODS ── */}
          {crackMethods && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Crack Confirmation Methods Used</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "transillum", icon: "💡", label: "Transillumination" },
                  { key: "methBlue",   icon: "🔵", label: "Methylene Blue Dye" },
                  { key: "direct",     icon: "🔬", label: "Direct Visualization" },
                ].map(m => {
                  const used = crackMethods[m.key];
                  return (
                    <div key={m.key} className={`rounded-xl p-3 text-center border ${
                      used
                        ? "bg-emerald-500/10 border-emerald-500/25"
                        : "bg-white/3 border-white/8"
                    }`}>
                      <p className="text-lg mb-1">{m.icon}</p>
                      <p className={`text-[10px] font-bold ${used ? "text-emerald-400" : "text-gray-600"}`}>
                        {m.label}
                      </p>
                      <p className={`text-[9px] mt-0.5 ${used ? "text-emerald-500" : "text-gray-700"}`}>
                        {used ? "Confirmed" : "Not used"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {sites.length > 0 && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Periodontal Probing Map</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
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

          {/* ── SUPPORTING SYMPTOMS (context only) ── */}
          {(() => {
            if (!result.formData) return null;
            const f = result.formData;
            const symps = ([
              f.painBiting     === "1" ? "Pain on biting / chewing"       : null,
              f.sharpCold      === "1" ? "Sharp pain to cold / sweet"      : null,
              f.spontLingering === "1" ? "Spontaneous or lingering pain"   : null,
              f.biteTest       === "1" ? "Positive bite test"              : null,
            ] as (string | null)[]).filter((s): s is string => s !== null);
            if (symps.length === 0) return null;
            return (
              <div className="bg-[#0d1a30] border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Reported Symptoms</p>
                <p className="text-[10px] text-gray-600 mb-3">Recorded for clinical context — not used in Iowa staging (per Krell & Caplan)</p>
                <div className="flex flex-wrap gap-2">
                  {symps.map((s, i) => (
                    <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full text-gray-400">{s}</span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── ACTIONS ── */}
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
            Based on Krell & Caplan Iowa Staging Index (J Endod 2018) · Clinical decision support only · Always apply professional judgment
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

        <div className="border-t border-white/8 bg-black/40 py-6 text-center mt-10">
          <p className="text-xs text-gray-600">© 2026 Endoprognosis · All Rights Reserved</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}