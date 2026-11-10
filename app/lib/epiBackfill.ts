// Recomputes the Endoprognosis Index from a saved case's own inputs, to add the breakdown and the model version.
// It never changes a saved score. A case whose recomputed score differs from the saved one is reported, not written.

import { calculatePrognosis, ENGINE_VERSION } from "./epiEngine";

const AP_DX = ["Asymptomatic Apical Periodontitis", "Symptomatic Apical Periodontitis", "Acute Apical Abscess", "Chronic Apical Abscess"];
const WALL_KEYS = ["mesial", "distal", "buccal", "lingual"] as const;
const WALL_STATES = ["intact", "moderate", "severe"];
const OCCLUSAL = ["access_only", "moderate", "severe"];

export type CheckStatus = "ready" | "already" | "mismatch" | "missing";

export interface CaseCheck {
  id: string;
  caseName: string;
  toothNumber: string;
  createdAt: string;
  status: CheckStatus;
  reasons: string[];
  stored: { survival: number | null; epPoints: number | null; isPractical: boolean | null };
  recomputed: { survival: number; epPoints: number; isPractical: boolean } | null;
  fields: Record<string, unknown> | null; // what would be added. Nothing else is written.
}

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function when(c: Doc): string {
  try {
    if (c.createdAt && typeof c.createdAt.toDate === "function") return c.createdAt.toDate().toISOString();
  } catch { /* fall through */ }
  return typeof c.savedAt === "string" ? c.savedAt : "";
}

// The calculation's inputs, rebuilt exactly as the form builds them. Returns the problems if any are missing.
export function inputsFromCase(c: Doc) {
  const f: Doc = c.patientInputs && typeof c.patientInputs === "object" ? c.patientInputs : {};
  const problems: string[] = [];
  if (!c.toothNumber) problems.push("tooth number");
  if (!c.walls || !WALL_KEYS.every(k => WALL_STATES.includes(c.walls[k]))) problems.push("wall states");
  if (!OCCLUSAL.includes(c.occlusal)) problems.push("occlusal state");
  if (typeof c.remainingStructure !== "number") problems.push("remaining structure");
  if (!c.patientInputs) problems.push("the saved form answers");
  for (const k of ["perio", "oralHygiene", "medical", "endo", "prostho"]) if (f[k] === undefined) problems.push(k);
  if (problems.length) return { inputs: null, problems };

  const periApical = f.periApical === "yes" || AP_DX.includes(c.periapicalDiagnosis);
  return {
    problems,
    inputs: {
      toothNumber: String(c.toothNumber),
      walls: { mesial: c.walls.mesial, distal: c.walls.distal, buccal: c.walls.buccal, lingual: c.walls.lingual },
      occlusal: c.occlusal,
      remainingPercent: c.remainingStructure as number,
      perio: String(f.perio), oralHygiene: String(f.oralHygiene), medical: String(f.medical),
      endo: f.endo === "10" ? "10" : f.endo === "5" ? "5" : "0", // the form passes only these three
      instrumentSep: f.instrumentSep === "yes", sepLocation: f.sepLocation ?? "apical", sepStage: f.sepStage ?? "after",
      perforation: f.perforation === "yes", perfLocation: f.perfLocation ?? "coronal", perfTime: f.perfTime ?? "recent",
      prostho: String(f.prostho), periApical,
      rootTreated: f.rootTreated === "yes",
      existingObturation: f.existingObturation ?? "adequate", restorationQuality: f.restorationQuality ?? "good",
      postWithoutCrown: f.postWithoutCrown ?? "no", previousAttempts: f.previousAttempts ?? "first",
    },
  };
}

export function checkCase(id: string, c: Doc): CaseCheck {
  const base = {
    id,
    caseName: String(c.caseName ?? ""),
    toothNumber: String(c.toothNumber ?? ""),
    createdAt: when(c),
    stored: {
      survival: typeof c.survivalEstimate === "number" ? c.survivalEstimate : null,
      epPoints: typeof c.epPoints === "number" ? c.epPoints : null,
      isPractical: typeof c.isPractical === "boolean" ? c.isPractical : null,
    },
  };
  if (c.breakdown && c.engineVersion) {
    return { ...base, status: "already", reasons: [], recomputed: null, fields: null };
  }
  const { inputs, problems } = inputsFromCase(c);
  if (!inputs) {
    return { ...base, status: "missing", reasons: [`Missing: ${problems.join(", ")}`], recomputed: null, fields: null };
  }
  const r = calculatePrognosis(inputs as Parameters<typeof calculatePrognosis>[0]);
  const reasons: string[] = [];
  if (base.stored.survival !== r.survival) reasons.push(`survival saved ${base.stored.survival}, recomputed ${r.survival}`);
  if (base.stored.epPoints !== r.totalDPI) reasons.push(`index points saved ${base.stored.epPoints}, recomputed ${r.totalDPI}`);
  if (base.stored.isPractical !== r.isPractical) reasons.push(`practical saved ${base.stored.isPractical}, recomputed ${r.isPractical}`);
  const pr: Doc = c.predictionResult && typeof c.predictionResult === "object" ? c.predictionResult : {};
  const tiers: [string, number][] = [["tier1", r.tier1Deductions], ["tier2", r.tier2Deductions], ["tier3", r.tier3Deductions], ["tier4", r.tier4Deductions]];
  tiers.forEach(([k, v]) => { if (typeof pr[k] === "number" && pr[k] !== v) reasons.push(`${k} saved ${pr[k]}, recomputed ${v}`); });
  const recomputed = { survival: r.survival, epPoints: r.totalDPI, isPractical: r.isPractical };
  if (reasons.length) return { ...base, status: "mismatch", reasons, recomputed, fields: null };
  return {
    ...base, status: "ready", reasons: [], recomputed,
    fields: {
      engineVersion: ENGINE_VERSION,
      breakdown: r.breakdown,
      advisedPathway: r.isPractical ? "" : "Retention not advised. Extraction and replacement alternatives to be discussed.",
      backfilledAt: new Date().toISOString(),
      backfillNote: "Computed from the saved inputs. The saved scores were not changed.",
    },
  };
}

export function summarise(checks: CaseCheck[]) {
  const n = (s: CheckStatus) => checks.filter(c => c.status === s).length;
  return { total: checks.length, ready: n("ready"), already: n("already"), mismatch: n("mismatch"), missing: n("missing") };
}

const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// A file for the study: what was saved, what the same inputs give now, and whether they agree
export function toCsv(checks: CaseCheck[]): string {
  const head = ["caseId", "createdAt", "toothNumber", "status", "survivalSaved", "survivalRecomputed", "epiPointsSaved", "epiPointsRecomputed", "practicalSaved", "practicalRecomputed", "notes"];
  const rows = checks.map(c => [
    c.id, c.createdAt, c.toothNumber, c.status, c.stored.survival, c.recomputed?.survival, c.stored.epPoints, c.recomputed?.epPoints,
    c.stored.isPractical, c.recomputed?.isPractical, c.reasons.join("; "),
  ].map(q).join(","));
  return [head.join(","), ...rows].join("\n");
}
