"use client";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { detectProcedureCategory } from "../lib/casesService";
import Image from "next/image";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
type WallState         = "intact" | "moderate" | "severe";
type WallKey           = "mesial" | "distal" | "buccal" | "lingual";
type OcclusalState     = "access_only" | "moderate" | "severe";
type PocketLevel       = "normal" | "attachment" | "deep";
type Urgency           = "low" | "medium" | "high";
type CrownPrepLevel    = "not_applicable" | "minimal" | "moderate" | "aggressive" | "cannot_assess";
type RestorationStatus = "none" | "veneer" | "inlay" | "onlay" | "endocrown" | "crown";
type ObturationQuality  = "adequate" | "inadequate";
type RestorationQuality = "good" | "poor";
type PostWithoutCrown   = "no" | "yes";
type PreviousAttempts   = "first" | "second" | "third_or_more";

interface WallStates { mesial: WallState; distal: WallState; buccal: WallState; lingual: WallState; }
interface ProbingSite { id: string; label: string; short: string; cx: number; cy: number; level: PocketLevel; }

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════
const WALL_WEIGHTS: Record<WallKey, number> = { mesial: 22, distal: 22, buccal: 23, lingual: 23 };
const STATE_CONTRIBUTION: Record<WallState, number> = { intact: 1.0, moderate: 0.5, severe: 0.0 };

const WALL_CONFIG: Record<WallState, { label: string; color: string; bg: string; border: string; dot: string }> = {
  intact:   { label: "Intact",   color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/50", dot: "bg-emerald-400" },
  moderate: { label: "Moderate", color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/50",   dot: "bg-amber-400"   },
  severe:   { label: "Severe",   color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/50",     dot: "bg-red-400"     },
};

const OCCLUSAL_CONFIG: Record<OcclusalState, { label: string; color: string; bg: string; border: string }> = {
  access_only: { label: "Access cavity only",          color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/50" },
  moderate:    { label: "Moderate loss beyond access", color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/50"   },
  severe:      { label: "Severe / cusp loss",          color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/50"     },
};

const POCKET_COLOR: Record<PocketLevel, string>  = { normal: "#10b981", attachment: "#f59e0b", deep: "#ef4444" };
const POCKET_CYCLE: Record<PocketLevel, PocketLevel> = { normal: "attachment", attachment: "deep", deep: "normal" };
const POCKET_LABEL: Record<PocketLevel, string>  = { normal: "Normal (<3mm)", attachment: "Attachment loss (3–4mm)", deep: "Deep (≥5mm) — Iowa trigger" };

const INITIAL_SITES: ProbingSite[] = [
  { id: "mb", label: "Mesio-Buccal",  short: "MB", cx: 100, cy: 92,  level: "normal" },
  { id: "b",  label: "Buccal",        short: "B",  cx: 160, cy: 68,  level: "normal" },
  { id: "db", label: "Disto-Buccal",  short: "DB", cx: 220, cy: 92,  level: "normal" },
  { id: "ml", label: "Mesio-Lingual", short: "ML", cx: 100, cy: 192, level: "normal" },
  { id: "l",  label: "Lingual",       short: "L",  cx: 160, cy: 216, level: "normal" },
  { id: "dl", label: "Disto-Lingual", short: "DL", cx: 220, cy: 192, level: "normal" },
];

const URGENCY_CONFIG: Record<Urgency, { label: string; sub: string; accent: string; accentDim: string; heroBg: string; badge: string; badgeText: string }> = {
  low:    { label: "Asymptomatic",              sub: "Elective — low urgency",           accent: "#10b981", accentDim: "#10b98130", heroBg: "from-emerald-950/80 via-[#0a1428]/90 to-[#0a1428]", badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400", badgeText: "Low Urgency" },
  medium: { label: "Symptomatic — No Swelling", sub: "Prompt treatment — medium urgency", accent: "#f59e0b", accentDim: "#f59e0b30", heroBg: "from-amber-950/80 via-[#0a1428]/90 to-[#0a1428]",   badge: "bg-amber-500/15 border-amber-500/40 text-amber-400",   badgeText: "Medium Urgency" },
  high:   { label: "Symptomatic — Swelling",    sub: "Urgent treatment required",         accent: "#ef4444", accentDim: "#ef444430", heroBg: "from-red-950/80 via-[#0a1428]/90 to-[#0a1428]",     badge: "bg-red-500/15 border-red-500/40 text-red-400",         badgeText: "High Urgency" },
};

// ── Restoration pre-fill map ──
const RESTORATION_PREFILL: Record<RestorationStatus, { walls: WallStates; occlusal: OcclusalState; note: string }> = {
  none:      { walls: { mesial: "intact",    distal: "intact",    buccal: "intact",    lingual: "intact"    }, occlusal: "access_only", note: "" },
  veneer:    { walls: { mesial: "intact",    distal: "intact",    buccal: "intact",    lingual: "intact"    }, occlusal: "access_only", note: "Buccal wall assumed intact — veneers are placed on sound tooth structure. Adjust individual walls if additional restorations are present on this tooth." },
  inlay:     { walls: { mesial: "intact",    distal: "intact",    buccal: "intact",    lingual: "intact"    }, occlusal: "moderate",    note: "Inlay preparation — cusps intact, central occlusal structure partially reduced. Adjust individual walls if needed." },
  onlay:     { walls: { mesial: "intact",    distal: "intact",    buccal: "intact",    lingual: "intact"    }, occlusal: "severe",      note: "Onlay preparation — cusp coverage applied, occlusal set to severe. Axial walls typically intact; adjust if clinical findings differ." },
  endocrown: { walls: { mesial: "moderate",  distal: "moderate",  buccal: "moderate",  lingual: "moderate"  }, occlusal: "severe",      note: "Endocrown — ferrule effect is absent by design. Retention relies entirely on pulp chamber adhesion and bonding surface area. Fracture risk is the dominant concern in this restoration type." },
  crown:     { walls: { mesial: "intact",    distal: "intact",    buccal: "intact",    lingual: "intact"    }, occlusal: "access_only", note: "" },
};

// ── Crown prep wall pre-fill ──
const CROWN_PREP_WALLS: Record<"minimal" | "moderate" | "aggressive", { walls: WallStates; occlusal: OcclusalState }> = {
  minimal:    { walls: { mesial: "intact",   distal: "intact",   buccal: "intact",   lingual: "intact"   }, occlusal: "access_only" },
  moderate:   { walls: { mesial: "moderate", distal: "moderate", buccal: "intact",   lingual: "intact"   }, occlusal: "moderate"    },
  aggressive: { walls: { mesial: "severe",   distal: "severe",   buccal: "severe",   lingual: "severe"   }, occlusal: "severe"      },
};

// ════════════════════════════════════════════════════════════
// CALCULATION HELPERS
// ════════════════════════════════════════════════════════════
function computeFerrule(walls: WallStates): { wallsWithFerrule: number; penalty: number; label: string } {
  const i = (Object.values(walls) as WallState[]).filter(v => v === "intact").length;
  const m = (Object.values(walls) as WallState[]).filter(v => v === "moderate").length;
  const w = i + m;
  const penalty = w === 4 ? 0 : w === 3 ? 2 : w === 2 ? 5 : w === 1 ? 9 : 12;
  const label   = w === 4 ? "Adequate ferrule on all walls" : w === 3 ? "Ferrule compromised on 1 wall" : w === 2 ? "Ferrule on 2 walls only — insufficient" : w === 1 ? "Ferrule on 1 wall only — no ferrule effect" : "No ferrule effect";
  return { wallsWithFerrule: w, penalty, label };
}

function computeRemainingPercent(walls: WallStates, occlusal: OcclusalState): number {
  let total = 0;
  (Object.entries(walls) as [WallKey, WallState][]).forEach(([k, s]) => { total += WALL_WEIGHTS[k] * STATE_CONTRIBUTION[s]; });
  if (occlusal === "moderate") total -= 5;
  if (occlusal === "severe")   total -= 10;
  return Math.max(5, Math.round(total));
}

// ════════════════════════════════════════════════════════════
// DIAGNOSIS LOGIC
// ════════════════════════════════════════════════════════════
function derivePulpalDiagnosis(form: any): { diagnosis: string; isInconsistent: boolean; inconsistencyNote: string } {
  if (form.rootTreated  === "yes") return { diagnosis: "Previously Treated",           isInconsistent: false, inconsistencyNote: "" };
  if (form.rootAccessed === "yes") return { diagnosis: "Previously Initiated Therapy", isInconsistent: false, inconsistencyNote: "" };
  const cold = form.coldTest; const sp = form.spontaneous === "yes"; const no = form.nocturnal === "yes";
  if (cold === "none" && (sp || no)) return { diagnosis: "Pulp Necrosis", isInconsistent: true, inconsistencyNote: "Inconsistent finding: no cold response with spontaneous pain may indicate partial necrosis. Pulp Necrosis recorded — correlate with radiographic findings." };
  if (cold === "none")             return { diagnosis: "Pulp Necrosis",         isInconsistent: false, inconsistencyNote: "" };
  if (cold === "lingering_long" || sp || no) return { diagnosis: "Irreversible Pulpitis", isInconsistent: false, inconsistencyNote: "" };
  if (cold === "lingering_short")  return { diagnosis: "Reversible Pulpitis",   isInconsistent: false, inconsistencyNote: "" };
  if (cold === "normal")           return { diagnosis: "Normal Pulp",           isInconsistent: false, inconsistencyNote: "" };
  return { diagnosis: "Not determined", isInconsistent: false, inconsistencyNote: "" };
}

function derivePeriapicalDiagnosis(form: any): { diagnosis: string; isInconsistent: boolean; inconsistencyNote: string } {
  const sw = form.swelling==="yes", si = form.sinus==="yes", pe = form.percussion==="yes", pa = form.palpation==="yes", le = form.periApical==="yes";
  if (sw && si) return { diagnosis: "Acute Apical Abscess",              isInconsistent: true,  inconsistencyNote: "Swelling and sinus tract reported simultaneously. Acute Apical Abscess recorded — verify whether sinus is draining the swelling." };
  if (sw)       return { diagnosis: "Acute Apical Abscess",              isInconsistent: false, inconsistencyNote: "" };
  if (si)       return { diagnosis: "Chronic Apical Abscess",            isInconsistent: false, inconsistencyNote: "" };
  if (pe || pa) return { diagnosis: "Symptomatic Apical Periodontitis",  isInconsistent: false, inconsistencyNote: "" };
  if (le)       return { diagnosis: "Asymptomatic Apical Periodontitis", isInconsistent: false, inconsistencyNote: "" };
  return { diagnosis: "Normal Apical Tissues", isInconsistent: false, inconsistencyNote: "" };
}

function calcIowaStage(deepCount: number, marginalRidge: boolean, periDx: string): { stage: string; successRate: number; label: string } {
  if (deepCount >= 1) return { stage: "IV", successRate: 41, label: "Extension into periodontium — pocket ≥5mm" };
  if (!marginalRidge) return { stage: "I",  successRate: 93, label: "Crack within crown — no distal ridge involvement" };
  const isIII = ["Asymptomatic Apical Periodontitis","Symptomatic Apical Periodontitis","Acute Apical Abscess","Chronic Apical Abscess"].includes(periDx);
  return isIII ? { stage: "III", successRate: 69, label: "Crack with periapical involvement" } : { stage: "II", successRate: 84, label: "Crack across distal marginal ridge — no periapical involvement" };
}

function calcTier4(p: { rootTreated: boolean; existingObturation: ObturationQuality; restorationQuality: RestorationQuality; postWithoutCrown: PostWithoutCrown; previousAttempts: PreviousAttempts }): { tier4Deductions: number; isPostWithoutCrownOverride: boolean; obturationNarrative: string; tier4Factors: string[] } {
  if (!p.rootTreated) return { tier4Deductions: 0, isPostWithoutCrownOverride: false, obturationNarrative: "", tier4Factors: [] };
  let d = 0; const f: string[] = [];
  if (p.existingObturation === "inadequate") { d += 3; f.push("Inadequate pre-existing obturation — intraradicular cause likely; correctable with thorough retreatment"); }
  else f.push("Adequate pre-existing obturation — consider extraradicular cause (radicular cyst, scar tissue, VRF)");
  if (p.restorationQuality === "poor") { d += 8; f.push("Poor coronal restoration quality — 6.9–7.2× higher failure risk (Zgur-Er 2025)"); }
  const isPWC = p.postWithoutCrown === "yes";
  if (isPWC) { d += 18; f.push("Post present without full coverage crown — survival 25.6%; 100% extractions fracture-related (Zgur-Er 2025). Full coverage mandatory."); }
  if (p.previousAttempts === "second")        { d += 3; f.push("Second retreatment attempt — additional dentin loss, elevated treatment-resistant biofilm"); }
  else if (p.previousAttempts === "third_or_more") { d += 7; f.push("Third or more retreatment — severely compromised prognosis; surgical option should be evaluated"); }
  const narrative = p.existingObturation === "inadequate"
    ? "The pre-existing root canal filling was inadequate, suggesting an intraradicular cause correctable with thorough retreatment."
    : "The pre-existing filling was adequate — consider extraradicular cause before proceeding.";
  return { tier4Deductions: d, isPostWithoutCrownOverride: isPWC, obturationNarrative: narrative, tier4Factors: f };
}

function calculatePrognosis(p: {
  toothNumber: string; walls: WallStates; occlusal: OcclusalState; remainingPercent: number;
  perio: string; oralHygiene: string; medical: string; endo: string;
  instrumentSep: boolean; sepLocation: string; sepStage: string;
  perforation: boolean; perfLocation: string; perfTime: string; prostho: string; periApical: boolean;
  rootTreated: boolean; existingObturation: ObturationQuality; restorationQuality: RestorationQuality;
  postWithoutCrown: PostWithoutCrown; previousAttempts: PreviousAttempts;
}): { survival: number; survivalRange: [number,number]; totalDPI: number; isPractical: boolean; threshold: number; toothType: string; isImpracticalOverride: boolean; overrideReason: string; tier1Deductions: number; tier2Deductions: number; tier3Deductions: number; tier4Deductions: number; isPostWithoutCrownOverride: boolean; obturationNarrative: string; tier4Factors: string[] } {
  const isA = ["11","12","13","21","22","23","31","32","33","41","42","43"].includes(p.toothNumber);
  const isP = ["14","15","24","25","34","35","44","45"].includes(p.toothNumber);
  const toothType = isA ? "Anterior" : isP ? "Premolar" : "Molar";
  const threshold = isA ? 55 : isP ? 60 : 65;
  let survival = p.periApical ? 87 : 92;

  let t1 = 0;
  if (!isA && !isP) t1 += 4; else if (!isA) t1 += 2;
  const miss = 100 - p.remainingPercent;
  t1 += miss > 70 ? 12 : miss > 50 ? 8 : miss > 30 ? 4 : miss > 10 ? 2 : 0;
  const ferrule = computeFerrule(p.walls);
  t1 += Math.round(ferrule.penalty * 0.4);
  const ev = parseInt(p.endo) || 0;
  if (ev === 10) t1 += 10; else if (ev === 5) t1 += 5;

  let t2 = 0;
  const pv = parseInt(p.perio) || 0;
  const pb = pv >= 6 ? 10 : pv === 3 ? 5 : pv === 1 ? 2 : 0;
  const ov = parseInt(p.oralHygiene) || 0;
  t2 += Math.round(pb * (ov === 2 ? 2.0 : ov === 1 ? 1.5 : 1.0));
  const mv = parseInt(p.medical) || 0;
  t2 += mv >= 6 ? 8 : mv >= 3 ? 4 : mv >= 1 ? 1 : 0;

  let t3 = 0;
  if (p.instrumentSep) { let s = 3; if (p.sepLocation==="middle") s++; if (p.sepLocation==="coronal"||p.sepStage==="before") s+=2; t3+=Math.min(s,5); }
  if (p.perforation)   { let s = 3; if (p.perfTime==="old") s+=2; else if (p.perfLocation==="coronal") s++; t3+=Math.min(s,5); }
  const ct3 = Math.min(t3, Math.max(0, survival - t1 - t2 - threshold));

  const r4 = calcTier4({ rootTreated: p.rootTreated, existingObturation: p.existingObturation, restorationQuality: p.restorationQuality, postWithoutCrown: p.postWithoutCrown, previousAttempts: p.previousAttempts });

  survival = Math.round(survival - t1 - t2 - ct3 - r4.tier4Deductions);
  survival = Math.max(35, Math.min(92, survival));
  const pv2 = parseInt(p.prostho) || 0;
  if (pv2 >= 6) survival -= 8; else if (pv2 >= 2) survival -= 3; else if (pv2 >= 1) survival -= 1;
  survival = Math.max(35, survival);

  const isPractical = survival >= threshold;
  const isImp = ev === 10 && !isA;
  return {
    survival, survivalRange: [Math.max(0,survival-3),Math.min(100,survival+3)],
    totalDPI: t1+t2+ct3+r4.tier4Deductions+(p.periApical?1:0)+pv2,
    isPractical: (isImp||r4.isPostWithoutCrownOverride)?false:isPractical,
    threshold, toothType, isImpracticalOverride: isImp,
    overrideReason: isImp?"Untreatable canal system in a non-anterior tooth — surgical access required":r4.isPostWithoutCrownOverride?"Post without full coverage crown — full coverage required before retreatment":"",
    tier1Deductions: t1, tier2Deductions: t2, tier3Deductions: ct3,
    tier4Deductions: r4.tier4Deductions, isPostWithoutCrownOverride: r4.isPostWithoutCrownOverride,
    obturationNarrative: r4.obturationNarrative, tier4Factors: r4.tier4Factors,
  };
}

function deriveTreatmentRec(pulpalDx: string, isPractical: boolean, endoVal: number): string {
  if (!isPractical) return "";
  if (pulpalDx === "Normal Pulp")              return "No Endodontic Treatment Indicated";
  if (pulpalDx === "Previously Treated")       return "Root Canal Retreatment";
  if (pulpalDx === "Previously Initiated Therapy") return "Root Canal Treatment";
  if (pulpalDx === "Reversible Pulpitis")      return "Vital Pulp Therapy";
  if (endoVal === 10)                          return "Microsurgical Endodontics (if surgically accessible)";
  return "Root Canal Treatment";
}

function buildAffectingFactors(p: {
  remainingPercent: number; walls: WallStates; periApical: boolean; perio: string;
  oralHygiene: string; medical: string; endoVal: number; instrumentSep: boolean;
  perforation: boolean; prosthoVal: number; ferrule: { wallsWithFerrule: number; label: string };
  tier4Factors: string[]; postWithoutCrown: PostWithoutCrown;
  restorationStatus: RestorationStatus; crownPrep: CrownPrepLevel;
}): string[] {
  const f: string[] = [];
  const miss = 100 - p.remainingPercent;
  const restoLabel: Partial<Record<RestorationStatus,string>> = { veneer:"veneer", inlay:"inlay", onlay:"onlay (cusp coverage)", endocrown:"endocrown", crown:p.crownPrep!=="not_applicable"&&p.crownPrep!=="cannot_assess"?`crown — ${p.crownPrep} preparation`:"crown" };
  if (miss > 0) {
    let t = `${miss}% loss of coronal tooth structure`;
    if (p.restorationStatus !== "none" && restoLabel[p.restorationStatus]) t += ` — ${restoLabel[p.restorationStatus]}`;
    if (p.ferrule.wallsWithFerrule === 0) t += "; no ferrule effect"; else if (p.ferrule.wallsWithFerrule <= 2) t += "; insufficient ferrule";
    f.push(t);
  } else { f.push("Adequate remaining coronal structure"); }
  if (p.restorationStatus === "endocrown") f.push("Endocrown — no ferrule effect by design; adhesive retention dependent on pulp chamber geometry");
  if (p.ferrule.wallsWithFerrule <= 2 || p.postWithoutCrown === "yes") f.push("High structural fracture risk — crown/root fracture accounts for 66.7% of post-endodontic extractions");
  if (p.periApical) f.push("Periapical lesion present");
  const pv = parseInt(p.perio)||0; const ov = parseInt(p.oralHygiene)||0;
  if (pv>=6) f.push(ov>=1?"Advanced periodontal disease with poor oral hygiene":"Advanced periodontal disease");
  else if (pv===3) f.push(ov>=1?"Moderate periodontitis compounded by poor oral hygiene":"Moderate periodontitis");
  else if (pv===1) f.push(ov>=1?"Gingivitis with poor oral hygiene":"Gingivitis");
  else if (ov>=1) f.push("Poor oral hygiene — elevated long-term risk");
  const mv = parseInt(p.medical)||0;
  if (mv>=3) f.push("Significant medical compromise (ASA III or higher)"); else if (mv>=1) f.push("Medical compromise (ASA II)");
  if (p.endoVal>=5) f.push("High endodontic complexity");
  if (p.instrumentSep) f.push("Instrument separation");
  if (p.perforation)   f.push("Root perforation");
  if (p.prosthoVal>=1) f.push("Prosthodontic complexity");
  p.tier4Factors.forEach(t => f.push(t));
  return f.slice(0,9);
}

function checkVRFFlag(p: { rootTreated: boolean; deepCount: number; hasSinus: boolean; remainingPercent: number }): boolean {
  return p.rootTreated && (p.deepCount>=1||p.hasSinus) && p.remainingPercent<50;
}

// ════════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════════
function Section({ accent, title, children, note }: { accent: string; title: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-6 rounded-full" style={{ background: accent }} />
        <h3 className="font-semibold text-white">{title}</h3>
        {note && <span className="ml-2 text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{note}</span>}
      </div>
      {children}
    </div>
  );
}

const sel = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors appearance-none cursor-pointer";

// ════════════════════════════════════════════════════════════
// CROWN PREP SVG SELECTOR
// ════════════════════════════════════════════════════════════
function CrownPrepSelector({ value, onChange }: { value: CrownPrepLevel; onChange: (v:"minimal"|"moderate"|"aggressive")=>void }) {
  const opts = [
    { key:"minimal"    as const, label:"Minimal preparation",    sub:"3–4 walls intact",       hex:"#10b981", ev:"No catastrophic failure with ≥3 walls (Arunpraditkul 2009)" },
    { key:"moderate"   as const, label:"Moderate preparation",   sub:"1–2 walls remaining",    hex:"#f59e0b", ev:"Full coverage critical; ferrule essential (Juloski 2012)" },
    { key:"aggressive" as const, label:"Aggressive preparation", sub:"No walls / decoronated", hex:"#ef4444", ev:"Highest fracture risk; post and crown lengthening required (Behr 2009)" },
  ];
  const hex  = value==="minimal"?"#10b981":value==="moderate"?"#f59e0b":value==="aggressive"?"#ef4444":"#475569";
  const fill = value==="minimal"?"rgba(16,185,129,0.65)":value==="moderate"?"rgba(245,158,11,0.65)":value==="aggressive"?"rgba(239,68,68,0.65)":"rgba(30,58,95,0.5)";
  return (
    <div className="mb-5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Crown preparation level — select after crown removal</p>
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        <div className="flex-shrink-0 flex flex-col items-center">
          <svg width="150" height="150" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="100" fill="none" stroke={hex} strokeWidth="2" strokeDasharray="6 4" opacity="0.4"/>
            <path d="M45 45 L175 45 L155 75 L65 75Z"   fill={fill} stroke={hex} strokeWidth="1.5" style={{transition:"fill 0.3s"}}/>
            <path d="M65 145 L155 145 L175 175 L45 175Z" fill={fill} stroke={hex} strokeWidth="1.5" style={{transition:"fill 0.3s"}}/>
            <path d="M45 45 L75 65 L75 155 L45 175Z"   fill={fill} stroke={hex} strokeWidth="1.5" style={{transition:"fill 0.3s"}}/>
            <path d="M175 45 L175 175 L145 155 L145 65Z" fill={fill} stroke={hex} strokeWidth="1.5" style={{transition:"fill 0.3s"}}/>
            <rect x="75" y="65" width="70" height="90" rx="10"
              fill={value==="aggressive"?"rgba(239,68,68,0.2)":value==="moderate"?"rgba(245,158,11,0.12)":"rgba(16,185,129,0.1)"}
              stroke={hex} strokeWidth="1.5" style={{transition:"fill 0.3s"}}/>
            <rect x="38" y="38" width="144" height="144" rx="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeDasharray="8 4"/>
            <text x="110" y="108" textAnchor="middle" fontSize="18" fill={hex} fontWeight="900">
              {value==="minimal"?"~90%":value==="moderate"?"~50%":value==="aggressive"?"~5%":"?"}
            </text>
            <text x="110" y="124" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)">remaining</text>
          </svg>
          {value!=="not_applicable"&&value!=="cannot_assess"&&(
            <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-bold border ${value==="minimal"?"bg-emerald-500/10 border-emerald-500/30 text-emerald-400":value==="moderate"?"bg-amber-500/10 border-amber-500/30 text-amber-400":"bg-red-500/10 border-red-500/30 text-red-400"}`}>
              {value==="minimal"?"Minimal":value==="moderate"?"Moderate":"Aggressive"}
            </div>
          )}
        </div>
        <div className="flex-1 w-full space-y-2">
          {opts.map(o=>{
            const sel2=value===o.key;
            return (
              <button key={o.key} type="button" onClick={()=>onChange(o.key)}
                className="w-full text-left rounded-2xl p-3.5 border-2 transition-all"
                style={sel2?{background:o.hex+"15",borderColor:o.hex+"60"}:{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.1)"}}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{background:o.hex,boxShadow:sel2?`0 0 8px ${o.hex}80`:"none"}}/>
                    <div>
                      <p className="text-sm font-bold" style={sel2?{color:o.hex}:{color:"#d1d5db"}}>{o.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{o.sub}</p>
                      {sel2&&<p className="text-[10px] mt-1.5 leading-relaxed" style={{color:o.hex+"99"}}>{o.ev}</p>}
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={sel2?{background:o.hex,borderColor:o.hex}:{borderColor:"#4b5563"}}>
                    {sel2&&<svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RESTORATION STATUS SELECTOR
// ════════════════════════════════════════════════════════════
function RestorationSelector({ restorationStatus, crownAccessible, crownRemoved, crownPrep, onRestorationChange, onCrownAccessibleChange, onCrownRemovedChange, onCrownPrepChange }: {
  restorationStatus: RestorationStatus; crownAccessible: string; crownRemoved: string; crownPrep: CrownPrepLevel;
  onRestorationChange: (v:RestorationStatus)=>void; onCrownAccessibleChange: (v:string)=>void;
  onCrownRemovedChange: (v:string)=>void; onCrownPrepChange: (v:"minimal"|"moderate"|"aggressive")=>void;
}) {
  const restorations: { key: RestorationStatus; label: string; icon: string; note: string }[] = [
    { key:"none",      label:"No restoration", icon:"○", note:"Direct or unrestored" },
    { key:"veneer",    label:"Veneer",          icon:"◑", note:"Buccal surface only" },
    { key:"inlay",     label:"Inlay",           icon:"◻", note:"Cusps intact" },
    { key:"onlay",     label:"Onlay",           icon:"◼", note:"Cusp coverage" },
    { key:"endocrown", label:"Endocrown",       icon:"⬡", note:"Pulp chamber retention" },
    { key:"crown",     label:"Full crown",      icon:"♛", note:"Complete coverage" },
  ];
  const restoNote = restorationStatus!=="none"&&restorationStatus!=="crown" ? RESTORATION_PREFILL[restorationStatus]?.note : null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-5 rounded-full bg-violet-500"/>
        <p className="text-sm font-semibold text-white">Existing Restoration</p>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">Select the restoration currently on this tooth. Pre-fills wall assessment below — override individual walls at any time.</p>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {restorations.map(r=>{
          const isSel=restorationStatus===r.key;
          return (
            <button key={r.key} type="button" onClick={()=>onRestorationChange(r.key)}
              className="text-center rounded-2xl p-3 border-2 transition-all"
              style={isSel?{background:"rgba(139,92,246,0.15)",borderColor:"rgba(139,92,246,0.6)"}:{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.1)"}}>
              <p className="text-xl mb-1" style={isSel?{color:"#a78bfa"}:{color:"#6b7280"}}>{r.icon}</p>
              <p className="text-[11px] font-bold" style={isSel?{color:"#a78bfa"}:{color:"#d1d5db"}}>{r.label}</p>
              <p className="text-[9px] text-gray-600 mt-0.5 leading-tight">{r.note}</p>
            </button>
          );
        })}
      </div>

      {restoNote&&(
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 border mb-4 ${restorationStatus==="endocrown"?"bg-amber-500/8 border-amber-500/25":"bg-violet-500/8 border-violet-500/20"}`}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" style={{color:restorationStatus==="endocrown"?"#f59e0b":"#a78bfa"}}>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p className="text-[11px] leading-relaxed" style={{color:restorationStatus==="endocrown"?"#fbbf24":"#c4b5fd"}}>{restoNote}</p>
        </div>
      )}

      {restorationStatus==="crown"&&(
        <div className="space-y-4 bg-[#0a1428] border border-white/10 rounded-2xl p-4">
          {/* Q1: Accessible? */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Can treatment be accessed through the existing crown?</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {val:"yes",label:"Yes — access through crown",   sub:"Well-fitted, intact margins, no perio involvement",  color:"#10b981"},
                {val:"no", label:"No — crown requires removal",  sub:"Ill-fitted, overhang, or perio involvement present", color:"#f59e0b"},
              ].map(o=>(
                <button key={o.val} type="button" onClick={()=>onCrownAccessibleChange(o.val)}
                  className="text-left rounded-xl p-3 border-2 transition-all"
                  style={crownAccessible===o.val?{background:o.color+"15",borderColor:o.color+"60"}:{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.1)"}}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{background:crownAccessible===o.val?o.color:"#4b5563"}}/>
                    <p className="text-xs font-bold" style={crownAccessible===o.val?{color:o.color}:{color:"#d1d5db"}}>{o.label}</p>
                  </div>
                  <p className="text-[10px] text-gray-600 pl-4">{o.sub}</p>
                </button>
              ))}
            </div>
            {crownAccessible==="yes"&&(
              <div className="mt-3 flex items-start gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-emerald-400 flex-shrink-0 mt-0.5"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <p className="text-[11px] text-emerald-400/80 leading-relaxed">Minimal preparation assumed — a well-fitted crown indicates sound underlying tooth structure. Walls pre-filled as intact. Refine individual walls below if needed.</p>
              </div>
            )}
          </div>

          {/* Q2: Crown removed? */}
          {crownAccessible==="no"&&(
            <div>
              <div className="border-t border-white/8 pt-4"/>
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Has the crown been removed?</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {val:"yes",label:"Yes — crown removed",        sub:"Structure now directly assessable", color:"#10b981"},
                  {val:"no", label:"No — crown still in place",  sub:"Structure cannot be assessed",     color:"#ef4444"},
                ].map(o=>(
                  <button key={o.val} type="button" onClick={()=>onCrownRemovedChange(o.val)}
                    className="text-left rounded-xl p-3 border-2 transition-all"
                    style={crownRemoved===o.val?{background:o.color+"15",borderColor:o.color+"60"}:{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.1)"}}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{background:crownRemoved===o.val?o.color:"#4b5563"}}/>
                      <p className="text-xs font-bold" style={crownRemoved===o.val?{color:o.color}:{color:"#d1d5db"}}>{o.label}</p>
                    </div>
                    <p className="text-[10px] text-gray-600 pl-4">{o.sub}</p>
                  </button>
                ))}
              </div>
              {crownRemoved==="yes"&&(
                <div className="mt-4"><div className="border-t border-white/8 pt-4"/>
                  <CrownPrepSelector value={crownPrep} onChange={onCrownPrepChange}/>
                </div>
              )}
              {crownRemoved==="no"&&(
                <div className="mt-3 rounded-2xl border-2 border-red-500/40 bg-red-500/8 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#ef4444" strokeWidth="1.5"/><path d="M8 5v4M8 10.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-400 mb-1">Prognosis Calculation Blocked</p>
                      <p className="text-xs text-red-300/80 leading-relaxed">The crown has not been removed. Coronal structure cannot be assessed until the crown is removed and wall states are confirmed. Return to this form after crown removal to generate the prognosis.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// UNIFIED DIAGRAM
// ════════════════════════════════════════════════════════════
function UnifiedDiagram({ walls, occlusal, sites, remainingPercent, restorationStatus, crownAccessible, crownRemoved, crownPrep, onWallChange, onOcclusalChange, onSiteChange, onRestorationChange, onCrownAccessibleChange, onCrownRemovedChange, onCrownPrepChange }: {
  walls: WallStates; occlusal: OcclusalState; sites: ProbingSite[]; remainingPercent: number;
  restorationStatus: RestorationStatus; crownAccessible: string; crownRemoved: string; crownPrep: CrownPrepLevel;
  onWallChange:(wall:WallKey,state:WallState)=>void; onOcclusalChange:(s:OcclusalState)=>void; onSiteChange:(id:string)=>void;
  onRestorationChange:(v:RestorationStatus)=>void; onCrownAccessibleChange:(v:string)=>void;
  onCrownRemovedChange:(v:string)=>void; onCrownPrepChange:(v:"minimal"|"moderate"|"aggressive")=>void;
}) {
  const [expanded,setExpanded]=useState(false);
  const ferrule=computeFerrule(walls);
  const wallOrder:WallKey[]=["buccal","mesial","distal","lingual"];
  const deepCount=sites.filter(s=>s.level==="deep").length;
  const normCount=sites.filter(s=>s.level==="normal").length;
  const atcCount =sites.filter(s=>s.level==="attachment").length;

  const wallLabels:Record<WallKey,{name:string;sub:string;icon:string}>={
    buccal: {name:"Buccal Wall", sub:"Facial surface · 23%",   icon:"↑"},
    mesial: {name:"Mesial Wall", sub:"Forward proximal · 22%", icon:"←"},
    distal: {name:"Distal Wall", sub:"Back proximal · 22%",    icon:"→"},
    lingual:{name:"Lingual Wall",sub:"Palatal surface · 23%",  icon:"↓"},
  };

  function cycleW(c:WallState):WallState{const a:WallState[]=["intact","moderate","severe"];return a[(a.indexOf(c)+1)%3];}
  function cycleO(c:OcclusalState):OcclusalState{const a:OcclusalState[]=["access_only","moderate","severe"];return a[(a.indexOf(c)+1)%3];}
  const wc=(w:WallState)=>w==="intact"?"#10b981":w==="moderate"?"#f59e0b":"#ef4444";
  const rc=ferrule.wallsWithFerrule>=4?"#10b981":ferrule.wallsWithFerrule>=3?"#f59e0b":"#ef4444";

  const crownAccessThrough  = restorationStatus==="crown"&&crownAccessible==="yes";
  const crownRemovedAssessed= restorationStatus==="crown"&&crownAccessible==="no"&&crownRemoved==="yes"&&crownPrep!=="not_applicable"&&crownPrep!=="cannot_assess";
  const wallsCollapsed = crownAccessThrough||crownRemovedAssessed;
  const wallsHidden    = restorationStatus==="crown"&&crownAccessible==="no"&&crownRemoved==="no";

  return (
    <div className="bg-[#0a1428] border border-white/10 rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Coronal Structure & Periodontal Probing</h3>
          <p className="text-xs text-gray-500 mt-0.5">{wallsHidden?"Crown removal required before wall assessment":"Click walls to cycle state · Click probing dots to cycle depth"}</p>
        </div>
        {!wallsHidden&&<div className="text-right"><p className="text-3xl font-bold text-[#10b981]">{remainingPercent}%</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">remaining</p></div>}
      </div>

      <RestorationSelector restorationStatus={restorationStatus} crownAccessible={crownAccessible} crownRemoved={crownRemoved} crownPrep={crownPrep}
        onRestorationChange={onRestorationChange} onCrownAccessibleChange={onCrownAccessibleChange} onCrownRemovedChange={onCrownRemovedChange} onCrownPrepChange={onCrownPrepChange}/>

      {!wallsHidden&&(
        <>
          <div className="border-t border-white/8 mb-6"/>
          {wallsCollapsed&&(
            <button type="button" onClick={()=>setExpanded(v=>!v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-white/10 bg-white/3 hover:bg-white/5 transition-all mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-300">Refine individual walls</span>
                <span className="text-[10px] text-gray-600">— pre-filled from assessment above</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className={`text-gray-500 transition-transform ${expanded?"rotate-180":""}`}>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {(!wallsCollapsed||expanded)&&(
            <div className="flex flex-col xl:flex-row gap-8 items-start">
              <div className="flex-shrink-0 flex flex-col items-center mx-auto">
                <svg width="320" height="300" viewBox="0 0 320 300" className="w-full max-w-xs">
                  <rect x="12" y="12" width="296" height="276" rx="32" fill="none" stroke={rc} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.5"/>
                  <rect x="32"  y="18"  width="256" height="46"  rx="12" fill={wc(walls.buccal)}  opacity={walls.buccal==="intact"?0.7:0.45}/>
                  <rect x="32"  y="236" width="256" height="46"  rx="12" fill={wc(walls.lingual)} opacity={walls.lingual==="intact"?0.7:0.45}/>
                  <rect x="18"  y="32"  width="46"  height="236" rx="12" fill={wc(walls.mesial)}  opacity={walls.mesial==="intact"?0.7:0.45}/>
                  <rect x="256" y="32"  width="46"  height="236" rx="12" fill={wc(walls.distal)}  opacity={walls.distal==="intact"?0.7:0.45}/>
                  <rect x="64" y="64" width="192" height="172" rx="18"
                    fill={occlusal==="access_only"?"#10b981":occlusal==="moderate"?"#f59e0b":"#ef4444"}
                    opacity={occlusal==="access_only"?0.55:0.38}/>
                  <circle cx="160" cy="150" r="28" fill={occlusal==="access_only"?"#0a1428":occlusal==="moderate"?"#92400e":"#7f1d1d"} opacity="0.85"/>
                  <text x="160" y="45"  textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9">BUCCAL</text>
                  <text x="160" y="263" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9">LINGUAL</text>
                  <text x="41"  cy="154" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9" transform="rotate(-90 41 154)">MESIAL</text>
                  <text x="279" cy="154" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9" transform="rotate(90 279 154)">DISTAL</text>
                  <text x="160" y="145" textAnchor="middle" fontSize="8" fill="white" opacity="0.75">ACCESS</text>
                  <text x="160" y="157" textAnchor="middle" fontSize="8" fill="white" opacity="0.75">CAVITY</text>
                  <text x="160" y="200" textAnchor="middle" fontSize="13" fill="#10b981" fontWeight="800">{remainingPercent}%</text>
                  {sites.map(s=>{
                    const c=POCKET_COLOR[s.level]; const id=s.level==="deep";
                    return(<g key={s.id} onClick={()=>onSiteChange(s.id)} style={{cursor:"pointer"}}>
                      {id&&<circle cx={s.cx} cy={s.cy} r="14" fill="none" stroke={c} strokeWidth="1.5" opacity="0.35"/>}
                      <circle cx={s.cx} cy={s.cy} r="11" fill={c+"25"} stroke={c} strokeWidth="2" style={{filter:`drop-shadow(0 0 5px ${c}60)`}}/>
                      <text x={s.cx} y={s.cy+4} textAnchor="middle" fontSize="8" fill={c} fontWeight="800">{s.short}</text>
                    </g>);
                  })}
                </svg>
                <div className={`mt-3 px-3 py-1.5 rounded-full text-[10px] font-semibold border ${ferrule.wallsWithFerrule>=4?"bg-emerald-500/10 border-emerald-500/30 text-emerald-400":ferrule.wallsWithFerrule>=3?"bg-amber-500/10 border-amber-500/30 text-amber-400":"bg-red-500/10 border-red-500/30 text-red-400"}`}>{ferrule.label}</div>
                {deepCount>=1&&<div className="mt-2 flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"/><p className="text-[10px] text-red-400 font-semibold">{deepCount} deep pocket{deepCount>1?"s":""} — Iowa Stage IV if crack confirmed</p></div>}
              </div>

              <div className="flex-1 w-full space-y-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Coronal Walls — click to cycle</p>
                {wallOrder.map(wall=>{
                  const st=walls[wall]; const cfg=WALL_CONFIG[st]; const inf=wallLabels[wall];
                  return(<button key={wall} onClick={()=>onWallChange(wall,cycleW(st))}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border ${cfg.bg} ${cfg.border} hover:opacity-90 transition-all`}>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm w-5 text-center">{inf.icon}</span>
                      <div className="text-left"><p className="text-sm font-semibold text-white">{inf.name}</p><p className="text-[10px] text-gray-500">{inf.sub}</p></div>
                    </div>
                    <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${cfg.dot}`}/><span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span></div>
                  </button>);
                })}

                <button onClick={()=>onOcclusalChange(cycleO(occlusal))}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border ${OCCLUSAL_CONFIG[occlusal].bg} ${OCCLUSAL_CONFIG[occlusal].border} hover:opacity-90 transition-all`}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-5 text-center">○</span>
                    <div className="text-left"><p className="text-sm font-semibold text-white">Occlusal / Incisal</p><p className="text-[10px] text-gray-500">Penalizes only beyond access cavity</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${occlusal==="access_only"?"bg-emerald-400":occlusal==="moderate"?"bg-amber-400":"bg-red-400"}`}/>
                    <span className={`text-xs font-bold ${OCCLUSAL_CONFIG[occlusal].color}`}>{OCCLUSAL_CONFIG[occlusal].label}</span>
                  </div>
                </button>

                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-4 mb-2">Periodontal Probing — click dots to cycle depth</p>
                {sites.map(s=>{const c=POCKET_COLOR[s.level];return(
                  <button key={s.id} onClick={()=>onSiteChange(s.id)} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all hover:opacity-90"
                    style={{background:c+"12",borderColor:c+"40"}}>
                    <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:c}}/><span className="text-sm font-medium text-white">{s.label}</span></div>
                    <span className="text-[10px] font-bold" style={{color:c}}>{POCKET_LABEL[s.level]}</span>
                  </button>
                );})}

                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[{label:"Normal",count:normCount,color:"#10b981"},{label:"Attachment",count:atcCount,color:"#f59e0b"},{label:"Deep ≥5mm",count:deepCount,color:"#ef4444"}].map(s=>(
                    <div key={s.label} className="text-center rounded-xl py-2 border" style={{background:s.color+"10",borderColor:s.color+"30"}}>
                      <p className="text-xl font-black" style={{color:s.color}}>{s.count}</p>
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(!wallsCollapsed||expanded)&&(
            <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/8 flex-wrap">
              {(["intact","moderate","severe"] as WallState[]).map(s=>(
                <div key={s} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${WALL_CONFIG[s].dot}`}/><span className="text-[10px] text-gray-500 capitalize">{s}</span></div>
              ))}
              <div className="flex items-center gap-1.5 ml-auto"><span className="w-3 h-px border-t-2 border-dashed border-gray-500"/><span className="text-[10px] text-gray-500">Ferrule ring</span></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CRACK SECTION
// ════════════════════════════════════════════════════════════
function CrackSection({ formData, onChange }: { formData: any; onChange: (n:string,v:string)=>void }) {
  const cp=formData.crackPresent==="yes";
  const cc=formData.crackTransillum==="yes"||formData.crackMethBlue==="yes"||formData.crackDirect==="yes";
  const tog=(f:string)=>onChange(f,formData[f]==="yes"?"no":"yes");
  return (
    <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-6 rounded-full bg-orange-500"/>
        <h3 className="font-semibold text-white">Crack Assessment</h3>
        <span className="ml-2 text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">Triggers Iowa Classification if confirmed</span>
      </div>
      <div className="mb-5">
        <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Is a crack suspected or present?</label>
        <select name="crackPresent" value={formData.crackPresent} onChange={e=>onChange("crackPresent",e.target.value)} className={sel}>
          <option value="no">No — no crack suspected</option>
          <option value="yes">Yes — crack suspected or visible</option>
        </select>
      </div>
      {cp&&(
        <>
          <div className={`rounded-2xl border-2 p-5 mb-5 ${cc?"bg-emerald-500/8 border-emerald-500/40":"bg-white/3 border-white/15"}`}>
            <p className={`text-sm font-semibold mb-1 ${cc?"text-emerald-400":"text-gray-300"}`}>Crack Confirmation — Required for Iowa Classification</p>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">Per Krell & Caplan: no tooth staged without confirmed crack visualization.</p>
            <div className="grid md:grid-cols-3 gap-4">
              {[{f:"crackTransillum",i:"💡",t:"Transillumination",d:"Definite shadow blocking light"},{f:"crackMethBlue",i:"🔵",t:"Methylene Blue",d:"Visible dye uptake along crack"},{f:"crackDirect",i:"🔬",t:"Direct Visualization",d:"Crack confirmed under magnification"}].map(m=>{
                const c2=formData[m.f]==="yes";
                return(<button key={m.f} type="button" onClick={()=>tog(m.f)}
                  className={`text-left rounded-2xl p-4 border-2 transition-all ${c2?"bg-emerald-500/15 border-emerald-500/50":"bg-white/3 border-white/10 hover:border-white/25"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{m.i}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${c2?"bg-emerald-500 border-emerald-500":"border-gray-600"}`}>
                      {c2&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round"/></svg>}
                    </div>
                  </div>
                  <p className={`text-xs font-bold mb-1 ${c2?"text-emerald-400":"text-gray-300"}`}>{m.t}</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">{m.d}</p>
                </button>);
              })}
            </div>
            <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 border ${cc?"bg-emerald-500/10 border-emerald-500/25":"bg-amber-500/10 border-amber-500/25"}`}>
              {cc?<><svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/></svg><p className="text-xs text-emerald-400 font-semibold">Crack confirmed — Iowa Classification will be applied</p></>
                :<><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2Z" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/></svg><p className="text-xs text-amber-400">Crack suspected but not confirmed — no Iowa stage assigned</p></>}
            </div>
          </div>
          {cc&&(
            <div className="grid md:grid-cols-2 gap-5">
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Bite test</label><select name="biteTest" value={formData.biteTest} onChange={e=>onChange("biteTest",e.target.value)} className={sel}><option value="no">Negative</option><option value="yes">Positive — pain on cusp release</option></select></div>
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Distal marginal ridge <span className="text-amber-400/70">★ Iowa</span></label><select name="marginalRidge" value={formData.marginalRidge} onChange={e=>onChange("marginalRidge",e.target.value)} className={sel}><option value="no">None / mesial ridge only</option><option value="yes">Distal or both ridges cracked</option></select></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RETREATMENT SECTION
// ════════════════════════════════════════════════════════════
function RetreatmentSection({ formData, onChange }: { formData: any; onChange: (n:string,v:string)=>void }) {
  return (
    <div className="bg-[#0d1a30] border border-cyan-500/30 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-2"><div className="w-1 h-6 rounded-full bg-cyan-500"/><h3 className="font-semibold text-white">Retreatment History</h3><span className="ml-2 text-[10px] text-cyan-600 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">Tier 4</span></div>
      <p className="text-xs text-gray-500 mb-6 leading-relaxed ml-3">Tier 4 penalties are uncapped — post without crown and repeated retreatment are legitimate impractical triggers.</p>
      <div className="space-y-5">
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Number of Previous Treatment Attempts</label>
          <select name="previousAttempts" value={formData.previousAttempts} onChange={e=>onChange("previousAttempts",e.target.value)} className={sel}>
            <option value="first">First retreatment</option><option value="second">Second retreatment</option><option value="third_or_more">Third or more — surgical option should be evaluated</option>
          </select>
          {formData.previousAttempts==="third_or_more"&&<div className="mt-2 flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-red-400 flex-shrink-0 mt-0.5"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg><p className="text-xs text-red-400 leading-relaxed">Third or more — microsurgical endodontics should be evaluated.</p></div>}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Quality of Existing Obturation</label>
          <select name="existingObturation" value={formData.existingObturation} onChange={e=>onChange("existingObturation",e.target.value)} className={sel}>
            <option value="adequate">Adequate — within 0–2mm of apex, homogeneous, no voids</option><option value="inadequate">Inadequate — short, voids, poor density, or missed canals</option>
          </select>
          <p className="text-[10px] mt-1.5 px-1 leading-relaxed" style={{color:"#06b6d480"}}>{formData.existingObturation==="inadequate"?"Intraradicular cause likely — correctable":"Adequate obturation — consider extraradicular cause"}</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Quality of Coronal Restoration at Failure</label>
          <select name="restorationQuality" value={formData.restorationQuality} onChange={e=>onChange("restorationQuality",e.target.value)} className={sel}>
            <option value="good">Good — intact margins, no leakage, no recurrent caries</option><option value="poor">Poor — marginal breakdown, leakage, or lost</option>
          </select>
          {formData.restorationQuality==="poor"&&<div className="mt-2 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg><p className="text-xs text-amber-400 leading-relaxed">6.9–7.2× higher failure risk (Zgur-Er 2025).</p></div>}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Post Without Full Coverage Crown? <span className="normal-case text-red-400/70">★ Override trigger</span></label>
          <select name="postWithoutCrown" value={formData.postWithoutCrown} onChange={e=>onChange("postWithoutCrown",e.target.value)} className={sel}>
            <option value="no">No — no post, or post with full coverage crown</option><option value="yes">Yes — post present but no full coverage crown</option>
          </select>
          {formData.postWithoutCrown==="yes"&&<div className="mt-3 rounded-2xl border-2 border-red-500/50 bg-red-500/8 p-4"><p className="text-sm font-bold text-red-400 mb-1">Critical Structural Risk — Impractical Override</p><p className="text-xs text-red-300/80 leading-relaxed">Survival 25.6%; 100% of extractions fracture-related (Zgur-Er 2025). Full coverage mandatory.</p></div>}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-start gap-2">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-cyan-500/50 flex-shrink-0 mt-0.5"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        <p className="text-[10px] text-gray-600 leading-relaxed">Evidence: Zgur-Er 2025 · Sainudeen et al. 2024. Tier 4 is uncapped.</p>
      </div>
    </div>
  );
}

function LiveDiagnosisBadge({ pulpal, periapical, inconsistencies }: { pulpal:string; periapical:string; inconsistencies:string[] }) {
  if (!pulpal&&!periapical) return null;
  return (
    <div className="bg-[#0a1428] border border-[#10b981]/25 rounded-2xl p-4">
      <p className="text-[10px] text-[#10b981]/60 uppercase tracking-wider mb-3">Live Diagnosis Preview</p>
      <div className="grid md:grid-cols-2 gap-3">
        {pulpal    &&<div className="bg-white/3 rounded-xl p-3"><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Pulpal</p><p className="text-sm font-bold text-white">{pulpal}</p></div>}
        {periapical&&<div className="bg-white/3 rounded-xl p-3"><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Periapical</p><p className="text-sm font-bold text-white">{periapical}</p></div>}
      </div>
      {inconsistencies.map((n,i)=>(
        <div key={i} className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <p className="text-xs text-amber-400 leading-relaxed">{n}</p>
        </div>
      ))}
    </div>
  );
}

function UrgencySelector({ value, onChange }: { value:Urgency; onChange:(u:Urgency)=>void }) {
  const opts=[{key:"low" as Urgency,label:"Asymptomatic",sub:"Elective — low urgency",icon:"🟢"},{key:"medium" as Urgency,label:"Symptomatic — No Swelling",sub:"Prompt care",icon:"🟡"},{key:"high" as Urgency,label:"Symptomatic — Swelling",sub:"Urgent treatment required",icon:"🔴"}];
  return(
    <div className="grid md:grid-cols-3 gap-3">
      {opts.map(o=>{const cfg=URGENCY_CONFIG[o.key];const s=value===o.key;return(
        <button key={o.key} type="button" onClick={()=>onChange(o.key)}
          className={`text-left rounded-2xl p-4 border-2 transition-all ${s?"":"border-white/10 bg-white/3 hover:border-white/25"}`}
          style={s?{background:cfg.accentDim,borderColor:cfg.accent}:{}}>
          <div className="flex items-center justify-between mb-2"><span className="text-xl">{o.icon}</span>{s&&<div className="w-5 h-5 rounded-full flex items-center justify-center" style={{background:cfg.accent}}><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round"/></svg></div>}</div>
          <p className="text-sm font-bold text-white">{o.label}</p>
          <p className="text-[10px] mt-0.5" style={{color:s?cfg.accent:"#6b7280"}}>{o.sub}</p>
        </button>
      );})}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function EndoDecide() {
  const router=useRouter(); const {user}=useAuth();
  const [urgency,setUrgency]=useState<Urgency>("low");
  const urgCfg=URGENCY_CONFIG[urgency];
  const [walls,setWalls]=useState<WallStates>({mesial:"intact",distal:"intact",buccal:"intact",lingual:"intact"});
  const [occlusal,setOcclusal]=useState<OcclusalState>("access_only");
  const [sites,setSites]=useState<ProbingSite[]>(INITIAL_SITES);
  const [restorationStatus,setRestorationStatus]=useState<RestorationStatus>("none");
  const [crownAccessible,setCrownAccessible]=useState<string>("");
  const [crownRemoved,setCrownRemoved]=useState<string>("");
  const [crownPrep,setCrownPrep]=useState<CrownPrepLevel>("not_applicable");
  const remainingPercent=computeRemainingPercent(walls,occlusal);
  const deepCount=sites.filter(s=>s.level==="deep").length;
  const [formData,setFormData]=useState({
    toothNumber:"",ageGroup:"26-40 years",gender:"Male",medications:"0",
    medical:"0",oralHygiene:"0",perio:"0",
    coldTest:"",spontaneous:"no",nocturnal:"no",
    percussion:"no",palpation:"no",swelling:"no",sinus:"no",periApical:"no",mobility:"no",
    rootTreated:"no",rootAccessed:"no",
    crackPresent:"no",crackTransillum:"no",crackMethBlue:"no",crackDirect:"no",biteTest:"no",marginalRidge:"no",
    endo:"0",instrumentSep:"no",sepLocation:"apical",sepStage:"after",
    perforation:"no",perfLocation:"coronal",perfTime:"recent",prostho:"0",
    previousAttempts:"first" as PreviousAttempts,existingObturation:"adequate" as ObturationQuality,
    restorationQuality:"good" as RestorationQuality,postWithoutCrown:"no" as PostWithoutCrown,
  });
  const [loading,setLoading]=useState(false);
  const handleChange=(n:string,v:string)=>setFormData(p=>({...p,[n]:v}));
  const handleSelectChange=(e:React.ChangeEvent<HTMLSelectElement>)=>handleChange(e.target.name,e.target.value);
  const cycleSite=(id:string)=>setSites(p=>p.map(s=>s.id===id?{...s,level:POCKET_CYCLE[s.level]}:s));

  const handleRestorationChange=(v:RestorationStatus)=>{
    setRestorationStatus(v); setCrownAccessible(""); setCrownRemoved(""); setCrownPrep("not_applicable");
    if(v!=="crown"){const pf=RESTORATION_PREFILL[v];setWalls({...pf.walls});setOcclusal(pf.occlusal);}
    else{setWalls({mesial:"intact",distal:"intact",buccal:"intact",lingual:"intact"});setOcclusal("access_only");}
  };
  const handleCrownAccessibleChange=(v:string)=>{
    setCrownAccessible(v); setCrownRemoved(""); setCrownPrep("not_applicable");
    if(v==="yes"){setWalls({mesial:"intact",distal:"intact",buccal:"intact",lingual:"intact"});setOcclusal("access_only");setCrownPrep("minimal");}
  };
  const handleCrownRemovedChange=(v:string)=>{
    setCrownRemoved(v); setCrownPrep("not_applicable");
    if(v==="no")setCrownPrep("cannot_assess");
  };
  const handleCrownPrepChange=(level:"minimal"|"moderate"|"aggressive")=>{
    setCrownPrep(level); const pf=CROWN_PREP_WALLS[level]; setWalls({...pf.walls}); setOcclusal(pf.occlusal);
  };

  const isCalculationBlocked=restorationStatus==="crown"&&crownAccessible==="no"&&crownRemoved==="no";
  const pulpalResult=derivePulpalDiagnosis(formData);
  const periapicalResult=derivePeriapicalDiagnosis(formData);
  const inconsistencies=[pulpalResult.isInconsistent?pulpalResult.inconsistencyNote:null,periapicalResult.isInconsistent?periapicalResult.inconsistencyNote:null].filter(Boolean) as string[];
  const crackConfirmed=formData.crackPresent==="yes"&&(formData.crackTransillum==="yes"||formData.crackMethBlue==="yes"||formData.crackDirect==="yes");
  const isRetreatmentCase=formData.rootTreated==="yes";

  const calculate=()=>{
    if(!formData.toothNumber){alert("Please select a tooth number.");return;}
    if(!formData.coldTest&&formData.rootTreated==="no"&&formData.rootAccessed==="no"){alert("Please complete the cold test finding.");return;}
    if(isCalculationBlocked){alert("Crown must be removed before coronal structure can be assessed.");return;}
    setLoading(true);
    setTimeout(()=>{
      const pulpalDx=pulpalResult.diagnosis; const periDx=periapicalResult.diagnosis;
      const periApicalBool=formData.periApical==="yes"||["Asymptomatic Apical Periodontitis","Symptomatic Apical Periodontitis","Acute Apical Abscess","Chronic Apical Abscess"].includes(periDx);
      const prog=calculatePrognosis({toothNumber:formData.toothNumber,walls,occlusal,remainingPercent,perio:formData.perio,oralHygiene:formData.oralHygiene,medical:formData.medical,endo:formData.endo==="10"?"10":formData.endo==="5"?"5":"0",instrumentSep:formData.instrumentSep==="yes",sepLocation:formData.sepLocation,sepStage:formData.sepStage,perforation:formData.perforation==="yes",perfLocation:formData.perfLocation,perfTime:formData.perfTime,prostho:formData.prostho,periApical:periApicalBool,rootTreated:formData.rootTreated==="yes",existingObturation:formData.existingObturation,restorationQuality:formData.restorationQuality,postWithoutCrown:formData.postWithoutCrown,previousAttempts:formData.previousAttempts});
      const ferrule=computeFerrule(walls); const endoVal=parseInt(formData.endo)||0;
      const treatmentRec=deriveTreatmentRec(pulpalDx,prog.isPractical,endoVal);
      const affectingFactors=buildAffectingFactors({remainingPercent,walls,periApical:periApicalBool,perio:formData.perio,oralHygiene:formData.oralHygiene,medical:formData.medical,endoVal,instrumentSep:formData.instrumentSep==="yes",perforation:formData.perforation==="yes",prosthoVal:parseInt(formData.prostho)||0,ferrule,tier4Factors:prog.tier4Factors,postWithoutCrown:formData.postWithoutCrown,restorationStatus,crownPrep});
      let iowa=null; if(crackConfirmed)iowa=calcIowaStage(deepCount,formData.marginalRidge==="yes",periDx);
      const vrfFlag=checkVRFFlag({rootTreated:formData.rootTreated==="yes",deepCount,hasSinus:formData.sinus==="yes",remainingPercent});
      const toothType=prog.toothType; const casePresText=urgency==="low"?"Asymptomatic":urgency==="medium"?"Symptomatic without swelling":"Symptomatic with facial swelling";
      const restoLabel:Partial<Record<RestorationStatus,string>>={veneer:"veneer",inlay:"inlay",onlay:"onlay",endocrown:"endocrown",crown:"full coverage crown"};
      const introParagraph=`The case presented is related to a <strong>${formData.gender.toLowerCase()}</strong> patient, age between <strong>${formData.ageGroup}</strong>. Tooth <strong>#${formData.toothNumber}</strong> (${toothType}) is <strong>${casePresText.toLowerCase()}</strong> with <strong>${remainingPercent}%</strong> remaining coronal tooth structure${restorationStatus!=="none"?` — ${restoLabel[restorationStatus]??restorationStatus} restoration present`:""}${restorationStatus==="crown"&&crownPrep!=="not_applicable"&&crownPrep!=="cannot_assess"?`, <strong>${crownPrep} preparation</strong> assessed`:""}.`;
      const explanationNote=prog.isPractical?`This tooth is considered <strong>practical to retain</strong>. The estimated 4-year survival rate meets the minimum threshold for a ${toothType} tooth. The remaining coronal structure (${remainingPercent}%) provides an acceptable foundation for final restoration.${isRetreatmentCase&&prog.obturationNarrative?" "+prog.obturationNarrative:""}`:`Retention of this tooth is considered <strong>impractical</strong>. The estimated 4-year survival rate (${prog.survival}%) falls below the threshold for a ${toothType} tooth.${isRetreatmentCase&&prog.obturationNarrative?" "+prog.obturationNarrative:""}`;
      let vptAgeNote=""; if(treatmentRec==="Vital Pulp Therapy"){if(["1-12 years","13-25 years"].includes(formData.ageGroup))vptAgeNote="Favorable age for vital pulp therapy — enhanced healing expected."; else if(formData.ageGroup==="Over 40 years")vptAgeNote="Pulp vascularity may be reduced — assess carefully before VPT.";}
      let medicationFlag=""; if(parseInt(formData.medications)>=2&&parseInt(formData.prostho)>=1)medicationFlag="Patient on medications requiring modification — consider MRONJ risk if surgical procedures planned.";
      const resultData={
        toolType:crackConfirmed?"combined":"predictor",urgency,toothNumber:formData.toothNumber,toothType,gender:formData.gender,ageGroup:formData.ageGroup,
        pulpalDiagnosis:pulpalDx,periapicalDiagnosis:periDx,inconsistencyNotes:inconsistencies,
        survivalPercentage:prog.survival,survivalRange:prog.survivalRange,isPractical:prog.isPractical,totalDPI:prog.totalDPI,threshold:prog.threshold,
        tier1Deductions:prog.tier1Deductions,tier2Deductions:prog.tier2Deductions,tier3Deductions:prog.tier3Deductions,tier4Deductions:prog.tier4Deductions,
        isPostWithoutCrownOverride:prog.isPostWithoutCrownOverride,obturationNarrative:prog.obturationNarrative,
        isRetreatmentCase,previousAttempts:formData.previousAttempts,existingObturation:formData.existingObturation,restorationQuality:formData.restorationQuality,postWithoutCrown:formData.postWithoutCrown,
        restorationStatus,crownAccessible,crownRemoved,crownPrep,crownPrepLabel:crownPrep!=="not_applicable"&&crownPrep!=="cannot_assess"?crownPrep:null,crownAssessmentPending:crownPrep==="cannot_assess",
        restorationNote:restorationStatus!=="none"?RESTORATION_PREFILL[restorationStatus]?.note:"",
        isImpracticalOverride:prog.isImpracticalOverride,overrideReason:prog.overrideReason,
        treatmentRec,procedureCategory:detectProcedureCategory(pulpalDx,treatmentRec,prog.isPractical),
        affectingFactors,remainingPercent,walls:{...walls},occlusal,ferrule,
        crackPresent:formData.crackPresent==="yes",crackConfirmed,crackMethods:{transillum:formData.crackTransillum==="yes",methBlue:formData.crackMethBlue==="yes",direct:formData.crackDirect==="yes"},
        biteTest:formData.biteTest==="yes",marginalRidge:formData.marginalRidge==="yes",
        iowa,vrfFlag,sites:sites.map(s=>({id:s.id,label:s.label,short:s.short,level:s.level})),deepCount,
        vptAgeNote,medicationFlag,introParagraph,explanationNote,casePresText,formData:{...formData},
      };
      localStorage.setItem("lastEndoDecideResult",JSON.stringify(resultData));
      setLoading(false); router.push("/endodecide/result");
    },900);
  };

  return (
    <ProtectedRoute>
      <Navigation/>
      <div className="min-h-screen bg-[#0a1428] text-white">
        <div className="relative h-[320px] md:h-[360px] bg-cover bg-center overflow-hidden" style={{backgroundImage:"url('https://iili.io/Bw4dt99.jpg')"}}>
          <div className={`absolute inset-0 bg-gradient-to-b ${urgCfg.heroBg} transition-all duration-700`}/>
          <div className="absolute top-5 left-6 z-20"><Image src="https://iili.io/B6RcxlS.png" alt="Endoprognosis Logo" width={160} height={55} className="h-10 w-auto" priority/></div>
          <div className="absolute top-5 right-6 z-20"><span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${urgCfg.badge} transition-all duration-500`}>{urgCfg.badgeText}</span></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 pt-8">
            <p className="text-[11px] tracking-[4px] mb-3" style={{color:urgCfg.accent+"99"}}>CLINICAL DECISION TOOL</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{fontFamily:"Playfair Display, serif",background:`linear-gradient(135deg, ${urgCfg.accent}, white, ${urgCfg.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>EndoDecide</h1>
            <p className="text-gray-300 text-base md:text-lg">Unified Endodontic Prognosis & Crack Classification</p>
            <div className="flex items-center gap-6 mt-5">
              <div className="text-center"><p className="text-2xl font-bold" style={{color:urgCfg.accent}}>92%</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">Best case baseline</p></div>
              <div className="w-px h-10 bg-white/20"/>
              <div className="text-center"><p className="text-2xl font-bold text-amber-400">87%</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">With periapical lesion</p></div>
              <div className="w-px h-10 bg-white/20"/>
              <div className="text-center"><p className="text-2xl font-bold text-white">AAE 2013</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">Terminology</p></div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-5">
          <Section accent={urgCfg.accent} title="Case Presentation"><UrgencySelector value={urgency} onChange={setUrgency}/></Section>

          <Section accent="#3b82f6" title="Tooth & Patient" note="FDI numbering">
            <div className="grid md:grid-cols-3 gap-5">
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Tooth Number (FDI)</label>
                <select name="toothNumber" value={formData.toothNumber} onChange={handleSelectChange} className={sel}>
                  <option value="">Select tooth number</option>
                  {["11","12","13","14","15","16","17","18","21","22","23","24","25","26","27","28","31","32","33","34","35","36","37","38","41","42","43","44","45","46","47","48"].map(n=><option key={n} value={n}>#{n}</option>)}
                </select>
                <p className="text-[10px] text-gray-600 mt-1.5">Aim for ≥2 control teeth. Reproduce the chief complaint.</p>
              </div>
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Age Group</label>
                <select name="ageGroup" value={formData.ageGroup} onChange={handleSelectChange} className={sel}>
                  <option value="1-12 years">1–12 years</option><option value="13-25 years">13–25 years</option><option value="26-40 years">26–40 years</option><option value="Over 40 years">Over 40 years</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleSelectChange} className={sel}>
                  <option value="Male">Male</option><option value="Female">Female</option>
                </select>
              </div>
            </div>
          </Section>

          <Section accent="#f59e0b" title="Overall Health Status">
            <div className="grid md:grid-cols-2 gap-5">
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Medical Status (ASA)</label>
                <select name="medical" value={formData.medical} onChange={handleSelectChange} className={sel}>
                  <option value="0">ASA I — Medically fit</option><option value="1">ASA II — Controlled condition</option><option value="3">ASA III — Uncontrolled condition</option><option value="6">ASA IV or higher</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Medications</label>
                <select name="medications" value={formData.medications} onChange={handleSelectChange} className={sel}>
                  <option value="0">Not taken</option><option value="1">Taken — no modification required</option><option value="2">Taken — modification required</option>
                </select>
              </div>
            </div>
          </Section>

          <Section accent="#10b981" title="Clinical Examination">
            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Oral Hygiene</label>
                <select name="oralHygiene" value={formData.oralHygiene} onChange={handleSelectChange} className={sel}>
                  <option value="0">Compliant / Good</option><option value="1">Fair</option><option value="2">Neglected / Poor</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Periodontal Health</label>
                <select name="perio" value={formData.perio} onChange={handleSelectChange} className={sel}>
                  <option value="0">Healthy periodontium</option><option value="1">Gingivitis</option><option value="3">Initial to moderate periodontitis</option><option value="6">Advanced periodontitis — mobility / probing &gt;5mm</option>
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Root Canal Treated?</label>
                <select name="rootTreated" value={formData.rootTreated} onChange={handleSelectChange} className={sel}>
                  <option value="no">No</option><option value="yes">Yes — previously root canal treated</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Canal System Accessed?</label>
                <select name="rootAccessed" value={formData.rootAccessed} onChange={handleSelectChange} className={sel}>
                  <option value="no">No</option><option value="yes">Yes — treatment initiated but incomplete</option>
                </select>
              </div>
            </div>

            <UnifiedDiagram walls={walls} occlusal={occlusal} sites={sites} remainingPercent={remainingPercent}
              restorationStatus={restorationStatus} crownAccessible={crownAccessible} crownRemoved={crownRemoved} crownPrep={crownPrep}
              onWallChange={(wall,state)=>setWalls(p=>({...p,[wall]:state}))} onOcclusalChange={setOcclusal} onSiteChange={cycleSite}
              onRestorationChange={handleRestorationChange} onCrownAccessibleChange={handleCrownAccessibleChange}
              onCrownRemovedChange={handleCrownRemovedChange} onCrownPrepChange={handleCrownPrepChange}/>

            {formData.rootTreated==="no"&&formData.rootAccessed==="no"&&(
              <div className="mt-6 border-t border-white/8 pt-5">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-semibold">Pulp Sensibility Testing</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Cold Test Response (CO₂ dry ice preferred)</label>
                  <select name="coldTest" value={formData.coldTest} onChange={handleSelectChange} className={sel}>
                    <option value="">Select response</option><option value="normal">Brief — resolves within 1–2 seconds (Normal)</option>
                    <option value="lingering_short">Lingering under 30 seconds (Reversible)</option><option value="lingering_long">Lingering over 30 seconds (Irreversible)</option><option value="none">No response</option>
                  </select>
                  <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed">Duration of lingering is the key diagnostic variable — not intensity alone.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-5 mt-4">
                  <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Spontaneous Pain</label><select name="spontaneous" value={formData.spontaneous} onChange={handleSelectChange} className={sel}><option value="no">No</option><option value="yes">Yes — unprovoked pain</option></select></div>
                  <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Nocturnal Pain</label><select name="nocturnal" value={formData.nocturnal} onChange={handleSelectChange} className={sel}><option value="no">No</option><option value="yes">Yes — wakes patient at night</option></select></div>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-white/8 pt-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-semibold">Periapical Clinical Tests</p>
              <p className="text-[10px] text-gray-600 mb-4 leading-relaxed">Percussion and palpation indicate PDL inflammation — not pulpal status.</p>
              <div className="grid md:grid-cols-2 gap-5">
                {[{n:"percussion",l:"Percussion Test",o:[["no","No tenderness"],["yes","Tender to percussion"]]},{n:"palpation",l:"Palpation Test",o:[["no","No tenderness"],["yes","Tender to palpation"]]},{n:"swelling",l:"Swelling",o:[["no","No swelling"],["yes","Facial / intraoral swelling present"]]},{n:"sinus",l:"Sinus Tract",o:[["no","No sinus tract"],["yes","Sinus tract present"]]},{n:"mobility",l:"Tooth Mobility",o:[["no","No mobility"],["yes","Mobility present"]]},{n:"periApical",l:"Periapical Lesion (radiograph)",o:[["no","No periapical lesion"],["yes","Periapical lesion present"]]}].map(f=>(
                  <div key={f.n}><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">{f.l}</label>
                    <select name={f.n} value={(formData as any)[f.n]} onChange={handleSelectChange} className={sel}>{f.o.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6"><LiveDiagnosisBadge pulpal={pulpalResult.diagnosis} periapical={periapicalResult.diagnosis} inconsistencies={inconsistencies}/></div>
          </Section>

          <CrackSection formData={formData} onChange={handleChange}/>
          {isRetreatmentCase&&<RetreatmentSection formData={formData} onChange={handleChange}/>}

          <Section accent="#f59e0b" title="Endodontic Complexity">
            <div className="space-y-5">
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Endodontic Score</label>
                <select name="endo" value={formData.endo} onChange={handleSelectChange} className={sel}>
                  <option value="0">No endodontic treatment required</option><option value="1">Accessible root canal treatment or retreatment</option>
                  <option value="5">Challenging anatomy / complex retreatment</option><option value="10">Untreatable canal system — surgical option considered</option>
                </select>
                {formData.endo==="10"&&<div className="mt-2 flex items-start gap-2 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-2.5"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-orange-400 flex-shrink-0 mt-0.5"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg><p className="text-xs text-orange-400 leading-relaxed">Maximum complexity penalty. Microsurgical endodontics recommended if accessible.</p></div>}
              </div>
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Instrument Separation</label>
                <select name="instrumentSep" value={formData.instrumentSep} onChange={handleSelectChange} className={sel}><option value="no">No</option><option value="yes">Yes</option></select>
                {formData.instrumentSep==="yes"&&<div className="mt-3 grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-2">Location</label><select name="sepLocation" value={formData.sepLocation} onChange={handleSelectChange} className={sel}><option value="apical">Apical third</option><option value="middle">Middle third</option><option value="coronal">Coronal third</option></select></div>
                  <div><label className="block text-xs text-gray-500 mb-2">Stage of treatment</label><select name="sepStage" value={formData.sepStage} onChange={handleSelectChange} className={sel}><option value="after">After cleaning and shaping</option><option value="before">Before cleaning</option><option value="unknown">Unknown</option></select></div>
                </div>}
              </div>
              <div><label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Root Perforation</label>
                <select name="perforation" value={formData.perforation} onChange={handleSelectChange} className={sel}><option value="no">No</option><option value="yes">Yes</option></select>
                {formData.perforation==="yes"&&<div className="mt-3 grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-2">Location</label><select name="perfLocation" value={formData.perfLocation} onChange={handleSelectChange} className={sel}><option value="coronal">Coronal third</option><option value="middle">Middle third</option><option value="apical">Apical third</option></select></div>
                  <div><label className="block text-xs text-gray-500 mb-2">Time since perforation</label><select name="perfTime" value={formData.perfTime} onChange={handleSelectChange} className={sel}><option value="recent">Recent</option><option value="old">Old / established</option></select></div>
                </div>}
              </div>
            </div>
          </Section>

          <Section accent="#a855f7" title="Prosthodontic Context">
            <select name="prostho" value={formData.prostho} onChange={handleSelectChange} className={sel}>
              <option value="0">Isolated dental problem</option><option value="1">Prosthodontic plan — tooth is an abutment</option>
              <option value="2">Complex prosthodontic plan</option><option value="6">Retention would compromise the overall plan</option>
            </select>
          </Section>

          {isCalculationBlocked&&(
            <div className="rounded-3xl border-2 border-red-500/40 bg-red-500/8 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#ef4444" strokeWidth="1.5"/><path d="M8 5v4M8 10.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <p className="text-base font-bold text-red-400 mb-1">Crown Removal Required</p>
                  <p className="text-sm text-red-300/80 leading-relaxed">The crown has not been removed. Coronal structure cannot be assessed and prognosis calculation is blocked. Return to this form after crown removal, select the preparation level observed, then generate the report.</p>
                </div>
              </div>
            </div>
          )}

          <button onClick={calculate} disabled={loading||isCalculationBlocked}
            className="w-full font-bold py-5 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg disabled:transform-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={{background:(loading||isCalculationBlocked)?"#374151":`linear-gradient(135deg, ${urgCfg.accent}, ${urgCfg.accent}cc)`,boxShadow:(loading||isCalculationBlocked)?"none":`0 8px 32px ${urgCfg.accent}30`,color:(loading||isCalculationBlocked)?"#9ca3af":"#000"}}>
            {loading?(<span className="flex items-center justify-center gap-2"><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg><span className="text-white">Generating EndoDecide Report...</span></span>):isCalculationBlocked?"⚠ Remove crown before generating report":"Generate EndoDecide Report →"}
          </button>

          <p className="text-center text-xs text-gray-600 leading-relaxed">AAE 2013 terminology · Iowa Classification (Krell & Caplan 2018) · Tier 4: Zgur-Er et al. 2025 · Clinical decision support only</p>
        </div>
        <footer className="text-center py-8 text-xs text-gray-600 border-t border-white/8">© 2026 Endoprognosis. All rights reserved.</footer>
      </div>
    </ProtectedRoute>
  );
}