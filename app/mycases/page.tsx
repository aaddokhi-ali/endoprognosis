// app/mycases/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection, query, where, orderBy,
  getDocs, doc, updateDoc, deleteDoc, startAfter, limit,
  getCountFromServer, getDoc,
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

interface ProfitSettings {
  currency: "SAR" | "USD";
  procedures: Record<string, { revenue: number; cost: number }>;
}

const PAGE_SIZE = 15;

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
// SURVIVAL RING
// ════════════════════════════════════════════════════════════
function SurvivalRing({ value, size = 52 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = survivalRingColor(value);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="rotate-90"
        style={{ fill: color, fontSize: size * 0.24, fontWeight: 800, fontFamily: "system-ui", transform: `rotate(90deg) translate(0,0)` }}>
      </text>
    </svg>
  );
}

// Inline SVG ring with centered label (uses foreignObject workaround via absolute positioning)
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
// STATUS PILL — clickable cycle
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
      // Fire profit update in background — don't await so UI is instant
      if (next === "Done" || next === "In-Progress") {
        applyProfitFields(userId, caseId, treatmentRec, toothType, next).catch(console.error);
      }
      onUpdated(caseId, next); // ← instant optimistic update
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
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="opacity-40 group-hover:opacity-80 transition-opacity">
        <path d="M5 1v8M1 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// STATUS SELECTOR (expanded panel — all 4 options visible)
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
  // Sync if parent value changes
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
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function MyCases() {
  const [cases, setCases]             = useState<SavedCase[]>([]);
  const [lastDoc, setLastDoc]         = useState<any>(null);
  const [hasMore, setHasMore]         = useState(true);
  const [totalCount, setTotalCount]   = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab]     = useState<ActiveTab>("All");
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const { user } = useAuth();
  const router   = useRouter();
  const hasFetched = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "cases"), where("userId", "==", user.uid));
      const snap = await getCountFromServer(q);
      setTotalCount(snap.data().count);
    } catch {}
  }, [user]);

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

  useEffect(() => {
    if (!user || hasFetched.current) return;
    hasFetched.current = true;
    loadCases(false);
    fetchCount();
  }, [user]);

  // ── Optimistic handlers ──
  const handleStatusUpdated = useCallback((id: string, next: TreatmentStatus) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, treatmentStatus: next } : c));
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
    setTotalCount(prev => prev !== null ? prev - 1 : null);
    setExpandedId(prev => prev === id ? null : prev);
  }, []);

  const handleFieldUpdated = useCallback((id: string, fields: Partial<SavedCase>) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  }, []);

  // ── Tab counts ──
  const tabCounts = useMemo(() => ({
    "All":          cases.length,
    "EndoDecide":   cases.filter(c => isEndoDecide(c)).length,
    "Crack Cases":  cases.filter(c => isLegacyCrack(c)).length,
    "No Treatment": cases.filter(c => c.treatmentStatus === "No Treatment" && !isLegacyCrack(c)).length,
    "In-Progress":  cases.filter(c => c.treatmentStatus === "In-Progress").length,
    "Done":         cases.filter(c => c.treatmentStatus === "Done").length,
    "Postpone":     cases.filter(c => c.treatmentStatus === "Postpone").length,
  }), [cases]);

  // ── Filter ──
  const filteredCases = useMemo(() => {
    let result = cases;
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase().trim();
      result = result.filter(c => [
        c.caseName, c.phoneNumber, c.toothNumber, c.toothType,
        c.pulpalDiagnosis, c.periapicalDiagnosis, c.treatmentRec,
        c.gender, c.ageGroup, ...(c.affectingFactors || []),
      ].join(" ").toLowerCase().includes(term));
    }
    if (activeTab === "EndoDecide")  return result.filter(c => isEndoDecide(c));
    if (activeTab === "Crack Cases") return result.filter(c => isLegacyCrack(c));
    if (activeTab !== "All")         return result.filter(c => c.treatmentStatus === activeTab && !isLegacyCrack(c));
    return result;
  }, [cases, debouncedSearch, activeTab]);

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

        {/* ── HEADER ── */}
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
                  {loading ? "Loading…" : totalCount !== null
                    ? `${cases.length} of ${totalCount} loaded`
                    : `${cases.length} loaded`}
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type="text" placeholder="Search by name, tooth, diagnosis…"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0a1428] border border-white/8 rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-[#10b981]/40 transition-colors" />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 text-xs transition-colors">✕</button>
                )}
              </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex flex-wrap gap-1.5">
              {tabs.map(tab => {
                const isActive = activeTab === tab;
                const isEndo  = tab === "EndoDecide";
                const isCrack = tab === "Crack Cases";
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                      isActive
                        ? "bg-[#10b981] border-[#10b981] text-black"
                        : isEndo
                          ? "bg-[#10b981]/8 border-[#10b981]/20 text-[#10b981]/80 hover:bg-[#10b981]/15"
                          : "bg-white/3 border-white/8 text-gray-500 hover:border-white/18 hover:text-gray-300"
                    }`}>
                    {isCrack && <span className="text-[10px]">🦷</span>}
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

        {/* ── BODY ── */}
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

          {!loading && filteredCases.length === 0 && (
            <div className="text-center py-24">
              <svg className="mx-auto mb-4 opacity-15" width="44" height="44" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 18h16M16 24h16M16 30h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-gray-500 text-sm">
                {debouncedSearch ? `No cases matching "${debouncedSearch}"` : "No cases in this category yet"}
              </p>
            </div>
          )}

          {/* Legacy crack cases */}
          {!loading && activeTab === "Crack Cases" && legacyCrackCases.length > 0 && (
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

          {/* All other cases */}
          {!loading && activeTab !== "Crack Cases" &&
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

          {/* Load more */}
          {!loading && hasMore && (
            <div className="flex justify-center mt-10">
              <button onClick={() => loadCases(true)} disabled={loadingMore}
                className="flex items-center gap-2 bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/18 px-7 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-50">
                {loadingMore
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" /> Loading…</>
                  : <>Load more <span className="text-gray-600 text-xs">({totalCount ? totalCount - cases.length : "?"} remaining)</span></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ════════════════════════════════════════════════════════════
// CASE GROUP WRAPPER
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

      {/* ── COLLAPSED HEADER (always visible) ── */}
      <div
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
      >
        {/* Survival circle */}
        <SurvivalCircle value={crack ? undefined : survival} />

        {/* Core info */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + meta-badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white leading-tight truncate max-w-[180px] sm:max-w-none">
              {c.caseName}
            </p>

            {/* Tool type badge */}
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

            {/* Urgency — shown only when set */}
            {urgency && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none ${urgency.color} ${urgency.bg} ${urgency.border}`}>
                {urgency.label.toUpperCase()}
              </span>
            )}
          </div>

          {/* Row 2: tooth + patient quick info */}
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

          {/* Row 3: diagnosis line */}
          {(c.pulpalDiagnosis || c.treatmentRec) && (
            <p className="text-[10px] text-gray-600 mt-0.5 truncate">
              {[c.pulpalDiagnosis, c.periapicalDiagnosis].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Row 4: clinical flags — Iowa, VRF, Practical — full-width, prominent */}
          {(c.iowaStage || hasVRF || c.isPractical !== undefined || crack) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {c.iowaStage && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M5 1v4M5 7v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Iowa {c.iowaStage}
                  {c.iowaSuccessRate ? <span className="text-orange-600 ml-0.5">· {c.iowaSuccessRate}% success</span> : ""}
                </span>
              )}
              {hasVRF && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                  ⚠ VRF — cannot exclude
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
              {crack && (
                <span className="text-[10px] text-gray-600">Crack Classifier case</span>
              )}
            </div>
          )}
        </div>

        {/* Status cycler — rightmost, always visible */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
          <StatusCycler
            caseId={c.id} current={c.treatmentStatus}
            treatmentRec={c.treatmentRec} toothType={c.toothType}
            userId={userId} onUpdated={onStatusUpdated}
          />
        </div>

        {/* Expand chevron */}
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
          className={`flex-shrink-0 text-gray-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ── EXPANDED PANEL ── */}
      {expanded && (
        <div className="border-t border-white/6">

          {/* ── SECTION: Status selector (full 4-option row) ── */}
          <div className="px-4 py-4 border-b border-white/6">
            <p className="text-[9px] uppercase tracking-[3px] text-gray-600 font-semibold mb-2.5">Treatment Status</p>
            <StatusSelector
              caseId={c.id} current={c.treatmentStatus}
              treatmentRec={c.treatmentRec} toothType={c.toothType}
              userId={userId} onUpdated={onStatusUpdated}
            />
          </div>

          {/* ── SECTION: Patient details (editable) ── */}
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

          {/* ── SECTION: Clinical (editable) ── */}
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
                    "Previously initiated root canal treatment","Previously root canal treated",
                  ]} onSaved={handleSaved} />
                <EditableField label="Periapical Diagnosis" field="periapicalDiagnosis" caseId={c.id} value={c.periapicalDiagnosis}
                  type="select" options={[
                    "Normal Apical Tissues","Symptomatic Apical Periodontitis",
                    "Asymptomatic Apical Periodontitis","Acute Apical Abscess",
                    "Chronic Apical Abscess","Normal Apical tissue",
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

          {/* ── SECTION: Crack / Iowa (EndoDecide combined, read-only display) ── */}
          {endo && (c.iowaStage || hasVRF) && (
            <div className="px-4 py-4 border-b border-white/6">
              <p className="text-[9px] uppercase tracking-[3px] text-orange-400/50 font-semibold mb-3">Crack Assessment</p>
              <div className="flex flex-wrap gap-3">
                {c.iowaStage && (
                  <div className="bg-orange-500/6 border border-orange-500/15 rounded-xl px-4 py-3 min-w-[120px] text-center">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Iowa Stage</p>
                    <p className="text-2xl font-black text-orange-400 leading-none">{c.iowaStage}</p>
                    {c.iowaSuccessRate && (
                      <p className="text-[10px] text-gray-600 mt-1">{c.iowaSuccessRate}% 1-yr success</p>
                    )}
                  </div>
                )}
                {hasVRF && (
                  <div className="bg-red-500/6 border border-red-500/15 rounded-xl px-4 py-3 min-w-[160px] text-center">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">VRF Risk</p>
                    <p className="text-sm font-bold text-red-400">⚠ Cannot exclude</p>
                    <p className="text-[10px] text-gray-600 mt-1">Direct visualization required</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION: Calculated values (read-only) ── */}
          {!crack && (survival !== undefined || c.epPoints !== undefined || c.remainingPercent !== undefined) && (
            <div className="px-4 py-4 border-b border-white/6">
              <p className="text-[9px] uppercase tracking-[3px] text-gray-600 font-semibold mb-3">Prognosis Metrics</p>
              <div className="flex flex-wrap gap-3">
                {survival !== undefined && (
                  <div className="flex items-center gap-3 bg-white/3 rounded-xl px-4 py-3 min-w-[140px]">
                    <SurvivalCircle value={survival} />
                    <div>
                      <p className="text-[9px] text-gray-600 uppercase tracking-wider">Survival estimate</p>
                      <p className={`text-xl font-black leading-none mt-0.5 ${survivalColor(survival)}`}>{survival}%</p>
                      {c.survivalRange && (
                        <p className="text-[9px] text-gray-600 mt-0.5">Range: {c.survivalRange[0]}–{c.survivalRange[1]}%</p>
                      )}
                    </div>
                  </div>
                )}
                {c.epPoints !== undefined && (
                  <div className="bg-white/3 rounded-xl px-4 py-3 text-center min-w-[90px]">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">EP Points</p>
                    <p className="text-xl font-black text-[#10b981] mt-0.5">{c.epPoints}</p>
                  </div>
                )}
                {c.remainingPercent !== undefined && (
                  <div className="bg-white/3 rounded-xl px-4 py-3 text-center min-w-[90px]">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">Structure</p>
                    <p className="text-xl font-black text-amber-400 mt-0.5">{c.remainingPercent}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION: Affecting factors ── */}
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

          {/* ── SECTION: Notes ── */}
          <div className="px-4 py-4 border-b border-white/6">
            <p className="text-[9px] uppercase tracking-[3px] text-[#10b981]/50 font-semibold mb-3">Notes</p>
            <EditableField label="Further Notes" field="furtherNote" caseId={c.id} value={c.furtherNote} type="textarea" onSaved={handleSaved} />
          </div>

          {/* ── SECTION: Actions ── */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {/* Delete */}
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
                <button onClick={handleDelete}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/8 border border-transparent hover:border-red-500/15">
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4M3 4l1 8h6l1-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Delete case
                </button>
              )}
            </div>

            {/* Full detail page */}
            <button onClick={onOpen}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#10b981] transition-colors">
              Full detail page
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