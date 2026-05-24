// app/crack-classifier/page.tsx
"use client";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";

// ── TYPES ──
type PocketLevel = "normal" | "attachment" | "deep";

interface ProbingSite {
  id: string; label: string; short: string;
  cx: number; cy: number; level: PocketLevel;
}

const INITIAL_SITES: ProbingSite[] = [
  { id: "mb", label: "Mesio-Buccal",  short: "MB", cx: 118, cy: 108, level: "normal" },
  { id: "b",  label: "Buccal",        short: "B",  cx: 210, cy:  78, level: "normal" },
  { id: "db", label: "Disto-Buccal",  short: "DB", cx: 302, cy: 108, level: "normal" },
  { id: "ml", label: "Mesio-Lingual", short: "ML", cx: 118, cy: 252, level: "normal" },
  { id: "l",  label: "Lingual",       short: "L",  cx: 210, cy: 282, level: "normal" },
  { id: "dl", label: "Disto-Lingual", short: "DL", cx: 302, cy: 252, level: "normal" },
];

const LEVEL_COLOR: Record<PocketLevel, string> = {
  normal: "#10b981", attachment: "#f59e0b", deep: "#ef4444",
};
const LEVEL_CYCLE: Record<PocketLevel, PocketLevel> = {
  normal: "attachment", attachment: "deep", deep: "normal",
};
const LEVEL_LABEL: Record<PocketLevel, string> = {
  normal: "Normal (< 3 mm)", attachment: "Attachment loss (3–4.9 mm)", deep: "Deep (≥ 5 mm)",
};

// ══════════════════════════════════════════════
// PERIAPICAL DIAGNOSIS — DERIVED FROM CLINICAL FINDINGS
// Doctor records clinical tests → tool derives diagnosis automatically
// ══════════════════════════════════════════════
export interface DerivedPeriapical {
  code: "normal" | "sap" | "cap" | "aaa" | "caa";
  label: string;
  shortLabel: string;
  isIowaStageIIITrigger: boolean;
  derivationReason: string;
}

export function derivePeriapicalDx(form: any): DerivedPeriapical {
  const hasLesion    = form.periLesion   === "1";
  const hasPercussion = form.percussion  === "1";
  const hasSwelling  = form.swelling     === "1";
  const hasSinus     = form.sinus        === "1";

  // Acute Apical Abscess — lesion + swelling ± percussion
  if (hasLesion && hasSwelling) return {
    code: "aaa",
    label: "Acute Apical Abscess (AAA)",
    shortLabel: "AAA",
    isIowaStageIIITrigger: true,
    derivationReason: "Apical lesion + swelling → Acute Apical Abscess",
  };

  // Chronic Apical Abscess / Suppurative AP — sinus tract + lesion
  if (hasLesion && hasSinus) return {
    code: "caa",
    label: "Chronic Apical Abscess / Suppurative AP",
    shortLabel: "CAA/SAP",
    isIowaStageIIITrigger: true,
    derivationReason: "Apical lesion + sinus tract → Chronic Apical Abscess",
  };

  // Asymptomatic Apical Periodontitis — lesion, no percussion, no swelling, no sinus
  if (hasLesion && !hasPercussion && !hasSwelling && !hasSinus) return {
    code: "cap",
    label: "Asymptomatic Apical Periodontitis (CAP/AAP)",
    shortLabel: "CAP",
    isIowaStageIIITrigger: true,
    derivationReason: "Apical lesion without percussion tenderness, swelling, or sinus → Asymptomatic Apical Periodontitis",
  };

  // Symptomatic Apical Periodontitis — percussion tender ± lesion, no swelling/sinus
  if (hasPercussion) return {
    code: "sap",
    label: "Symptomatic Apical Periodontitis (SAP/AAP)",
    shortLabel: "SAP",
    isIowaStageIIITrigger: false,
    derivationReason: "Percussion tenderness" + (hasLesion ? " with apical lesion" : ", no apical lesion") + " → Symptomatic Apical Periodontitis",
  };

  // Normal apical tissue
  return {
    code: "normal",
    label: "Normal Apical Tissue",
    shortLabel: "Normal",
    isIowaStageIIITrigger: false,
    derivationReason: "No percussion tenderness, no apical lesion, no swelling, no sinus tract → Normal apical tissue",
  };
}

// ── VRF SCORE ──
function calcVRFScore(form: any, deepCount: number): number {
  let score = 0;
  if (deepCount >= 1)             score += 2;
  if (form.jLesion === "1")       score += 3;
  if (form.apicoMarginal === "1") score += 3;
  if (form.swelling === "1")      score += 2;
  if (form.sinus === "1")         score += 2;
  if (form.mobility === "1")      score += 1;
  return score;
}

function vrfSuspicion(score: number): "low" | "suspected" | "high" {
  if (score >= 6) return "high";
  if (score >= 3) return "suspected";
  return "low";
}

// ── IOWA STAGING — exact Figure 2, Krell & Caplan 2018 ──
function calcIowaStage(deepCount: number, form: any, periDx: DerivedPeriapical): {
  stage: string; successRate: number; label: string;
} {
  // Q1: Any mesial or distal pocket ≥5mm?
  if (deepCount >= 1)
    return { stage: "IV", successRate: 41, label: "Extension into periodontium (pocket ≥5mm)" };

  // Q2: Distal marginal ridge cracked?
  if (form.marginalRidge !== "1")
    return { stage: "I", successRate: 93, label: "Crack within crown — no distal ridge involvement" };

  // Q3: Periapical diagnosis CAP / SAP / AAA? (derived automatically)
  if (!periDx.isIowaStageIIITrigger)
    return { stage: "II", successRate: 84, label: "Crack across distal marginal ridge — no CAP/CAA/AAA" };

  return { stage: "III", successRate: 69, label: "Crack across distal marginal ridge with " + periDx.shortLabel };
}

// ── AFFECTING FACTORS ──
function buildAffectingFactors(form: any, deepCount: number, periDx: DerivedPeriapical): string[] {
  const factors: string[] = [];
  if (deepCount > 0)               factors.push(`${deepCount} deep periodontal pocket${deepCount > 1 ? "s" : ""} (≥5mm)`);
  if (periDx.isIowaStageIIITrigger) factors.push(`Periapical diagnosis: ${periDx.shortLabel} (Iowa Stage III trigger)`);
  if (form.jLesion === "1")        factors.push("J-shaped / halo radiographic lesion (VRF indicator)");
  if (form.apicoMarginal === "1")  factors.push("Apico-marginal defect on CBCT (VRF indicator)");
  if (form.swelling === "1")       factors.push("Presence of swelling");
  if (form.sinus === "1")          factors.push("Sinus tract present");
  if (form.mobility === "1")       factors.push("Tooth mobility");
  if (form.marginalRidge === "1")  factors.push("Distal marginal ridge involvement");
  if (form.percussion === "1")     factors.push("Percussion sensitivity");
  if (form.rctStatus === "1")      factors.push("Previously root canal treated");
  if (parseInt(form.restoration) >= 3) factors.push("Large / complex restoration (MOD or crown)");
  return factors.slice(0, 7);
}

// ── CLINICAL RECOMMENDATION ──
function buildRecommendation(
  isVRF: boolean, vrfLevel: string, stage: string, isRCT: boolean
): { primary: string; note: string } {
  const consent = "The patient should be informed of the prognosis and provide informed consent before treatment begins.";
  if (isVRF) {
    if (vrfLevel === "high") return {
      primary: "Multiple indicators suggest VRF. Microsurgical or endoscopic exploration is strongly recommended to confirm the diagnosis. Initiate treatment — if VRF is confirmed intraoperatively through direct or microscopic visualization, discuss treatment modification or alternative options with the patient at that point.",
      note: consent,
    };
    if (vrfLevel === "suspected") return {
      primary: "Clinical and radiographic findings raise VRF suspicion. Proceed with treatment and direct microscopic visualization — VRF cannot be confirmed without intraoperative examination. Modify the treatment plan only if VRF is directly confirmed.",
      note: consent,
    };
    return {
      primary: "VRF is unlikely based on current findings. Proceed with standard endodontic assessment and treatment.",
      note: consent,
    };
  }
  if (stage === "IV") return {
    primary: isRCT
      ? "Stage IV — guarded prognosis (41% 1-year success). Deep periodontal pocket associated with the crack. Initiate treatment and monitor closely. If symptoms do not resolve after appropriate treatment, reassess restorability in consultation with the patient."
      : "Stage IV — guarded prognosis (41% 1-year success). Initiate root canal treatment and cuspal coverage. Monitor periodontal status — if symptoms persist or the pocket does not resolve, reassess and discuss further options with the patient.",
    note: consent,
  };
  if (stage === "III") return {
    primary: isRCT
      ? "Stage III — moderate prognosis (69% 1-year success). Distal ridge involvement with advanced periapical diagnosis. Monitor and consider full coverage restoration if not already present. If symptoms do not resolve, reassess in consultation with the patient."
      : "Stage III — moderate prognosis (69% 1-year success). Proceed with root canal treatment and immediate coronal stabilization, followed by full coverage restoration. Inform the patient that symptoms may not fully resolve.",
    note: consent,
  };
  if (stage === "II") return {
    primary: isRCT
      ? "Stage II — favourable prognosis (84% 1-year success). Full coverage restoration to stabilize the crack and prevent propagation."
      : "Stage II — favourable prognosis (84% 1-year success). Provisional crown placement to stabilize, followed by root canal treatment if pulp becomes irreversibly affected, then full coverage restoration.",
    note: consent,
  };
  return {
    primary: isRCT
      ? "Stage I — excellent prognosis (93% 1-year success). Full coverage crown recommended to prevent crack propagation."
      : "Stage I — excellent prognosis (93% 1-year success). Immediate cuspal coverage with provisional or definitive crown to stabilize and prevent propagation.",
    note: consent,
  };
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function CrackToothClassifier() {
  const router   = useRouter();
  const { user } = useAuth();

  const [sites, setSites]           = useState<ProbingSite[]>(INITIAL_SITES);
  const [activeSite, setActiveSite] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  const [formData, setFormData] = useState({
    toothNumber:      "",
    toothType:        "Molar",
    rctStatus:        "0",
    // Crack confirmation — 3 methods
    crackTransillum:  "0",
    crackMethBlue:    "0",
    crackDirect:      "0",
    // Symptoms (clinical context — not used in Iowa staging)
    painBiting:       "0",
    sharpCold:        "0",
    spontLingering:   "0",
    biteTest:         "0",
    // Clinical exam findings
    marginalRidge:    "0",
    restoration:      "0",
    percussion:       "0",   // → periapical dx derivation
    swelling:         "0",   // → periapical dx derivation
    sinus:            "0",   // → periapical dx derivation
    mobility:         "0",
    periLesion:       "0",   // → periapical dx derivation
    // VRF radiographic
    jLesion:          "0",
    apicoMarginal:    "0",
  });

  // ── Derived values ──
  const deepCount        = sites.filter(s => s.level === "deep").length;
  const attachCount      = sites.filter(s => s.level === "attachment").length;
  const normalCount      = sites.filter(s => s.level === "normal").length;
  const isRCT            = formData.rctStatus === "1";
  const largeRest        = parseInt(formData.restoration) >= 3;
  const vrfBaseCondition = isRCT && largeRest;
  const crackVisible     = formData.crackTransillum === "1" || formData.crackMethBlue === "1" || formData.crackDirect === "1";

  // Live periapical derivation (for UI feedback)
  const livePeriDx = derivePeriapicalDx(formData);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === "toothNumber") {
        const premolars = ["14","15","24","25","34","35","44","45"];
        next.toothType = premolars.includes(value) ? "Premolar" : value ? "Molar" : "Molar";
      }
      return next;
    });
  };

  const cycleSite = (id: string) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, level: LEVEL_CYCLE[s.level] } : s));
  };

  const calculate = () => {
    if (!formData.toothNumber) { alert("Please select a tooth number."); return; }
    setLoading(true);
    setTimeout(() => {
      const periDx   = derivePeriapicalDx(formData);
      const vrfScore = vrfBaseCondition ? calcVRFScore(formData, deepCount) : 0;
      const vrfLevel = vrfBaseCondition ? vrfSuspicion(vrfScore) : "low";
      const isVRF    = vrfBaseCondition && vrfLevel !== "low";
      const iowa     = (!isVRF && crackVisible) ? calcIowaStage(deepCount, formData, periDx) : null;
      const factors  = buildAffectingFactors(formData, deepCount, periDx);
      const rec      = buildRecommendation(isVRF, vrfLevel, iowa?.stage ?? "", isRCT);
      const treatRec = isVRF
        ? `VRF — ${vrfLevel === "high" ? "Highly probable" : "Suspected"}`
        : iowa ? `Iowa Stage ${iowa.stage} — ${iowa.label}` : "Crack not confirmed — cannot stage";

      localStorage.setItem("lastCrackResult", JSON.stringify({
        formData: { ...formData },
        sites: sites.map(s => ({ id: s.id, label: s.label, short: s.short, level: s.level })),
        deepCount, attachCount, crackVisible,
        crackMethods: {
          transillum: formData.crackTransillum === "1",
          methBlue:   formData.crackMethBlue   === "1",
          direct:     formData.crackDirect     === "1",
        },
        periDx,
        isVRF, vrfScore, vrfLevel, iowa,
        affectingFactors: factors,
        recommendation: rec,
        treatmentRec: treatRec,
        isPractical: isVRF ? vrfLevel !== "high" : iowa ? iowa.successRate >= 50 : true,
        toothNumber: formData.toothNumber,
        toothType:   formData.toothType,
        isRCT, largeRest, vrfBaseCondition,
      }));
      router.push("/crack-classifier/result");
    }, 700);
  };

  const sel = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors";

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white">

        {/* ── HERO ── */}
        <div className="relative h-[280px] md:h-[320px] overflow-hidden"
          style={{ backgroundImage: "url('https://iili.io/BwkLI0N.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0a1428]" />
          <div className="absolute top-5 left-6 z-20">
            <Image src="https://iili.io/B6RcxlS.png" alt="Logo" width={160} height={55} className="h-10 w-auto" priority />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 pt-8">
            <p className="text-[11px] tracking-[4px] text-[#10b981]/70 uppercase mb-3">Clinical Decision Tool</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-[#10b981] via-white to-[#10b981] bg-clip-text text-transparent"
              style={{ fontFamily: "Playfair Display, serif" }}>
              Crack Tooth Classifier
            </h1>
            <p className="text-gray-300 text-base">Iowa Classification (Krell & Caplan 2018) · VRF Detection</p>
          </div>
        </div>

        {/* ── PROGRESS ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-1">
            {["Tooth & Crack", "Symptoms", "Clinical Exam", "Radiographic"].map((_, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                  {i + 1}
                </div>
                <div className="flex-1 h-px bg-white/8" />
              </div>
            ))}
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[#10b981]/20 border border-[#10b981]/30">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l2.5 2.5L9 1" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-gray-600 uppercase tracking-wider mt-1">
            <span>Tooth & Crack</span><span>Symptoms</span><span>Clinical</span><span>Radiographic</span><span>Result</span>
          </div>
        </div>

        {/* ── FORM ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-5">

          {/* ══ SECTION 1: TOOTH + CRACK CONFIRMATION ══ */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full bg-[#3b82f6]" />
              <h3 className="font-semibold text-white">1. Tooth Identification & Crack Confirmation</h3>
            </div>

            {/* Tooth fields */}
            <div className="grid md:grid-cols-3 gap-5 mb-6">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Tooth Number (FDI)</label>
                <select name="toothNumber" value={formData.toothNumber} onChange={handleChange} className={sel}>
                  <option value="">Select tooth</option>
                  <optgroup label="Upper Right">
                    {["14","15","16","17"].map(n => <option key={n} value={n}>#{n}</option>)}
                  </optgroup>
                  <optgroup label="Upper Left">
                    {["24","25","26","27"].map(n => <option key={n} value={n}>#{n}</option>)}
                  </optgroup>
                  <optgroup label="Lower Left">
                    {["34","35","36","37"].map(n => <option key={n} value={n}>#{n}</option>)}
                  </optgroup>
                  <optgroup label="Lower Right">
                    {["44","45","46","47"].map(n => <option key={n} value={n}>#{n}</option>)}
                  </optgroup>
                </select>
                <p className="text-[10px] text-gray-600 mt-1">Wisdom teeth excluded — Iowa Index applies to molars and premolars only</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Tooth Type</label>
                <div className={sel + " text-gray-500 cursor-not-allowed"}>{formData.toothType}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Root Canal Treated?</label>
                <select name="rctStatus" value={formData.rctStatus} onChange={handleChange} className={sel}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>

            {/* ── CRACK CONFIRMATION — 3 methods ── */}
            <div className={`rounded-2xl border-2 p-5 transition-all ${
              crackVisible ? "bg-emerald-500/8 border-emerald-500/40" : "bg-white/3 border-white/15"
            }`}>
              <p className={`text-sm font-semibold mb-1 ${crackVisible ? "text-emerald-400" : "text-gray-300"}`}>
                Crack Confirmation — Required Gate
              </p>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Per Krell & Caplan: no tooth included without confirmed crack visualization. Iowa Classification cannot be applied without confirmation. Select all methods used.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    name: "crackTransillum",
                    icon: "💡",
                    title: "Transillumination",
                    desc: "Definite shadow blocking light transmission with both buccal and lingual light placement",
                  },
                  {
                    name: "crackMethBlue",
                    icon: "🔵",
                    title: "Methylene Blue Dye",
                    desc: "Visible dye uptake along the crack line after application",
                  },
                  {
                    name: "crackDirect",
                    icon: "🔬",
                    title: "Direct Visualization",
                    desc: "Crack confirmed under magnification (loupes or microscope) after restoration removal",
                  },
                ].map(m => {
                  const confirmed = formData[m.name as keyof typeof formData] === "1";
                  return (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, [m.name]: prev[m.name as keyof typeof prev] === "1" ? "0" : "1" }))}
                      className={`text-left rounded-2xl p-4 border-2 transition-all ${
                        confirmed
                          ? "bg-emerald-500/15 border-emerald-500/50"
                          : "bg-white/3 border-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{m.icon}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          confirmed ? "bg-emerald-500 border-emerald-500" : "border-gray-600"
                        }`}>
                          {confirmed && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l2.5 2.5L9 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs font-bold mb-1 ${confirmed ? "text-emerald-400" : "text-gray-300"}`}>{m.title}</p>
                      <p className="text-[10px] text-gray-600 leading-relaxed">{m.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Status line */}
              <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 border ${
                crackVisible
                  ? "bg-emerald-500/10 border-emerald-500/25"
                  : "bg-amber-500/10 border-amber-500/25"
              }`}>
                {crackVisible ? (
                  <>
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    <p className="text-xs text-emerald-400 font-semibold">
                      Crack confirmed — Iowa Classification will be applied
                    </p>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2L14 13H2L8 2Z" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M8 7v3M8 11.5v.5" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    <p className="text-xs text-amber-400">
                      Crack not yet confirmed — complete clinical findings below, but no Iowa stage will be assigned
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* VRF base condition flag */}
            {vrfBaseCondition && (
              <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 13H2L8 2Z" stroke="#ef4444" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M8 7v3M8 11.5v.5" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <p className="text-xs text-red-400">RCT + large restoration detected — VRF assessment will be applied alongside Iowa staging</p>
              </div>
            )}
          </div>

          {/* ══ SECTION 2: SYMPTOMS (context only) ══ */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 rounded-full bg-amber-500" />
              <h3 className="font-semibold text-white">2. Patient Symptoms / History</h3>
              <span className="ml-2 text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                Clinical context — not used in Iowa staging
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              Per Krell & Caplan: pulpal diagnosis was not statistically significant in staging outcome. Symptoms are recorded for clinical context and informed consent discussion only.
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { name: "painBiting",     label: "Pain on biting / chewing" },
                { name: "sharpCold",      label: "Sharp pain to cold / sweet" },
                { name: "spontLingering", label: "Spontaneous or lingering pain" },
                { name: "biteTest",       label: "Positive bite test (Tooth Slooth / Burlew wheel)" },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">{f.label}</label>
                  <select name={f.name} value={formData[f.name as keyof typeof formData]} onChange={handleChange} className={sel}>
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* ══ SECTION 3: CLINICAL EXAMINATION ══ */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full bg-red-500" />
              <h3 className="font-semibold text-white">3. Clinical Examination Findings</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {[
                {
                  name: "marginalRidge",
                  label: "Distal marginal ridge involvement",
                  note: "★ Iowa variable",
                  opts: [["0","None / Mesial ridge only"],["1","Distal or both ridges cracked"]],
                },
                {
                  name: "restoration",
                  label: "Restoration status",
                  opts: [["0","No restoration"],["1","Occlusal only"],["2","MO"],["3","DO"],["4","MOD / Crown"]],
                },
                { name: "percussion",  label: "Percussion tenderness",    note: "→ periapical dx derivation" },
                { name: "swelling",    label: "Presence of swelling",     note: "→ periapical dx derivation" },
                { name: "sinus",       label: "Sinus tract present",      note: "→ periapical dx derivation" },
                { name: "mobility",    label: "Tooth mobility" },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">{f.label}</label>
                  {(f as any).note && (
                    <p className="text-[10px] text-amber-400/70 mb-2">{(f as any).note}</p>
                  )}
                  <select name={f.name} value={formData[f.name as keyof typeof formData]} onChange={handleChange} className={sel}>
                    {(f as any).opts
                      ? (f as any).opts.map(([v, l]: string[]) => <option key={v} value={v}>{l}</option>)
                      : [<option key="0" value="0">No</option>, <option key="1" value="1">Yes</option>]}
                  </select>
                </div>
              ))}
            </div>

            {/* ── PROBING DIAGRAM ── */}
            <div className="bg-[#0a1428] border border-white/8 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Periodontal Probing Map</p>
              <p className="text-[10px] text-gray-600 mb-1">
                6-point probing: mesial and distal interproximal spaces + furcas
              </p>
              <p className="text-[10px] text-amber-400/80 mb-4">
                ★ Iowa variable: any pocket ≥5mm → Stage IV regardless of other findings
              </p>
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <svg width="420" height="360" viewBox="0 0 420 360" className="w-full max-w-sm">
                    <ellipse cx="210" cy="185" rx="130" ry="105" fill="#1a2a3a" stroke="#2e4060" strokeWidth="2"/>
                    {[[168,138],[252,138],[168,232],[252,232]].map(([cx,cy],i) => (
                      <circle key={i} cx={cx} cy={cy} r="26" fill="#152030" stroke="#2e4060" strokeWidth="1.5"/>
                    ))}
                    <circle cx="210" cy="185" r="18" fill="#0a1428" stroke="#2e4060" strokeWidth="1"/>
                    <text x="210" y="50"  textAnchor="middle" fontSize="11" fill="#64748b">BUCCAL</text>
                    <text x="210" y="328" textAnchor="middle" fontSize="11" fill="#64748b">LINGUAL</text>
                    <text x="55"  y="189" textAnchor="middle" fontSize="11" fill="#64748b">MESIAL</text>
                    <text x="365" y="189" textAnchor="middle" fontSize="11" fill="#64748b">DISTAL</text>
                    <line x1="210" y1="60" x2="210" y2="315" stroke="#1e2e4a" strokeWidth="1" strokeDasharray="4 3"/>
                    {sites.map(s => {
                      const color = LEVEL_COLOR[s.level];
                      const isActive = activeSite === s.id;
                      return (
                        <g key={s.id} onClick={() => { cycleSite(s.id); setActiveSite(s.id); }} style={{ cursor: "pointer" }}>
                          <circle cx={s.cx} cy={s.cy} r={isActive ? 20 : 17}
                            fill={color + "30"} stroke={color} strokeWidth={isActive ? 2.5 : 1.8}
                            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
                          <text x={s.cx} y={s.cy + 4} textAnchor="middle" fontSize="9"
                            fill={color} fontWeight="700">{s.short}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {sites.map(s => {
                    const color = LEVEL_COLOR[s.level];
                    return (
                      <button key={s.id} onClick={() => cycleSite(s.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all hover:opacity-90"
                        style={{ background: color + "12", borderColor: color + "40" }}>
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-sm font-medium text-white">{s.label}</span>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color }}>{LEVEL_LABEL[s.level]}</span>
                      </button>
                    );
                  })}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      { label: "Normal",      count: normalCount,  color: "#10b981" },
                      { label: "Attachment",  count: attachCount,  color: "#f59e0b" },
                      { label: "Deep (≥5mm)", count: deepCount,    color: "#ef4444" },
                    ].map(s => (
                      <div key={s.label} className="text-center rounded-xl py-2 px-3 border"
                        style={{ background: s.color + "10", borderColor: s.color + "30" }}>
                        <p className="text-xl font-black" style={{ color: s.color }}>{s.count}</p>
                        <p className="text-[9px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {deepCount >= 1 && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
                      <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                      <p className="text-[10px] text-red-400 font-semibold">
                        Deep pocket detected → Iowa Stage IV regardless of other findings
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── LIVE PERIAPICAL DERIVATION ── */}
            <div className={`mt-5 rounded-2xl border p-4 transition-all ${
              livePeriDx.isIowaStageIIITrigger
                ? "bg-orange-500/8 border-orange-500/30"
                : "bg-white/3 border-white/10"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Auto-derived Periapical Diagnosis
                  </p>
                  <p className={`text-sm font-bold mb-1 ${
                    livePeriDx.isIowaStageIIITrigger ? "text-orange-400" : "text-emerald-400"
                  }`}>
                    {livePeriDx.label}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{livePeriDx.derivationReason}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  livePeriDx.isIowaStageIIITrigger
                    ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                }`}>
                  {livePeriDx.isIowaStageIIITrigger ? "Stage III trigger" : "Not a Stage III trigger"}
                </span>
              </div>
            </div>
          </div>

          {/* ══ SECTION 4: RADIOGRAPHIC ══ */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full bg-[#10b981]" />
              <h3 className="font-semibold text-white">4. Radiographic Findings</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">
                  Periapical lesion on radiograph
                </label>
                <p className="text-[10px] text-amber-400/70 mb-2">→ periapical dx derivation</p>
                <select name="periLesion" value={formData.periLesion} onChange={handleChange} className={sel}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>

            {/* VRF radiographic indicators */}
            <div className="bg-[#0a1428] border border-white/8 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">VRF Radiographic Indicators</p>
              <p className="text-[10px] text-gray-600 mb-4">
                {vrfBaseCondition ? "Applied — RCT + large restoration present" : "Only relevant when RCT + large restoration (DO/MOD/Crown) is present"}
              </p>
              <div className="grid md:grid-cols-2 gap-5">
                {[
                  { name: "jLesion",       label: "J-shaped lesion / halo pattern" },
                  { name: "apicoMarginal", label: "Apico-marginal defect on CBCT" },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">{f.label}</label>
                    <select name={f.name}
                      value={formData[f.name as keyof typeof formData]} onChange={handleChange}
                      className={sel + (!vrfBaseCondition ? " opacity-40 cursor-not-allowed" : "")}
                      disabled={!vrfBaseCondition}>
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </div>
                ))}
              </div>

              {vrfBaseCondition && (
                <div className="mt-4 bg-[#0d1a30] border border-white/8 rounded-xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">VRF Risk Score (live)</p>
                  <div className="flex items-center gap-4">
                    {(() => {
                      const score  = calcVRFScore(formData, deepCount);
                      const level  = vrfSuspicion(score);
                      const colors = { low: "#10b981", suspected: "#f59e0b", high: "#ef4444" };
                      const labels = { low: "Low suspicion", suspected: "VRF suspected", high: "VRF highly probable" };
                      const color  = colors[level];
                      return (
                        <>
                          <div className="text-center">
                            <p className="text-3xl font-black" style={{ color }}>{score}</p>
                            <p className="text-[9px] text-gray-600">/ 13 pts</p>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 bg-white/8 rounded-full overflow-hidden mb-1">
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${(score / 13) * 100}%`, background: color }} />
                            </div>
                            <p className="text-xs font-semibold" style={{ color }}>{labels[level]}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── CLASSIFY BUTTON ── */}
          <button onClick={calculate} disabled={loading || !formData.toothNumber}
            className="w-full bg-[#10b981] hover:bg-[#0ea76e] disabled:bg-gray-700 text-black font-bold py-5 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-[#10b981]/20 disabled:text-gray-400 disabled:transform-none">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Analysing crack pattern...
              </span>
            ) : "Classify & Generate Report →"}
          </button>

          <p className="text-center text-xs text-gray-600 leading-relaxed">
            Based on Krell & Caplan Iowa Staging Index (J Endod 2018) · Clinical decision support only
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}