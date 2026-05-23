// app/profit-tracker/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  collection, query, where, orderBy,
  onSnapshot, doc, getDoc, deleteDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import ProfitSetupWizard from "../components/ProfitSetupWizard";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { getProcedureDisplayName } from "../utils/profitCalculator";

// ── TYPES ──
interface ProfitCase {
  id: string;
  caseName: string;
  toothNumber: string;
  actualProcedure: string;
  revenue: number;
  cost: number;
  profit: number;
  feeMultiplier?: number;
  profitStatus?: "full" | "in-progress";
  completedAt?: any;
  createdAt?: any;
}

interface ProfitSettings {
  currency: "SAR" | "USD";
  procedures: Record<string, { revenue: number; cost: number }>;
}

interface ProcedureStat {
  name: string;
  key: string;
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  color: string;
}

// ── PROCEDURE GROUPING ──
const PROCEDURE_GROUPS: { key: string; label: string; color: string; match: string[] }[] = [
  { key: "rct",    label: "Root Canal Treatment",   color: "#10b981", match: ["root canal treatment","rct"]        },
  { key: "rcret",  label: "Root Canal Retreatment", color: "#3b82f6", match: ["retreatment","rcret"]               },
  { key: "vpt",    label: "Vital Pulp Therapy",     color: "#f59e0b", match: ["vital pulp","vpt"]                  },
  { key: "apico",  label: "Microsurgery",           color: "#8b5cf6", match: ["microsurgery","apico","surgical"]   },
  { key: "other",  label: "Other",                  color: "#64748b", match: []                                    },
];

function getProcedureGroup(procedure: string): typeof PROCEDURE_GROUPS[0] {
  const p = procedure.toLowerCase();
  for (const g of PROCEDURE_GROUPS) {
    if (g.match.some(m => p.includes(m))) return g;
  }
  return PROCEDURE_GROUPS[PROCEDURE_GROUPS.length - 1];
}

function fmt(n: number, currency: string) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " " + currency;
}

function pct(part: number, total: number) {
  if (!total) return "0%";
  return Math.round((part / total) * 100) + "%";
}

// ── STAT CARD ──
function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className={`bg-[#0d1a30] border rounded-2xl p-5 border-white/8`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center`} style={{ background: color + "20" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-black text-white leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── CUSTOM TOOLTIP ──
function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1a30] border border-white/15 rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {fmt(p.value, currency)}
        </p>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function ProfitTrackerPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [profitCases, setProfitCases]     = useState<ProfitCase[]>([]);
  const [profitSettings, setProfitSettings] = useState<ProfitSettings | null>(null);
  const [showSetup, setShowSetup]         = useState(false);
  const [loading, setLoading]             = useState(true);
  const [isExporting, setIsExporting]     = useState(false);
  const [sortBy, setSortBy]               = useState<"profit" | "revenue" | "date">("profit");
  const [filterProc, setFilterProc]       = useState<string>("all");
  const [showReset, setShowReset]         = useState(false);
  const [resetting, setResetting]         = useState(false);

  const currency = profitSettings?.currency ?? "SAR";

  // ── Settings ──
  useEffect(() => {
    if (!user) return;
    const checkSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "settings", "profitSettings"));
        if (!snap.exists()) setShowSetup(true);
        else { setShowSetup(false); setProfitSettings(snap.data() as ProfitSettings); }
      } catch (err) { console.error(err); }
    };
    checkSettings();
  }, [user]);

  // ── Cases real-time ──
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const q = query(
      collection(db, "cases"),
      where("userId", "==", user.uid),
      where("treatmentStatus", "in", ["Done", "In-Progress"]),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: ProfitCase[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!data.actualProcedure) return;
        list.push({
          id: d.id,
          caseName:       data.caseName       || "Unnamed",
          toothNumber:    data.toothNumber     || "—",
          actualProcedure: data.actualProcedure,
          revenue:        Number(data.revenue) || 0,
          cost:           Number(data.cost)    || 0,
          profit:         Number(data.profit)  || 0,
          feeMultiplier:  data.feeMultiplier   || 1,
          profitStatus:   data.profitStatus    || (data.treatmentStatus === "Done" ? "full" : "in-progress"),
          completedAt:    data.completedAt     || data.updatedAt || data.createdAt,
          createdAt:      data.createdAt,
        });
      });
      setProfitCases(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ── TOTALS ──
  const totals = useMemo(() => {
    const full = profitCases.filter(c => c.profitStatus === "full");
    const inProg = profitCases.filter(c => c.profitStatus === "in-progress");
    const totalRevenue = profitCases.reduce((s, c) => s + c.revenue, 0);
    const totalProfit  = profitCases.reduce((s, c) => s + c.profit,  0);
    const totalCost    = profitCases.reduce((s, c) => s + c.cost,    0);
    return {
      totalRevenue, totalProfit, totalCost,
      margin: totalRevenue ? Math.round((totalProfit / totalRevenue) * 100) : 0,
      fullCases:        full.length,
      fullProfit:       full.reduce((s,c) => s + c.profit, 0),
      inProgressCases:  inProg.length,
      inProgressProfit: inProg.reduce((s,c) => s + c.profit, 0),
      avgCase:          profitCases.length ? Math.round(totalProfit / profitCases.length) : 0,
    };
  }, [profitCases]);

  // ── THIS MONTH vs LAST MONTH ──
  const monthComparison = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();
    let thisProfit = 0, lastProfit = 0;
    profitCases.forEach(c => {
      const ts = c.completedAt?.seconds
        ? new Date(c.completedAt.seconds * 1000)
        : c.completedAt ? new Date(c.completedAt) : null;
      if (!ts) return;
      if (ts.getMonth() === thisMonth && ts.getFullYear() === thisYear) thisProfit += c.profit;
      const lm = thisMonth === 0 ? 11 : thisMonth - 1;
      const ly = thisMonth === 0 ? thisYear - 1 : thisYear;
      if (ts.getMonth() === lm && ts.getFullYear() === ly) lastProfit += c.profit;
    });
    const change = lastProfit ? Math.round(((thisProfit - lastProfit) / lastProfit) * 100) : null;
    return { thisProfit, lastProfit, change };
  }, [profitCases]);

  // ── PROCEDURE STATS ──
  const procedureStats = useMemo((): ProcedureStat[] => {
    const map: Record<string, ProcedureStat> = {};
    PROCEDURE_GROUPS.forEach(g => {
      map[g.key] = { name: g.label, key: g.key, count: 0, revenue: 0, cost: 0, profit: 0, margin: 0, color: g.color };
    });
    profitCases.forEach(c => {
      const g = getProcedureGroup(c.actualProcedure);
      map[g.key].count++;
      map[g.key].revenue += c.revenue;
      map[g.key].cost    += c.cost;
      map[g.key].profit  += c.profit;
    });
    return Object.values(map)
      .map(s => ({ ...s, margin: s.revenue ? Math.round((s.profit / s.revenue) * 100) : 0 }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.profit - a.profit);
  }, [profitCases]);

  // ── TREND CHART (weekly, last 8 weeks) ──
  const weeklyData = useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (7 * (7 - i)));
      return {
        week: "W" + (i + 1),
        label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        profit: 0, revenue: 0,
        start: new Date(d), end: new Date(d.setDate(d.getDate() + 7)),
      };
    });
    profitCases.forEach(c => {
      const ts = c.completedAt?.seconds
        ? new Date(c.completedAt.seconds * 1000)
        : c.completedAt ? new Date(c.completedAt)
        : c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000) : null;
      if (!ts) return;
      const w = weeks.find(w => ts >= w.start && ts < w.end);
      if (w) { w.profit += c.profit; w.revenue += c.revenue; }
    });
    return weeks;
  }, [profitCases]);

  // ── TOP 3 CASES ──
  const topCases = useMemo(() =>
    [...profitCases].sort((a, b) => b.profit - a.profit).slice(0, 3),
  [profitCases]);

  // ── FILTERED + SORTED CASE LIST ──
  const filteredCases = useMemo(() => {
    let list = filterProc === "all" ? profitCases
      : profitCases.filter(c => getProcedureGroup(c.actualProcedure).key === filterProc);
    return [...list].sort((a, b) =>
      sortBy === "profit"  ? b.profit - a.profit :
      sortBy === "revenue" ? b.revenue - a.revenue :
      (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0)
    );
  }, [profitCases, filterProc, sortBy]);

  // ── PDF EXPORT ──
  const exportToPDF = async () => {
    if (profitCases.length === 0) { alert("No cases to export yet."); return; }
    setIsExporting(true);
    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const rows = filteredCases.slice(0, 20).map(c =>
        `<tr style="border-bottom:1px solid #1e293b">
          <td style="padding:10px">${c.caseName}</td>
          <td style="padding:10px">#${c.toothNumber}</td>
          <td style="padding:10px">${getProcedureDisplayName(c.actualProcedure)}</td>
          <td style="padding:10px;text-align:right;color:${c.profitStatus==="in-progress"?"#fb923c":"#10b981"};font-weight:700">
            +${fmt(c.profit, currency)}${c.profitStatus==="in-progress"?" (50%)":""}
          </td>
        </tr>`
      ).join("");
      const procRows = procedureStats.map(s =>
        `<tr style="border-bottom:1px solid #1e293b">
          <td style="padding:10px;color:${s.color};font-weight:600">${s.name}</td>
          <td style="padding:10px;text-align:center">${s.count}</td>
          <td style="padding:10px;text-align:right">${fmt(s.revenue, currency)}</td>
          <td style="padding:10px;text-align:right">${fmt(s.profit, currency)}</td>
          <td style="padding:10px;text-align:right">${s.margin}%</td>
        </tr>`
      ).join("");
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="font-family:system-ui,sans-serif;color:#e2e8f0;background:#0a1428;padding:40px;line-height:1.6;">
          <div style="text-align:center;margin-bottom:32px;">
            <h1 style="color:#10b981;font-size:28px;margin:0;">Profit Tracker Report</h1>
            <p style="color:#64748b;font-size:13px;margin-top:6px;">Generated: ${new Date().toLocaleDateString("en-GB")}</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
            <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:16px;text-align:center;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 8px">Total Profit</p>
              <p style="color:#10b981;font-size:22px;font-weight:900;margin:0;">${fmt(totals.totalProfit, currency)}</p>
            </div>
            <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:16px;text-align:center;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 8px">Total Revenue</p>
              <p style="color:#3b82f6;font-size:22px;font-weight:900;margin:0;">${fmt(totals.totalRevenue, currency)}</p>
            </div>
            <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:16px;text-align:center;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 8px">Avg Margin</p>
              <p style="color:#f59e0b;font-size:22px;font-weight:900;margin:0;">${totals.margin}%</p>
            </div>
            <div style="background:#0d1a30;border:1px solid #1e3a5f;border-radius:12px;padding:16px;text-align:center;">
              <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 8px">Cases</p>
              <p style="color:#e2e8f0;font-size:22px;font-weight:900;margin:0;">${profitCases.length}</p>
            </div>
          </div>
          <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px;">By Procedure Type</h2>
          <table style="width:100%;border-collapse:collapse;background:#0d1a30;border-radius:12px;margin-bottom:32px;">
            <thead><tr style="background:#050d1f">
              <th style="padding:10px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;">Procedure</th>
              <th style="padding:10px;text-align:center;color:#64748b;font-size:11px;text-transform:uppercase;">Cases</th>
              <th style="padding:10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Revenue</th>
              <th style="padding:10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Net Profit</th>
              <th style="padding:10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Margin</th>
            </tr></thead>
            <tbody>${procRows}</tbody>
          </table>
          <h2 style="color:#e2e8f0;font-size:16px;margin:0 0 12px;">Case Detail</h2>
          <table style="width:100%;border-collapse:collapse;background:#0d1a30;border-radius:12px;">
            <thead><tr style="background:#050d1f">
              <th style="padding:10px;text-align:left;color:#64748b;font-size:11px;">Case</th>
              <th style="padding:10px;text-align:left;color:#64748b;font-size:11px;">Tooth</th>
              <th style="padding:10px;text-align:left;color:#64748b;font-size:11px;">Procedure</th>
              <th style="padding:10px;text-align:right;color:#64748b;font-size:11px;">Profit</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="text-align:center;margin-top:32px;color:#475569;font-size:11px;">Endoprognosis Profit Tracker • ${new Date().getFullYear()}</p>
        </div>`;
      document.body.appendChild(el);
      await html2pdf().from(el).set({
        margin: [10,15,10,15] as [number,number,number,number],
        filename: `Profit_Report_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#0a1428" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      }).save();
      document.body.removeChild(el);
    } catch (e) { alert("Failed to generate PDF. Please try again."); }
    finally { setIsExporting(false); }
  };

  // ── RESET ──
  const handleReset = async () => {
    if (!user) return;
    setResetting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "settings", "profitSettings"));
      setShowSetup(true);
      setProfitSettings(null);
      setShowReset(false);
    } catch { alert("Failed to reset. Please try again."); }
    finally { setResetting(false); }
  };

  // ── LOADING ──
  if (loading) return (
    <ProtectedRoute><Navigation />
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#10b981]/30 border-t-[#10b981] animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading Profit Tracker...</p>
        </div>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white pb-20">

        {/* ── HEADER ── */}
        <div className="border-b border-white/8 bg-[#0d1a30]/60 backdrop-blur-sm px-4 sm:px-6 py-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-[#10b981]/60 tracking-[3px] uppercase mb-1">Financial Overview</p>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>
                Profit Tracker
              </h1>
              <p className="text-gray-500 text-sm mt-1">Real-time · Done + In-Progress cases</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={exportToPDF} disabled={isExporting}
                className="flex items-center gap-2 bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/30 text-[#10b981] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 1h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 6v6M5 9l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
              <button onClick={() => setShowReset(true)}
                className="flex items-center gap-2 bg-white/4 hover:bg-white/8 border border-white/10 text-gray-500 hover:text-red-400 px-4 py-2.5 rounded-xl text-sm transition-all">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M2 4h10M5 4V2h4v2M3 4l1 8h6l1-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {showSetup ? (
            <ProfitSetupWizard onComplete={() => {
              setShowSetup(false);
              router.refresh();
            }} />
          ) : (
            <>
              {/* ── HERO STATS ROW ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Net Profit" value={fmt(totals.totalProfit, currency)}
                  sub={`${totals.fullCases + totals.inProgressCases} cases total`}
                  color="#10b981"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M5 5l3-3 3 3M5 11l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>} />
                <StatCard label="Total Revenue" value={fmt(totals.totalRevenue, currency)}
                  sub={`Cost: ${fmt(totals.totalCost, currency)}`}
                  color="#3b82f6"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v6M6 7h3a1 1 0 010 2H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>} />
                <StatCard label="Avg Margin" value={totals.margin + "%"}
                  sub={`Avg per case: ${fmt(totals.avgCase, currency)}`}
                  color="#f59e0b"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12L6 8l3 3 5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
                <StatCard
                  label="This Month"
                  value={fmt(monthComparison.thisProfit, currency)}
                  sub={monthComparison.change !== null
                    ? (monthComparison.change >= 0 ? "▲ " : "▼ ") + Math.abs(monthComparison.change) + "% vs last month"
                    : "First month of data"}
                  color={monthComparison.change === null ? "#8b5cf6" : monthComparison.change >= 0 ? "#10b981" : "#ef4444"}
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>} />
              </div>

              {/* ── DONE vs IN-PROGRESS ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0d1a30] border border-emerald-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Completed (100% fee)</p>
                  </div>
                  <p className="text-2xl font-black text-emerald-400">{fmt(totals.fullProfit, currency)}</p>
                  <p className="text-xs text-gray-600 mt-1">{totals.fullCases} cases</p>
                  <div className="mt-3 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: pct(totals.fullProfit, totals.totalProfit) }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">{pct(totals.fullProfit, totals.totalProfit)} of total</p>
                </div>
                <div className="bg-[#0d1a30] border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">In Progress (50% fee)</p>
                  </div>
                  <p className="text-2xl font-black text-amber-400">{fmt(totals.inProgressProfit, currency)}</p>
                  <p className="text-xs text-gray-600 mt-1">{totals.inProgressCases} cases</p>
                  <div className="mt-3 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: pct(totals.inProgressProfit, totals.totalProfit) }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">{pct(totals.inProgressProfit, totals.totalProfit)} of total</p>
                </div>
              </div>

              {/* ── PROCEDURE BREAKDOWN ── */}
              {procedureStats.length > 0 && (
                <div className="bg-[#0d1a30] border border-white/8 rounded-2xl p-6">
                  <p className="text-[10px] text-[#10b981]/60 tracking-[2px] uppercase font-semibold mb-5">
                    By Procedure Type
                  </p>

                  {/* Bar chart */}
                  <div className="h-52 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={procedureStats} barSize={36}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }}
                          tickFormatter={v => v.split(" ").map((w: string) => w[0]).join("")} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip content={<ChartTooltip currency={currency} />} />
                        <Bar dataKey="profit" name="Net Profit" radius={[6,6,0,0]}>
                          {procedureStats.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stats table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {["Procedure","Cases","Revenue","Cost","Net Profit","Margin"].map(h => (
                            <th key={h} className="text-[10px] text-gray-600 uppercase tracking-wider pb-2 text-left first:pl-0 last:text-right px-3 first:px-0">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {procedureStats.map((s, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                                <span className="text-white text-xs font-medium">{s.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-xs text-gray-400">{s.count}</td>
                            <td className="py-3 px-3 text-xs text-gray-300">{fmt(s.revenue, currency)}</td>
                            <td className="py-3 px-3 text-xs text-gray-500">{fmt(s.cost, currency)}</td>
                            <td className="py-3 px-3 text-xs font-bold" style={{ color: s.color }}>{fmt(s.profit, currency)}</td>
                            <td className="py-3 pl-3 text-right">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.margin >= 60 ? "bg-emerald-500/15 text-emerald-400" :
                                s.margin >= 40 ? "bg-amber-500/15 text-amber-400" :
                                "bg-red-500/15 text-red-400"
                              }`}>{s.margin}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── WEEKLY TREND ── */}
              <div className="bg-[#0d1a30] border border-white/8 rounded-2xl p-6">
                <p className="text-[10px] text-[#10b981]/60 tracking-[2px] uppercase font-semibold mb-5">
                  8-Week Profit Trend
                </p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip content={<ChartTooltip currency={currency} />} />
                      <Line type="monotone" dataKey="profit" name="Net Profit"
                        stroke="#10b981" strokeWidth={2.5}
                        dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="revenue" name="Revenue"
                        stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2"
                        dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── TOP 3 CASES ── */}
              {topCases.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#10b981]/60 tracking-[2px] uppercase font-semibold mb-4">
                    Top Earning Cases
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {topCases.map((c, i) => {
                      const g = getProcedureGroup(c.actualProcedure);
                      return (
                        <div key={c.id} className="bg-[#0d1a30] border border-white/8 rounded-2xl p-5 relative overflow-hidden">
                          <div className="absolute top-3 right-3 text-2xl font-black text-white/5">
                            #{i + 1}
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: g.color }}>{g.label}</p>
                          </div>
                          <p className="font-semibold text-white text-sm truncate">{c.caseName}</p>
                          <p className="text-xs text-gray-500 mb-3">Tooth #{c.toothNumber}</p>
                          <p className="text-2xl font-black" style={{ color: g.color }}>
                            +{fmt(c.profit, currency)}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-1">
                            Margin: {c.revenue ? Math.round((c.profit / c.revenue) * 100) : 0}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── FULL CASE LIST ── */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <p className="text-[10px] text-[#10b981]/60 tracking-[2px] uppercase font-semibold">
                    All Cases ({filteredCases.length})
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Procedure filter */}
                    <select value={filterProc} onChange={e => setFilterProc(e.target.value)}
                      className="bg-[#0a1428] border border-white/10 text-gray-400 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#10b981]/50">
                      <option value="all">All procedures</option>
                      {PROCEDURE_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                    </select>
                    {/* Sort */}
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                      className="bg-[#0a1428] border border-white/10 text-gray-400 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#10b981]/50">
                      <option value="profit">Sort by Profit</option>
                      <option value="revenue">Sort by Revenue</option>
                      <option value="date">Sort by Date</option>
                    </select>
                  </div>
                </div>

                {filteredCases.length === 0 ? (
                  <div className="bg-[#0d1a30] border border-white/8 rounded-2xl p-16 text-center text-gray-600 text-sm">
                    No cases match this filter
                  </div>
                ) : (
                  <div className="bg-[#0d1a30] border border-white/8 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/8">
                            {["Case","Tooth","Procedure","Revenue","Cost","Profit","Margin","Status"].map(h => (
                              <th key={h} className="text-[10px] text-gray-600 uppercase tracking-wider px-4 py-3 text-left last:text-right">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCases.map(c => {
                            const g = getProcedureGroup(c.actualProcedure);
                            const margin = c.revenue ? Math.round((c.profit / c.revenue) * 100) : 0;
                            const isIP = c.profitStatus === "in-progress";
                            return (
                              <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="text-sm text-white font-medium">{c.caseName}</p>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-400">#{c.toothNumber}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                                    <span className="text-xs text-gray-300">{getProcedureDisplayName(c.actualProcedure)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-300">{fmt(c.revenue, currency)}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{fmt(c.cost, currency)}</td>
                                <td className="px-4 py-3 text-xs font-bold" style={{ color: g.color }}>+{fmt(c.profit, currency)}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    margin >= 60 ? "bg-emerald-500/15 text-emerald-400" :
                                    margin >= 40 ? "bg-amber-500/15 text-amber-400" :
                                    "bg-red-500/15 text-red-400"
                                  }`}>{margin}%</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isIP ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                                  }`}>{isIP ? "In Progress" : "Done"}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* ── RESET CONFIRMATION ── */}
              {showReset && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
                  <div className="bg-[#0d1a30] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M10 4v8M10 14.5v.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M3 17h14L10 3 3 17Z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">Reset Profit Tracker?</p>
                        <p className="text-xs text-gray-500">All settings will be permanently deleted.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowReset(false)}
                        className="flex-1 py-2.5 bg-white/8 hover:bg-white/15 rounded-xl text-sm font-semibold transition-all">
                        Cancel
                      </button>
                      <button onClick={handleReset} disabled={resetting}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                        {resetting ? "Resetting..." : "Yes, Reset"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}