// app/crack-classifier/page.tsx
"use client";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";

// ── PROBING SITES ──
type PocketLevel = "normal" | "attachment" | "deep";
interface ProbingSite {
  id: string;
  label: string;
  short: string;
  cx: number;
  cy: number;
  level: PocketLevel;
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
  normal:     "#10b981",
  attachment: "#f59e0b",
  deep:       "#ef4444",
};

const LEVEL_CYCLE: Record<PocketLevel, PocketLevel> = {
  normal: "attachment",
  attachment: "deep",
  deep: "normal",
};

const LEVEL_LABEL: Record<PocketLevel, string> = {
  normal:     "Normal (< 3 mm)",
  attachment: "Attachment loss (3–4.9 mm)",
  deep:       "Deep (≥ 5 mm)",
};

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

// ── IOWA STAGE ──
function calcIowaStage(form: any, sites: ProbingSite[], deepCount: number): {
  stage: string; successRate: number; label: string; canRetain: boolean;
} {
  const distalRidge   = form.marginalRidge === "1";
  const deepPocket    = deepCount >= 1;
  const manyPockets   = deepCount >= 4;
  const pulpalInvolv  = form.spontLingering === "1" || form.sharpCold === "1";
  const periSign      = parseInt(form.percussion) === 1 || parseInt(form.periLesion) === 1;
  const splitSign     = manyPockets && parseInt(form.mobility) === 1 && distalRidge;

  // Stage V — split tooth
  if (splitSign) return { stage: "V", successRate: 0,  label: "Complete / Split tooth", canRetain: false };
  // Stage IV — deep perio pocket
  if (deepPocket) return { stage: "IV", successRate: 41, label: "Extension into periodontium", canRetain: true };
  // Stage III — distal ridge + pulpal/peri
  if (distalRidge && (pulpalInvolv || periSign))
    return { stage: "III", successRate: 69, label: "Extension with pulpal/periapical involvement", canRetain: true };
  // Stage II — distal marginal ridge
  if (distalRidge)
    return { stage: "II", successRate: 84, label: "Extension to distal marginal ridge", canRetain: true };
  // Stage I
  return { stage: "I", successRate: 93, label: "Crack within crown, no ridge involvement", canRetain: true };
}

// ── AFFECTING FACTORS ──
function buildAffectingFactors(form: any, sites: ProbingSite[], deepCount: number, isVRF: boolean): string[] {
  const factors: string[] = [];
  if (deepCount > 0)               factors.push(`${deepCount} deep periodontal pocket${deepCount>1?"s":""} (≥5mm)`);
  if (form.jLesion === "1")        factors.push("J-shaped / halo radiographic lesion");
  if (form.apicoMarginal === "1")  factors.push("Apico-marginal defect on CBCT");
  if (form.swelling === "1")       factors.push("Presence of swelling");
  if (form.sinus === "1")          factors.push("Sinus tract present");
  if (form.mobility === "1")       factors.push("Tooth mobility");
  if (form.marginalRidge === "1")  factors.push("Distal marginal ridge involvement");
  if (form.spontLingering === "1") factors.push("Spontaneous / lingering pain (pulpal involvement)");
  if (form.periLesion === "1")     factors.push("Periapical lesion present");
  if (form.percussion === "1")     factors.push("Positive percussion test");
  if (form.rctStatus === "1")      factors.push("Previously root canal treated");
  if (parseInt(form.restoration) >= 3) factors.push("Large / complex restoration (MOD or crown)");
  return factors.slice(0, 6);
}

// ── TREATMENT RECOMMENDATION ──
function buildTreatmentRec(isVRF: boolean, vrfLevel: string, stage: string, isRCT: boolean): string {
  if (isVRF) {
    if (vrfLevel === "high")      return "Extraction — VRF highly probable, poor prognosis";
    if (vrfLevel === "suspected") return "Exploratory surgery to confirm VRF — extraction likely";
    return "Monitor closely — low VRF suspicion, observe symptoms";
  }
  if (stage === "V") return "Extraction — split tooth, non-restorable";
  if (stage === "IV") return isRCT ? "Extraction or hemisection if multi-rooted" : "Root Canal Treatment + cuspal coverage — guarded prognosis";
  if (stage === "III") return isRCT ? "Monitor + full coverage restoration" : "Root Canal Treatment + immediate stabilization";
  if (stage === "II") return isRCT ? "Full coverage crown — stabilize crack" : "Provisional crown + Root Canal Treatment if pulp involved";
  return "Stabilization — provisional or full coverage crown to prevent propagation";
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function CrackToothClassifier() {
  const router   = useRouter();
  const { user } = useAuth();

  const [sites, setSites]     = useState<ProbingSite[]>(INITIAL_SITES);
  const [activeSite, setActiveSite] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    toothNumber:   "",
    toothType:     "Molar",
    rctStatus:     "0",
    painBiting:    "0",
    sharpCold:     "0",
    spontLingering:"0",
    biteTest:      "0",
    transillum:    "0",
    marginalRidge: "0",
    restoration:   "0",
    percussion:    "0",
    swelling:      "0",
    sinus:         "0",
    periLesion:    "0",
    jLesion:       "0",
    apicoMarginal: "0",
    mobility:      "0",
  });

  const deepCount      = sites.filter(s => s.level === "deep").length;
  const attachCount    = sites.filter(s => s.level === "attachment").length;
  const normalCount    = sites.filter(s => s.level === "normal").length;
  const isRCT          = formData.rctStatus === "1";
  const largeRest      = parseInt(formData.restoration) >= 3;
  const vrfBaseCondition = isRCT && largeRest;

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
    setSites(prev => prev.map(s =>
      s.id === id ? { ...s, level: LEVEL_CYCLE[s.level] } : s
    ));
  };

  const calculate = () => {
    if (!formData.toothNumber) { alert("Please select a tooth number."); return; }
    setLoading(true);

    setTimeout(() => {
      const vrfScore  = vrfBaseCondition ? calcVRFScore(formData, deepCount) : 0;
      const vrfLevel  = vrfBaseCondition ? vrfSuspicion(vrfScore) : "low";
      const isVRF     = vrfBaseCondition && vrfLevel !== "low";
      const iowa      = isVRF ? null : calcIowaStage(formData, sites, deepCount);
      const factors   = buildAffectingFactors(formData, sites, deepCount, isVRF);
      const treatRec  = buildTreatmentRec(isVRF, vrfLevel, iowa?.stage ?? "", isRCT);

      const resultData = {
        formData:      { ...formData },
        sites:         sites.map(s => ({ id: s.id, label: s.label, short: s.short, level: s.level })),
        deepCount,
        attachCount,
        isVRF,
        vrfScore,
        vrfLevel,
        iowa,
        affectingFactors: factors,
        treatmentRec:  treatRec,
        toothNumber:   formData.toothNumber,
        toothType:     formData.toothType,
        isRCT,
        largeRest,
        vrfBaseCondition,
      };

      localStorage.setItem("lastCrackResult", JSON.stringify(resultData));
      router.push("/crack-classifier/result");
    }, 700);
  };

  const sel = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors";

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white">

        {/* ── HERO ── */}
        <div className="relative h-[280px] md:h-[340px] overflow-hidden"
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
            <p className="text-gray-300 text-base">Iowa Classification · VRF Detection · Stage I–V</p>
          </div>
        </div>

        {/* ── PROGRESS ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-1">
            {["Tooth & History", "Clinical Exam", "Radiographic", "Classify"].map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                  {i + 1}
                </div>
                <div className="flex-1 h-px bg-white/8" />
              </div>
            ))}
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[#10b981]/20 border border-[#10b981]/30">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-gray-600 uppercase tracking-wider px-0 mt-1">
            <span>Tooth & History</span><span>Clinical</span><span>Radiographic</span><span>Result</span>
          </div>
        </div>

        {/* ── FORM ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-5">

          {/* ── SECTION 1: Tooth & Case ── */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full bg-[#3b82f6]" />
              <h3 className="font-semibold text-white">1. Tooth & Case Identification</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Tooth Number (FDI)</label>
                <select name="toothNumber" value={formData.toothNumber} onChange={handleChange} className={sel}>
                  <option value="">Select tooth</option>
                  {["14","15","16","17","18","24","25","26","27","28","34","35","36","37","38","44","45","46","47","48"].map(n => (
                    <option key={n} value={n}>#{n}</option>
                  ))}
                </select>
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

            {/* VRF base condition flag */}
            {vrfBaseCondition && (
              <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 13H2L8 2Z" stroke="#ef4444" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M8 7v3M8 11.5v.5" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <p className="text-xs text-red-400">RCT + large restoration detected — VRF assessment will be applied</p>
              </div>
            )}
          </div>

          {/* ── SECTION 2: Symptoms ── */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full bg-amber-500" />
              <h3 className="font-semibold text-white">2. Patient Symptoms / History</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { name: "painBiting",     label: "Pain on biting / chewing" },
                { name: "sharpCold",      label: "Sharp pain to cold / sweet" },
                { name: "spontLingering", label: "Spontaneous or lingering pain" },
                { name: "biteTest",       label: "Positive bite test" },
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

          {/* ── SECTION 3: Clinical Exam ── */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full bg-red-500" />
              <h3 className="font-semibold text-white">3. Clinical Examination Findings</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {[
                { name: "transillum",    label: "Crack line visible (transillumination / light)" },
                { name: "marginalRidge", label: "Marginal ridge involvement",
                  opts: [["0","None / Mesial only"],["1","Distal or Both ridges"]] },
                { name: "restoration",  label: "Restoration status",
                  opts: [["0","No restoration"],["1","Occlusal only"],["2","MO"],["3","DO"],["4","MOD / Crown"]] },
                { name: "percussion",   label: "Percussion sensitivity" },
                { name: "swelling",     label: "Presence of swelling" },
                { name: "sinus",        label: "Sinus tract present" },
                { name: "mobility",     label: "Tooth mobility" },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">{f.label}</label>
                  <select name={f.name} value={formData[f.name as keyof typeof formData]} onChange={handleChange} className={sel}>
                    {f.opts
                      ? f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)
                      : [<option key="0" value="0">No</option>, <option key="1" value="1">Yes</option>]}
                  </select>
                </div>
              ))}
            </div>

            {/* ── PROBING DIAGRAM ── */}
            <div className="bg-[#0a1428] border border-white/8 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Probing Depth Map</p>
              <p className="text-[10px] text-gray-600 mb-4">Click each site to cycle: Normal → Attachment loss → Deep (≥5mm)</p>

              <div className="flex flex-col lg:flex-row items-center gap-6">
                {/* SVG diagram */}
                <div className="flex-shrink-0">
                  <svg width="420" height="360" viewBox="0 0 420 360" className="w-full max-w-sm">
                    {/* Tooth body */}
                    <ellipse cx="210" cy="185" rx="130" ry="105" fill="#1a2a3a" stroke="#2e4060" strokeWidth="2"/>
                    {/* Cusps */}
                    {[[168,138],[252,138],[168,232],[252,232]].map(([cx,cy],i) => (
                      <circle key={i} cx={cx} cy={cy} r="26" fill="#152030" stroke="#2e4060" strokeWidth="1.5"/>
                    ))}
                    {/* Center fossa */}
                    <circle cx="210" cy="185" r="18" fill="#0a1428" stroke="#2e4060" strokeWidth="1"/>
                    {/* Axis labels */}
                    <text x="210" y="50" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="DM Sans,sans-serif">BUCCAL</text>
                    <text x="210" y="328" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="DM Sans,sans-serif">LINGUAL</text>
                    <text x="55" y="189" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="DM Sans,sans-serif">MESIAL</text>
                    <text x="365" y="189" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="DM Sans,sans-serif">DISTAL</text>
                    {/* Midline */}
                    <line x1="210" y1="60" x2="210" y2="315" stroke="#1e2e4a" strokeWidth="1" strokeDasharray="4 3"/>

                    {/* Probing sites */}
                    {sites.map(s => {
                      const color = LEVEL_COLOR[s.level];
                      const isActive = activeSite === s.id;
                      return (
                        <g key={s.id} onClick={() => { cycleSite(s.id); setActiveSite(s.id); }}
                          style={{ cursor: "pointer" }}>
                          <circle cx={s.cx} cy={s.cy} r={isActive ? 20 : 17}
                            fill={color + "30"} stroke={color} strokeWidth={isActive ? 2.5 : 1.8}
                            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
                          <text x={s.cx} y={s.cy + 4} textAnchor="middle" fontSize="9"
                            fill={color} fontWeight="700" fontFamily="DM Sans,sans-serif">
                            {s.short}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Site list */}
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

                  {/* Summary counts */}
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
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 4: Radiographic ── */}
          <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 rounded-full bg-[#10b981]" />
              <h3 className="font-semibold text-white">4. Radiographic Findings</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { name: "periLesion",    label: "Periapical lesion" },
                { name: "jLesion",       label: "J-shaped lesion / halo (VRF indicator)" },
                { name: "apicoMarginal", label: "Apico-marginal defect on CBCT (VRF indicator)" },
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

            {/* VRF real-time score preview */}
            {vrfBaseCondition && (
              <div className="mt-5 bg-[#0a1428] border border-white/8 rounded-2xl p-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">VRF Risk Score (live)</p>
                <div className="flex items-center gap-4">
                  {(() => {
                    const score = calcVRFScore(formData, deepCount);
                    const level = vrfSuspicion(score);
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
                              style={{ width: `${(score/13)*100}%`, background: color }} />
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
            ) : "Classify Crack & Generate Report →"}
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}