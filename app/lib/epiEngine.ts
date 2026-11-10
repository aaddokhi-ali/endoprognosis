// The Endoprognosis Index scoring, model epi-1.0. This is the same calculation as in app/endodecide/page.tsx.
// It exists as its own file so saved cases can be recomputed from their stored inputs.
// If the scoring ever changes, change ENGINE_VERSION in both places and keep this file in step with the page.

// The calculation logic copied verbatim from the current endoprognosis.org EndoDecide page
export type WallState = "intact" | "moderate" | "severe";
export type WallKey = "mesial" | "distal" | "buccal" | "lingual";
export type OcclusalState = "access_only" | "moderate" | "severe";
export type ObturationQuality = "adequate" | "inadequate";
export type RestorationQuality = "good" | "poor";
export type PostWithoutCrown = "no" | "yes";
export type PreviousAttempts = "first" | "second" | "third_or_more";
export interface WallStates { mesial: WallState; distal: WallState; buccal: WallState; lingual: WallState; }

export const WALL_WEIGHTS: Record<WallKey, number> = { mesial: 22, distal: 22, buccal: 23, lingual: 23 };
export const STATE_CONTRIBUTION: Record<WallState, number> = { intact: 1.0, moderate: 0.5, severe: 0.0 };

export function computeFerrule(walls: WallStates): { wallsWithFerrule: number; penalty: number; label: string } {
  const i = (Object.values(walls) as WallState[]).filter(v => v === "intact").length;
  const m = (Object.values(walls) as WallState[]).filter(v => v === "moderate").length;
  const w = i + m;
  const penalty = w === 4 ? 0 : w === 3 ? 2 : w === 2 ? 5 : w === 1 ? 9 : 12;
  const label   = w === 4 ? "Adequate ferrule on all walls" : w === 3 ? "Ferrule compromised on 1 wall" : w === 2 ? "Ferrule on 2 walls only — insufficient" : w === 1 ? "Ferrule on 1 wall only — no ferrule effect" : "No ferrule effect";
  return { wallsWithFerrule: w, penalty, label };
}

export function computeRemainingPercent(walls: WallStates, occlusal: OcclusalState): number {
  let total = 0;
  (Object.entries(walls) as [WallKey, WallState][]).forEach(([k, s]) => { total += WALL_WEIGHTS[k] * STATE_CONTRIBUTION[s]; });
  if (occlusal === "moderate") total -= 5;
  if (occlusal === "severe")   total -= 10;
  return Math.max(5, Math.round(total));
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

// Version of the scoring model. The scoring itself is unchanged. This only labels it, so every saved case
// says which model produced it. If the scoring ever changes, change this and recompute older cases from their saved inputs.
export const ENGINE_VERSION = "epi-1.0";

export interface EpiBreakdown {
  baseline: number;              // 92, or 87 with a periapical lesion
  tier1: number;
  tier2: number;
  tier3Raw: number;              // what tier 3 would have deducted
  tier3: number;                 // what it did deduct, after the cap that stops tier 3 alone taking the tooth below its threshold
  tier3Capped: boolean;
  tier4: number;
  afterTiers: number;            // baseline minus the four tiers, before any limit
  floorOrCapApplied: "floor" | "cap" | "none";
  afterLimits: number;           // kept between 35 and 92
  prosthodontic: number;         // deducted after the limits
  floorAfterProsthodontic: boolean;
  final: number;                 // the survival estimate shown
}
export function calculatePrognosis(p: {
  toothNumber: string; walls: WallStates; occlusal: OcclusalState; remainingPercent: number;
  perio: string; oralHygiene: string; medical: string; endo: string;
  instrumentSep: boolean; sepLocation: string; sepStage: string;
  perforation: boolean; perfLocation: string; perfTime: string; prostho: string; periApical: boolean;
  rootTreated: boolean; existingObturation: ObturationQuality; restorationQuality: RestorationQuality;
  postWithoutCrown: PostWithoutCrown; previousAttempts: PreviousAttempts;
}): { breakdown: EpiBreakdown; engineVersion: string; survival: number; survivalRange: [number,number]; totalDPI: number; isPractical: boolean; threshold: number; toothType: string; isImpracticalOverride: boolean; overrideReason: string; tier1Deductions: number; tier2Deductions: number; tier3Deductions: number; tier4Deductions: number; isPostWithoutCrownOverride: boolean; obturationNarrative: string; tier4Factors: string[] } {
  const isA = ["11","12","13","21","22","23","31","32","33","41","42","43"].includes(p.toothNumber);
  const isP = ["14","15","24","25","34","35","44","45"].includes(p.toothNumber);
  const toothType = isA ? "Anterior" : isP ? "Premolar" : "Molar";
  const threshold = isA ? 55 : isP ? 60 : 65;
  const baseline = p.periApical ? 87 : 92;
  let survival = baseline;

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

  const afterTiers = Math.round(survival - t1 - t2 - ct3 - r4.tier4Deductions);
  survival = afterTiers;
  survival = Math.max(35, Math.min(92, survival));
  const afterLimits = survival;
  const pv2 = parseInt(p.prostho) || 0;
  if (pv2 >= 6) survival -= 8; else if (pv2 >= 2) survival -= 3; else if (pv2 >= 1) survival -= 1;
  survival = Math.max(35, survival);
  const prosthodontic = pv2 >= 6 ? 8 : pv2 >= 2 ? 3 : pv2 >= 1 ? 1 : 0;
  const floorAfterProsthodontic = afterLimits - prosthodontic < 35;

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
    engineVersion: ENGINE_VERSION,
    breakdown: { baseline, tier1: t1, tier2: t2, tier3Raw: t3, tier3: ct3, tier3Capped: ct3 < t3, tier4: r4.tier4Deductions, afterTiers, floorOrCapApplied: afterTiers < 35 ? "floor" : afterTiers > 92 ? "cap" : "none", afterLimits, prosthodontic, floorAfterProsthodontic, final: survival },
  };
}

