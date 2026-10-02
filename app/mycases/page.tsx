"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection, query, where, orderBy,
  getDocs, doc, updateDoc, deleteDoc, startAfter, limit,
  getCountFromServer, getDoc, Timestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
type TreatmentStatus = "No Treatment" | "In-Progress" | "Done" | "Postpone";
type ActiveTab = "All" | "EndoDecide" | "Crack Cases" | "No Treatment" | "In-Progress" | "Done" | "Postpone";

interface SavedCase {
  id: string;
  caseName: string;
  phoneNumber?: string;
  gender?: string;
  ageGroup?: string;
  asa?: string;
  toothNumber: string;
  toothType: string;
  pulpalDiagnosis?: string;
  periapicalDiagnosis?: string;
  periodontalStatus?: string;
  remainingPercent?: number;
  affectingFactors?: string[];
  treatmentRec?: string;
  survivalEstimate?: number;
  survivalRange?: [number, number];
  isPractical?: boolean;
  treatmentStatus: TreatmentStatus;
  followUpDate: string | null;
  furtherNote?: string;
  type?: string;
  toolType?: string;
  classification?: string;
  iowaStage?: string;
  iowaSuccessRate?: number;
  isVRF?: boolean;
  vrfFlag?: boolean;
  crackConfirmed?: boolean;
  epPoints?: number;
  urgency?: "low" | "medium" | "high";
  createdAt: any;
}

interface Radiograph {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: any;
  storagePath?: string;
  fileSize?: number;
  mimeType?: string;
}

interface ProfitSettings {
  currency: "SAR" | "USD";
  procedures: Record<string, { revenue: number; cost: number }>;
}

const PAGE_SIZE = 15;

// ════════════════════════════════════════════════════════════
// MONTH SELECTOR HELPERS
// ════════════════════════════════════════════════════════════
function getMonthRange(month: number, year: number): { start: Timestamp; end: Timestamp } {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
  };
}

function formatMonthYear(month: number, year: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function getProcedureCategory(treatmentRec?: string): string {
  if (!treatmentRec) return "Other";
  const rec = treatmentRec.toLowerCase();
  if (rec.includes("vital pulp")) return "VPT";
  if (rec.includes("retreatment")) return "Retreatment";
  if (rec.includes("root canal treatment")) return "RCT";
  if (rec.includes("microsurgical") || rec.includes("apico")) return "Microsurgery";
  return "Other";
}

// ════════════════════════════════════════════════════════════
// XLSX EXPORT
// ════════════════════════════════════════════════════════════
async function exportToXLSX(cases: SavedCase[], monthYear: string) {
  try {
    const { utils, writeFile } = await import("xlsx");
    
    const data = cases.map(c => ({
      "Case Name": c.caseName || "",
      "Phone": c.phoneNumber || "",
      "Tooth #": c.toothNumber || "",
      "Pulpal Diagnosis": c.pulpalDiagnosis || "",
      "Periapical Diagnosis": c.periapicalDiagnosis || "",
      "Procedure Type": getProcedureCategory(c.treatmentRec),
      "Treatment Status": c.treatmentStatus || "No Treatment",
      "Survival %": c.survivalEstimate ?? "",
      "Created": c.createdAt ? new Date(c.createdAt.toDate()).toLocaleDateString("en-GB") : "",
      "Follow-up": c.followUpDate ? new Date(c.followUpDate).toLocaleDateString("en-GB") : "",
    }));

    const ws = utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 18 },
      { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 11 }, { wch: 11 },
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Cases");
    writeFile(wb, `MyCases_${monthYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) {
    console.error("Export failed:", err);
    alert("Failed to export to Excel. Please try again.");
  }
}

// ════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════
const STATUS_CONFIG: Record<TreatmentStatus, {
  label: string; bg: string; border: string; text: string; dot: string; ring: string;
}> = {
  "No Treatment": { label: "No Treatment", bg: "bg-slate-500/10",   border: "border-slate-500/25",   text: "text-slate-400",   dot: "bg-slate-400",   ring: "ring-slate-500/30"   },
  "In-Progress":  { label: "In Progress",  bg: "bg-amber-500/10",   border: "border-amber-500/25",   text: "text-amber-400",   dot: "bg-amber-400",   ring: "ring-amber-500/30"   },
  "Done":         { label: "Done",         bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400", dot: "bg-emerald-400", ring: "ring-emerald-500/30" },
  "Postpone":     { label: "Postponed",    bg: "bg-violet-500/10",  border: "border-violet-500/25",  text: "text-violet-400",  dot: "bg-violet-400",  ring: "ring-violet-500/30"  },
};

const STATUS_ORDER: TreatmentStatus[] = ["No Treatment", "In-Progress", "Done", "Postpone"];

const NEXT_STATUS: Record<TreatmentStatus, TreatmentStatus> = {
  "No Treatment": "In-Progress",
  "In-Progress":  "Done",
  "Done":         "Postpone",
  "Postpone":     "No Treatment",
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: "Low urgency",    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  medium: { label: "Med urgency",    color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25"   },
  high:   { label: "High urgency",   color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/25"     },
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function getToothSubKey(toothType: string): "anterior" | "premolar" | "molar" {
  const t = (toothType || "").toLowerCase();
  if (t.includes("molar"))    return "molar";
  if (t.includes("premolar")) return "premolar";
  return "anterior";
}

function mapToProcKey(treatmentRec: string, toothType: string): string {
  const rec = (treatmentRec || "").toLowerCase();
  const sub = getToothSubKey(toothType);
  if (rec.includes("retreatment"))                                                     return `retreat-${sub}`;
  if (rec.includes("root canal treatment"))                                            return `rct-${sub}`;
  if (rec.includes("vital pulp"))                                                      return "vpt";
  if (rec.includes("microsurgical") || rec.includes("apico") || rec.includes("surgical")) return "apico";
  return "other";
}

async function applyProfitFields(
  userId: string, caseId: string,
  treatmentRec: string | undefined, toothType: string | undefined,
  newStatus: TreatmentStatus
): Promise<void> {
  if (!treatmentRec) return;
  try {
    const settingsSnap = await getDoc(doc(db, "users", userId, "settings", "profitSettings"));
    if (!settingsSnap.exists()) return;
    const settings = settingsSnap.data() as ProfitSettings;
    const procKey  = mapToProcKey(treatmentRec, toothType || "");
    const fees     = settings.procedures?.[procKey];
    if (!fees) return;
    const revenue = Number(fees.revenue) || 0;
    const cost    = Number(fees.cost)    || 0;
    const profit  = revenue - cost;
    await updateDoc(doc(db, "cases", caseId), {
      actualProcedure: procKey,
      revenue, cost,
      profit:      newStatus === "Done" ? profit : Math.round(profit * 0.5),
      profitStatus: newStatus === "Done" ? "full" : "in-progress",
      completedAt:  new Date(),
    });
  } catch (err) { console.error("applyProfitFields failed:", err); }
}

function survivalColor(v?: number): string {
  if (!v) return "text-gray-500";
  if (v >= 80) return "text-emerald-400";
  if (v >= 65) return "text-amber-400";
  return "text-red-400";
}

function survivalRingColor(v?: number): string {
  if (!v) return "#334155";
  if (v >= 80) return "#10b981";
  if (v >= 65) return "#f59e0b";
  return "#ef4444";
}

function isEndoDecide(c: SavedCase): boolean { return c.type === "endodecide"; }
function isLegacyCrack(c: SavedCase): boolean { return c.type === "crack-classifier"; }
function isLegacyPredictor(c: SavedCase): boolean { return c.type === "predictor"; }

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}

// ════════════════════════════════════════════════════════════
// RADIOGRAPH GALLERY
// ════════════════════════════════════════════════════════════
function RadiographGallery({ caseId, userId }: { caseId: string; userId: string }) {
  const [radiographs, setRadiographs] = useState<Radiograph[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Radiograph | null>(null);

  useEffect(() => {
    const fetchRadiographs = async () => {
      try {
        const rad = await getDocs(
          collection(db, "cases", caseId, "radiographs")
        );
        const data = rad.docs.map(d => ({
          id: d.id,
          ...d.data(),
        } as Radiograph));
        setRadiographs(data);
      } catch (err) {
        console.error("Failed to fetch radiographs:", err);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      fetchRadiographs();
    }
  }, [caseId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white/4 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (radiographs.length === 0) {
    return (
      <div className="text-center py-8">
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-30">
          <rect x="4" y="6" width="40" height="32" rx="2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="14" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M4 30l12-10 8 8 20-20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-xs text-gray-600">No radiographs uploaded</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {radiographs.map(rad => (
          <button
            key={rad.id}
            onClick={() => setSelectedImage(rad)}
            className="relative group rounded-lg overflow-hidden bg-black/40 aspect-square border border-white/8 hover:border-[#10b981]/50 transition-all"
          >
            <img
              src={rad.url}
              alt={rad.name}
              className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7S3.732 16.057 2.458 12Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-2 py-1">
              <p className="text-[9px] text-white font-bold truncate">{rad.type.toUpperCase()}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 flex-col"
        >
          <button
            onClick={e => { e.stopPropagation(); setSelectedImage(null); }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <div
            onClick={e => e.stopPropagation()}
            className="flex flex-col items-center max-w-2xl w-full"
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="max-w-full max-h-[70vh] rounded-lg object-contain"
            />
            <div className="mt-4 text-center">
              <p className="text-sm font-semibold text-white">{selectedImage.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedImage.type.toUpperCase()} · {selectedImage.uploadedAt?.toDate?.().toLocaleDateString?.("en-GB") || ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SURVIVAL RING
// ════════════════════════════════════════════════════════════
function SurvivalCircle({ value }: { value?: number }) {
  const size = 56;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = value !== undefined ? (value / 100) * circ : 0;
  const color = survivalRingColor(value);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a2744" strokeWidth="5" />
        {value !== undefined && (
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {value !== undefined ? (
          <>
            <span className="text-[11px] font-black leading-none" style={{ color }}>{value}</span>
            <span className="text-[7px] text-gray-600 leading-none mt-0.5">%</span>
          </>
        ) : (
          <span className="text-lg">🦷</span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STATUS CYCLER
// ════════════════════════════════════════════════════════════
function StatusCycler({ caseId, current, treatmentRec, toothType, userId, onUpdated }: {
  caseId: string; current: TreatmentStatus; treatmentRec?: string;
  toothType?: string; userId: string;
  onUpdated: (id: string, next: TreatmentStatus) => void;
}) {
  const [busy, setBusy] = useState(false);
  const cfg = STATUS_CONFIG[current] ?? STATUS_CONFIG["No Treatment"];

  const cycle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    const next = NEXT_STATUS[current] ?? "No Treatment";
    setBusy(true);
    try {
      await updateDoc(doc(db, "cases", caseId), { treatmentStatus: next });
      if (next === "Done" || next === "In-Progress") {
        applyProfitFields(userId, caseId, treatmentRec, toothType, next).catch(console.error);
      }
      onUpdated(caseId, next);
    } catch (err) {
      console.error("Status cycle failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={cycle}
      disabled={busy}
      title="Click to advance status"
      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-[11px] uppercase tracking-widest transition-all duration-150 hover:brightness-125 active:scale-95 disabled:opacity-60 select-none ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${busy ? "animate-ping" : ""}`} />
      {busy ? "Saving…" : cfg.label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// STATUS SELECTOR
// ════════════════════════════════════════════════════════════
function StatusSelector({ caseId, current, treatmentRec, toothType, userId, onUpdated }: {
  caseId: string; current: TreatmentStatus; treatmentRec?: string;
  toothType?: string; userId: string;
  onUpdated: (id: string, next: TreatmentStatus) => void;
}) {
  const [busy, setBusy] = useState<TreatmentStatus | null>(null);

  const select = async (s: TreatmentStatus) => {
    if (s === current || busy) return;
    setBusy(s);
    try {
      await updateDoc(doc(db, "cases", caseId), { treatmentStatus: s });
      if (s === "Done" || s === "In-Progress") {
        applyProfitFields(userId, caseId, treatmentRec, toothType, s).catch(console.error);
      }
      onUpdated(caseId, s);
    } catch (err) { console.error("Status select failed:", err); }
    finally { setBusy(null); }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_ORDER.map(s => {
        const cfg = STATUS_CONFIG[s];
        const isActive = current === s;
        const isBusy   = busy === s;
        return (
          <button key={s} onClick={() => select(s)} disabled={!!busy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 disabled:opacity-60 ${
              isActive
                ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-1 ${cfg.ring} cursor-default`
                : "bg-white/3 border-white/10 text-gray-600 hover:border-white/25 hover:text-gray-400"
            }`}>
            {isBusy
              ? <span className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin" />
              : <span className={`w-1.5 h-1.5 rounded-full ${isActive ? cfg.dot : "bg-white/20"}`} />}
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// INLINE EDITABLE FIELD
// ════════════════════════════════════════════════════════════
function EditableField({ label, value, field, caseId, type = "text", options, onSaved }: {
  label: string; value: string | null | undefined; field: string; caseId: string;
  type?: "text" | "textarea" | "date" | "select"; options?: string[];
  onSaved: (field: string, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value ?? "");
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<any>(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "cases", caseId), { [field]: draft });
      onSaved(field, draft);
      setEditing(false);
    } catch {}
    finally { setSaving(false); }
  };

  const cancel = () => { setDraft(value ?? ""); setEditing(false); };

  const inputCls = "w-full bg-[#0a1428] border border-[#10b981]/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981] transition-colors";

  return (
    <div>
      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1 font-semibold">{label}</p>
      {editing ? (
        <div className="flex items-start gap-1.5">
          {type === "textarea" ? (
            <textarea ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
              className={inputCls + " resize-none h-16"} />
          ) : type === "select" && options ? (
            <select ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input ref={inputRef} type={type} value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
              className={inputCls} />
          )}
          <div className="flex gap-1 flex-shrink-0 mt-0.5">
            <button onClick={save} disabled={saving}
              className="w-6 h-6 rounded-md bg-[#10b981] flex items-center justify-center hover:bg-[#0ea76e] transition-colors disabled:opacity-50">
              {saving
                ? <span className="w-3 h-3 rounded-full border border-black/30 border-t-black/80 animate-spin" />
                : <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round"/></svg>}
            </button>
            <button onClick={cancel}
              className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          className="group/f flex items-center justify-between w-full text-left rounded-lg px-2 py-1 -mx-2 hover:bg-white/4 transition-colors">
          <span className="text-xs text-gray-300 leading-relaxed">
            {value || <span className="text-gray-600 italic">tap to add</span>}
          </span>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
            className="flex-shrink-0 ml-1 opacity-0 group-hover/f:opacity-100 text-[#10b981] transition-opacity">
            <path d="M8 2l2 2-6 6H2V8L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SKELETON
// ════════════════════════════════════════════════════════════
function SkeletonCard() {
  return (
    <div className="bg-[#0d1a30] border border-white/6 rounded-2xl p-5 animate-pulse">
      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 rounded-full bg-white/6" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 bg-white/8 rounded w-2/5" />
          <div className="h-3 bg-white/5 rounded w-3/5" />
          <div className="h-3 bg-white/4 rounded w-1/4" />
        </div>
        <div className="w-24 h-7 bg-white/5 rounded-full" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PROCEDURE STAT ROW
// ════════════════════════════════════════════════════════════
function ProcedureStatRow({ cases }: { cases: SavedCase[] }) {
  const stats = useMemo(() => {
    const counts = {
      rct: 0,
      retreat: 0,
      microsurgery: 0,
      vpt: 0,
      other: 0,
    };
    cases.forEach(c => {
      const cat = getProcedureCategory(c.treatmentRec);
      if (cat === "RCT") counts.rct++;
      else if (cat === "Retreatment") counts.retreat++;
      else if (cat === "Microsurgery") counts.microsurgery++;
      else if (cat === "VPT") counts.vpt++;
      else counts.other++;
    });
    return counts;
  }, [cases]);

  return (
    <div className="grid grid-cols-5 gap-2 mb-6">
      {[
        { label: "RCT", value: stats.rct, color: "#10b981" },
        { label: "Retreatment", value: stats.retreat, color: "#f59e0b" },
        { label: "Microsurgery", value: stats.microsurgery, color: "#f97316" },
        { label: "VPT", value: stats.vpt, color: "#0ea5e9" },
        { label: "Other", value: stats.other, color: "#6b7280" },
      ].map(stat => (
        <div key={stat.label} className="bg-[#0d1a30] border border-white/8 rounded-xl px-3 py-3 text-center">
          <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          <p className="text-[9px] text-gray-600 uppercase tracking-wider mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function MyCases() {
  const [cases, setCases]             = useState<SavedCase[]>([]);
  const [allCases, setAllCases]       = useState<SavedCase[]>([]);
  const [lastDoc, setLastDoc]         = useState<any>(null);
  const [hasMore, setHasMore]         = useState(true);
  const [totalCount, setTotalCount]   = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab]     = useState<ActiveTab>("All");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  
  // Date range (month selector)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { user } = useAuth();
  const router   = useRouter();
  const hasFetched = useRef(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch count (month-specific)
  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const { start, end } = getMonthRange(selectedMonth, selectedYear);
      const q = query(
        collection(db, "cases"),
        where("userId", "==", user.uid),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );
      const snap = await getCountFromServer(q);
      setTotalCount(snap.data().count);
    } catch {}
  }, [user, selectedMonth, selectedYear]);

  // Load cases (initial + pagination)
  const loadCases = useCallback(async (loadMore = false) => {
    if (!user) return;
    if (loadMore) setLoadingMore(true);
    else { setLoading(true); setCases([]); setLastDoc(null); setHasMore(true); }
    setError(null);
    try {
      let q = query(
        collection(db, "cases"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      if (loadMore && lastDoc) q = query(q, startAfter(lastDoc));
      const snapshot = await getDocs(q);
      const newCases: SavedCase[] = snapshot.docs.map(d => {
        const data = d.data() as Omit<SavedCase, "id">;
        return {
          id: d.id, ...data,
          treatmentStatus:  (data.treatmentStatus ?? "No Treatment") as TreatmentStatus,
          followUpDate:     data.followUpDate ?? null,
          affectingFactors: data.affectingFactors ?? [],
        } as SavedCase;
      });
      setCases(prev => loadMore ? [...prev, ...newCases] : newCases);
      if (snapshot.docs.length < PAGE_SIZE) setHasMore(false);
      if (snapshot.docs.length > 0) setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    } catch {
      setError("Failed to load your cases. Please refresh.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, lastDoc]);

  // Search all cases (full archive)
  const searchAllCases = useCallback(async () => {
    if (!user || !debouncedSearch.trim()) {
      setAllCases([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const q = query(
        collection(db, "cases"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const allData = snapshot.docs.map(d => {
        const data = d.data() as Omit<SavedCase, "id">;
        return {
          id: d.id, ...data,
          treatmentStatus:  (data.treatmentStatus ?? "No Treatment") as TreatmentStatus,
          followUpDate:     data.followUpDate ?? null,
          affectingFactors: data.affectingFactors ?? [],
        } as SavedCase;
      });

      const term = debouncedSearch.toLowerCase().trim();
      const filtered = allData.filter(c => [
        c.caseName, c.phoneNumber, c.toothNumber, c.toothType,
        c.pulpalDiagnosis, c.periapicalDiagnosis, c.treatmentRec,
        c.gender, c.ageGroup, ...(c.affectingFactors || []),
      ].join(" ").toLowerCase().includes(term));

      setAllCases(filtered);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, [user, debouncedSearch]);

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearch) {
      searchAllCases();
    } else {
      setAllCases([]);
    }
  }, [debouncedSearch, searchAllCases]);

  // Initial load
  useEffect(() => {
    if (!user || hasFetched.current) return;
    hasFetched.current = true;
    loadCases(false);
    fetchCount();
  }, [user, loadCases, fetchCount]);

  // Refetch count when month/year changes
  useEffect(() => {
    if (user) {
      fetchCount();
    }
  }, [user, selectedMonth, selectedYear, fetchCount]);

  // Optimistic handlers
  const handleStatusUpdated = useCallback((id: string, next: TreatmentStatus) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, treatmentStatus: next } : c));
    setAllCases(prev => prev.map(c => c.id === id ? { ...c, treatmentStatus: next } : c));
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
    setAllCases(prev => prev.filter(c => c.id !== id));
    setTotalCount(prev => prev !== null ? prev - 1 : null);
    setExpandedId(prev => prev === id ? null : prev);
  }, []);

  const handleFieldUpdated = useCallback((id: string, fields: Partial<SavedCase>) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    setAllCases(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  }, []);

  // Filter by date range
  const monthRange = getMonthRange(selectedMonth, selectedYear);
  const casesInRange = (debouncedSearch ? allCases : cases).filter(c =>
    c.createdAt && c.createdAt >= monthRange.start && c.createdAt <= monthRange.end
  );

  // Tab counts
  const tabCounts = useMemo(() => ({
    "All":          casesInRange.length,
    "EndoDecide":   casesInRange.filter(c => isEndoDecide(c)).length,
    "Crack Cases":  casesInRange.filter(c => isLegacyCrack(c)).length,
    "No Treatment": casesInRange.filter(c => c.treatmentStatus === "No Treatment" && !isLegacyCrack(c)).length,
    "In-Progress":  casesInRange.filter(c => c.treatmentStatus === "In-Progress").length,
    "Done":         casesInRange.filter(c => c.treatmentStatus === "Done").length,
    "Postpone":     casesInRange.filter(c => c.treatmentStatus === "Postpone").length,
  }), [casesInRange]);

  // Filter by tab
  const filteredCases = useMemo(() => {
    let result = casesInRange;
    if (activeTab === "EndoDecide")  return result.filter(c => isEndoDecide(c));
    if (activeTab === "Crack Cases") return result.filter(c => isLegacyCrack(c));
    if (activeTab !== "All")         return result.filter(c => c.treatmentStatus === activeTab && !isLegacyCrack(c));
    return result;
  }, [casesInRange, activeTab]);

  // Categorize for display
  const categorizedCases = useMemo(() => {
    const groups: Record<string, SavedCase[]> = {
      "Root Canal Treatment":    [],
      "Root Canal Retreatment":  [],
      "Endodontic Microsurgery": [],
      "Vital Pulp Therapy":      [],
      "Other / No Treatment":    [],
    };
    filteredCases.filter(c => !isLegacyCrack(c)).forEach(c => {
      const tr = (c.treatmentRec || "").toLowerCase();
      if (tr.includes("root canal treatment"))                                    groups["Root Canal Treatment"].push(c);
      else if (tr.includes("retreatment"))                                        groups["Root Canal Retreatment"].push(c);
      else if (tr.includes("microsurgical") || tr.includes("apico"))             groups["Endodontic Microsurgery"].push(c);
      else if (tr.includes("vital pulp"))                                         groups["Vital Pulp Therapy"].push(c);
      else                                                                        groups["Other / No Treatment"].push(c);
    });
    return Object.fromEntries(Object.entries(groups).filter(([, list]) => list.length > 0));
  }, [filteredCases]);

  const legacyCrackCases = useMemo(() => filteredCases.filter(c => isLegacyCrack(c)), [filteredCases]);
  const tabs: ActiveTab[] = ["All", "EndoDecide", "Crack Cases", "No Treatment", "In-Progress", "Done", "Postpone"];

  const monthYear = formatMonthYear(selectedMonth, selectedYear);

  if (!user) return (
    <ProtectedRoute><Navigation />
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <p className="text-gray-400">Please log in to view your cases.</p>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white pb-24">

        {/* HEADER */}
        <div className="border-b border-white/6 bg-[#0d1830]/80 backdrop-blur-md px-4 sm:px-6 pt-8 pb-5">
          <div className="max-w-5xl mx-auto">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 mb-6">
              <div>
                <p className="text-[9px] tracking-[4px] uppercase text-[#10b981]/50 font-semibold mb-1.5">
                  EndoDecide · Case Management
                </p>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>
                  My Cases
                </h1>
                <p className="text-gray-600 text-xs mt-1">
                  {loading ? "Loading…" : `${totalCount ?? casesInRange.length} cases in ${monthYear}`}
                </p>
              </div>

              {/* Date range selector + Search + Export */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {/* Month selector */}
                <div className="flex items-center gap-1.5 bg-[#0a1428] border border-white/8 rounded-xl px-2 py-1.5">
                  <button onClick={() => {
                    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
                    else setSelectedMonth(selectedMonth - 1);
                  }}
                    className="p-1 hover:bg-white/8 rounded transition-colors">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M10 2L5 8l5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <select value={`${selectedYear}-${selectedMonth}`}
                    onChange={e => {
                      const [y, m] = e.target.value.split("-");
                      setSelectedYear(Number(y));
                      setSelectedMonth(Number(m));
                    }}
                    className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer text-center flex-1">
                    {Array.from({ length: 24 }, (_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - i);
                      return d;
                    }).map(d => {
                      const m = d.getMonth();
                      const y = d.getFullYear();
                      return <option key={`${y}-${m}`} value={`${y}-${m}`}>{formatMonthYear(m, y)}</option>;
                    })}
                  </select>
                  <button onClick={() => {
                    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
                    else setSelectedMonth(selectedMonth + 1);
                  }}
                    className="p-1 hover:bg-white/8 rounded transition-colors">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M6 2l5 6-5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 sm:flex-initial sm:w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input type="text" placeholder="Search cases…"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0a1428] border border-white/8 rounded-xl pl-9 pr-8 py-2 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-[#10b981]/40 transition-colors" />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 text-xs transition-colors">✕</button>
                  )}
                </div>

                {/* Export button */}
                <button onClick={() => exportToXLSX(casesInRange, monthYear)}
                  className="flex items-center gap-2 bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/30 text-[#10b981] px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 1h10l2 2v11a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 6h6M5 9h6M5 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Export
                </button>
              </div>
            </div>

            {/* TABS */}
            <div className="flex flex-wrap gap-1.5">
              {tabs.map(tab => {
                const isActive = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                      isActive
                        ? "bg-[#10b981] border-[#10b981] text-black"
                        : "bg-white/3 border-white/8 text-gray-500 hover:border-white/18 hover:text-gray-300"
                    }`}>
                    {tab}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-black/20 text-black/70" : "bg-white/6 text-gray-600"
                    }`}>
                      {tabCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7">

          {error && (
            <div className="flex items-center gap-3 bg-red-500/8 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-2.5">{[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}</div>
          )}

          {!loading && (
            <>
              {/* Procedure stat row */}
              {casesInRange.length > 0 && <ProcedureStatRow cases={casesInRange} />}

              {filteredCases.length === 0 && (
                <div className="text-center py-24">
                  <svg className="mx-auto mb-4 opacity-15" width="44" height="44" viewBox="0 0 48 48" fill="none">
                    <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M16 18h16M16 24h16M16 30h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p className="text-gray-500 text-sm">
                    {debouncedSearch ? `No cases matching "${debouncedSearch}"` : `No cases in ${monthYear}`}
                  </p>
                </div>
              )}

              {/* Cases display */}
              {activeTab === "Crack Cases" && legacyCrackCases.length > 0 && (
                <CaseGroup label="Legacy Crack Classifier" count={legacyCrackCases.length}>
                  {legacyCrackCases.map(c => (
                    <CaseCard key={c.id} c={c} userId={user.uid}
                      expanded={expandedId === c.id}
                      onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      onOpen={() => router.push(`/cases/${c.id}`)}
                      onStatusUpdated={handleStatusUpdated}
                      onDeleted={handleDeleted}
                      onFieldUpdated={handleFieldUpdated}
                    />
                  ))}
                </CaseGroup>
              )}

              {activeTab !== "Crack Cases" &&
                Object.entries(categorizedCases).map(([category, list]) => (
                  <CaseGroup key={category} label={category} count={list.length}>
                    {list.map(c => (
                      <CaseCard key={c.id} c={c} userId={user.uid}
                        expanded={expandedId === c.id}
                        onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        onOpen={() => router.push(`/cases/${c.id}`)}
                        onStatusUpdated={handleStatusUpdated}
                        onDeleted={handleDeleted}
                        onFieldUpdated={handleFieldUpdated}
                      />
                    ))}
                  </CaseGroup>
                ))}

              {/* Load more (only when not searching and showing initial pagination) */}
              {!debouncedSearch && !loading && hasMore && (
                <div className="flex justify-center mt-10">
                  <button onClick={() => loadCases(true)} disabled={loadingMore}
                    className="flex items-center gap-2 bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/18 px-7 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-50">
                    {loadingMore
                      ? <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" /> Loading…</>
                      : <>Load more <span className="text-gray-600 text-xs">({totalCount ? totalCount - cases.length : "?"} remaining)</span></>}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ════════════════════════════════════════════════════════════
// CASE GROUP
// ════════════════════════════════════════════════════════════
function CaseGroup({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-white/6" />
        <span className="text-[9px] font-bold uppercase tracking-[3px] text-gray-600">
          {label} <span className="text-gray-700 ml-1">({count})</span>
        </span>
        <div className="h-px flex-1 bg-white/6" />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CASE CARD
// ════════════════════════════════════════════════════════════
function CaseCard({ c, userId, expanded, onToggle, onOpen, onStatusUpdated, onDeleted, onFieldUpdated }: {
  c: SavedCase; userId: string; expanded: boolean;
  onToggle: () => void; onOpen: () => void;
  onStatusUpdated: (id: string, next: TreatmentStatus) => void;
  onDeleted: (id: string) => void;
  onFieldUpdated: (id: string, fields: Partial<SavedCase>) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const endo   = isEndoDecide(c);
  const crack  = isLegacyCrack(c);
  const legacy = isLegacyPredictor(c);
  const survival = c.survivalEstimate;
  const hasVRF   = c.vrfFlag || c.isVRF;
  const urgency  = c.urgency ? URGENCY_CONFIG[c.urgency] : null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "cases", c.id));
      onDeleted(c.id);
    } catch { setDeleting(false); setConfirmDelete(false); }
  };

  const handleSaved = useCallback((field: string, val: string) => {
    onFieldUpdated(c.id, { [field]: val } as Partial<SavedCase>);
  }, [c.id, onFieldUpdated]);

  return (
    <div className={`bg-[#0d1830] border rounded-2xl overflow-hidden transition-all duration-200 ${
      expanded ? "border-[#10b981]/20" : "border-white/6 hover:border-white/12"
    }`}>

      {/* COLLAPSED HEADER */}
      <div
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
      >
        <SurvivalCircle value={crack ? undefined : survival} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white leading-tight truncate max-w-[180px] sm:max-w-none">
              {c.caseName}
            </p>
            {endo && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20 leading-none">
                ENDODECIDE
              </span>
            )}
            {legacy && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-600 border border-white/8 leading-none">
                LEGACY
              </span>
            )}
            {urgency && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none ${urgency.color} ${urgency.bg} ${urgency.border}`}>
                {urgency.label.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-gray-500">
              🦷 #{c.toothNumber} · {c.toothType}
            </span>
            {c.gender && (
              <span className="text-[11px] text-gray-600">
                {c.gender === "Male" ? "♂" : "♀"}{c.ageGroup ? ` · ${c.ageGroup}` : ""}
              </span>
            )}
            {c.phoneNumber && (
              <span className="text-[11px] text-gray-600">📞 {c.phoneNumber}</span>
            )}
          </div>

          {(c.pulpalDiagnosis || c.treatmentRec) && (
            <p className="text-[10px] text-gray-600 mt-0.5 truncate">
              {[c.pulpalDiagnosis, c.periapicalDiagnosis].filter(Boolean).join(" · ")}
            </p>
          )}

          {(c.iowaStage || hasVRF || c.isPractical !== undefined || crack) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {c.iowaStage && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  Iowa {c.iowaStage} {c.iowaSuccessRate ? `· ${c.iowaSuccessRate}%` : ""}
                </span>
              )}
              {hasVRF && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                  ⚠ VRF
                </span>
              )}
              {!crack && c.isPractical !== undefined && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                  c.isPractical
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}>
                  {c.isPractical ? "✓ Retain" : "✗ Impractical"}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
          <StatusCycler
            caseId={c.id} current={c.treatmentStatus}
            treatmentRec={c.treatmentRec} toothType={c.toothType}
            userId={userId} onUpdated={onStatusUpdated}
          />
        </div>

        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
          className={`flex-shrink-0 text-gray-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* EXPANDED PANEL */}
      {expanded && (
        <div className="border-t border-white/6">

          {/* Status Selector */}
          <div className="px-4 py-4 border-b border-white/6">
            <p className="text-[9px] uppercase tracking-[3px] text-gray-600 font-semibold mb-2.5">Treatment Status</p>
            <StatusSelector
              caseId={c.id} current={c.treatmentStatus}
              treatmentRec={c.treatmentRec} toothType={c.toothType}
              userId={userId} onUpdated={onStatusUpdated}
            />
          </div>

          {/* Patient Details */}
          <div className="px-4 py-4 border-b border-white/6">
            <p className="text-[9px] uppercase tracking-[3px] text-[#10b981]/50 font-semibold mb-3">Patient Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
              <EditableField label="Case Name"      field="caseName"    caseId={c.id} value={c.caseName}    onSaved={handleSaved} />
              <EditableField label="Phone"          field="phoneNumber" caseId={c.id} value={c.phoneNumber} onSaved={handleSaved} />
              <EditableField label="Gender"         field="gender"      caseId={c.id} value={c.gender}
                type="select" options={["Male","Female"]} onSaved={handleSaved} />
              <EditableField label="Age Group"      field="ageGroup"    caseId={c.id} value={c.ageGroup}
                type="select" options={["1-12 years","13-25 years","26-40 years","Over 40 years"]} onSaved={handleSaved} />
              <EditableField label="ASA"            field="asa"         caseId={c.id} value={c.asa}
                type="select" options={["0","1","2","3","4","5","6"]} onSaved={handleSaved} />
              <EditableField label="Tooth Number"   field="toothNumber" caseId={c.id} value={c.toothNumber} onSaved={handleSaved} />
              <EditableField label="Follow-up Date" field="followUpDate" caseId={c.id} value={c.followUpDate} type="date" onSaved={handleSaved} />
            </div>
          </div>

          {/* Clinical */}
          {!crack && (
            <div className="px-4 py-4 border-b border-white/6">
              <p className="text-[9px] uppercase tracking-[3px] text-[#10b981]/50 font-semibold mb-3">
                Clinical {endo && <span className="text-gray-700 normal-case ml-1">(AAE 2013)</span>}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <EditableField label="Pulpal Diagnosis" field="pulpalDiagnosis" caseId={c.id} value={c.pulpalDiagnosis}
                  type="select" options={[
                    "Normal Pulp","Reversible Pulpitis","Irreversible Pulpitis","Pulp Necrosis",
                    "Previously Initiated Therapy","Previously Treated",
                  ]} onSaved={handleSaved} />
                <EditableField label="Periapical Diagnosis" field="periapicalDiagnosis" caseId={c.id} value={c.periapicalDiagnosis}
                  type="select" options={[
                    "Normal Apical Tissues","Symptomatic Apical Periodontitis",
                    "Asymptomatic Apical Periodontitis","Acute Apical Abscess",
                    "Chronic Apical Abscess",
                  ]} onSaved={handleSaved} />
                <EditableField label="Treatment Recommendation" field="treatmentRec" caseId={c.id} value={c.treatmentRec}
                  type="select" options={[
                    "Root Canal Treatment","Root Canal Retreatment","Vital Pulp Therapy",
                    "Microsurgical Endodontics (if surgically accessible)",
                    "No Endodontic Treatment Indicated","Extraction",
                  ]} onSaved={handleSaved} />
                <EditableField label="Periodontal Status" field="periodontalStatus" caseId={c.id} value={c.periodontalStatus}
                  type="select" options={[
                    "Healthy periodontium","Gingivitis",
                    "Initial to moderate periodontitis","Advanced periodontal disease",
                  ]} onSaved={handleSaved} />
              </div>
            </div>
          )}

          {/* Prognosis */}
          {!crack && (survival !== undefined || c.epPoints !== undefined || c.remainingPercent !== undefined) && (
            <div className="px-4 py-4 border-b border-white/6">
              <p className="text-[9px] uppercase tracking-[3px] text-gray-600 font-semibold mb-3">Prognosis Metrics</p>
              <div className="flex flex-wrap gap-3">
                {survival !== undefined && (
                  <div className="flex items-center gap-3 bg-white/3 rounded-xl px-4 py-3 min-w-[140px]">
                    <SurvivalCircle value={survival} />
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider">Survival</p>
                      <p className={`text-xl font-black leading-none mt-0.5 ${survivalColor(survival)}`}>{survival}%</p>
                    </div>
                  </div>
                )}
                {c.epPoints !== undefined && (
                  <div className="bg-white/3 rounded-xl px-4 py-3 text-center min-w-[90px]">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">EP Points</p>
                    <p className="text-xl font-black text-[#10b981] mt-0.5">{c.epPoints}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Radiographs */}
          {endo && (
            <div className="px-4 py-4 border-b border-white/6">
              <p className="text-[9px] uppercase tracking-[3px] text-[#10b981]/50 font-semibold mb-3">Radiographs</p>
              <RadiographGallery caseId={c.id} userId={userId} />
            </div>
          )}

          {/* Affecting Factors */}
          {c.affectingFactors && c.affectingFactors.length > 0 && (
            <div className="px-4 py-4 border-b border-white/6">
              <p className="text-[9px] uppercase tracking-[3px] text-gray-600 font-semibold mb-2.5">Affecting Factors</p>
              <div className="flex flex-wrap gap-1.5">
                {c.affectingFactors.map((f, i) => (
                  <span key={i} className="text-[10px] bg-white/4 border border-white/8 px-2.5 py-1 rounded-full text-gray-400">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="px-4 py-4 border-b border-white/6">
            <p className="text-[9px] uppercase tracking-[3px] text-[#10b981]/50 font-semibold mb-3">Notes</p>
            <EditableField label="Further Notes" field="furtherNote" caseId={c.id} value={c.furtherNote} type="textarea" onSaved={handleSaved} />
          </div>

          {/* Actions */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-red-400">Permanently delete?</span>
                  <button onClick={handleDelete} disabled={deleting}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/8 text-gray-400 hover:bg-white/15 transition-colors">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {endo && (
                    <button onClick={e => {
                      e.stopPropagation();
                      window.location.href = `/endodecide/radiographs?caseId=${c.id}`;
                    }}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#10b981] hover:text-[#0ea76e] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#10b981]/8 border border-transparent hover:border-[#10b981]/15">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Upload X-rays
                    </button>
                  )}
                  <button onClick={handleDelete}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/8 border border-transparent hover:border-red-500/15">
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                      <path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4M3 4l1 8h6l1-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
            <button onClick={onOpen}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#10b981] transition-colors">
              View detail
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}