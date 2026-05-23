// app/mycases/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection, query, where, orderBy,
  getDocs, doc, updateDoc, deleteDoc, startAfter, limit,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";

// ── TYPES ──
type TreatmentStatus = "No Treatment" | "In-Progress" | "Done" | "Postpone";
type ActiveTab = "All" | "Crack Cases" | "No Treatment" | "In-Progress" | "Done" | "Postpone";

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
  remainingToothStructure?: string;
  remainingPercent?: number;
  affectingFactors?: string[];
  treatmentRec?: string;
  survivalEstimate?: number;
  isPractical?: boolean;
  treatmentStatus: TreatmentStatus;
  followUpDate: string | null;
  furtherNote?: string;
  type?: string;
  classification?: string;
  iowaStage?: string;
  isVRF?: boolean;
  epPoints?: number;
  createdAt: any;
}

const PAGE_SIZE = 15;

const STATUS_CONFIG: Record<TreatmentStatus, { label: string; bg: string; border: string; text: string; dot: string }> = {
  "No Treatment": { label: "No Treatment", bg: "bg-gray-500/15",    border: "border-gray-500/30",    text: "text-gray-400",    dot: "bg-gray-400"    },
  "In-Progress":  { label: "In Progress",  bg: "bg-amber-500/15",   border: "border-amber-500/30",   text: "text-amber-400",   dot: "bg-amber-400"   },
  "Done":         { label: "Done",         bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  "Postpone":     { label: "Postponed",    bg: "bg-purple-500/15",  border: "border-purple-500/30",  text: "text-purple-400",  dot: "bg-purple-400"  },
};

const NEXT_STATUS: Record<TreatmentStatus, TreatmentStatus> = {
  "No Treatment": "In-Progress",
  "In-Progress":  "Done",
  "Done":         "Postpone",
  "Postpone":     "No Treatment",
};

// ── SURVIVAL COLOR ──
function survivalColor(v?: number): string {
  if (!v) return "text-gray-500";
  if (v >= 80) return "text-emerald-400";
  if (v >= 65) return "text-amber-400";
  return "text-red-400";
}

// ── STATUS BADGE ──
function StatusBadge({ status }: { status: TreatmentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["No Treatment"];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── QUICK STATUS CYCLER ──
function QuickStatusButton({
  caseId, current, onUpdated,
}: { caseId: string; current: TreatmentStatus; onUpdated: (id: string, next: TreatmentStatus) => void }) {
  const [updating, setUpdating] = useState(false);
  const next = NEXT_STATUS[current] ?? "No Treatment";
  const nextCfg = STATUS_CONFIG[next];

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdating(true);
    try {
      await updateDoc(doc(db, "cases", caseId), { treatmentStatus: next });
      onUpdated(caseId, next);
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={updating}
      title={`Mark as: ${next}`}
      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all hover:opacity-90 disabled:opacity-50 ${nextCfg.bg} ${nextCfg.border} ${nextCfg.text}`}
    >
      {updating ? (
        <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      {next}
    </button>
  );
}

// ── SKELETON CARD ──
function SkeletonCard() {
  return (
    <div className="bg-[#0d1a30] border border-white/8 rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-white/8 rounded-lg w-1/3" />
          <div className="h-3 bg-white/5 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[1,2,3,4].map(i => <div key={i} className="h-8 bg-white/5 rounded-xl" />)}
          </div>
        </div>
        <div className="w-20 h-16 bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function MyCases() {
  const [cases, setCases]           = useState<SavedCase[]>([]);
  const [lastDoc, setLastDoc]       = useState<any>(null);
  const [hasMore, setHasMore]       = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab]   = useState<ActiveTab>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { user } = useAuth();
  const router   = useRouter();
  const hasFetched = useRef(false);

  // ── Debounce search (300ms) ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Fetch total count (once) ──
  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "cases"), where("userId", "==", user.uid));
      const snap = await getCountFromServer(q);
      setTotalCount(snap.data().count);
    } catch {}
  }, [user]);

  // ── Load cases ──
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
          id: d.id,
          ...data,
          treatmentStatus: (data.treatmentStatus ?? "No Treatment") as TreatmentStatus,
          followUpDate: data.followUpDate ?? null,
          affectingFactors: data.affectingFactors ?? [],
        } as SavedCase;
      });

      setCases(prev => loadMore ? [...prev, ...newCases] : newCases);
      if (snapshot.docs.length < PAGE_SIZE) setHasMore(false);
      if (snapshot.docs.length > 0) setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    } catch (err) {
      setError("Failed to load your cases. Please refresh.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, lastDoc]);

  // ── Init — only once when user is ready ──
  useEffect(() => {
    if (!user || hasFetched.current) return;
    hasFetched.current = true;
    loadCases(false);
    fetchCount();
  }, [user]);

  // ── Optimistic status update (no refetch) ──
  const handleStatusUpdated = useCallback((id: string, next: TreatmentStatus) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, treatmentStatus: next } : c));
  }, []);

  // ── Optimistic delete ──
  const handleDeleted = useCallback((id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
    setTotalCount(prev => prev !== null ? prev - 1 : null);
  }, []);

  // ── Optimistic field update ──
  const handleFieldUpdated = useCallback((id: string, fields: Partial<SavedCase>) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  }, []);

  // ── Tab counts ──
  const tabCounts = useMemo(() => ({
    "All":          cases.length,
    "Crack Cases":  cases.filter(c => c.type === "crack-classifier").length,
    "No Treatment": cases.filter(c => c.treatmentStatus === "No Treatment" && c.type !== "crack-classifier").length,
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
    if (activeTab === "Crack Cases") return result.filter(c => c.type === "crack-classifier");
    if (activeTab !== "All") return result.filter(c => c.treatmentStatus === activeTab && c.type !== "crack-classifier");
    return result;
  }, [cases, debouncedSearch, activeTab]);

  // ── Categorize (predictor cases only) ──
  const categorizedCases = useMemo(() => {
    const groups: Record<string, SavedCase[]> = {
      "Root Canal Treatment":    [],
      "Root Canal Retreatment":  [],
      "Endodontic Microsurgery": [],
      "Vital Pulp Therapy":      [],
      "Other / No Treatment":    [],
    };
    filteredCases.filter(c => c.type !== "crack-classifier").forEach(c => {
      const tr = (c.treatmentRec || "").toLowerCase();
      if (tr.includes("root canal treatment") || tr.includes("rct"))         groups["Root Canal Treatment"].push(c);
      else if (tr.includes("retreatment") || tr.includes("rcret"))           groups["Root Canal Retreatment"].push(c);
      else if (tr.includes("microsurgery") || tr.includes("apico"))          groups["Endodontic Microsurgery"].push(c);
      else if (tr.includes("vital pulp") || tr.includes("vpt"))              groups["Vital Pulp Therapy"].push(c);
      else                                                                    groups["Other / No Treatment"].push(c);
    });
    return Object.fromEntries(Object.entries(groups).filter(([, list]) => list.length > 0));
  }, [filteredCases]);

  const crackCases = useMemo(() => filteredCases.filter(c => c.type === "crack-classifier"), [filteredCases]);

  // ── INPUT STYLE ──
  const inputCls = "w-full bg-[#0a1428] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#10b981]/50 transition-colors";

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
      <div className="min-h-screen bg-[#0a1428] text-white pb-20">

        {/* ── HEADER ── */}
        <div className="border-b border-white/8 bg-[#0d1a30]/60 backdrop-blur-sm px-4 sm:px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
              <div>
                <p className="text-[10px] text-[#10b981]/60 tracking-[3px] uppercase mb-1">Case Management</p>
                <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>
                  My Cases
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {loading ? "Loading..." : totalCount !== null
                    ? `${cases.length} of ${totalCount} cases loaded`
                    : `${cases.length} cases loaded`}
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-80">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search cases..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={inputCls}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-xs">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex flex-wrap gap-2 mt-6">
              {(["All","Crack Cases","No Treatment","In-Progress","Done","Postpone"] as ActiveTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                    activeTab === tab
                      ? "bg-[#10b981] border-[#10b981] text-black"
                      : "bg-white/4 border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-300"
                  }`}
                >
                  {tab === "Crack Cases" ? "🦷 " : ""}
                  {tab}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab ? "bg-black/20 text-black/70" : "bg-white/8 text-gray-500"
                  }`}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-2xl text-sm mb-6">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredCases.length === 0 && (
            <div className="text-center py-24">
              <svg className="mx-auto mb-4 opacity-20" width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 18h16M16 24h16M16 30h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-gray-500 text-sm">
                {debouncedSearch ? `No cases match "${debouncedSearch}"` : "No cases in this category yet"}
              </p>
            </div>
          )}

          {/* ── CRACK CASES ── */}
          {!loading && activeTab === "Crack Cases" && crackCases.length > 0 && (
            <div className="space-y-3">
              {crackCases.map(c => (
                <CaseCard key={c.id} c={c} expanded={expandedId === c.id}
                  onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  onOpen={() => router.push(`/cases/${c.id}`)}
                  onStatusUpdated={handleStatusUpdated}
                  onDeleted={handleDeleted}
                  onFieldUpdated={handleFieldUpdated}
                />
              ))}
            </div>
          )}

          {/* ── PREDICTOR CASES grouped ── */}
          {!loading && activeTab !== "Crack Cases" && Object.entries(categorizedCases).map(([category, list]) => (
            <div key={category} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {category}
                  <span className="ml-2 text-gray-700">({list.length})</span>
                </span>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <div className="space-y-3">
                {list.map(c => (
                  <CaseCard key={c.id} c={c} expanded={expandedId === c.id}
                    onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    onOpen={() => router.push(`/cases/${c.id}`)}
                    onStatusUpdated={handleStatusUpdated}
                    onDeleted={handleDeleted}
                    onFieldUpdated={handleFieldUpdated}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* ── LOAD MORE ── */}
          {!loading && hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => loadCases(true)}
                disabled={loadingMore}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 px-8 py-3.5 rounded-full text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />Loading...</>
                ) : (
                  <>Load More Cases<span className="text-gray-600 text-xs ml-1">({totalCount ? totalCount - cases.length : "?"} remaining)</span></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ══════════════════════════════════════════════
// INLINE EDIT FIELD
// ══════════════════════════════════════════════
function EditableField({
  label, value, field, caseId, type = "text", options, onSaved,
}: {
  label: string;
  value: string | null | undefined;
  field: string;
  caseId: string;
  type?: "text" | "textarea" | "date" | "select";
  options?: string[];
  onSaved: (field: string, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value ?? "");
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<any>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "cases", caseId), { [field]: draft });
      onSaved(field, draft);
      setEditing(false);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const cancel = () => { setDraft(value ?? ""); setEditing(false); };

  const inputCls = "w-full bg-[#0a1428] border border-[#10b981]/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981] transition-colors";

  return (
    <div className="group">
      <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
      {editing ? (
        <div className="flex items-start gap-1.5">
          {type === "textarea" ? (
            <textarea ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
              className={inputCls + " resize-none h-16"} />
          ) : type === "select" && options ? (
            <select ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
              className={inputCls}>
              <option value="">—</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input ref={inputRef} type={type} value={draft} onChange={e => setDraft(e.target.value)}
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
          className="flex items-center gap-1.5 w-full text-left group/field">
          <p className="text-xs text-gray-300 flex-1">{value || <span className="text-gray-600 italic">tap to add</span>}</p>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
            className="text-gray-700 group-hover/field:text-[#10b981] transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
            <path d="M8 2l2 2-6 6H2V8L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// CASE CARD COMPONENT
// ══════════════════════════════════════════════
function CaseCard({ c, expanded, onToggle, onOpen, onStatusUpdated, onDeleted, onFieldUpdated }: {
  c: SavedCase;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onStatusUpdated: (id: string, next: TreatmentStatus) => void;
  onDeleted: (id: string) => void;
  onFieldUpdated: (id: string, fields: Partial<SavedCase>) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const isCrack   = c.type === "crack-classifier";
  const survival  = c.survivalEstimate;
  const survColor = survivalColor(survival);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "cases", c.id));
      onDeleted(c.id);
    } catch { setDeleting(false); setConfirmDelete(false); }
  };

  const handleSaved = (field: string, val: string) => {
    onFieldUpdated(c.id, { [field]: val } as Partial<SavedCase>);
  };

  return (
    <div className={`bg-[#0d1a30] border rounded-2xl overflow-hidden transition-all duration-200 ${
      expanded ? "border-[#10b981]/30" : "border-white/8 hover:border-white/15"
    }`}>

      {/* ── CARD HEADER ── */}
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={onToggle}>
        {/* Survival */}
        <div className="flex-shrink-0 w-14 text-center">
          {isCrack ? <span className="text-2xl">🦷</span>
            : survival !== undefined ? (
              <><p className={`text-xl font-black leading-none ${survColor}`}>{survival}%</p>
              <p className="text-[9px] text-gray-600 mt-0.5">survival</p></>
            ) : <p className="text-gray-600 text-xs">—</p>}
        </div>
        <div className="w-px h-10 bg-white/8 flex-shrink-0" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white text-sm truncate">{c.caseName}</p>
            {!isCrack && c.isPractical !== undefined && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                c.isPractical ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
              }`}>
                {c.isPractical ? "✅ Retain" : "⚠️ Extract"}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>🦷 #{c.toothNumber} · {c.toothType}</span>
            {c.phoneNumber && <span>📞 {c.phoneNumber}</span>}
            {c.gender && <span>{c.gender === "Male" ? "♂" : "♀"} {c.ageGroup || ""}</span>}
          </p>
        </div>

        {/* Status + quick cycle */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <StatusBadge status={c.treatmentStatus} />
          <QuickStatusButton caseId={c.id} current={c.treatmentStatus} onUpdated={onStatusUpdated} />
        </div>

        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
          className={`flex-shrink-0 text-gray-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ── EXPANDED DETAIL ── */}
      {expanded && (
        <div className="border-t border-white/8 px-5 py-5 space-y-5">

          {/* Edit hint */}
          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M8 2l2 2-6 6H2V8L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            Click any field to edit inline
          </div>

          {/* ── BASIC INFO ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <EditableField label="Case Name"   field="caseName"    caseId={c.id} value={c.caseName}    onSaved={handleSaved} />
            <EditableField label="Phone"       field="phoneNumber" caseId={c.id} value={c.phoneNumber} onSaved={handleSaved} />
            <EditableField label="Follow-up Date" field="followUpDate" caseId={c.id} value={c.followUpDate} type="date" onSaved={handleSaved} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <EditableField label="Gender" field="gender" caseId={c.id} value={c.gender}
              type="select" options={["Male","Female"]} onSaved={handleSaved} />
            <EditableField label="Age Group" field="ageGroup" caseId={c.id} value={c.ageGroup}
              type="select" options={["1-12 years","13-25 years","26-40 years","Over 40 years"]} onSaved={handleSaved} />
            <EditableField label="ASA" field="asa" caseId={c.id} value={c.asa}
              type="select" options={["0","1","2","3","4","5","6"]} onSaved={handleSaved} />
            <EditableField label="Tooth Number" field="toothNumber" caseId={c.id} value={c.toothNumber} onSaved={handleSaved} />
          </div>

          {/* ── DIAGNOSIS ── */}
          {!isCrack && (
            <div>
              <p className="text-[10px] text-[#10b981]/60 tracking-[2px] uppercase font-semibold mb-3">Diagnosis</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <EditableField label="Pulpal Diagnosis" field="pulpalDiagnosis" caseId={c.id} value={c.pulpalDiagnosis}
                  type="select" options={[
                    "Reversible Pulpitis","Irreversible Pulpitis","Pulp Necrosis",
                    "Previously initiated root canal treatment","Previously root canal treated","Normal Pulp",
                  ]} onSaved={handleSaved} />
                <EditableField label="Periapical Diagnosis" field="periapicalDiagnosis" caseId={c.id} value={c.periapicalDiagnosis}
                  type="select" options={[
                    "Normal Apical tissue","Symptomatic Apical Periodontitis","Asymptomatic Apical Periodontitis",
                    "Acute Apical Abscess","Chronic Apical Abscess",
                  ]} onSaved={handleSaved} />
                <EditableField label="Treatment Recommendation" field="treatmentRec" caseId={c.id} value={c.treatmentRec}
                  type="select" options={[
                    "Root Canal Treatment","Root Canal Retreatment",
                    "Vital Pulp Therapy","Microsurgical Endodontics","Extraction",
                  ]} onSaved={handleSaved} />
                <EditableField label="Periodontal Status" field="periodontalStatus" caseId={c.id} value={c.periodontalStatus}
                  type="select" options={[
                    "Healthy periodontium","Gingivitis",
                    "Initial and moderate periodontitis","Advanced periodontal disease",
                  ]} onSaved={handleSaved} />
              </div>
            </div>
          )}

          {/* ── NOTES ── */}
          <div>
            <p className="text-[10px] text-[#10b981]/60 tracking-[2px] uppercase font-semibold mb-3">Notes</p>
            <EditableField label="Further Notes" field="furtherNote" caseId={c.id} value={c.furtherNote} type="textarea" onSaved={handleSaved} />
          </div>

          {/* Read-only fields */}
          {!isCrack && (survival !== undefined || c.epPoints !== undefined || c.remainingPercent !== undefined) && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Calculated Values (read-only)</p>
              <div className="grid grid-cols-3 gap-3">
                {survival !== undefined && (
                  <div className="bg-white/3 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Survival</p>
                    <p className={`text-lg font-black ${survColor}`}>{survival}%</p>
                  </div>
                )}
                {c.epPoints !== undefined && (
                  <div className="bg-white/3 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">EP Points</p>
                    <p className="text-lg font-black text-[#10b981]">{c.epPoints}</p>
                  </div>
                )}
                {c.remainingPercent !== undefined && (
                  <div className="bg-white/3 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Structure</p>
                    <p className="text-lg font-black text-amber-400">{c.remainingPercent}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Affecting factors (read-only) */}
          {c.affectingFactors && c.affectingFactors.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Affecting Factors</p>
              <div className="flex flex-wrap gap-1.5">
                {c.affectingFactors.map((f, i) => (
                  <span key={i} className="text-[10px] bg-white/5 border border-white/8 px-2.5 py-1 rounded-full text-gray-400">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── STATUS + ACTIONS BAR ── */}
          <div className="pt-3 border-t border-white/8 space-y-3">

            {/* Status selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Status:</p>
              {(["No Treatment","In-Progress","Done","Postpone"] as TreatmentStatus[]).map(s => {
                const cfg = STATUS_CONFIG[s];
                const isActive = c.treatmentStatus === s;
                return (
                  <button key={s}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isActive) return;
                      try {
                        await updateDoc(doc(db, "cases", c.id), { treatmentStatus: s });
                        onStatusUpdated(c.id, s);
                      } catch {}
                    }}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                      isActive
                        ? `${cfg.bg} ${cfg.border} ${cfg.text} cursor-default`
                        : "bg-white/4 border-white/10 text-gray-600 hover:border-white/25 hover:text-gray-400"
                    }`}>
                    {s}
                  </button>
                );
              })}
            </div>

            {/* Action buttons row */}
            <div className="flex items-center justify-between gap-3">
              {/* Delete */}
              <div className="flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <span className="text-xs text-red-400">Permanently delete?</span>
                    <button onClick={handleDelete} disabled={deleting}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/8 text-gray-400 hover:bg-white/15 transition-colors">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={handleDelete}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded-full hover:bg-red-500/10 border border-transparent hover:border-red-500/20">
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                      <path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4M3 4l1 8h6l1-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Delete case
                  </button>
                )}
              </div>

              {/* Full details link */}
              <button onClick={onOpen}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#10b981] hover:text-[#0ea76e] transition-colors">
                Full details page
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}