// app/inbox/requests/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { app } from "../../firebaseConfig";

// ── FIRESTORE ──
const db = getFirestore(app);

const ADMIN_EMAIL = "aaddokhi@endoprognosis.org";

// ── TYPES ──
type ImpressionType = "emergency" | "urgent" | "routine" | "info";
type StatusType = "new" | "contacted" | "resolved";
type FilterType = "all" | ImpressionType | StatusType;

interface PatientRequest {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string;
  city: string;
  tooth: number | null;
  hasPain: string | null;
  painType: string | null;
  duration: string | null;
  sleep: string | null;
  visible: string[];
  acidicTaste: string | null;
  brush: string | null;
  floss: string | null;
  scaling: string | null;
  toothState: string | null;
  impression: ImpressionType;
  lang: string;
  timestamp: { seconds: number } | null;
  status: StatusType;
}

// ── URGENCY CONFIG ──
const URGENCY: Record<ImpressionType, {
  label: string; labelAr: string;
  bg: string; border: string; text: string;
  dot: string; badgeBg: string; badgeText: string;
  priority: number;
}> = {
  emergency: {
    label: "Emergency",       labelAr: "طارئ",
    bg: "bg-[#1a0808]",       border: "border-[#7a2020]",
    text: "text-red-400",     dot: "bg-red-500",
    badgeBg: "bg-red-600",    badgeText: "text-white",
    priority: 0,
  },
  urgent: {
    label: "Urgent",          labelAr: "عاجل",
    bg: "bg-[#1a1008]",       border: "border-[#7a5010]",
    text: "text-amber-400",   dot: "bg-amber-500",
    badgeBg: "bg-amber-500",  badgeText: "text-[#050d1f]",
    priority: 1,
  },
  routine: {
    label: "Routine",         labelAr: "اعتيادي",
    bg: "bg-[#081a10]",       border: "border-[#1a5a30]",
    text: "text-emerald-400", dot: "bg-emerald-500",
    badgeBg: "bg-emerald-600",badgeText: "text-[#050d1f]",
    priority: 2,
  },
  info: {
    label: "Info",            labelAr: "معلومات",
    bg: "bg-[#081418]",       border: "border-[#0e4050]",
    text: "text-teal-400",    dot: "bg-teal-500",
    badgeBg: "bg-teal-600",   badgeText: "text-[#050d1f]",
    priority: 3,
  },
};

// ── HELPERS ──
function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return "—";
  const d = new Date(ts.seconds * 1000);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function toothArchLabel(fdi: number | null): string {
  if (!fdi) return "—";
  const arch = fdi < 30 ? "Upper" : "Lower";
  const side = (fdi >= 10 && fdi < 20) || (fdi >= 40 && fdi < 50) ? "Right" : "Left";
  return `${arch} ${side}`;
}

function brushLabel(v: string | null): string {
  const map: Record<string, string> = { "0": "Never", "1": "Once/day", "2": "Twice/day", "3": "3×/day" };
  return v ? (map[v] ?? v) : "—";
}
function flossLabel(v: string | null): string {
  const map: Record<string, string> = { yes: "Daily", sometimes: "Sometimes", no: "Rarely/Never" };
  return v ? (map[v] ?? v) : "—";
}
function scalingLabel(v: string | null): string {
  const map: Record<string, string> = { recent: "< 6 months", old: "> 6 months", never: "Never" };
  return v ? (map[v] ?? v) : "—";
}
function toothStateLabel(v: string | null): string {
  const map: Record<string, string> = {
    sound: "Healthy", restored: "Has filling",
    broken: "Broken restoration", rct: "Root canal treated", crown: "Crowned",
  };
  return v ? (map[v] ?? v) : "—";
}
function durationLabel(v: string | null): string {
  const map: Record<string, string> = {
    seconds: "Seconds", minutes: "Minutes",
    hours: "Hours", medication: "Needs medication",
  };
  return v ? (map[v] ?? v) : "—";
}

// ── STATUS BADGE ──
function StatusBadge({ status }: { status: StatusType }) {
  const cfg: Record<StatusType, { label: string; cls: string }> = {
    new:       { label: "New",       cls: "bg-blue-600/20 text-blue-400 border-blue-600/40" },
    contacted: { label: "Contacted", cls: "bg-amber-600/20 text-amber-400 border-amber-600/40" },
    resolved:  { label: "Resolved",  cls: "bg-emerald-600/20 text-emerald-400 border-emerald-600/40" },
  };
  const c = cfg[status];
  return (
    <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ── DETAIL ROW ──
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-gray-300">{value || "—"}</span>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════
export default function InboxRequestsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [requests, setRequests]   = useState<PatientRequest[]>([]);
  const [fetching, setFetching]   = useState<boolean>(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [filter, setFilter]       = useState<FilterType>("all");
  const [search, setSearch]       = useState<string>("");
  const [updating, setUpdating]   = useState<string | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    if (loading) return;
    if (!user || user.email !== ADMIN_EMAIL) router.replace("/");
  }, [user, loading, router]);

  // ── Realtime Firestore listener ──
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;
    const q = query(collection(db, "patients"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
        const data = d.data() as Omit<PatientRequest, "id">;
        return {
          id: d.id,
          ...data,
          status: (data.status ?? "new") as StatusType,
          visible: (data.visible ?? []) as string[],
        } as PatientRequest;
      });
      setRequests(docs);
      setFetching(false);
    });
    return () => unsub();
  }, [user]);

  // ── Mark status ──
  async function setStatus(id: string, status: StatusType) {
    setUpdating(id);
    try {
      await updateDoc(doc(db, "patients", id), { status });
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  }

  // ── Counts ──
  const counts = {
    all:       requests.length,
    emergency: requests.filter((r) => r.impression === "emergency").length,
    urgent:    requests.filter((r) => r.impression === "urgent").length,
    routine:   requests.filter((r) => r.impression === "routine").length,
    info:      requests.filter((r) => r.impression === "info").length,
    new:       requests.filter((r) => (r.status ?? "new") === "new").length,
    contacted: requests.filter((r) => r.status === "contacted").length,
    resolved:  requests.filter((r) => r.status === "resolved").length,
  };

  // ── Filter + search ──
  const filtered = requests
    .filter((r: PatientRequest) => {
      if (filter === "all") return true;
      const imp = r.impression as string;
      const sta = (r.status ?? "new") as string;
      return imp === filter || sta === filter;
    })
    .filter((r: PatientRequest) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.phone?.includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        String(r.tooth ?? "").includes(q)
      );
    });

  const sorted = [...filtered].sort((a: PatientRequest, b: PatientRequest) => {
    const pa = URGENCY[a.impression]?.priority ?? 3;
    const pb = URGENCY[b.impression]?.priority ?? 3;
    if (pa !== pb) return pa - pb;
    return (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0);
  });

  // ── Loading / guard screen ──
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#050d1f] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#f5d76e]/30 border-t-[#f5d76e] animate-spin" />
      </div>
    );
  }
  if (user.email !== ADMIN_EMAIL) return null;

  return (
    <div className="min-h-screen bg-[#050d1f] text-white flex flex-col">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#050d1f]/95 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="17" fill="#0d1a30" stroke="#f5d76e" strokeWidth="1"/>
            <path d="M11 14 C11 10,14 8,18 8 C22 8,25 10,25 14 C25 20,21 26,18 28 C15 26,11 20,11 14Z" fill="#f5d76e" opacity="0.2"/>
            <path d="M13 15 C13 12,15 10,18 10 C21 10,23 12,23 15 C23 20,20 25,18 27 C16 25,13 20,13 15Z" stroke="#f5d76e" strokeWidth="1.2" fill="none"/>
            <circle cx="18" cy="18" r="2" fill="#f5d76e" opacity="0.6"/>
          </svg>
          <div>
            <p className="text-[10px] text-[#f5d76e]/60 tracking-[3px] uppercase">Admin Panel</p>
            <h1 className="text-base font-bold text-[#f5d76e] leading-tight" style={{ fontFamily: "Playfair Display, serif" }}>
              Patient Requests
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {counts.new > 0 && (
            <span className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-600/40 text-blue-400 text-xs font-bold px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {counts.new} new
            </span>
          )}
          <button
            onClick={() => router.push("/home")}
            className="text-gray-500 hover:text-[#f5d76e] text-xs border border-[#1e2e4a] hover:border-[#f5d76e]/50 px-4 py-2 rounded-full transition-all"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-8">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {(["emergency", "urgent", "routine", "info"] as ImpressionType[]).map((type) => {
            const u = URGENCY[type];
            return (
              <div
                key={type}
                onClick={() => setFilter(filter === type ? "all" : type)}
                className={`${u.bg} border ${filter === type ? u.border : "border-white/8"} rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-2 h-2 rounded-full ${u.dot}`} />
                  <span className={`text-2xl font-bold ${u.text}`}>{counts[type]}</span>
                </div>
                <p className={`text-xs font-semibold ${u.text}`}>{u.label}</p>
                <p className="text-[10px] text-gray-600 mt-0.5" style={{ fontFamily: "Tajawal, sans-serif" }}>{u.labelAr}</p>
              </div>
            );
          })}
        </div>

        {/* ── SEARCH + STATUS FILTERS ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, city, tooth number..."
              className="w-full bg-[#0a1428] border border-[#1e2e4a] text-sm text-gray-300 placeholder-gray-600 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#f5d76e]/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "new", "contacted", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(filter === f ? "all" : f)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                  filter === f
                    ? "bg-[#f5d76e] border-[#f5d76e] text-[#050d1f]"
                    : "bg-[#0a1428] border-[#1e2e4a] text-gray-500 hover:border-[#f5d76e]/40 hover:text-gray-300"
                }`}
              >
                {f === "all" ? `All (${counts.all})` : `${f} (${counts[f]})`}
              </button>
            ))}
          </div>
        </div>

        {/* ── REQUEST LIST ── */}
        {fetching ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 rounded-full border-2 border-[#f5d76e]/20 border-t-[#f5d76e] animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-32 text-gray-600">
            <svg className="mx-auto mb-4 opacity-30" width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-sm">No requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((req: PatientRequest) => {
              const u = URGENCY[req.impression];
              const isOpen = expanded === req.id;
              const status: StatusType = req.status ?? "new";

              return (
                <div
                  key={req.id}
                  className={`${u.bg} border ${isOpen ? u.border : "border-white/8"} rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/20`}
                >
                  {/* ── ROW HEADER ── */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : req.id)}
                  >
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${u.dot} ${req.impression === "emergency" ? "animate-pulse" : ""}`} />

                    <span className={`hidden sm:inline-flex text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full flex-shrink-0 ${u.badgeBg} ${u.badgeText}`}>
                      {u.label}
                    </span>

                    <div className="flex-shrink-0 text-center hidden md:block">
                      <p className="text-lg font-bold text-[#f5d76e] leading-none">{req.tooth ?? "—"}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">FDI</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white text-sm truncate">{req.name || "Unknown"}</p>
                        <StatusBadge status={status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>📞 {req.phone || "—"}</span>
                        {req.city  && <span>📍 {req.city}</span>}
                        {req.age   && <span>🎂 {req.age}y</span>}
                        {req.gender && <span>{req.gender === "male" ? "♂" : "♀"}</span>}
                      </p>
                    </div>

                    <p className="hidden lg:block text-xs text-gray-600 flex-shrink-0">{formatDate(req.timestamp)}</p>

                    <svg
                      width="16" height="16" viewBox="0 0 16 16" fill="none"
                      className={`flex-shrink-0 text-gray-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* ── EXPANDED DETAIL ── */}
                  {isOpen && (
                    <div className="border-t border-white/8 px-5 py-5 space-y-6">

                      {/* Symptom summary */}
                      <div>
                        <p className="text-[10px] text-[#f5d76e]/60 tracking-[2px] uppercase font-semibold mb-3">Symptom Summary</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          <DetailRow label="Tooth (FDI)" value={req.tooth ? `${req.tooth} — ${toothArchLabel(req.tooth)}` : "—"} />
                          <DetailRow label="Pain" value={req.hasPain === "yes" ? "Yes" : req.hasPain === "no" ? "No" : "—"} />
                          <DetailRow label="Pain type" value={req.painType === "stimulus" ? "With stimulus" : req.painType === "spontaneous" ? "Spontaneous" : "—"} />
                          <DetailRow label="Duration" value={durationLabel(req.duration)} />
                          <DetailRow label="Disturbs sleep" value={req.sleep === "yes" ? "Yes" : req.sleep === "no" ? "No" : "—"} />
                          <DetailRow label="Visible signs" value={req.visible?.length ? req.visible.join(", ") : "None"} />
                          <DetailRow label="Acidic taste" value={req.acidicTaste === "yes" ? "Yes" : req.acidicTaste === "no" ? "No" : "—"} />
                          <DetailRow label="Tooth state" value={toothStateLabel(req.toothState)} />
                        </div>
                      </div>

                      {/* Oral hygiene */}
                      <div>
                        <p className="text-[10px] text-[#f5d76e]/60 tracking-[2px] uppercase font-semibold mb-3">Oral Hygiene History</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <DetailRow label="Brushing"     value={brushLabel(req.brush)}   />
                          <DetailRow label="Flossing"     value={flossLabel(req.floss)}   />
                          <DetailRow label="Last scaling" value={scalingLabel(req.scaling)} />
                        </div>
                      </div>

                      {/* Patient info */}
                      <div>
                        <p className="text-[10px] text-[#f5d76e]/60 tracking-[2px] uppercase font-semibold mb-3">Patient Information</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                          <DetailRow label="Full name" value={req.name}                            />
                          <DetailRow label="Age"       value={req.age ? `${req.age} years` : "—"} />
                          <DetailRow label="Gender"    value={req.gender ?? "—"}                   />
                          <DetailRow label="Phone"     value={req.phone}                           />
                          <DetailRow label="City"      value={req.city || "—"}                     />
                        </div>
                      </div>

                      {/* Actions row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/8">
                        <p className="text-xs text-gray-600">
                          Submitted: {formatDate(req.timestamp)} · Lang: {req.lang?.toUpperCase() ?? "—"}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          {status !== "contacted" && (
                            <button
                              disabled={updating === req.id}
                              onClick={() => setStatus(req.id, "contacted")}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-amber-600/20 border border-amber-600/40 text-amber-400 hover:bg-amber-600/35 transition-all disabled:opacity-50"
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M2 4l6 5 6-5M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                              </svg>
                              Mark as Contacted
                            </button>
                          )}
                          {status !== "resolved" && (
                            <button
                              disabled={updating === req.id}
                              onClick={() => setStatus(req.id, "resolved")}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/35 transition-all disabled:opacity-50"
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Mark as Resolved
                            </button>
                          )}
                          {status !== "new" && (
                            <button
                              disabled={updating === req.id}
                              onClick={() => setStatus(req.id, "new")}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600/20 border border-blue-600/40 text-blue-400 hover:bg-blue-600/35 transition-all disabled:opacity-50"
                            >
                              Reset to New
                            </button>
                          )}
                          {updating === req.id && (
                            <div className="w-4 h-4 rounded-full border-2 border-[#f5d76e]/30 border-t-[#f5d76e] animate-spin" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-5 text-center">
        <p className="text-gray-700 text-xs">endoprognosis project 2026. Copyrights reserved</p>
      </footer>
    </div>
  );
}