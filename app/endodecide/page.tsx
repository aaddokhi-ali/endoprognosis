"use client";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { detectProcedureCategory } from "../lib/casesService";
import Image from "next/image";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
type WallState  = "intact" | "moderate" | "severe";
type WallKey    = "mesial" | "distal" | "buccal" | "lingual";
type OcclusalState = "access_only" | "moderate" | "severe";
type PocketLevel   = "normal" | "attachment" | "deep";
type Urgency    = "low" | "medium" | "high";

// ── NEW: Retreatment-specific types ──
type ObturationQuality   = "adequate" | "inadequate";
type RestorationQuality  = "good" | "poor";
type PostWithoutCrown    = "no" | "yes";
type PreviousAttempts    = "first" | "second" | "third_or_more";

interface WallStates {
  mesial: WallState; distal: WallState;
  buccal: WallState; lingual: WallState;
}

interface ProbingSite {
  id: string; label: string; short: string;
  cx: number; cy: number; level: PocketLevel;
}

// ════════════════════════════════════════════════════════════
// CONSTANTS & CONFIG
// ════════════════════════════════════════════════════════════
const WALL_WEIGHTS: Record<WallKey, number> = {
  mesial: 22, distal: 22, buccal: 23, lingual: 23,
};

const STATE_CONTRIBUTION: Record<WallState, number> = {
  intact: 1.0, moderate: 0.5, severe: 0.0,
};

const WALL_CONFIG: Record<WallState, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  intact:   { label: "Intact",   color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/50", dot: "bg-emerald-400" },
  moderate: { label: "Moderate", color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/50",   dot: "bg-amber-400"   },
  severe:   { label: "Severe",   color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/50",     dot: "bg-red-400"     },
};

const OCCLUSAL_CONFIG: Record<OcclusalState, {
  label: string; color: string; bg: string; border: string;
}> = {
  access_only: { label: "Access cavity only",          color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/50" },
  moderate:    { label: "Moderate loss beyond access", color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/50"   },
  severe:      { label: "Severe / cusp loss",          color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/50"     },
};

const POCKET_COLOR: Record<PocketLevel, string> = {
  normal: "#10b981", attachment: "#f59e0b", deep: "#ef4444",
};

const POCKET_CYCLE: Record<PocketLevel, PocketLevel> = {
  normal: "attachment", attachment: "deep", deep: "normal",
};

const POCKET_LABEL: Record<PocketLevel, string> = {
  normal:     "Normal (<3mm)",
  attachment: "Attachment loss (3–4mm)",
  deep:       "Deep (≥5mm) — Iowa trigger",
};

const INITIAL_SITES: ProbingSite[] = [
  { id: "mb", label: "Mesio-Buccal",  short: "MB", cx: 100, cy: 92,  level: "normal" },
  { id: "b",  label: "Buccal",        short: "B",  cx: 160, cy: 68,  level: "normal" },
  { id: "db", label: "Disto-Buccal",  short: "DB", cx: 220, cy: 92,  level: "normal" },
  { id: "ml", label: "Mesio-Lingual", short: "ML", cx: 100, cy: 192, level: "normal" },
  { id: "l",  label: "Lingual",       short: "L",  cx: 160, cy: 216, level: "normal" },
  { id: "dl", label: "Disto-Lingual", short: "DL", cx: 220, cy: 192, level: "normal" },
];

const URGENCY_CONFIG: Record<Urgency, {
  label: string;
  sub: string;
  accent: string;
  accentDim: string;
  heroBg: string;
  badge: string;
  badgeText: string;
}> = {
  low: {
    label: "Asymptomatic",
    sub: "Elective — low urgency",
    accent: "#10b981",
    accentDim: "#10b98130",
    heroBg: "from-emerald-950/80 via-[#0a1428]/90 to-[#0a1428]",
    badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
    badgeText: "Low Urgency",
  },
  medium: {
    label: "Symptomatic — No Swelling",
    sub: "Prompt treatment — medium urgency",
    accent: "#f59e0b",
    accentDim: "#f59e0b30",
    heroBg: "from-amber-950/80 via-[#0a1428]/90 to-[#0a1428]",
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-400",
    badgeText: "Medium Urgency",
  },
  high: {
    label: "Symptomatic — Facial Swelling",
    sub: "Urgent treatment required",
    accent: "#ef4444",
    accentDim: "#ef444430",
    heroBg: "from-red-950/80 via-[#0a1428]/90 to-[#0a1428]",
    badge: "bg-red-500/15 border-red-500/40 text-red-400",
    badgeText: "High Urgency",
  },
};

// ════════════════════════════════════════════════════════════
// CALCULATION HELPERS
// ════════════════════════════════════════════════════════════
function computeFerrule(walls: WallStates): {
  wallsWithFerrule: number; penalty: number; label: string;
} {
  const intact   = (Object.values(walls) as WallState[]).filter(v => v === "intact").length;
  const moderate = (Object.values(walls) as WallState[]).filter(v => v === "moderate").length;
  const withFerrule = intact + moderate;
  let penalty = 0; let label = "";
  if (withFerrule === 4)      { penalty = 0;  label = "Adequate ferrule on all walls"; }
  else if (withFerrule === 3) { penalty = 2;  label = "Ferrule compromised on 1 wall"; }
  else if (withFerrule === 2) { penalty = 5;  label = "Ferrule on 2 walls only — insufficient"; }
  else if (withFerrule === 1) { penalty = 9;  label = "Ferrule on 1 wall only — no ferrule effect"; }
  else                         { penalty = 12; label = "No ferrule effect"; }
  return { wallsWithFerrule: withFerrule, penalty, label };
}

function computeRemainingPercent(walls: WallStates, occlusal: OcclusalState): number {
  let total = 0;
  (Object.entries(walls) as [WallKey, WallState][]).forEach(([key, state]) => {
    total += WALL_WEIGHTS[key] * STATE_CONTRIBUTION[state];
  });
  if (occlusal === "moderate") total -= 5;
  if (occlusal === "severe")   total -= 10;
  return Math.max(5, Math.round(total));
}

// ════════════════════════════════════════════════════════════
// PULPAL DIAGNOSIS LOGIC (AAE 2013 terminology)
// ════════════════════════════════════════════════════════════
function derivePulpalDiagnosis(form: any): {
  diagnosis: string;
  isInconsistent: boolean;
  inconsistencyNote: string;
} {
  if (form.rootTreated === "yes") return { diagnosis: "Previously Treated", isInconsistent: false, inconsistencyNote: "" };
  if (form.rootAccessed === "yes") return { diagnosis: "Previously Initiated Therapy", isInconsistent: false, inconsistencyNote: "" };

  const coldResponse  = form.coldTest;
  const spontaneous   = form.spontaneous === "yes";
  const nocturnal     = form.nocturnal === "yes";

  if (coldResponse === "none" && (spontaneous || nocturnal)) {
    return {
      diagnosis: "Pulp Necrosis",
      isInconsistent: true,
      inconsistencyNote: "Inconsistent finding: no cold response with spontaneous pain may indicate partial necrosis (necrobiosis). Pulp Necrosis recorded — correlate with radiographic findings.",
    };
  }

  if (coldResponse === "none") return { diagnosis: "Pulp Necrosis", isInconsistent: false, inconsistencyNote: "" };
  if (coldResponse === "lingering_long" || spontaneous || nocturnal) {
    return { diagnosis: "Irreversible Pulpitis", isInconsistent: false, inconsistencyNote: "" };
  }
  if (coldResponse === "lingering_short") {
    return { diagnosis: "Reversible Pulpitis", isInconsistent: false, inconsistencyNote: "" };
  }
  if (coldResponse === "normal") return { diagnosis: "Normal Pulp", isInconsistent: false, inconsistencyNote: "" };

  return { diagnosis: "Not determined", isInconsistent: false, inconsistencyNote: "" };
}

// ════════════════════════════════════════════════════════════
// PERIAPICAL DIAGNOSIS LOGIC (AAE 2013 terminology)
// ════════════════════════════════════════════════════════════
function derivePeriapicalDiagnosis(form: any): {
  diagnosis: string;
  isInconsistent: boolean;
  inconsistencyNote: string;
} {
  const hasSwelling   = form.swelling   === "yes";
  const hasSinus      = form.sinus      === "yes";
  const hasPercussion = form.percussion === "yes";
  const hasPalpation  = form.palpation  === "yes";
  const hasLesion     = form.periApical === "yes";

  if (hasSwelling && hasSinus) {
    return {
      diagnosis: "Acute Apical Abscess",
      isInconsistent: true,
      inconsistencyNote: "Inconsistent finding: swelling and sinus tract reported simultaneously. Acute Apical Abscess recorded — verify clinically whether sinus is draining the swelling.",
    };
  }

  if (hasSwelling)              return { diagnosis: "Acute Apical Abscess",          isInconsistent: false, inconsistencyNote: "" };
  if (hasSinus)                 return { diagnosis: "Chronic Apical Abscess",         isInconsistent: false, inconsistencyNote: "" };
  if (hasPercussion || hasPalpation) return { diagnosis: "Symptomatic Apical Periodontitis", isInconsistent: false, inconsistencyNote: "" };
  if (hasLesion)                return { diagnosis: "Asymptomatic Apical Periodontitis", isInconsistent: false, inconsistencyNote: "" };
  return { diagnosis: "Normal Apical Tissues", isInconsistent: false, inconsistencyNote: "" };
}

// ════════════════════════════════════════════════════════════
// IOWA CLASSIFICATION
// ════════════════════════════════════════════════════════════
function calcIowaStage(deepCount: number, marginalRidge: boolean, periDx: string): {
  stage: string; successRate: number; label: string;
} {
  if (deepCount >= 1) return { stage: "IV", successRate: 41, label: "Extension into periodontium — pocket ≥5mm" };
  if (!marginalRidge) return { stage: "I",  successRate: 93, label: "Crack within crown — no distal ridge involvement" };
  const isStageIIITrigger = ["Asymptomatic Apical Periodontitis","Symptomatic Apical Periodontitis","Acute Apical Abscess","Chronic Apical Abscess"].includes(periDx);
  if (!isStageIIITrigger) return { stage: "II", successRate: 84, label: "Crack across distal marginal ridge — no periapical involvement" };
  return { stage: "III", successRate: 69, label: "Crack across distal marginal ridge with periapical involvement" };
}

// ════════════════════════════════════════════════════════════
// TIER 4 — RETREATMENT HISTORY CALCULATION
// Activated only when rootTreated === "yes"
// Uncapped — these are legitimate impractical triggers,
// unlike Tier 3 procedural errors which are workable
// ════════════════════════════════════════════════════════════
function calcTier4(params: {
  rootTreated: boolean;
  existingObturation: ObturationQuality;
  restorationQuality: RestorationQuality;
  postWithoutCrown: PostWithoutCrown;
  previousAttempts: PreviousAttempts;
}): {
  tier4Deductions: number;
  isPostWithoutCrownOverride: boolean;
  obturationNarrative: string;
  tier4Factors: string[];
} {
  const { rootTreated, existingObturation, restorationQuality,
    postWithoutCrown, previousAttempts } = params;

  // Not a retreatment case — zero contribution
  if (!rootTreated) {
    return {
      tier4Deductions: 0,
      isPostWithoutCrownOverride: false,
      obturationNarrative: "",
      tier4Factors: [],
    };
  }

  let deductions = 0;
  const factors: string[] = [];

  // ── 1. Existing obturation quality ──
  // Zgur-Er 2025: short fillings → 2.1× HR on univariate (p=0.035)
  // Lost significance on multivariate when restoration controlled for
  // → modest penalty (3 pts), strong narrative value
  if (existingObturation === "inadequate") {
    deductions += 3;
    factors.push(
      "Inadequate pre-existing obturation — intraradicular cause likely; favorable retreatment biology if disinfection achievable"
    );
  } else {
    factors.push(
      "Adequate pre-existing obturation — consider extraradicular cause for failure (radicular cyst, scar tissue healing, or VRF)"
    );
  }

  // ── 2. Coronal restoration quality ──
  // Zgur-Er 2025 multivariate: poor composite → HR 6.89×, poor crown → HR 7.21×
  // 8-point penalty maps retreatment baseline (~87) to ~79%
  // which aligns with the overall cohort success rate in that study
  if (restorationQuality === "poor") {
    deductions += 8;
    factors.push(
      "Poor coronal restoration quality — 6.9–7.2× higher failure risk on multivariate analysis (Zgur-Er 2025)"
    );
  }

  // ── 3. Post without full coverage ──
  // Zgur-Er 2025: survival collapsed to 25.6%, 100% fracture-related extraction
  // This is an override-level finding — 18 pt penalty pushes most cases below threshold
  const isPostWithoutCrownOverride = postWithoutCrown === "yes";
  if (isPostWithoutCrownOverride) {
    deductions += 18;
    factors.push(
      "Post present without full coverage crown — survival rate 25.6%; 100% of extractions in this group were fracture-related (Zgur-Er 2025). Full coverage restoration is mandatory."
    );
  }

  // ── 4. Number of previous treatment attempts ──
  // Biological rationale: each retreatment further compromises dentin,
  // reduces canal taper options, and increases treatment-resistant biofilm
  // No single study powers this exactly — penalties are clinically reasoned
  if (previousAttempts === "second") {
    deductions += 3;
    factors.push("Second retreatment attempt — additional dentin loss and elevated treatment-resistant bacterial load");
  } else if (previousAttempts === "third_or_more") {
    deductions += 7;
    factors.push("Third or more retreatment attempt — severely compromised prognosis; surgical option should be evaluated");
  }

  // Obturation narrative (used separately in explanationNote on result page)
  const obturationNarrative = existingObturation === "inadequate"
    ? "The pre-existing root canal filling was inadequate, suggesting an intraradicular cause for failure that may be correctable with thorough retreatment."
    : "The pre-existing root canal filling was adequate, raising the possibility of an extraradicular cause for failure. Correlation with CBCT and clinical findings is recommended before proceeding.";

  return {
    tier4Deductions: deductions,
    isPostWithoutCrownOverride,
    obturationNarrative,
    tier4Factors: factors,
  };
}

// ════════════════════════════════════════════════════════════
// MAIN PROGNOSIS CALCULATION — Tiered System
// ════════════════════════════════════════════════════════════
function calculatePrognosis(params: {
  toothNumber: string;
  walls: WallStates;
  occlusal: OcclusalState;
  remainingPercent: number;
  perio: string;
  oralHygiene: string;
  medical: string;
  endo: string;
  instrumentSep: boolean;
  sepLocation: string;
  sepStage: string;
  perforation: boolean;
  perfLocation: string;
  perfTime: string;
  prostho: string;
  periApical: boolean;
  // NEW: Tier 4 params
  rootTreated: boolean;
  existingObturation: ObturationQuality;
  restorationQuality: RestorationQuality;
  postWithoutCrown: PostWithoutCrown;
  previousAttempts: PreviousAttempts;
}): {
  survival: number;
  survivalRange: [number, number];
  totalDPI: number;
  isPractical: boolean;
  threshold: number;
  toothType: string;
  isImpracticalOverride: boolean;
  overrideReason: string;
  tier1Deductions: number;
  tier2Deductions: number;
  tier3Deductions: number;
  // NEW
  tier4Deductions: number;
  isPostWithoutCrownOverride: boolean;
  obturationNarrative: string;
  tier4Factors: string[];
} {
  const { toothNumber, walls, occlusal, remainingPercent, perio, oralHygiene,
    medical, endo, instrumentSep, sepLocation, sepStage, perforation,
    perfLocation, perfTime, prostho, periApical,
    rootTreated, existingObturation, restorationQuality, postWithoutCrown, previousAttempts } = params;

  const isAnterior  = ["11","12","13","21","22","23","31","32","33","41","42","43"].includes(toothNumber);
  const isPremolar  = ["14","15","24","25","34","35","44","45"].includes(toothNumber);
  const toothType   = isAnterior ? "Anterior" : isPremolar ? "Premolar" : "Molar";
  const threshold   = isAnterior ? 55 : isPremolar ? 60 : 65;

  // Baseline
  let survival = periApical ? 87 : 92;

  // ── TIER 1: Tooth-level factors ──
  let tier1 = 0;

  if (!isAnterior && !isPremolar) tier1 += 4;
  else if (!isAnterior)           tier1 += 2;

  const missingPercent = 100 - remainingPercent;
  if      (missingPercent > 70) tier1 += 12;
  else if (missingPercent > 50) tier1 += 8;
  else if (missingPercent > 30) tier1 += 4;
  else if (missingPercent > 10) tier1 += 2;

  const ferrule = computeFerrule(walls);
  tier1 += Math.round(ferrule.penalty * 0.4);

  const endoVal = parseInt(endo) || 0;
  if      (endoVal === 10) tier1 += 10;
  else if (endoVal === 5)  tier1 += 5;

  // ── TIER 2: Patient-level factors ──
  let tier2 = 0;

  const perioVal = parseInt(perio) || 0;
  let perioBase = 0;
  if      (perioVal >= 6) perioBase = 10;
  else if (perioVal === 3) perioBase = 5;
  else if (perioVal === 1) perioBase = 2;

  const ohVal = parseInt(oralHygiene) || 0;
  const amplifier = ohVal === 2 ? 2.0 : ohVal === 1 ? 1.5 : 1.0;
  tier2 += Math.round(perioBase * amplifier);

  const medVal = parseInt(medical) || 0;
  if      (medVal >= 6) tier2 += 8;
  else if (medVal >= 3) tier2 += 4;
  else if (medVal >= 1) tier2 += 1;

  // ── TIER 3: Procedural factors (capped) ──
  let tier3 = 0;

  if (instrumentSep) {
    let sepDeduction = 3;
    if (sepLocation === "middle")  sepDeduction += 1;
    if (sepLocation === "coronal" || sepStage === "before") sepDeduction += 2;
    tier3 += Math.min(sepDeduction, 5);
  }

  if (perforation) {
    let perfDeduction = 3;
    if (perfTime === "old") perfDeduction += 2;
    else if (perfLocation === "coronal") perfDeduction += 1;
    tier3 += Math.min(perfDeduction, 5);
  }

  // Cap Tier 3: cannot alone push below threshold
  const afterTier12 = survival - tier1 - tier2;
  const cappedTier3 = Math.min(tier3, Math.max(0, afterTier12 - threshold));

  // ── TIER 4: Retreatment history (uncapped) ──
  const tier4Result = calcTier4({
    rootTreated,
    existingObturation,
    restorationQuality,
    postWithoutCrown,
    previousAttempts,
  });
  const { tier4Deductions, isPostWithoutCrownOverride, obturationNarrative, tier4Factors } = tier4Result;

  // Apply all tiers
  survival = Math.round(survival - tier1 - tier2 - cappedTier3 - tier4Deductions);
  survival = Math.max(35, Math.min(92, survival));

  // Prostho context (applied after tiers for context adjustment)
  const prosthoVal = parseInt(prostho) || 0;
  if      (prosthoVal >= 6) survival -= 8;
  else if (prosthoVal >= 2) survival -= 3;
  else if (prosthoVal >= 1) survival -= 1;
  survival = Math.max(35, survival);

  const survivalRange: [number, number] = [Math.max(0, survival - 3), Math.min(100, survival + 3)];

  const totalDPI = tier1 + tier2 + cappedTier3 + tier4Deductions + (periApical ? 1 : 0) + prosthoVal;

  const isPractical = survival >= threshold;

  // Impractical override: untreatable canal in non-anterior tooth (existing)
  const isImpracticalOverride = endoVal === 10 && !isAnterior;
  const overrideReason = isImpracticalOverride
    ? "Untreatable canal system in a non-anterior tooth — surgical access required to determine feasibility"
    : isPostWithoutCrownOverride
      ? "Post present without full coronal coverage — full coverage restoration is required before or concurrent with retreatment"
      : "";

  return {
    survival,
    survivalRange,
    totalDPI,
    isPractical: (isImpracticalOverride || isPostWithoutCrownOverride) ? false : isPractical,
    threshold,
    toothType,
    isImpracticalOverride,
    overrideReason,
    tier1Deductions: tier1,
    tier2Deductions: tier2,
    tier3Deductions: cappedTier3,
    tier4Deductions,
    isPostWithoutCrownOverride,
    obturationNarrative,
    tier4Factors,
  };
}

// ════════════════════════════════════════════════════════════
// TREATMENT RECOMMENDATION
// ════════════════════════════════════════════════════════════
function deriveTreatmentRec(
  pulpalDx: string,
  isPractical: boolean,
  endoVal: number,
  ageGroup: string,
): string {
  if (!isPractical) return "";
  if (pulpalDx === "Normal Pulp") return "No Endodontic Treatment Indicated";
  if (pulpalDx === "Previously Treated") return "Root Canal Retreatment";
  if (pulpalDx === "Previously Initiated Therapy") return "Root Canal Treatment";
  if (pulpalDx === "Reversible Pulpitis") return "Vital Pulp Therapy";
  if (endoVal === 10) return "Microsurgical Endodontics (if surgically accessible)";
  return "Root Canal Treatment";
}

// ════════════════════════════════════════════════════════════
// AFFECTING FACTORS BUILDER
// ════════════════════════════════════════════════════════════
function buildAffectingFactors(params: {
  remainingPercent: number;
  walls: WallStates;
  periApical: boolean;
  perio: string;
  oralHygiene: string;
  medical: string;
  endoVal: number;
  instrumentSep: boolean;
  perforation: boolean;
  prosthoVal: number;
  ferrule: { wallsWithFerrule: number; label: string };
  // NEW: Tier 4 factors passed in pre-computed
  tier4Factors: string[];
  postWithoutCrown: PostWithoutCrown;
}): string[] {
  const factors: string[] = [];
  const { remainingPercent, walls, periApical, perio, oralHygiene, medical,
    endoVal, instrumentSep, perforation, prosthoVal, ferrule,
    tier4Factors, postWithoutCrown } = params;

  const missingPercent = 100 - remainingPercent;

  if (missingPercent > 0) {
    let structureText = `${missingPercent}% loss of coronal tooth structure`;
    if (ferrule.wallsWithFerrule === 0)      structureText += " — no ferrule effect";
    else if (ferrule.wallsWithFerrule <= 2)  structureText += " — insufficient ferrule";
    factors.push(structureText);
  } else {
    factors.push("Adequate remaining coronal structure");
  }

  // Fracture risk warning — triggered by ferrule compromise OR post-without-crown
  // Evidence: fracture = 66.7% of extractions post-endo (Zgur-Er 2025)
  if (ferrule.wallsWithFerrule <= 2 || postWithoutCrown === "yes") {
    factors.push(
      "High structural fracture risk — crown/root fracture accounts for 66.7% of post-endodontic extractions, far exceeding apical periodontitis recurrence"
    );
  }

  if (periApical) factors.push("Periapical lesion present");

  const perioVal = parseInt(perio) || 0;
  const ohVal    = parseInt(oralHygiene) || 0;
  if (perioVal >= 6) {
    factors.push(ohVal >= 1
      ? "Advanced periodontal disease with poor oral hygiene — significantly compounded risk"
      : "Advanced periodontal disease");
  } else if (perioVal === 3) {
    factors.push(ohVal >= 1
      ? "Moderate periodontitis compounded by poor oral hygiene"
      : "Moderate periodontitis");
  } else if (perioVal === 1) {
    factors.push(ohVal >= 1
      ? "Gingivitis with poor oral hygiene"
      : "Gingivitis");
  } else if (ohVal >= 1) {
    factors.push("Poor oral hygiene — elevated long-term risk");
  }

  const medVal = parseInt(medical) || 0;
  if (medVal >= 3) factors.push("Significant medical compromise (ASA III or higher)");
  else if (medVal >= 1) factors.push("Medical compromise (ASA II — controlled condition)");

  if (endoVal >= 5) factors.push("High endodontic complexity");
  if (instrumentSep) factors.push("Instrument separation");
  if (perforation)   factors.push("Root perforation");
  if (prosthoVal >= 1) factors.push("Prosthodontic complexity");

  // Append Tier 4 factors last (retreatment-specific)
  tier4Factors.forEach(f => factors.push(f));

  return factors.slice(0, 9); // Increased cap from 7 to 9 to accommodate Tier 4
}

// ════════════════════════════════════════════════════════════
// VRF FLAG LOGIC
// ════════════════════════════════════════════════════════════
function checkVRFFlag(params: {
  rootTreated: boolean;
  deepCount: number;
  hasSinus: boolean;
  remainingPercent: number;
}): boolean {
  const { rootTreated, deepCount, hasSinus, remainingPercent } = params;
  return rootTreated && (deepCount >= 1 || hasSinus) && remainingPercent < 50;
}

// ════════════════════════════════════════════════════════════
// SECTION WRAPPER COMPONENT
// ════════════════════════════════════════════════════════════
function Section({ accent, title, children, note }: {
  accent: string; title: string; children: React.ReactNode; note?: string;
}) {
  return (
    <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-6 rounded-full" style={{ background: accent }} />
        <h3 className="font-semibold text-white">{title}</h3>
        {note && (
          <span className="ml-2 text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{note}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SELECT STYLE
// ════════════════════════════════════════════════════════════
const sel = "w-full bg-[#0a1428] border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-[#10b981] transition-colors appearance-none cursor-pointer";

// ════════════════════════════════════════════════════════════
// WALL + PROBING UNIFIED DIAGRAM
// ════════════════════════════════════════════════════════════
function UnifiedDiagram({
  walls, occlusal, sites, remainingPercent,
  onWallChange, onOcclusalChange, onSiteChange,
}: {
  walls: WallStates;
  occlusal: OcclusalState;
  sites: ProbingSite[];
  remainingPercent: number;
  onWallChange: (wall: WallKey, state: WallState) => void;
  onOcclusalChange: (state: OcclusalState) => void;
  onSiteChange: (id: string) => void;
}) {
  const ferrule    = computeFerrule(walls);
  const wallOrder: WallKey[] = ["buccal", "mesial", "distal", "lingual"];
  const deepCount  = sites.filter(s => s.level === "deep").length;
  const normalCount = sites.filter(s => s.level === "normal").length;
  const attachCount = sites.filter(s => s.level === "attachment").length;

  const wallLabels: Record<WallKey, { name: string; sub: string; icon: string }> = {
    buccal:  { name: "Buccal Wall",  sub: "Facial surface · 23%",   icon: "↑" },
    mesial:  { name: "Mesial Wall",  sub: "Forward proximal · 22%", icon: "←" },
    distal:  { name: "Distal Wall",  sub: "Back proximal · 22%",    icon: "→" },
    lingual: { name: "Lingual Wall", sub: "Palatal surface · 23%",  icon: "↓" },
  };

  function cycleWall(current: WallState): WallState {
    const cycle: WallState[] = ["intact", "moderate", "severe"];
    return cycle[(cycle.indexOf(current) + 1) % cycle.length];
  }
  function cycleOcclusal(current: OcclusalState): OcclusalState {
    const cycle: OcclusalState[] = ["access_only", "moderate", "severe"];
    return cycle[(cycle.indexOf(current) + 1) % cycle.length];
  }

  const wallColor = (w: WallState) =>
    w === "intact" ? "#10b981" : w === "moderate" ? "#f59e0b" : "#ef4444";

  const ferruleRingColor =
    ferrule.wallsWithFerrule >= 4 ? "#10b981" :
    ferrule.wallsWithFerrule >= 3 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-[#0a1428] border border-white/10 rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Coronal Structure & Periodontal Probing</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Click walls to cycle state · Click probing dots to cycle depth
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-[#10b981]">{remainingPercent}%</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">remaining</p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        <div className="flex-shrink-0 flex flex-col items-center mx-auto">
          <svg width="320" height="300" viewBox="0 0 320 300" className="w-full max-w-xs">
            <rect x="12" y="12" width="296" height="276" rx="32"
              fill="none" stroke={ferruleRingColor}
              strokeWidth="2.5" strokeDasharray="6 4" opacity="0.5" />
            <rect x="32" y="18" width="256" height="46" rx="12"
              fill={wallColor(walls.buccal)} opacity={walls.buccal === "intact" ? 0.7 : 0.45} />
            <rect x="32" y="236" width="256" height="46" rx="12"
              fill={wallColor(walls.lingual)} opacity={walls.lingual === "intact" ? 0.7 : 0.45} />
            <rect x="18" y="32" width="46" height="236" rx="12"
              fill={wallColor(walls.mesial)} opacity={walls.mesial === "intact" ? 0.7 : 0.45} />
            <rect x="256" y="32" width="46" height="236" rx="12"
              fill={wallColor(walls.distal)} opacity={walls.distal === "intact" ? 0.7 : 0.45} />
            <rect x="64" y="64" width="192" height="172" rx="18"
              fill={occlusal === "access_only" ? "#10b981" : occlusal === "moderate" ? "#f59e0b" : "#ef4444"}
              opacity={occlusal === "access_only" ? 0.55 : 0.38} />
            <circle cx="160" cy="150" r="28"
              fill={occlusal === "access_only" ? "#0a1428" : occlusal === "moderate" ? "#92400e" : "#7f1d1d"}
              opacity="0.85" />
            <text x="160" y="45"  textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9">BUCCAL</text>
            <text x="160" y="263" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9">LINGUAL</text>
            <text x="41"  y="154" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9" transform="rotate(-90 41 154)">MESIAL</text>
            <text x="279" y="154" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" opacity="0.9" transform="rotate(90 279 154)">DISTAL</text>
            <text x="160" y="145" textAnchor="middle" fontSize="8" fill="white" opacity="0.75">ACCESS</text>
            <text x="160" y="157" textAnchor="middle" fontSize="8" fill="white" opacity="0.75">CAVITY</text>
            <text x="160" y="200" textAnchor="middle" fontSize="13" fill="#10b981" fontWeight="800">{remainingPercent}%</text>
            {sites.map(s => {
              const color = POCKET_COLOR[s.level];
              const isDeep = s.level === "deep";
              return (
                <g key={s.id} onClick={() => onSiteChange(s.id)} style={{ cursor: "pointer" }}>
                  {isDeep && (
                    <circle cx={s.cx} cy={s.cy} r="14" fill="none"
                      stroke={color} strokeWidth="1.5" opacity="0.35" />
                  )}
                  <circle cx={s.cx} cy={s.cy} r="11"
                    fill={color + "25"} stroke={color} strokeWidth="2"
                    style={{ filter: `drop-shadow(0 0 5px ${color}60)` }} />
                  <text x={s.cx} y={s.cy + 4} textAnchor="middle"
                    fontSize="8" fill={color} fontWeight="800">{s.short}</text>
                </g>
              );
            })}
          </svg>

          <div className={`mt-3 px-3 py-1.5 rounded-full text-[10px] font-semibold border ${
            ferrule.wallsWithFerrule >= 4 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
            ferrule.wallsWithFerrule >= 3 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
            "bg-red-500/10 border-red-500/30 text-red-400"
          }`}>
            {ferrule.label}
          </div>

          {deepCount >= 1 && (
            <div className="mt-2 flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <p className="text-[10px] text-red-400 font-semibold">
                {deepCount} deep pocket{deepCount > 1 ? "s" : ""} — Iowa Stage IV if crack confirmed
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 w-full space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Coronal Walls — click to cycle</p>
          {wallOrder.map((wall) => {
            const state = walls[wall];
            const cfg   = WALL_CONFIG[state];
            const info  = wallLabels[wall];
            return (
              <button key={wall}
                onClick={() => onWallChange(wall, cycleWall(state))}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border ${cfg.bg} ${cfg.border} hover:opacity-90 transition-all group`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-5 text-center">{info.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{info.name}</p>
                    <p className="text-[10px] text-gray-500">{info.sub}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                </div>
              </button>
            );
          })}

          <button onClick={() => onOcclusalChange(cycleOcclusal(occlusal))}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border ${OCCLUSAL_CONFIG[occlusal].bg} ${OCCLUSAL_CONFIG[occlusal].border} hover:opacity-90 transition-all group`}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-5 text-center">○</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Occlusal / Incisal</p>
                <p className="text-[10px] text-gray-500">Penalizes only beyond access cavity</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                occlusal === "access_only" ? "bg-emerald-400" : occlusal === "moderate" ? "bg-amber-400" : "bg-red-400"
              }`} />
              <span className={`text-xs font-bold ${OCCLUSAL_CONFIG[occlusal].color}`}>
                {OCCLUSAL_CONFIG[occlusal].label}
              </span>
            </div>
          </button>

          <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-4 mb-2">Periodontal Probing — click dots to cycle depth</p>
          {sites.map(s => {
            const color = POCKET_COLOR[s.level];
            return (
              <button key={s.id} onClick={() => onSiteChange(s.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all hover:opacity-90"
                style={{ background: color + "12", borderColor: color + "40" }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-sm font-medium text-white">{s.label}</span>
                </div>
                <span className="text-[10px] font-bold" style={{ color }}>{POCKET_LABEL[s.level]}</span>
              </button>
            );
          })}

          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: "Normal",     count: normalCount, color: "#10b981" },
              { label: "Attachment", count: attachCount, color: "#f59e0b" },
              { label: "Deep ≥5mm",  count: deepCount,   color: "#ef4444" },
            ].map(s => (
              <div key={s.label} className="text-center rounded-xl py-2 border"
                style={{ background: s.color + "10", borderColor: s.color + "30" }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.count}</p>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/8 flex-wrap">
        {(["intact", "moderate", "severe"] as WallState[]).map(s => (
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

// ════════════════════════════════════════════════════════════
// CRACK SECTION COMPONENT
// ════════════════════════════════════════════════════════════
function CrackSection({ formData, onChange }: {
  formData: any;
  onChange: (name: string, value: string) => void;
}) {
  const crackPresent   = formData.crackPresent === "yes";
  const crackConfirmed = formData.crackTransillum === "yes" || formData.crackMethBlue === "yes" || formData.crackDirect === "yes";

  const toggleConfirm = (field: string) => {
    onChange(field, formData[field] === "yes" ? "no" : "yes");
  };

  return (
    <div className="bg-[#0d1a30] border border-white/10 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-6 rounded-full bg-orange-500" />
        <h3 className="font-semibold text-white">Crack Assessment</h3>
        <span className="ml-2 text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
          Triggers Iowa Classification if confirmed
        </span>
      </div>

      <div className="mb-5">
        <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
          Is a crack suspected or present?
        </label>
        <select name="crackPresent" value={formData.crackPresent}
          onChange={e => onChange("crackPresent", e.target.value)} className={sel}>
          <option value="no">No — no crack suspected</option>
          <option value="yes">Yes — crack suspected or visible</option>
        </select>
      </div>

      {crackPresent && (
        <>
          <div className={`rounded-2xl border-2 p-5 mb-5 transition-all ${
            crackConfirmed ? "bg-emerald-500/8 border-emerald-500/40" : "bg-white/3 border-white/15"
          }`}>
            <p className={`text-sm font-semibold mb-1 ${crackConfirmed ? "text-emerald-400" : "text-gray-300"}`}>
              Crack Confirmation — Required for Iowa Classification
            </p>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Per Krell & Caplan: no tooth staged without confirmed crack visualization. Select all methods used.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { field: "crackTransillum", icon: "💡", title: "Transillumination", desc: "Definite shadow blocking light with buccal and lingual placement" },
                { field: "crackMethBlue",   icon: "🔵", title: "Methylene Blue Dye", desc: "Visible dye uptake along the crack line after application" },
                { field: "crackDirect",     icon: "🔬", title: "Direct Visualization", desc: "Crack confirmed under magnification after restoration removal" },
              ].map(m => {
                const confirmed = formData[m.field] === "yes";
                return (
                  <button key={m.field} type="button"
                    onClick={() => toggleConfirm(m.field)}
                    className={`text-left rounded-2xl p-4 border-2 transition-all ${
                      confirmed ? "bg-emerald-500/15 border-emerald-500/50" : "bg-white/3 border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{m.icon}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
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
            <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 border ${
              crackConfirmed ? "bg-emerald-500/10 border-emerald-500/25" : "bg-amber-500/10 border-amber-500/25"
            }`}>
              {crackConfirmed ? (
                <>
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  <p className="text-xs text-emerald-400 font-semibold">Crack confirmed — Iowa Classification will be applied</p>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L14 13H2L8 2Z" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M8 7v3M8 11.5v.5" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <p className="text-xs text-amber-400">Crack suspected but not confirmed — no Iowa stage will be assigned</p>
                </>
              )}
            </div>
          </div>

          {crackConfirmed && (
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                  Bite test (Tooth Slooth / equivalent)
                </label>
                <select name="biteTest" value={formData.biteTest}
                  onChange={e => onChange("biteTest", e.target.value)} className={sel}>
                  <option value="no">Negative</option>
                  <option value="yes">Positive — pain on specific cusp release</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                  Distal marginal ridge involvement
                  <span className="ml-1 text-amber-400/70">★ Iowa variable</span>
                </label>
                <select name="marginalRidge" value={formData.marginalRidge}
                  onChange={e => onChange("marginalRidge", e.target.value)} className={sel}>
                  <option value="no">None / mesial ridge only</option>
                  <option value="yes">Distal or both ridges cracked</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RETREATMENT HISTORY SECTION — NEW TIER 4 COMPONENT
// Renders only when rootTreated === "yes"
// Accent: cyan (#06b6d4) — distinct from all existing sections
// ════════════════════════════════════════════════════════════
function RetreatmentSection({ formData, onChange }: {
  formData: any;
  onChange: (name: string, value: string) => void;
}) {
  const postWithoutCrown = formData.postWithoutCrown === "yes";

  return (
    <div className="bg-[#0d1a30] border border-cyan-500/30 rounded-3xl p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-6 rounded-full bg-cyan-500" />
        <h3 className="font-semibold text-white">Retreatment History</h3>
        <span className="ml-2 text-[10px] text-cyan-600 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
          Tier 4 — Retreatment cases only
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-6 leading-relaxed ml-3">
        These factors are specific to previously root canal treated teeth and contribute
        an independent retreatment penalty tier. Penalties in this tier are uncapped —
        post without crown and repeated retreatment are legitimate impractical triggers.
      </p>

      <div className="space-y-5">

        {/* 1. Number of previous attempts */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
            Number of Previous Treatment Attempts
          </label>
          <select name="previousAttempts" value={formData.previousAttempts}
            onChange={e => onChange("previousAttempts", e.target.value)} className={sel}>
            <option value="first">First retreatment</option>
            <option value="second">Second retreatment</option>
            <option value="third_or_more">Third or more — surgical option should be evaluated</option>
          </select>
          {formData.previousAttempts === "third_or_more" && (
            <div className="mt-2 flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-red-400 flex-shrink-0 mt-0.5">
                <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <p className="text-xs text-red-400 leading-relaxed">
                Third or more retreatment attempt — severe dentin loss, altered anatomy, and elevated
                treatment-resistant bacterial load. Microsurgical endodontics should be evaluated.
              </p>
            </div>
          )}
        </div>

        {/* 2. Existing obturation quality */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
            Quality of Existing Root Canal Obturation
            <span className="ml-1 normal-case text-cyan-400/70">— assess pre-op radiograph</span>
          </label>
          <select name="existingObturation" value={formData.existingObturation}
            onChange={e => onChange("existingObturation", e.target.value)} className={sel}>
            <option value="adequate">Adequate — within 0–2mm of apex, homogeneous, no voids</option>
            <option value="inadequate">Inadequate — short, voids, poor density, or missed canals</option>
          </select>
          {/* Obturation narrative hint */}
          <p className="text-[10px] mt-1.5 leading-relaxed px-1" style={{ color: "#06b6d480" }}>
            {formData.existingObturation === "inadequate"
              ? "Intraradicular cause likely — correctable with thorough retreatment"
              : "Adequate obturation — consider extraradicular cause (radicular cyst, scar tissue, VRF) before proceeding"
            }
          </p>
        </div>

        {/* 3. Coronal restoration quality */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
            Quality of Coronal Restoration at Time of Failure
            <span className="ml-1 normal-case text-cyan-400/70">— assess clinically and radiographically</span>
          </label>
          <select name="restorationQuality" value={formData.restorationQuality}
            onChange={e => onChange("restorationQuality", e.target.value)} className={sel}>
            <option value="good">Good — intact margins, no leakage, no recurrent caries</option>
            <option value="poor">Poor — marginal breakdown, leakage, recurrent caries, or lost</option>
          </select>
          {formData.restorationQuality === "poor" && (
            <div className="mt-2 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <p className="text-xs text-amber-400 leading-relaxed">
                Poor restoration quality is the strongest independent predictor of retreatment failure —
                6.9–7.2× higher failure risk on multivariate analysis (Zgur-Er 2025).
                Restoration plan must be addressed for retreatment to succeed.
              </p>
            </div>
          )}
        </div>

        {/* 4. Post without full coverage — most severe, listed last */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
            Post Present Without Full Coverage Crown?
            <span className="ml-1 normal-case text-red-400/70">★ Override trigger</span>
          </label>
          <select name="postWithoutCrown" value={formData.postWithoutCrown}
            onChange={e => onChange("postWithoutCrown", e.target.value)} className={sel}>
            <option value="no">No — no post, or post with full coverage crown</option>
            <option value="yes">Yes — post present but no full coverage crown</option>
          </select>

          {/* Post without crown — prominent override warning */}
          {postWithoutCrown && (
            <div className="mt-3 rounded-2xl border-2 border-red-500/50 bg-red-500/8 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L14 13H2L8 2Z" stroke="#ef4444" strokeWidth="1.6" strokeLinejoin="round"/>
                    <path d="M8 7v3M8 11.5v.5" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400 mb-1">
                    Critical Structural Risk — Impractical Override
                  </p>
                  <p className="text-xs text-red-300/80 leading-relaxed mb-2">
                    Teeth with a post but no full coverage crown showed a survival rate of only 25.6%,
                    with 100% of extractions in this group caused by crown or root fracture
                    (Zgur-Er 2025, n=39 teeth, ≥5-year follow-up).
                  </p>
                  <p className="text-xs text-red-400 font-semibold">
                    Full coverage restoration is mandatory before or concurrent with retreatment.
                    This finding will be flagged as impractical until the restoration plan is resolved.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tier 4 evidence note */}
      <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-start gap-2">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-cyan-500/50 flex-shrink-0 mt-0.5">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Tier 4 penalties are evidence-based where available (Zgur-Er 2025; Sainudeen et al. 2024)
          and clinically reasoned for repeated retreatment attempts.
          Tier 4 is uncapped — unlike Tier 3 procedural errors, these findings represent
          genuine structural and biological compromise that cannot be worked around.
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// LIVE DIAGNOSIS BADGE
// ════════════════════════════════════════════════════════════
function LiveDiagnosisBadge({ pulpal, periapical, inconsistencies }: {
  pulpal: string; periapical: string; inconsistencies: string[];
}) {
  if (!pulpal && !periapical) return null;
  return (
    <div className="bg-[#0a1428] border border-[#10b981]/25 rounded-2xl p-4">
      <p className="text-[10px] text-[#10b981]/60 uppercase tracking-wider mb-3">Live Diagnosis Preview</p>
      <div className="grid md:grid-cols-2 gap-3">
        {pulpal && (
          <div className="bg-white/3 rounded-xl p-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Pulpal</p>
            <p className="text-sm font-bold text-white">{pulpal}</p>
          </div>
        )}
        {periapical && (
          <div className="bg-white/3 rounded-xl p-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Periapical</p>
            <p className="text-sm font-bold text-white">{periapical}</p>
          </div>
        )}
      </div>
      {inconsistencies.map((note, i) => (
        <div key={i} className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
            <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p className="text-xs text-amber-400 leading-relaxed">{note}</p>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// URGENCY SELECTOR
// ════════════════════════════════════════════════════════════
function UrgencySelector({ value, onChange }: {
  value: Urgency; onChange: (u: Urgency) => void;
}) {
  const options: { key: Urgency; label: string; sub: string; icon: string }[] = [
    { key: "low",    label: "Asymptomatic",              sub: "Elective — low urgency",       icon: "🟢" },
    { key: "medium", label: "Symptomatic — No Swelling", sub: "Prompt care — medium urgency", icon: "🟡" },
    { key: "high",   label: "Symptomatic — Swelling",    sub: "Urgent treatment required",    icon: "🔴" },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-3">
      {options.map(o => {
        const cfg = URGENCY_CONFIG[o.key];
        const isSelected = value === o.key;
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            className={`text-left rounded-2xl p-4 border-2 transition-all ${
              isSelected ? "border-opacity-100" : "border-white/10 bg-white/3 hover:border-white/25"
            }`}
            style={isSelected ? { background: cfg.accentDim, borderColor: cfg.accent } : {}}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{o.icon}</span>
              {isSelected && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: cfg.accent }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
            </div>
            <p className="text-sm font-bold text-white">{o.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: isSelected ? cfg.accent : "#6b7280" }}>{o.sub}</p>
          </button>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function EndoDecide() {
  const router   = useRouter();
  const { user } = useAuth();

  const [urgency, setUrgency] = useState<Urgency>("low");
  const urgCfg = URGENCY_CONFIG[urgency];

  const [walls, setWalls]       = useState<WallStates>({ mesial: "intact", distal: "intact", buccal: "intact", lingual: "intact" });
  const [occlusal, setOcclusal] = useState<OcclusalState>("access_only");
  const [sites, setSites]       = useState<ProbingSite[]>(INITIAL_SITES);

  const remainingPercent = computeRemainingPercent(walls, occlusal);
  const deepCount        = sites.filter(s => s.level === "deep").length;

  const [formData, setFormData] = useState({
    // Patient
    toothNumber:   "",
    ageGroup:      "26-40 years",
    gender:        "Male",
    medications:   "0",
    // Systemic
    medical:       "0",
    oralHygiene:   "0",
    perio:         "0",
    // Cold test
    coldTest:      "",
    spontaneous:   "no",
    nocturnal:     "no",
    // Periapical clinical
    percussion:    "no",
    palpation:     "no",
    swelling:      "no",
    sinus:         "no",
    periApical:    "no",
    mobility:      "no",
    // RCT history
    rootTreated:   "no",
    rootAccessed:  "no",
    // Crack
    crackPresent:    "no",
    crackTransillum: "no",
    crackMethBlue:   "no",
    crackDirect:     "no",
    biteTest:        "no",
    marginalRidge:   "no",
    // Endo complexity
    endo:          "0",
    instrumentSep: "no",
    sepLocation:   "apical",
    sepStage:      "after",
    perforation:   "no",
    perfLocation:  "coronal",
    perfTime:      "recent",
    // Prostho
    prostho:       "0",
    // ── NEW: Tier 4 — Retreatment History ──
    previousAttempts:    "first"    as PreviousAttempts,
    existingObturation:  "adequate" as ObturationQuality,
    restorationQuality:  "good"     as RestorationQuality,
    postWithoutCrown:    "no"       as PostWithoutCrown,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange(e.target.name, e.target.value);
  };

  const cycleSite = (id: string) => {
    setSites(prev => prev.map(s =>
      s.id === id ? { ...s, level: POCKET_CYCLE[s.level] } : s
    ));
  };

  const pulpalResult     = derivePulpalDiagnosis(formData);
  const periapicalResult = derivePeriapicalDiagnosis(formData);
  const inconsistencies  = [
    pulpalResult.isInconsistent     ? pulpalResult.inconsistencyNote     : null,
    periapicalResult.isInconsistent ? periapicalResult.inconsistencyNote : null,
  ].filter(Boolean) as string[];

  const crackConfirmed = formData.crackPresent === "yes" && (
    formData.crackTransillum === "yes" || formData.crackMethBlue === "yes" || formData.crackDirect === "yes"
  );

  const isRetreatmentCase = formData.rootTreated === "yes";

  const calculate = () => {
    if (!formData.toothNumber) {
      alert("Please select a tooth number before generating the result.");
      return;
    }
    if (!formData.coldTest && formData.rootTreated === "no" && formData.rootAccessed === "no") {
      alert("Please complete the cold test finding before generating the result.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const pulpalDx     = pulpalResult.diagnosis;
      const periapicalDx = periapicalResult.diagnosis;
      const periApicalBool = formData.periApical === "yes" ||
        ["Asymptomatic Apical Periodontitis","Symptomatic Apical Periodontitis",
         "Acute Apical Abscess","Chronic Apical Abscess"].includes(periapicalDx);

      const prognosisResult = calculatePrognosis({
        toothNumber:   formData.toothNumber,
        walls,
        occlusal,
        remainingPercent,
        perio:         formData.perio,
        oralHygiene:   formData.oralHygiene,
        medical:       formData.medical,
        endo:          formData.endo === "10" ? "10" : formData.endo === "5" ? "5" : "0",
        instrumentSep: formData.instrumentSep === "yes",
        sepLocation:   formData.sepLocation,
        sepStage:      formData.sepStage,
        perforation:   formData.perforation === "yes",
        perfLocation:  formData.perfLocation,
        perfTime:      formData.perfTime,
        prostho:       formData.prostho,
        periApical:    periApicalBool,
        // Tier 4
        rootTreated:        formData.rootTreated === "yes",
        existingObturation: formData.existingObturation as ObturationQuality,
        restorationQuality: formData.restorationQuality as RestorationQuality,
        postWithoutCrown:   formData.postWithoutCrown as PostWithoutCrown,
        previousAttempts:   formData.previousAttempts as PreviousAttempts,
      });

      const ferrule      = computeFerrule(walls);
      const endoVal      = parseInt(formData.endo) || 0;
      const treatmentRec = deriveTreatmentRec(
        pulpalDx, prognosisResult.isPractical, endoVal, formData.ageGroup
      );

      const affectingFactors = buildAffectingFactors({
        remainingPercent,
        walls,
        periApical: periApicalBool,
        perio:      formData.perio,
        oralHygiene: formData.oralHygiene,
        medical:    formData.medical,
        endoVal,
        instrumentSep: formData.instrumentSep === "yes",
        perforation:   formData.perforation   === "yes",
        prosthoVal:    parseInt(formData.prostho) || 0,
        ferrule,
        tier4Factors:    prognosisResult.tier4Factors,
        postWithoutCrown: formData.postWithoutCrown as PostWithoutCrown,
      });

      let iowa: { stage: string; successRate: number; label: string } | null = null;
      if (crackConfirmed) {
        iowa = calcIowaStage(deepCount, formData.marginalRidge === "yes", periapicalDx);
      }

      const vrfFlag = checkVRFFlag({
        rootTreated:      formData.rootTreated === "yes",
        deepCount,
        hasSinus:         formData.sinus === "yes",
        remainingPercent,
      });

      const toothType     = prognosisResult.toothType;
      const casePresText  = urgency === "low" ? "Asymptomatic" : urgency === "medium" ? "Symptomatic without swelling" : "Symptomatic with facial swelling";
      const introParagraph = `The case presented is related to a <strong>${formData.gender.toLowerCase()}</strong> patient, age between <strong>${formData.ageGroup}</strong>. Tooth <strong>#${formData.toothNumber}</strong> (${toothType}) is <strong>${casePresText.toLowerCase()}</strong> with <strong>${remainingPercent}%</strong> remaining coronal tooth structure.`;

      // Updated explanation note — includes obturation narrative for retreatment cases
      const explanationNote = prognosisResult.isPractical
        ? `This tooth is considered <strong>practical to retain</strong>. The estimated 4-year survival rate meets the minimum threshold required for a ${toothType} tooth. The remaining coronal structure (${remainingPercent}%) provides an acceptable foundation for final restoration.${isRetreatmentCase && prognosisResult.obturationNarrative ? " " + prognosisResult.obturationNarrative : ""}`
        : `Retention of this tooth is considered <strong>impractical</strong>. The estimated 4-year survival rate (${prognosisResult.survival}%) falls below the acceptable threshold for a ${toothType} tooth.${isRetreatmentCase && prognosisResult.obturationNarrative ? " " + prognosisResult.obturationNarrative : ""}`;

      let vptAgeNote = "";
      if (treatmentRec === "Vital Pulp Therapy") {
        if (["1-12 years","13-25 years"].includes(formData.ageGroup)) {
          vptAgeNote = "Favorable age for vital pulp therapy — enhanced healing and pulp regeneration expected.";
        } else if (formData.ageGroup === "Over 40 years") {
          vptAgeNote = "Note: pulp vascularity may be reduced with age — assess pulp vitality carefully before proceeding with VPT.";
        }
      }

      let medicationFlag = "";
      if (parseInt(formData.medications) >= 2 && parseInt(formData.prostho) >= 1) {
        medicationFlag = "Patient is on medications requiring modification — if surgical procedures are planned, consider MRONJ risk and specialist consultation.";
      }

      const resultData = {
        toolType: crackConfirmed ? "combined" : "predictor",
        urgency,
        toothNumber:   formData.toothNumber,
        toothType,
        gender:        formData.gender,
        ageGroup:      formData.ageGroup,
        pulpalDiagnosis:    pulpalDx,
        periapicalDiagnosis: periapicalDx,
        pulpalInconsistent:    pulpalResult.isInconsistent,
        periapicalInconsistent: periapicalResult.isInconsistent,
        inconsistencyNotes: inconsistencies,
        survivalPercentage: prognosisResult.survival,
        survivalRange:      prognosisResult.survivalRange,
        isPractical:        prognosisResult.isPractical,
        totalDPI:           prognosisResult.totalDPI,
        threshold:          prognosisResult.threshold,
        tier1Deductions:    prognosisResult.tier1Deductions,
        tier2Deductions:    prognosisResult.tier2Deductions,
        tier3Deductions:    prognosisResult.tier3Deductions,
        // NEW
        tier4Deductions:          prognosisResult.tier4Deductions,
        isPostWithoutCrownOverride: prognosisResult.isPostWithoutCrownOverride,
        obturationNarrative:       prognosisResult.obturationNarrative,
        isRetreatmentCase,
        previousAttempts:    formData.previousAttempts,
        existingObturation:  formData.existingObturation,
        restorationQuality:  formData.restorationQuality,
        postWithoutCrown:    formData.postWithoutCrown,
        //
        isImpracticalOverride: prognosisResult.isImpracticalOverride,
        overrideReason:     prognosisResult.overrideReason,
        treatmentRec,
        procedureCategory: detectProcedureCategory(pulpalDx, treatmentRec, prognosisResult.isPractical),
        affectingFactors,
        remainingPercent,
        walls:   { ...walls },
        occlusal,
        ferrule,
        crackPresent:    formData.crackPresent === "yes",
        crackConfirmed,
        crackMethods: {
          transillum: formData.crackTransillum === "yes",
          methBlue:   formData.crackMethBlue   === "yes",
          direct:     formData.crackDirect     === "yes",
        },
        biteTest:      formData.biteTest      === "yes",
        marginalRidge: formData.marginalRidge === "yes",
        iowa,
        vrfFlag,
        sites: sites.map(s => ({ id: s.id, label: s.label, short: s.short, level: s.level })),
        deepCount,
        vptAgeNote,
        medicationFlag,
        introParagraph,
        explanationNote,
        casePresText,
        formData: { ...formData },
      };

      localStorage.setItem("lastEndoDecideResult", JSON.stringify(resultData));
      setLoading(false);
      router.push("/endodecide/result");
    }, 900);
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white">

        {/* ── HERO ── */}
        <div className="relative h-[320px] md:h-[360px] bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: "url('https://iili.io/Bw4dt99.jpg')" }}>
          <div className={`absolute inset-0 bg-gradient-to-b ${urgCfg.heroBg} transition-all duration-700`} />
          <div className="absolute top-5 left-6 z-20">
            <Image src="https://iili.io/B6RcxlS.png" alt="Endoprognosis Logo"
              width={160} height={55} className="h-10 w-auto" priority />
          </div>
          <div className="absolute top-5 right-6 z-20">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${urgCfg.badge} transition-all duration-500`}>
              {urgCfg.badgeText}
            </span>
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 pt-8">
            <p className="text-[11px] tracking-[4px] mb-3 transition-colors duration-500"
              style={{ color: urgCfg.accent + "99" }}>
              CLINICAL DECISION TOOL
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 transition-all duration-500"
              style={{
                fontFamily: "Playfair Display, serif",
                background: `linear-gradient(135deg, ${urgCfg.accent}, white, ${urgCfg.accent})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
              EndoDecide
            </h1>
            <p className="text-gray-300 text-base md:text-lg">
              Unified Endodontic Prognosis & Crack Classification
            </p>
            <div className="flex items-center gap-6 mt-5">
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: urgCfg.accent }}>92%</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Best case baseline</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">87%</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">With periapical lesion</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">AAE 2013</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Terminology</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FORM ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-5">

          {/* ══ SECTION 1: URGENCY ══ */}
          <Section accent={urgCfg.accent} title="Case Presentation">
            <UrgencySelector value={urgency} onChange={setUrgency} />
          </Section>

          {/* ══ SECTION 2: PATIENT & TOOTH ══ */}
          <Section accent="#3b82f6" title="Tooth & Patient" note="FDI numbering">
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                  Tooth Number (FDI)
                </label>
                <select name="toothNumber" value={formData.toothNumber}
                  onChange={handleSelectChange} className={sel}>
                  <option value="">Select tooth number</option>
                  {["11","12","13","14","15","16","17","18","21","22","23","24","25","26","27","28",
                    "31","32","33","34","35","36","37","38","41","42","43","44","45","46","47","48"].map(n => (
                    <option key={n} value={n}>#{n}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-600 mt-1.5">
                  Aim for ≥2 control teeth. Reproduce the chief complaint.
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Age Group</label>
                <select name="ageGroup" value={formData.ageGroup}
                  onChange={handleSelectChange} className={sel}>
                  <option value="1-12 years">1–12 years</option>
                  <option value="13-25 years">13–25 years</option>
                  <option value="26-40 years">26–40 years</option>
                  <option value="Over 40 years">Over 40 years</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Gender</label>
                <select name="gender" value={formData.gender}
                  onChange={handleSelectChange} className={sel}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </Section>

          {/* ══ SECTION 3: OVERALL HEALTH ══ */}
          <Section accent="#f59e0b" title="Overall Health Status">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                  Medical Status (ASA Classification)
                </label>
                <select name="medical" value={formData.medical}
                  onChange={handleSelectChange} className={sel}>
                  <option value="0">ASA I — Medically fit</option>
                  <option value="1">ASA II — Controlled medical condition</option>
                  <option value="3">ASA III — Uncontrolled medical condition</option>
                  <option value="6">ASA IV or higher</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                  Medications
                </label>
                <select name="medications" value={formData.medications}
                  onChange={handleSelectChange} className={sel}>
                  <option value="0">Not taken</option>
                  <option value="1">Taken — no modification required</option>
                  <option value="2">Taken — modification required</option>
                </select>
              </div>
            </div>
          </Section>

          {/* ══ SECTION 4: CLINICAL EXAMINATION ══ */}
          <Section accent="#10b981" title="Clinical Examination">
            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Oral Hygiene Status</label>
                <select name="oralHygiene" value={formData.oralHygiene}
                  onChange={handleSelectChange} className={sel}>
                  <option value="0">Compliant / Good</option>
                  <option value="1">Fair</option>
                  <option value="2">Neglected / Poor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Periodontal Health</label>
                <select name="perio" value={formData.perio}
                  onChange={handleSelectChange} className={sel}>
                  <option value="0">Healthy periodontium</option>
                  <option value="1">Gingivitis</option>
                  <option value="3">Initial to moderate periodontitis</option>
                  <option value="6">Advanced periodontitis — mobility / probing &gt;5mm</option>
                </select>
              </div>
            </div>

            <UnifiedDiagram
              walls={walls}
              occlusal={occlusal}
              sites={sites}
              remainingPercent={remainingPercent}
              onWallChange={(wall, state) => setWalls(prev => ({ ...prev, [wall]: state }))}
              onOcclusalChange={setOcclusal}
              onSiteChange={cycleSite}
            />

            {/* RCT history */}
            <div className="grid md:grid-cols-2 gap-5 mt-6">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Root Canal Treated?</label>
                <select name="rootTreated" value={formData.rootTreated}
                  onChange={handleSelectChange} className={sel}>
                  <option value="no">No</option>
                  <option value="yes">Yes — previously root canal treated</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Canal System Accessed?</label>
                <select name="rootAccessed" value={formData.rootAccessed}
                  onChange={handleSelectChange} className={sel}>
                  <option value="no">No</option>
                  <option value="yes">Yes — treatment initiated but incomplete</option>
                </select>
              </div>
            </div>

            {/* Cold test — only if not previously treated */}
            {formData.rootTreated === "no" && formData.rootAccessed === "no" && (
              <div className="mt-6 space-y-5">
                <div className="border-t border-white/8 pt-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-semibold">
                    Pulp Sensibility Testing
                  </p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                      Cold Test Response (CO₂ dry ice preferred)
                    </label>
                    <select name="coldTest" value={formData.coldTest}
                      onChange={handleSelectChange} className={sel}>
                      <option value="">Select response</option>
                      <option value="normal">Brief — resolves within 1–2 seconds (Normal)</option>
                      <option value="lingering_short">Lingering under 30 seconds (Reversible)</option>
                      <option value="lingering_long">Lingering over 30 seconds (Irreversible)</option>
                      <option value="none">No response</option>
                    </select>
                    <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed">
                      Duration of lingering is the key diagnostic variable — not intensity alone.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-5 mt-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Spontaneous Pain</label>
                      <select name="spontaneous" value={formData.spontaneous}
                        onChange={handleSelectChange} className={sel}>
                        <option value="no">No</option>
                        <option value="yes">Yes — unprovoked pain</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Nocturnal Pain (wakes patient)</label>
                      <select name="nocturnal" value={formData.nocturnal}
                        onChange={handleSelectChange} className={sel}>
                        <option value="no">No</option>
                        <option value="yes">Yes — wakes patient at night</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Periapical clinical tests */}
            <div className="mt-6 border-t border-white/8 pt-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-semibold">
                Periapical Clinical Tests
              </p>
              <p className="text-[10px] text-gray-600 mb-4 leading-relaxed">
                These determine periapical diagnosis independently of the pulpal diagnosis.
                Percussion and palpation indicate PDL inflammation — not pulpal status.
              </p>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Percussion Test</label>
                  <select name="percussion" value={formData.percussion}
                    onChange={handleSelectChange} className={sel}>
                    <option value="no">No tenderness</option>
                    <option value="yes">Tender to percussion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
                    Palpation Test <span className="text-[#10b981]/60 normal-case">(new)</span>
                  </label>
                  <select name="palpation" value={formData.palpation}
                    onChange={handleSelectChange} className={sel}>
                    <option value="no">No tenderness</option>
                    <option value="yes">Tender to palpation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Swelling</label>
                  <select name="swelling" value={formData.swelling}
                    onChange={handleSelectChange} className={sel}>
                    <option value="no">No swelling</option>
                    <option value="yes">Facial / intraoral swelling present</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Sinus Tract</label>
                  <select name="sinus" value={formData.sinus}
                    onChange={handleSelectChange} className={sel}>
                    <option value="no">No sinus tract</option>
                    <option value="yes">Sinus tract present</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Tooth Mobility</label>
                  <select name="mobility" value={formData.mobility}
                    onChange={handleSelectChange} className={sel}>
                    <option value="no">No mobility</option>
                    <option value="yes">Mobility present</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Periapical Lesion (radiograph)</label>
                  <select name="periApical" value={formData.periApical}
                    onChange={handleSelectChange} className={sel}>
                    <option value="no">No periapical lesion</option>
                    <option value="yes">Periapical lesion present</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <LiveDiagnosisBadge
                pulpal={pulpalResult.diagnosis}
                periapical={periapicalResult.diagnosis}
                inconsistencies={inconsistencies}
              />
            </div>
          </Section>

          {/* ══ SECTION 5: CRACK ASSESSMENT ══ */}
          <CrackSection formData={formData} onChange={handleChange} />

          {/* ══ SECTION 6: RETREATMENT HISTORY (Tier 4) — gated ══ */}
          {isRetreatmentCase && (
            <RetreatmentSection formData={formData} onChange={handleChange} />
          )}

          {/* ══ SECTION 7: ENDODONTIC COMPLEXITY ══ */}
          <Section accent="#f59e0b" title="Endodontic Complexity">
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Endodontic Score</label>
                <select name="endo" value={formData.endo}
                  onChange={handleSelectChange} className={sel}>
                  <option value="0">No endodontic treatment required</option>
                  <option value="1">Accessible root canal treatment or retreatment</option>
                  <option value="5">Challenging anatomy / complex retreatment</option>
                  <option value="10">Untreatable canal system — surgical option considered</option>
                </select>
                {formData.endo === "10" && (
                  <div className="mt-2 flex items-start gap-2 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-orange-400 flex-shrink-0 mt-0.5">
                      <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    <p className="text-xs text-orange-400 leading-relaxed">
                      Maximum complexity penalty applied. Microsurgical endodontics (apicoectomy) will be recommended if surgically accessible.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Instrument Separation</label>
                <select name="instrumentSep" value={formData.instrumentSep}
                  onChange={handleSelectChange} className={sel}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
                {formData.instrumentSep === "yes" && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Location</label>
                      <select name="sepLocation" value={formData.sepLocation}
                        onChange={handleSelectChange} className={sel}>
                        <option value="apical">Apical third</option>
                        <option value="middle">Middle third</option>
                        <option value="coronal">Coronal third</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Stage of treatment</label>
                      <select name="sepStage" value={formData.sepStage}
                        onChange={handleSelectChange} className={sel}>
                        <option value="after">After cleaning and shaping</option>
                        <option value="before">Before cleaning</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Root Perforation</label>
                <select name="perforation" value={formData.perforation}
                  onChange={handleSelectChange} className={sel}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
                {formData.perforation === "yes" && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Location</label>
                      <select name="perfLocation" value={formData.perfLocation}
                        onChange={handleSelectChange} className={sel}>
                        <option value="coronal">Coronal third</option>
                        <option value="middle">Middle third</option>
                        <option value="apical">Apical third</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Time since perforation</label>
                      <select name="perfTime" value={formData.perfTime}
                        onChange={handleSelectChange} className={sel}>
                        <option value="recent">Recent</option>
                        <option value="old">Old / established</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ══ SECTION 8: PROSTHODONTIC CONTEXT ══ */}
          <Section accent="#a855f7" title="Prosthodontic Context">
            <select name="prostho" value={formData.prostho}
              onChange={handleSelectChange} className={sel}>
              <option value="0">Isolated dental problem</option>
              <option value="1">Prosthodontic plan — tooth is an abutment</option>
              <option value="2">Complex prosthodontic plan</option>
              <option value="6">Retention would compromise the overall plan</option>
            </select>
          </Section>

          {/* ══ GENERATE BUTTON ══ */}
          <button
            onClick={calculate}
            disabled={loading}
            className="w-full font-bold py-5 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-lg disabled:transform-none disabled:opacity-50"
            style={{
              background: loading ? "#374151" : `linear-gradient(135deg, ${urgCfg.accent}, ${urgCfg.accent}cc)`,
              boxShadow: loading ? "none" : `0 8px 32px ${urgCfg.accent}30`,
              color: "#000",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                <span className="text-white">Generating EndoDecide Report...</span>
              </span>
            ) : (
              "Generate EndoDecide Report →"
            )}
          </button>

          <p className="text-center text-xs text-gray-600 leading-relaxed">
            AAE 2013 terminology · Iowa Classification (Krell & Caplan 2018) · Tier 4 evidence: Zgur-Er et al. 2025 · Clinical decision support only
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-gray-600 border-t border-white/8">
          © 2026 Endoprognosis. All rights reserved.
        </footer>
      </div>
    </ProtectedRoute>
  );
}