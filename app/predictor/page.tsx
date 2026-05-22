// app/predictor/page.tsx
"use client";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { casesService, detectProcedureCategory } from "../lib/casesService";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Image from "next/image";

// ── TYPES ──
type WallState = "intact" | "moderate" | "severe";
type WallKey = "mesial" | "distal" | "buccal" | "lingual";
type OcclusalState = "access_only" | "moderate" | "severe";

interface WallStates {
  mesial: WallState;
  distal: WallState;
  buccal: WallState;
  lingual: WallState;
}

// ── WALL WEIGHTS (occlusal excluded from penalty) ──
const WALL_WEIGHTS: Record<WallKey, number> = {
  mesial:   22,
  distal:   22,
  buccal:   23,
  lingual:  23,
};

// ── WALL STATE CONTRIBUTIONS ──
const STATE_CONTRIBUTION: Record<WallState, number> = {
  intact:   1.0,
  moderate: 0.5,
  severe:   0.0,
};

// ── FERRULE derived from wall states ──
function computeFerrule(walls: WallStates): {
  wallsWithFerrule: number;
  penalty: number;
  label: string;
} {
  const intact   = (Object.values(walls) as WallState[]).filter(v => v === "intact").length;
  const moderate = (Object.values(walls) as WallState[]).filter(v => v === "moderate").length;
  const withFerrule = intact + moderate;

  let penalty = 0;
  let label = "";
  if (withFerrule === 4)      { penalty = 0;  label = "Adequate ferrule on all walls"; }
  else if (withFerrule === 3) { penalty = 2;  label = "Ferrule compromised on 1 wall"; }
  else if (withFerrule === 2) { penalty = 5;  label = "Ferrule on 2 walls only — insufficient"; }
  else if (withFerrule === 1) { penalty = 9;  label = "Ferrule on 1 wall only — no ferrule effect"; }
  else                         { penalty = 12; label = "No ferrule effect"; }

  return { wallsWithFerrule: withFerrule, penalty, label };
}

// ── REMAINING STRUCTURE % ──
function computeRemainingPercent(walls: WallStates, occlusal: OcclusalState): number {
  let total = 0;
  (Object.entries(walls) as [WallKey, WallState][]).forEach(([key, state]) => {
    total += WALL_WEIGHTS[key] * STATE_CONTRIBUTION[state];
  });
  // Occlusal only penalizes beyond access cavity
  if (occlusal === "moderate") total -= 5;
  if (occlusal === "severe")   total -= 10;
  return Math.max(5, Math.round(total));
}

// ── WALL STATE CONFIG ──
const WALL_CONFIG: Record<WallState, { label: string; color: string; bg: string; border: string; dot: string }> = {
  intact:   { label: "Intact",   color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/50", dot: "bg-emerald-400" },
  moderate: { label: "Moderate", color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/50",   dot: "bg-amber-400"   },
  severe:   { label: "Severe",   color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/50",     dot: "bg-red-400"     },
};

const OCCLUSAL_CONFIG: Record<OcclusalState, { label: string; color: string; bg: string; border: string }> = {
  access_only: { label: "Access cavity only",       color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/50" },
  moderate:    { label: "Moderate loss beyond access", color: "text-amber-400", bg: "bg-amber-500/15",  border: "border-amber-500/50" },
  severe:      { label: "Severe / cusp loss",        color: "text-red-400",    bg: "bg-red-500/15",    border: "border-red-500/50"  },
};

// ── WALL DIAGRAM COMPONENT ──
function WallDiagram({
  walls, occlusal, onWallChange, onOcclusalChange, remainingPercent,
}: {
  walls: WallStates;
  occlusal: OcclusalState;
  onWallChange: (wall: WallKey, state: WallState) => void;
  onOcclusalChange: (state: OcclusalState) => void;
  remainingPercent: number;
}) {
  const ferrule = computeFerrule(walls);
  const wallOrder: WallKey[] = ["buccal", "mesial", "distal", "lingual"];

  const wallLabels: Record<WallKey, { name: string; sub: string; icon: string }> = {
    buccal:  { name: "Buccal Wall",   sub: "Facial surface",  icon: "↑" },
    mesial:  { name: "Mesial Wall",   sub: "Forward proximal", icon: "←" },
    distal:  { name: "Distal Wall",   sub: "Back proximal",   icon: "→" },
    lingual: { name: "Lingual Wall",  sub: "Palatal surface", icon: "↓" },
  };

  function cycleState(current: WallState): WallState {
    const cycle: WallState[] = ["intact", "moderate", "severe"];
    return cycle[(cycle.indexOf(current) + 1) % cycle.length];
  }
  function cycleOcclusal(current: OcclusalState): OcclusalState {
    const cycle: OcclusalState[] = ["access_only", "moderate", "severe"];
    return cycle[(cycle.indexOf(current) + 1) % cycle.length];
  }

  return (
    <div className="bg-[#0a1428] border border-white/10 rounded-3xl p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Remaining Coronal Structure</h3>
          <p className="text-xs text-gray-500 mt-0.5">Click each wall to cycle: Intact → Moderate → Severe</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-[#10b981]">{remainingPercent}%</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">remaining</p>
        </div>
      </div>

      {/* Visual tooth diagram + wall cards */}
      <div className="flex flex-col lg:flex-row gap-6 items-center">

        {/* ── SVG Tooth Diagram (visual only — interactions on cards) ── */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <svg width="220" height="220" viewBox="0 0 220 220" className="w-48 h-48">
            {/* Outer ferrule ring */}
            <rect x="8" y="8" width="204" height="204" rx="28"
              fill="none"
              stroke={ferrule.wallsWithFerrule >= 3 ? "#10b981" : ferrule.wallsWithFerrule >= 2 ? "#f59e0b" : "#ef4444"}
              strokeWidth="3" strokeDasharray="6 4" opacity="0.6"
            />

            {/* Buccal */}
            <rect x="30" y="15" width="160" height="42" rx="12"
              fill={walls.buccal === "intact" ? "#10b981" : walls.buccal === "moderate" ? "#f59e0b" : "#ef4444"}
              opacity={walls.buccal === "intact" ? 0.7 : 0.5}
            />
            {/* Lingual */}
            <rect x="30" y="163" width="160" height="42" rx="12"
              fill={walls.lingual === "intact" ? "#10b981" : walls.lingual === "moderate" ? "#f59e0b" : "#ef4444"}
              opacity={walls.lingual === "intact" ? 0.7 : 0.5}
            />
            {/* Mesial */}
            <rect x="15" y="30" width="42" height="160" rx="12"
              fill={walls.mesial === "intact" ? "#10b981" : walls.mesial === "moderate" ? "#f59e0b" : "#ef4444"}
              opacity={walls.mesial === "intact" ? 0.7 : 0.5}
            />
            {/* Distal */}
            <rect x="163" y="30" width="42" height="160" rx="12"
              fill={walls.distal === "intact" ? "#10b981" : walls.distal === "moderate" ? "#f59e0b" : "#ef4444"}
              opacity={walls.distal === "intact" ? 0.7 : 0.5}
            />

            {/* Occlusal center */}
            <rect x="57" y="57" width="106" height="106" rx="16"
              fill={occlusal === "access_only" ? "#10b981" : occlusal === "moderate" ? "#f59e0b" : "#ef4444"}
              opacity={occlusal === "access_only" ? 0.6 : 0.45}
            />

            {/* Access cavity circle */}
            <circle cx="110" cy="110" r="22"
              fill={occlusal === "access_only" ? "#0a1428" : occlusal === "moderate" ? "#92400e" : "#7f1d1d"}
              opacity="0.8"
            />

            {/* Labels */}
            <text x="110" y="37" textAnchor="middle" fontSize="9" fill="white" fontWeight="600" opacity="0.9">BUCCAL</text>
            <text x="110" y="188" textAnchor="middle" fontSize="9" fill="white" fontWeight="600" opacity="0.9">LINGUAL</text>
            <text x="36" y="114" textAnchor="middle" fontSize="9" fill="white" fontWeight="600" opacity="0.9" transform="rotate(-90 36 114)">MESIAL</text>
            <text x="184" y="114" textAnchor="middle" fontSize="9" fill="white" fontWeight="600" opacity="0.9" transform="rotate(90 184 114)">DISTAL</text>
            <text x="110" y="107" textAnchor="middle" fontSize="8" fill="white" opacity="0.8">ACCESS</text>
            <text x="110" y="119" textAnchor="middle" fontSize="8" fill="white" opacity="0.8">CAVITY</text>

            {/* % overlay */}
            <text x="110" y="155" textAnchor="middle" fontSize="11" fill="#10b981" fontWeight="700">{remainingPercent}%</text>
          </svg>

          {/* Ferrule status */}
          <div className={`mt-3 px-3 py-1.5 rounded-full text-[10px] font-semibold border ${
            ferrule.wallsWithFerrule >= 4 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
            ferrule.wallsWithFerrule >= 3 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
            "bg-red-500/10 border-red-500/30 text-red-400"
          }`}>
            {ferrule.label}
          </div>
        </div>

        {/* ── Wall Cards ── */}
        <div className="flex-1 w-full space-y-2">
          {/* 4 walls */}
          {wallOrder.map((wall) => {
            const state = walls[wall];
            const cfg = WALL_CONFIG[state];
            const info = wallLabels[wall];
            return (
              <button
                key={wall}
                onClick={() => onWallChange(wall, cycleState(state))}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border ${cfg.bg} ${cfg.border} hover:opacity-90 transition-all group`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-5 text-center">{info.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{info.name}</p>
                    <p className="text-[10px] text-gray-500">{info.sub} · {WALL_WEIGHTS[wall]}% weight</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 group-hover:text-gray-400 transition-colors">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </button>
            );
          })}

          {/* Occlusal — separate with note */}
          <button
            onClick={() => onOcclusalChange(cycleOcclusal(occlusal))}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border ${OCCLUSAL_CONFIG[occlusal].bg} ${OCCLUSAL_CONFIG[occlusal].border} hover:opacity-90 transition-all group`}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-5 text-center">○</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Occlusal / Incisal</p>
                <p className="text-[10px] text-gray-500">Access cavity expected — only penalizes beyond access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                occlusal === "access_only" ? "bg-emerald-400" : occlusal === "moderate" ? "bg-amber-400" : "bg-red-400"
              }`} />
              <span className={`text-xs font-bold ${OCCLUSAL_CONFIG[occlusal].color}`}>
                {OCCLUSAL_CONFIG[occlusal].label}
              </span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 group-hover:text-gray-400 transition-colors">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/8">
        {(["intact", "moderate", "severe"] as WallState[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${WALL_CONFIG[s].dot}`} />
            <span className="text-[10px] text-gray-500 capitalize">{s}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-3 h-px border-t-2 border-dashed border-gray-500" />
          <span className="text-[10px] text-gray-500">Ferrule ring</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════
export default function EndodonticPrognosisPredictor() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { user } = useAuth();
  const isGuest = typeof window !== "undefined" && localStorage.getItem("isGuest") === "true";

  // ── Wall states (new 3-state system) ──
  const [walls, setWalls] = useState<WallStates>({
    mesial: "intact", distal: "intact", buccal: "intact", lingual: "intact",
  });
  const [occlusal, setOcclusal] = useState<OcclusalState>("access_only");

  const remainingPercent = computeRemainingPercent(walls, occlusal);

  const [formData, setFormData] = useState({
    casePresentation: "3",
    toothNumber: "",
    ageGroup: "26-40 years",    // kept for research + VPT note
    gender: "Male",
    oralHygiene: "0",
    perio: "0",
    medical: "0",
    medications: "0",           // kept for records + surgical flag only
    needHelpDiagnosis: "yes",
    painCold: "no",
    painHot: "no",
    spontaneous: "no",
    painSweets: "no",
    coldTest: "",
    percussion: "",
    sinus: "",
    swelling: "no",
    periApical: "no",
    rootTreated: "no",
    rootAccessed: "no",
    pulpalManual: "",
    periManual: "",
    endo: "0",
    instrumentSep: "no",
    sepLocation: "coronal",
    sepStage: "before",
    perforation: "no",
    perfLocation: "coronal",
    perfTime: "recent",
    prostho: "0",
  });

  const [loading, setLoading] = useState(false);

  // Save Case States
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [caseName, setCaseName]           = useState("");
  const [phoneNumber, setPhoneNumber]     = useState("");
  const [followUpDate, setFollowUpDate]   = useState("");
  const [furtherNote, setFurtherNote]     = useState("");
  const [saving, setSaving]               = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── CALCULATION ENGINE (recalibrated) ──
  const calculate = () => {
    setLoading(true);
    setTimeout(() => {

      const helpMode = formData.needHelpDiagnosis;
      let pulpal = "";
      let peri = "";
      let lesion = formData.periApical === "yes";

      // ── Auto-diagnosis ──
      if (helpMode === "yes") {
        if (formData.rootTreated === "yes") {
          pulpal = "Previously root canal treated";
        } else if (formData.rootAccessed === "yes") {
          pulpal = "Previously initiated root canal treatment";
        } else {
          const painToSweets  = formData.painSweets === "yes";
          const coldSevere    = formData.coldTest === "severe";
          const hasHotPain    = formData.painHot === "yes";

          if (painToSweets) {
            pulpal = (coldSevere || hasHotPain) ? "Irreversible Pulpitis" : "Reversible Pulpitis";
          } else if (coldSevere || hasHotPain) {
            pulpal = "Irreversible Pulpitis";
          } else if (formData.coldTest === "over") {
            pulpal = "Reversible Pulpitis";
          } else if (formData.coldTest === "no") {
            pulpal = "Pulp Necrosis";
          } else {
            pulpal = "Normal Pulp";
          }
        }

        if (formData.sinus === "traceable") {
          peri = "Chronic Apical Abscess"; lesion = true;
        } else if (formData.swelling === "yes") {
          peri = "Acute Apical Abscess"; lesion = true;
        } else if (formData.percussion === "tender") {
          peri = "Symptomatic Apical Periodontitis"; lesion = true;
        } else if (lesion) {
          peri = "Asymptomatic Apical Periodontitis";
        } else {
          peri = "Normal Apical tissue";
        }
      } else {
        pulpal = formData.pulpalManual || "Not selected";
        peri   = formData.periManual   || "Not selected";
      }

      if (["Asymptomatic Apical Periodontitis","Symptomatic Apical Periodontitis","Acute Apical Abscess","Chronic Apical Abscess"].includes(peri)) {
        lesion = true;
      }

      // ── Tooth type ──
      const toothNum    = formData.toothNumber.trim();
      const isAnterior  = ["11","12","13","21","22","23","31","32","33","41","42","43"].includes(toothNum);
      const isPremolar  = ["14","15","24","25","34","35","44","45"].includes(toothNum);
      const toothType   = isAnterior ? "Anterior" : isPremolar ? "Premolar" : "Molar";

      // ── RECALIBRATED BASELINE (literature) ──
      // Best case: 92% (no lesion), 87% (with lesion)
      let survival = lesion ? 87 : 92;

      // ── Perio deduction ──
      const basePerio    = parseInt(formData.perio)       || 0;
      const oralHygiene  = parseInt(formData.oralHygiene) || 0;
      let perioMultiplier = oralHygiene === 1 ? 1.5 : oralHygiene === 2 ? 2 : 1;
      const adjustedPerio = Math.min(10, Math.round(basePerio * perioMultiplier));

      // ── Medical deduction (ASA only — no medications penalty) ──
      const medical = parseInt(formData.medical) || 0;

      // ── Endo complexity ──
      const endo = parseInt(formData.endo) || 0;

      // ── Prostho context ──
      const context = parseInt(formData.prostho) || 0;

      // ── Structure deduction (from recalibrated wall system) ──
      const missingPercent = 100 - remainingPercent;
      const structurePenalty = missingPercent > 70 ? 12
        : missingPercent > 50 ? 8
        : missingPercent > 30 ? 4
        : missingPercent > 10 ? 2
        : 0;

      // ── Ferrule deduction ──
      const ferrule = computeFerrule(walls);
      const ferrulePenalty = ferrule.penalty;

      // ── Procedural errors ──
      let proceduralPenalty = 0;
      if (formData.instrumentSep === "yes") proceduralPenalty += 3;
      if (formData.perforation    === "yes") proceduralPenalty += 3;

      // ── Tooth type deduction ──
      if (!isAnterior)              survival -= 2;
      if (!isAnterior && !isPremolar) survival -= 2;

      // ── Apply all deductions ──
      survival -= (basePerio === 1 ? 3 : basePerio === 3 ? 8 : basePerio === 6 ? 18 : 0);
      if (oralHygiene >= 1) survival -= oralHygiene;
      survival -= (medical >= 3 ? 4 : medical >= 1 ? 1 : 0);
      survival -= (endo >= 2 ? 5 : 0);
      survival -= structurePenalty;
      survival -= Math.round(ferrulePenalty * 0.4);
      survival -= proceduralPenalty;
      survival -= (context >= 6 ? 8 : context >= 2 ? 3 : 0);

      survival = Math.max(40, Math.min(92, survival));

      // ── DPI (Dental Prognosis Index) ──
      let totalDPI = endo + adjustedPerio + structurePenalty + ferrulePenalty + context + medical;
      if (lesion) totalDPI += 1;
      totalDPI += proceduralPenalty;

      // ── Retention decision ──
      const requiredSurvival  = isAnterior ? 55 : isPremolar ? 60 : 65;
      const requiredStructure = isAnterior ? 5  : isPremolar ? 20 : 30;
      const isRestorable      = survival >= requiredSurvival && remainingPercent >= requiredStructure;

      // ── Affecting factors ──
      const affectingFactors: string[] = [];

      // Structure text (ferrule derived from walls)
      const missingFerruleWalls = (Object.values(walls) as WallState[]).filter(v => v === "severe").length;
      let structureText = "";
      if (missingPercent > 0) {
        structureText = `${missingPercent}% loss of coronal tooth structure`;
        if (missingFerruleWalls >= 3)      structureText += " with no ferrule effect";
        else if (missingFerruleWalls >= 1) structureText += " with insufficient ferrule";
      } else {
        structureText = "Adequate remaining coronal structure";
      }
      affectingFactors.push(structureText);

      if (lesion)          affectingFactors.push("Presence of periapical lesion");
      if (basePerio >= 3)  affectingFactors.push("Advanced periodontal disease");
      if (medical >= 1)    affectingFactors.push("Medical compromise (ASA II or higher)");
      if (endo >= 2)       affectingFactors.push("High endodontic complexity");
      if (formData.instrumentSep === "yes") affectingFactors.push("Instrument separation");
      if (formData.perforation   === "yes") affectingFactors.push("Root perforation");
      if (context >= 1)    affectingFactors.push("Prosthodontic complexity");
      if (oralHygiene >= 1) affectingFactors.push("Non-compliance with oral hygiene measures");

      const finalFactors = affectingFactors.slice(0, 6);

      // ── Treatment recommendation ──
      const treatmentRec = isRestorable
        ? (pulpal === "Previously root canal treated" ? "Root Canal Retreatment"
           : endo === 6 ? "Microsurgical Endodontics"
           : pulpal === "Reversible Pulpitis" ? "Vital Pulp Therapy"
           : "Root Canal Treatment")
        : "";

      // ── VPT age note (age only affects VPT commentary) ──
      let vptAgeNote = "";
      if (treatmentRec === "Vital Pulp Therapy") {
        const ageGroup = formData.ageGroup;
        if (ageGroup === "1-12 years" || ageGroup === "13-25 years") {
          vptAgeNote = "Favorable age for vital pulp therapy — enhanced healing and pulp regeneration expected.";
        } else if (ageGroup === "Over 40 years") {
          vptAgeNote = "Note: pulp vascularity may be reduced with age — assess pulp vitality carefully before proceeding with VPT.";
        }
      }

      // ── Medications surgical flag ──
      let medicationFlag = "";
      if (parseInt(formData.medications) >= 2 && parseInt(formData.prostho) >= 1) {
        medicationFlag = "Patient is on medications requiring modification — if surgical procedures are planned, consider MRONJ risk and specialist consultation.";
      }

      // ── Explanation note ──
      const explanationNote = isRestorable
        ? `This tooth is considered <strong>practical to retain</strong> because the estimated 4-year survival rate meets the minimum threshold required for a ${toothType} tooth. The remaining coronal structure (${remainingPercent}%) provides acceptable foundation for final restoration.`
        : `Retention of this tooth is considered <strong>impractical</strong>. The estimated 4-year survival rate (${survival.toFixed(1)}%) falls below the acceptable threshold for a ${toothType} tooth.`;

      const casePresText = formData.casePresentation === "3" ? "Asymptomatic" : formData.casePresentation === "2" ? "Symptomatic without swelling" : "Symptomatic with swelling";
      const introParagraph = `The case presented is related to a <strong>${formData.gender.toLowerCase()}</strong> patient, age between <strong>${formData.ageGroup}</strong>. Tooth <strong>#${toothNum}</strong> (${toothType} tooth) is <strong>${casePresText.toLowerCase()}</strong> with <strong>${remainingPercent}%</strong> remaining coronal tooth structure.`;

      const resultData = {
        toothNumber: formData.toothNumber,
        survivalPercentage: survival,
        isPractical: isRestorable,
        totalDPI: totalDPI,
        pulpalDiagnosis: pulpal,
        periapicalDiagnosis: peri,
        remainingPercent: remainingPercent,
        procedureCategory: detectProcedureCategory(pulpal, treatmentRec, isRestorable),
        formData: { ...formData },
        walls: { ...walls },
        occlusal,
        ferrule,
        treatmentRec,
        toothType,
        explanationNote,
        introParagraph,
        casePresText,
        affectingFactors: finalFactors,
        vptAgeNote,
        medicationFlag,
      };

      localStorage.setItem("lastCalculationResult", JSON.stringify(resultData));
      setLoading(false);
      router.push("/predictor/result");

    }, 800);
  };

  // ── Save Case ──
  const handleSaveCase = async () => {
    if (!caseName?.trim() || !phoneNumber?.trim()) {
      alert("Please fill in Case Name and Phone Number");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "cases"), {
        caseName: caseName.trim(),
        phoneNumber: phoneNumber.trim(),
        followUpDate: followUpDate || null,
        gender: formData.gender || "",
        ageGroup: formData.ageGroup || "",
        asa: formData.medical || "I",
        toothNumber: formData.toothNumber || "",
        toothType: ["11","12","13","21","22","23","31","32","33","41","42","43"].includes(formData.toothNumber) ? "Anterior" : ["14","15","24","25","34","35","44","45"].includes(formData.toothNumber) ? "Premolar" : "Molar",
        pulpalDiagnosis: formData.pulpalManual || "",
        periapicalDiagnosis: formData.periManual || "",
        periapicalLesion: formData.periApical || "no",
        periodontalStatus: formData.perio || "0",
        proceduralError: formData.instrumentSep === "yes" ? "Instrument Separation" : formData.perforation === "yes" ? "Perforation" : "None",
        remainingStructure: remainingPercent,
        walls: { ...walls },
        occlusal,
        furtherNote: furtherNote.trim(),
        createdAt: serverTimestamp(),
        userId: user?.uid,
        savedAt: new Date().toISOString(),
      });
      alert("Case saved successfully!");
      setShowSaveModal(false);
      setCaseName(""); setPhoneNumber(""); setFollowUpDate(""); setFurtherNote("");
    } catch (error: any) {
      console.error("Save failed:", error);
      alert("Failed to save the case. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── SELECT STYLE ──
  const sel = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors";

  return (
    <ProtectedRoute>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">

        {/* ── HERO ── */}
        <div className="relative h-[320px] md:h-[380px] bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: "url('https://iili.io/Bw4dt99.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#0a1428]" />

          {/* Logo top left */}
          <div className="absolute top-5 left-6 z-20">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={160}
              height={55}
              className="h-10 w-auto"
              priority
            />
          </div>

          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 pt-8">
            <p className="text-[11px] tracking-[4px] text-[#10b981]/70 uppercase mb-3">Clinical Decision Tool</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-[#10b981] via-white to-[#10b981] bg-clip-text text-transparent" style={{ fontFamily: "Playfair Display, serif" }}>
              Endodontic Prognosis Predictor
            </h1>
            <p className="text-gray-300 text-base md:text-lg">Evidence-based 4-year tooth survival estimate</p>
            <div className="flex items-center gap-6 mt-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#10b981]">92%</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Best case baseline</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">87%</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">With periapical lesion</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">2-step</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Assessment flow</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── PROGRESS ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-2">
          <div className="flex items-center gap-3 mb-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                  step >= s ? "bg-[#10b981] text-black" : "bg-white/10 text-gray-500"
                }`}>{s}</div>
                <div className={`flex-1 h-1 rounded-full transition-all ${step > s ? "bg-[#10b981]" : step === s ? "bg-[#10b981]/40" : "bg-white/10"}`} />
              </div>
            ))}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${step >= 2 ? "bg-[#10b981] text-black" : "bg-white/10 text-gray-500"}`}>✓</div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 uppercase tracking-wider px-0">
            <span>Patient & Structure</span>
            <span className="text-right">Diagnosis & Treatment</span>
          </div>
        </div>

        {/* ── FORM CONTENT ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20">

          {/* ════════════════ STEP 1 ════════════════ */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Case & Tooth */}
              <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 rounded-full bg-[#3b82f6]" />
                  <h3 className="font-semibold text-white">Case Presentation</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Presentation</label>
                    <select name="casePresentation" value={formData.casePresentation} onChange={handleChange} className={sel}>
                      <option value="3">Asymptomatic</option>
                      <option value="2">Symptomatic without swelling</option>
                      <option value="1">Symptomatic with swelling</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Tooth Number (FDI)</label>
                    <select name="toothNumber" value={formData.toothNumber} onChange={handleChange} className={sel}>
                      <option value="">Select tooth number</option>
                      {["11","12","13","14","15","16","17","18","21","22","23","24","25","26","27","28",
                        "31","32","33","34","35","36","37","38","41","42","43","44","45","46","47","48"].map(n => (
                        <option key={n} value={n}>#{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 rounded-full bg-amber-500" />
                  <h3 className="font-semibold text-white">Patient Information</h3>
                  <span className="ml-2 text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">Collected for records & research</span>
                </div>
                <div className="grid md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Age Group</label>
                    <select name="ageGroup" value={formData.ageGroup} onChange={handleChange} className={sel}>
                      <option value="1-12 years">1–12 years</option>
                      <option value="13-25 years">13–25 years</option>
                      <option value="26-40 years">26–40 years</option>
                      <option value="Over 40 years">Over 40 years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className={sel}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Medications</label>
                    <select name="medications" value={formData.medications} onChange={handleChange} className={sel}>
                      <option value="0">Not taken</option>
                      <option value="1">Does not require modifications</option>
                      <option value="2">Requires modifications</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Systemic */}
              <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 rounded-full bg-emerald-500" />
                  <h3 className="font-semibold text-white">Systemic & Periodontal</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Medical Status (ASA)</label>
                    <select name="medical" value={formData.medical} onChange={handleChange} className={sel}>
                      <option value="0">ASA I – Medically fit</option>
                      <option value="1">ASA II – Controlled medical condition</option>
                      <option value="3">ASA III – Uncontrolled medical condition</option>
                      <option value="6">ASA IV or higher</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Oral Hygiene</label>
                    <select name="oralHygiene" value={formData.oralHygiene} onChange={handleChange} className={sel}>
                      <option value="0">Compliant / Good</option>
                      <option value="1">Fair</option>
                      <option value="2">Neglected / Poor</option>
                    </select>
                  </div>
                </div>
                <div className="mt-5">
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Periodontal Status</label>
                  <select name="perio" value={formData.perio} onChange={handleChange} className={sel}>
                    <option value="0">Healthy periodontium</option>
                    <option value="1">Gingivitis</option>
                    <option value="3">Initial and moderate periodontitis</option>
                    <option value="6">Advanced periodontal disease / mobility / probing depth &gt;5 mm</option>
                  </select>
                </div>
              </div>

              {/* ── WALL DIAGRAM ── */}
              <WallDiagram
                walls={walls}
                occlusal={occlusal}
                onWallChange={(wall, state) => setWalls(prev => ({ ...prev, [wall]: state }))}
                onOcclusalChange={setOcclusal}
                remainingPercent={remainingPercent}
              />

              <button
                onClick={() => setStep(2)}
                className="w-full bg-[#10b981] hover:bg-[#0ea76e] text-black font-bold py-5 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-[#10b981]/20"
              >
                Next → Clinical Examination & Diagnosis
              </button>
            </div>
          )}

          {/* ════════════════ STEP 2 ════════════════ */}
          {step === 2 && (
            <div className="space-y-5">

              {/* Diagnosis mode */}
              <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 rounded-full bg-[#3b82f6]" />
                  <h3 className="font-semibold text-white">Endodontic Diagnosis</h3>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Diagnosis Mode</label>
                  <select name="needHelpDiagnosis" value={formData.needHelpDiagnosis} onChange={handleChange} className={sel}>
                    <option value="yes">Assisted — use automatic investigation</option>
                    <option value="no">Manual — I will select diagnosis directly</option>
                  </select>
                </div>
              </div>

              {/* Auto investigation */}
              {formData.needHelpDiagnosis === "yes" && (
                <div className="bg-[#0d1a30] border border-[#3b82f6]/30 rounded-3xl p-6 md:p-8">
                  <h4 className="text-sm font-semibold text-[#3b82f6] mb-5 uppercase tracking-wider">Endodontic Investigation</h4>

                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">1. History of Chief Complaint</p>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {[
                      { name: "painCold",  label: "Pain with Cold" },
                      { name: "painHot",   label: "Pain with Hot" },
                      { name: "spontaneous", label: "Spontaneous Pain" },
                      { name: "painSweets", label: "Pain to Sweets" },
                    ].map(f => (
                      <div key={f.name}>
                        <label className="block text-xs text-gray-500 mb-2">{f.label}</label>
                        <select name={f.name} value={formData[f.name as keyof typeof formData]} onChange={handleChange} className={sel}>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">2. Clinical Findings</p>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Cold Testing</label>
                      <select name="coldTest" value={formData.coldTest} onChange={handleChange} className={sel}>
                        <option value="">Select</option>
                        <option value="normal">Within normal limit</option>
                        <option value="over">Over stimulation (&lt;30 seconds)</option>
                        <option value="severe">Severe stimulation (&gt;30 seconds)</option>
                        <option value="no">No response</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Percussion Test</label>
                      <select name="percussion" value={formData.percussion} onChange={handleChange} className={sel}>
                        <option value="">Select</option>
                        <option value="tender">Tender to percussion</option>
                        <option value="no">No tenderness</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Sinus Tract</label>
                      <select name="sinus" value={formData.sinus} onChange={handleChange} className={sel}>
                        <option value="">Select</option>
                        <option value="traceable">Traceable sinus tract</option>
                        <option value="not-traceable">Sinus tract — not traceable</option>
                        <option value="no">No sinus tract</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Swelling</label>
                      <select name="swelling" value={formData.swelling} onChange={handleChange} className={sel}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">3. Radiographic Findings</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Periapical Lesion</label>
                      <select name="periApical" value={formData.periApical} onChange={handleChange} className={sel}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Root Canal Treated</label>
                      <select name="rootTreated" value={formData.rootTreated} onChange={handleChange} className={sel}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Canal System Accessed</label>
                      <select name="rootAccessed" value={formData.rootAccessed} onChange={handleChange} className={sel}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual diagnosis */}
              {formData.needHelpDiagnosis === "no" && (
                <div className="bg-[#0d1a30] border border-[#10b981]/30 rounded-3xl p-6 md:p-8">
                  <h4 className="text-sm font-semibold text-[#10b981] mb-5 uppercase tracking-wider">Manual Diagnosis</h4>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Pulpal Diagnosis</label>
                      <select name="pulpalManual" value={formData.pulpalManual} onChange={handleChange} className={sel}>
                        <option value="">Select</option>
                        <option value="Reversible Pulpitis">Reversible Pulpitis</option>
                        <option value="Irreversible Pulpitis">Irreversible Pulpitis</option>
                        <option value="Pulp Necrosis">Pulp Necrosis</option>
                        <option value="Previously initiated root canal treatment">Previously initiated RCT</option>
                        <option value="Previously root canal treated">Previously root canal treated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Periapical Diagnosis</label>
                      <select name="periManual" value={formData.periManual} onChange={handleChange} className={sel}>
                        <option value="">Select</option>
                        <option value="Normal Apical tissue">Normal Apical tissue</option>
                        <option value="Symptomatic Apical Periodontitis">Symptomatic Apical Periodontitis</option>
                        <option value="Asymptomatic Apical Periodontitis">Asymptomatic Apical Periodontitis</option>
                        <option value="Acute Apical Abscess">Acute Apical Abscess</option>
                        <option value="Chronic Apical Abscess">Chronic Apical Abscess</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Endo complexity + procedural */}
              <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 rounded-full bg-amber-500" />
                  <h3 className="font-semibold text-white">Endodontic Complexity</h3>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Endodontic Score</label>
                    <select name="endo" value={formData.endo} onChange={handleChange} className={sel}>
                      <option value="0">No treatment required</option>
                      <option value="1">Accessible root canal treatment or retreatment</option>
                      <option value="2">Challenging anatomy / complex retreatment</option>
                      <option value="6">Untreatable root canal system</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Instrument Separation</label>
                    <select name="instrumentSep" value={formData.instrumentSep} onChange={handleChange} className={sel}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    {formData.instrumentSep === "yes" && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Location</label>
                          <select name="sepLocation" value={formData.sepLocation} onChange={handleChange} className={sel}>
                            <option value="coronal">Coronal</option>
                            <option value="middle">Middle</option>
                            <option value="apical">Apical</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Stage</label>
                          <select name="sepStage" value={formData.sepStage} onChange={handleChange} className={sel}>
                            <option value="before">Before cleaning</option>
                            <option value="after">After cleaning</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Perforation</label>
                    <select name="perforation" value={formData.perforation} onChange={handleChange} className={sel}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    {formData.perforation === "yes" && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Location</label>
                          <select name="perfLocation" value={formData.perfLocation} onChange={handleChange} className={sel}>
                            <option value="coronal">Coronal</option>
                            <option value="middle">Middle</option>
                            <option value="apical">Apical</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Time</label>
                          <select name="perfTime" value={formData.perfTime} onChange={handleChange} className={sel}>
                            <option value="recent">Recent</option>
                            <option value="old">Old</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Prostho context */}
              <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 rounded-full bg-purple-500" />
                  <h3 className="font-semibold text-white">Prosthodontic Context</h3>
                </div>
                <select name="prostho" value={formData.prostho} onChange={handleChange} className={sel}>
                  <option value="0">Isolated dental problem</option>
                  <option value="1">Prosthodontic plan / abutment</option>
                  <option value="2">Complex prosthodontic plan</option>
                  <option value="6">Retention would compromise plan</option>
                </select>
              </div>

              {/* Nav buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white/8 hover:bg-white/15 border border-white/10 py-5 rounded-2xl text-sm font-semibold transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={calculate}
                  disabled={loading}
                  className="flex-[2] bg-[#10b981] hover:bg-[#0ea76e] disabled:bg-gray-700 text-black font-bold py-5 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-[#10b981]/20 disabled:text-gray-400"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Calculating...
                    </span>
                  ) : "Generate Result Summary →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── SAVE MODAL ── */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] px-4">
            <div className="bg-[#0d1a30] rounded-3xl p-8 max-w-md w-full border border-white/15">
              <h3 className="text-xl font-bold mb-6 text-[#10b981]">Save Case</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Case Name <span className="text-red-400">*</span></label>
                  <input type="text" value={caseName} onChange={(e) => setCaseName(e.target.value)}
                    className="w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981]"
                    placeholder="e.g. Ahmed - Tooth 36" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Phone Number <span className="text-red-400">*</span></label>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981]"
                    placeholder="+966 50 123 4567" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Follow-up Date</label>
                  <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Further Notes</label>
                  <textarea value={furtherNote} onChange={(e) => setFurtherNote(e.target.value)}
                    className="w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#10b981] h-24 resize-y"
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
                  {saving ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Saving...</> : "Save Case"}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="text-center py-8 text-xs text-gray-600">
          © 2026 Endoprognosis Project. All rights reserved.
        </footer>
      </div>
    </ProtectedRoute>
  );
}