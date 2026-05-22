// app/predictor/result/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  collection, serverTimestamp, query,
  where, getDocs, setDoc, doc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navigation from "../../components/navigation";
import ProtectedRoute from "../../components/protectedroute";

// ── DPI SCALE ──
function getDPILabel(dpi: number): { label: string; color: string; bg: string; border: string; desc: string } {
  if (dpi <= 4)  return { label: "Low",      color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", desc: "Favourable prognosis complexity" };
  if (dpi <= 9)  return { label: "Moderate", color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   desc: "Moderate complexity — careful case selection" };
  if (dpi <= 16) return { label: "High",     color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  desc: "High complexity — advanced clinical skill required" };
  return               { label: "Critical", color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30",     desc: "Critical — consider extraction and alternative restoration" };
}

// ── FACTOR SEVERITY ──
function getFactorSeverity(factor: string): { dot: string; weight: string } {
  const f = factor.toLowerCase();
  if (f.includes("no ferrule") || f.includes("instrument sep") || f.includes("perforation") || f.includes("advanced periodontal"))
    return { dot: "bg-red-500",    weight: "High impact" };
  if (f.includes("periapical lesion") || f.includes("insufficient ferrule") || f.includes("high endodontic") || f.includes("prosthodontic"))
    return { dot: "bg-amber-500",  weight: "Moderate impact" };
  return   { dot: "bg-blue-400",   weight: "Contributing factor" };
}

// ── SURVIVAL GAUGE ──
function SurvivalGauge({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped >= 80 ? "#10b981" : clamped >= 65 ? "#f59e0b" : clamped >= 50 ? "#f97316" : "#ef4444";
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (clamped / 100) * circ * 0.75;
  const gap  = circ - dash;
  const rotation = -225;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Track */}
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth="10" strokeDasharray={`${circ * 0.75} ${circ}`}
          strokeDashoffset={0} strokeLinecap="round"
          transform={`rotate(${rotation} 80 80)`} />
        {/* Fill */}
        <circle cx="80" cy="80" r={r} fill="none" stroke={color}
          strokeWidth="10" strokeDasharray={`${dash} ${gap + circ * 0.25}`}
          strokeDashoffset={0} strokeLinecap="round"
          transform={`rotate(${rotation} 80 80)`}
          style={{ filter: `drop-shadow(0 0 8px ${color}60)`, transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{clamped.toFixed(1)}%</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">4-year survival</span>
      </div>
    </div>
  );
}

// ── DPI GAUGE BAR ──
function DPIGauge({ value }: { value: number }) {
  const cfg = getDPILabel(value);
  const segments = [
    { label: "Low",      max: 4,  color: "#10b981" },
    { label: "Moderate", max: 9,  color: "#f59e0b" },
    { label: "High",     max: 16, color: "#f97316" },
    { label: "Critical", max: 32, color: "#ef4444" },
  ];
  const maxDPI = 32;
  const pct = Math.min(100, (value / maxDPI) * 100);

  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className={`text-4xl font-black ${cfg.color}`}>{value}</span>
          <span className="text-gray-500 text-sm ml-1">pts</span>
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          {cfg.label} Complexity
        </span>
      </div>
      {/* Bar */}
      <div className="relative h-3 rounded-full bg-white/8 overflow-hidden mb-2">
        <div className="absolute inset-0 flex">
          {segments.map((s, i) => (
            <div key={i} className="h-full rounded-full" style={{ flex: s.max - (segments[i-1]?.max ?? 0), background: `${s.color}25` }} />
          ))}
        </div>
        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: cfg.color, boxShadow: `0 0 8px ${cfg.color}80` }} />
      </div>
      <div className="flex justify-between text-[9px] text-gray-600">
        <span>0</span><span>4</span><span>9</span><span>16</span><span>32+</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{cfg.desc}</p>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function PredictorResult() {
  const [result, setResult]               = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [caseName, setCaseName]           = useState("");
  const [phoneNumber, setPhoneNumber]     = useState("");
  const [furtherNote, setFurtherNote]     = useState("");
  const [saving, setSaving]               = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── Load from localStorage ──
  useEffect(() => {
    const savedResult = localStorage.getItem("lastCalculationResult");
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        let factors = Array.isArray(parsed.affectingFactors) ? [...parsed.affectingFactors] : [];
        factors = factors.filter(
          (f) => !f.includes("Compromised coronal structure") && !f.includes("Remaining coronal structure")
        );
        const structFactor = factors.find(
          (f) => f.includes("% loss") || f.includes("Adequate remaining")
        );
        if (structFactor) factors = [structFactor, ...factors.filter((f) => f !== structFactor)];
        setResult({ ...parsed, affectingFactors: factors.slice(0, 6) });
      } catch (e) {
        router.push("/predictor");
      }
    } else {
      router.push("/predictor");
    }
  }, [router]);

  // ── Navigation ──
  const goBackToPredictor = () => router.push("/predictor");
  const goToRestorative   = () => {
    if (!result?.toothNumber) { alert("Tooth number not found."); return; }
    localStorage.setItem("restorativeData", JSON.stringify({
      toothNumber: result.toothNumber,
      remainingPercent: result.remainingPercent || 100,
      walls: result.walls || {},
      occlusal: result.occlusal || "access_only",
      ferrule: result.ferrule || {},
      oralHygiene: result.formData?.oralHygiene || "0",
      perio: result.formData?.perio || "0",
      fullResult: result,
    }));
    router.push("/restorative");
  };

  // ── Save case ──
  const handleSaveCase = async () => {
    if (authLoading) { alert("Authentication still loading. Please wait."); return; }
    if (!user?.uid)  { alert("Please log in to save cases."); return; }
    if (!caseName?.trim() || !phoneNumber?.trim()) { alert("Please fill in Case Name and Phone Number."); return; }
    if (saving) return;

    setSaving(true);
    try {
      const caseKey = `${user.uid}_predictor_${result.toothNumber}_${Date.now()}`;
      const q = query(collection(db, "cases"),
        where("userId",      "==", user.uid),
        where("toothNumber", "==", result.toothNumber),
        where("type",        "==", "predictor")
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        for (const docSnap of snapshot.docs) {
          const existing = docSnap.data();
          if (
            existing.survivalEstimate === (result.survivalPercentage || 0) &&
            existing.epPoints         === (result.totalDPI           || 0) &&
            existing.pulpalDiagnosis  === (result.pulpalDiagnosis    || "") &&
            existing.periapicalDiagnosis === (result.periapicalDiagnosis || "")
          ) {
            alert("This case was already saved. Please check My Cases.");
            setSaving(false);
            return;
          }
        }
      }

      await setDoc(doc(db, "cases", caseKey), {
        caseName:            caseName.trim(),
        phoneNumber:         phoneNumber.trim(),
        furtherNote:         furtherNote.trim() || "",
        gender:              result.formData?.gender       || "",
        ageGroup:            result.formData?.ageGroup     || "",
        asa:                 result.formData?.medical      || "0",
        periodontalStatus:   result.formData?.perio        || "0",
        toothNumber:         result.toothNumber            || "",
        toothType:           result.toothType              || "Molar",
        survivalEstimate:    result.survivalPercentage     || 0,
        epPoints:            result.totalDPI               || 0,
        pulpalDiagnosis:     result.pulpalDiagnosis        || "",
        periapicalDiagnosis: result.periapicalDiagnosis    || "",
        treatmentRec:        result.treatmentRec           || "",
        isPractical:         result.isPractical            ?? false,
        affectingFactors:    Array.isArray(result.affectingFactors) ? result.affectingFactors : [],
        walls:               result.walls                  || {},
        occlusal:            result.occlusal               || "access_only",
        ferrule:             result.ferrule                || {},
        remainingStructure:  result.remainingPercent       || 0,
        patientInputs:       result.formData              || {},
        predictionResult: {
          survivalPercentage:  result.survivalPercentage   || 0,
          totalDPI:            result.totalDPI             || 0,
          affectingFactors:    Array.isArray(result.affectingFactors) ? result.affectingFactors : [],
        },
        type:      "predictor",
        userId:    user.uid,
        caseKey,
        createdAt: serverTimestamp(),
        savedAt:   new Date().toISOString(),
      });

      setSaveSuccess(true);
      setShowSaveModal(false);
      setCaseName(""); setPhoneNumber(""); setFurtherNote("");
      localStorage.removeItem("lastCalculationResult");
    } catch (error: any) {
      alert("Failed to save case. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── PDF Export ──
  const exportAsPDF = async () => {
    if (!result) return;
    try {
      setIsGeneratingPDF(true);
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const dpiCfg = getDPILabel(result.totalDPI || 0);

      // Pre-compute all PDF values — avoids nested template literals
      const pdfThreshold   = ["11","12","13","21","22","23","31","32","33","41","42","43"].includes(result.toothNumber) ? 55
                           : ["14","15","24","25","34","35","44","45"].includes(result.toothNumber) ? 60 : 65;
      const pdfVerdict     = result.isPractical ? "Practical to Retain" : "Impractical to Retain";
      const pdfVerdictBg   = result.isPractical ? "#052e16" : "#450a0a";
      const pdfVerdictBord = result.isPractical ? "#10b981" : "#ef4444";
      const pdfVerdictCol  = result.isPractical ? "#10b981" : "#ef4444";
      const pdfToothType   = result.toothType || "this tooth type";
      const pdfSurvival    = (result.survivalPercentage || 0).toFixed(1);
      const pdfTreatment   = result.treatmentRec
        ? "<p style=\"margin-top:12px;padding:10px 16px;background:#0a1428;border-radius:10px;font-size:14px;color:#10b981;\">Treatment: " + result.treatmentRec + "</p>"
        : "";
      const pdfFactors     = (result.affectingFactors || [])
        .map((f: string) => "<li style=\"padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px;\">• " + f + "</li>")
        .join("");
      const pdfWalls       = result.walls
        ? (Object.entries(result.walls) as [string, string][])
            .map(([w, s]) => "<li style=\"padding:6px 0;border-bottom:1px solid #334155;text-transform:capitalize;\">" + w + " wall: <strong>" + s + "</strong></li>")
            .join("")
        : "";
      const pdfFerrule     = result.ferrule?.label || "";
      const pdfVptNote     = result.vptAgeNote || "";
      const pdfMedFlag     = result.medicationFlag || "";
      const pdfIntro       = result.introParagraph || "";
      const pdfRemaining   = result.remainingPercent || 0;
      const pdfDate        = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const pdfDpiLabel    = dpiCfg.label;
      const pdfDpi         = result.totalDPI || 0;
      const pdfPulpal      = result.pulpalDiagnosis || "";
      const pdfPeri        = result.periapicalDiagnosis || "";

      const cleanHTML = [
        '<div style="font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;background:#0a1428;padding:40px 30px;line-height:1.6;">',
        '<div style="text-align:center;margin-bottom:32px;">',
        '<h1 style="font-size:32px;font-weight:900;color:#10b981;margin-bottom:4px;">Endoprognosis</h1>',
        '<p style="color:#64748b;font-size:13px;letter-spacing:3px;text-transform:uppercase;">Prediction Result Report</p>',
        '</div>',

        '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:24px;margin-bottom:20px;">',
        '<p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Clinical Summary</p>',
        '<p style="font-size:14px;line-height:1.8;">' + pdfIntro + '</p>',
        '</div>',

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">',
        '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:24px;text-align:center;">',
        '<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">4-Year Survival</p>',
        '<p style="font-size:52px;font-weight:900;color:#10b981;">' + pdfSurvival + '%</p>',
        '</div>',
        '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:24px;text-align:center;">',
        '<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">EP Points (DPI)</p>',
        '<p style="font-size:52px;font-weight:900;color:#3b82f6;">' + pdfDpi + '</p>',
        '<p style="color:#64748b;font-size:12px;">' + pdfDpiLabel + ' Complexity</p>',
        '</div></div>',

        '<div style="background:' + pdfVerdictBg + ';border:3px solid ' + pdfVerdictBord + ';border-radius:16px;padding:20px;text-align:center;margin-bottom:20px;">',
        '<p style="font-size:24px;font-weight:900;color:' + pdfVerdictCol + ';">' + pdfVerdict + '</p>',
        '<p style="color:#94a3b8;font-size:13px;margin-top:6px;">Threshold: ' + pdfThreshold + '% survival required for ' + pdfToothType + '</p>',
        '</div>',

        '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:24px;margin-bottom:20px;">',
        '<p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Diagnosis</p>',
        '<p style="font-size:16px;font-weight:600;">' + pdfPulpal + '</p>',
        '<p style="font-size:14px;color:#94a3b8;margin-top:4px;">' + pdfPeri + '</p>',
        pdfTreatment,
        '</div>',

        pdfFactors ? '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:24px;margin-bottom:20px;"><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Factors Affecting Survivability</p><ul style="list-style:none;padding:0;margin:0;">' + pdfFactors + '</ul></div>' : '',

        pdfWalls ? '<div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:16px;padding:24px;margin-bottom:20px;"><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Coronal Structure (' + pdfRemaining + '% remaining)</p><ul style="list-style:none;padding:0;margin:0;">' + pdfWalls + '</ul><p style="margin-top:10px;font-size:13px;color:#94a3b8;">' + pdfFerrule + '</p></div>' : '',

        pdfVptNote ? '<div style="background:#0c1a0c;border:1px solid #166534;border-radius:12px;padding:16px;margin-bottom:16px;"><p style="font-size:13px;color:#86efac;">Info: ' + pdfVptNote + '</p></div>' : '',

        pdfMedFlag ? '<div style="background:#1a1000;border:1px solid #78350f;border-radius:12px;padding:16px;margin-bottom:16px;"><p style="font-size:13px;color:#fbbf24;">Warning: ' + pdfMedFlag + '</p></div>' : '',

        '<div style="margin-top:24px;padding:16px;border:1px solid #334155;border-radius:12px;text-align:center;">',
        '<p style="color:#ef4444;font-size:12px;">This result is for clinical decision support only. Always apply your professional judgment.</p>',
        '</div>',
        '<div style="margin-top:12px;text-align:center;">',
        '<p style="color:#475569;font-size:11px;">Generated by Endoprognosis · ' + pdfDate + '</p>',
        '</div>',
        '</div>',
      ].join("\n");

      const el = document.createElement("div");
      el.innerHTML = cleanHTML;
      document.body.appendChild(el);
      await html2pdf().from(el).set({
        margin: [10, 15, 10, 15] as [number,number,number,number],
        filename: `Endoprognosis_Tooth${result.toothNumber}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#0a1428" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      }).save();
      document.body.removeChild(el);
    } catch (e) {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Loading ──
  if (!result) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-[#0a1428] text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-[#10b981]/30 border-t-[#10b981] animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading result...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const survival    = result.survivalPercentage || 0;
  const isRestorable = result.isPractical ?? false;
  const dpiCfg      = getDPILabel(result.totalDPI || 0);
  const toothNum    = result.toothNumber || "—";
  const toothType   = result.toothType   || "Molar";
  const threshold   = ["11","12","13","21","22","23","31","32","33","41","42","43"].includes(toothNum) ? 55
                    : ["14","15","24","25","34","35","44","45"].includes(toothNum) ? 60 : 65;

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white pb-20">

        {/* ── HERO ── */}
        <div className="relative h-[280px] md:h-[320px] bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: "url('https://iili.io/Bw4dt99.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0a1428]" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-[11px] tracking-[4px] text-[#10b981]/70 uppercase mb-2">Result Summary</p>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#10b981] via-white to-[#10b981] bg-clip-text text-transparent mb-2"
              style={{ fontFamily: "Playfair Display, serif" }}>
              Prediction Result
            </h1>
            <p className="text-gray-300 text-base">
              Tooth <span className="text-[#10b981] font-bold">#{toothNum}</span>
              {" · "}<span className="text-gray-400">{toothType}</span>
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

          {/* ── BACK BUTTON ── */}
          <button onClick={goBackToPredictor}
            className="flex items-center gap-2 text-gray-500 hover:text-[#10b981] text-sm transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Predictor
          </button>

          {/* ── SAVE SUCCESS BANNER ── */}
          {saveSuccess && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-2xl text-sm font-medium">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Case saved successfully — view it in My Cases.
            </div>
          )}

          {/* ── CLINICAL INTRO PARAGRAPH ── */}
          {result.introParagraph && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6">
              <p className="text-[10px] text-[#10b981]/60 tracking-[2px] uppercase font-semibold mb-3">Clinical Summary</p>
              <p className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: result.introParagraph }} />
            </div>
          )}

          {/* ── MAIN METRICS ROW ── */}
          <div className="grid md:grid-cols-2 gap-5">

            {/* Survival gauge */}
            <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
              <p className="text-[10px] text-gray-500 tracking-[2px] uppercase mb-4">4-Year Survival Estimate</p>
              <SurvivalGauge value={survival} />
              <p className="text-xs text-gray-600 mt-4 max-w-xs leading-relaxed">
                Dependent on quality of final restoration, oral hygiene compliance, and absence of parafunctional habits.
              </p>
            </div>

            {/* DPI gauge */}
            <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
              <p className="text-[10px] text-gray-500 tracking-[2px] uppercase mb-4">EP Points (Dental Prognosis Index)</p>
              <DPIGauge value={result.totalDPI || 0} />
            </div>
          </div>

          {/* ── VERDICT ── */}
          <div className={`rounded-3xl p-6 border-2 ${
            isRestorable
              ? "bg-emerald-500/8 border-emerald-500/40"
              : "bg-red-500/8 border-red-500/40"
          }`}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className={`text-2xl md:text-3xl font-black ${isRestorable ? "text-emerald-400" : "text-red-400"}`}>
                  {isRestorable ? "✅ Practical to Retain" : "⚠️ Impractical to Retain"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {isRestorable
                    ? `Survival (${survival.toFixed(1)}%) meets the ${threshold}% threshold required for ${toothType} retention.`
                    : `Survival (${survival.toFixed(1)}%) falls below the ${threshold}% threshold required for ${toothType} retention.`}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest border ${
                isRestorable
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}>
                {toothType}
              </div>
            </div>

            {/* Explanation note */}
            {result.explanationNote && (
              <p className="text-sm text-gray-400 mt-4 leading-relaxed border-t border-white/8 pt-4"
                dangerouslySetInnerHTML={{ __html: result.explanationNote }} />
            )}
          </div>

          {/* ── DIAGNOSIS + TREATMENT ── */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6">
            <p className="text-[10px] text-gray-500 tracking-[2px] uppercase font-semibold mb-4">Working Diagnosis</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/4 rounded-2xl p-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Pulpal</p>
                <p className="text-sm font-semibold text-white">{result.pulpalDiagnosis || "—"}</p>
              </div>
              <div className="bg-white/4 rounded-2xl p-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Periapical</p>
                <p className="text-sm font-semibold text-white">{result.periapicalDiagnosis || "—"}</p>
              </div>
            </div>
            {result.treatmentRec && (
              <div className="mt-4 flex items-center gap-3 bg-[#10b981]/10 border border-[#10b981]/25 rounded-2xl px-4 py-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Recommended Treatment</p>
                  <p className="text-sm font-bold text-[#10b981]">{result.treatmentRec}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── AFFECTING FACTORS ── */}
          {result.affectingFactors?.length > 0 && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6">
              <p className="text-[10px] text-gray-500 tracking-[2px] uppercase font-semibold mb-4">
                Factors Affecting Survivability
              </p>
              <div className="space-y-2">
                {result.affectingFactors.map((factor: string, i: number) => {
                  const sev = getFactorSeverity(factor);
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white/3 rounded-xl border border-white/6">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${sev.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300">{factor}</p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider flex-shrink-0 px-2 py-0.5 rounded-full ${
                        sev.dot === "bg-red-500"   ? "bg-red-500/15 text-red-400" :
                        sev.dot === "bg-amber-500" ? "bg-amber-500/15 text-amber-400" :
                                                     "bg-blue-500/15 text-blue-400"
                      }`}>{sev.weight}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CORONAL STRUCTURE SUMMARY ── */}
          {result.walls && (
            <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-gray-500 tracking-[2px] uppercase font-semibold">Coronal Structure</p>
                <span className="text-lg font-bold text-[#10b981]">{result.remainingPercent || 0}% remaining</span>
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
            </div>
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

          {/* ── ACTION BUTTONS ── */}
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={() => setShowSaveModal(true)}
              className="flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#0ea76e] text-black font-bold py-4 rounded-2xl text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-[#10b981]/20">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Save This Case
            </button>
            <button onClick={exportAsPDF} disabled={isGeneratingPDF}
              className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/15 font-semibold py-4 rounded-2xl text-sm transition-all disabled:opacity-50">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 6v6M5 9l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isGeneratingPDF ? "Generating PDF..." : "Export as PDF"}
            </button>
          </div>

          {/* ── RESTORATIVE BUTTON ── */}
          {isRestorable && (
            <button onClick={goToRestorative}
              className="w-full flex items-center justify-center gap-3 bg-[#0f6cbd]/20 hover:bg-[#0f6cbd]/35 border border-[#0f6cbd]/40 hover:border-[#0f6cbd] text-[#60a5fa] font-bold py-4 rounded-2xl text-sm transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              View Suggested Restorative Treatment
            </button>
          )}

          {/* ── DISCLAIMER ── */}
          <p className="text-center text-xs text-gray-600 leading-relaxed">
            ⚠️ This result is for clinical decision support only. Always apply your professional judgment.
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
                  <input type="text" value={caseName} onChange={(e) => setCaseName(e.target.value)}
                    className="w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                    placeholder="e.g. Ahmed - Tooth 36" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Phone Number <span className="text-red-400">*</span></label>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors"
                    placeholder="+966 50 123 4567" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Further Notes</label>
                  <textarea value={furtherNote} onChange={(e) => setFurtherNote(e.target.value)}
                    className="w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981] h-24 resize-y transition-colors"
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
                    ? <><div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />Saving...</>
                    : "Save Case"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/8 bg-black/40 py-6 text-center text-sm text-gray-600 mt-10">
          <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
            {["About","References","How to Use","Contact Us","Privacy Policy","Terms of Service"].map((l) => (
              <Link key={l} href={`/${l.toLowerCase().replace(/ /g,"-")}`} className="hover:text-gray-300 transition">{l}</Link>
            ))}
          </div>
          <p className="text-xs">© 2026 Endoprognosis · All Rights Reserved</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}