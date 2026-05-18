// app/profit-tracker/page.tsx
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  deleteDoc 
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import ProfitSetupWizard from "../components/ProfitSetupWizard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getProcedureDisplayName } from "../utils/profitCalculator";

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
}

interface ProfitSettings {
  currency: "SAR" | "USD";
  procedures: Record<string, { revenue: number; cost: number }>;
}

export default function ProfitTrackerPage() {
  const { user } = useAuth();
  const [profitCases, setProfitCases] = useState<ProfitCase[]>([]);
  const [profitSettings, setProfitSettings] = useState<ProfitSettings | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Check Profit Settings
  useEffect(() => {
    if (!user) return;

    const checkSettings = async () => {
      try {
        const settingsRef = doc(db, "users", user.uid, "settings", "profitSettings");
        const snap = await getDoc(settingsRef);

        if (!snap.exists()) {
          setShowSetup(true);
        } else {
          setShowSetup(false);
          setProfitSettings(snap.data() as ProfitSettings);
        }
      } catch (err) {
        console.error("Error checking profit settings:", err);
      }
    };

    checkSettings();
  }, [user]);

  // 2. Fetch Both Done + In-Progress Cases
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "cases"),
      where("userId", "==", user.uid),
      where("treatmentStatus", "in", ["Done", "In-Progress"]),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const casesList: ProfitCase[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const actualProcedure = data.actualProcedure;

        if (!actualProcedure) return;

        let revenue = Number(data.revenue) || 0;
        let cost = Number(data.cost) || 0;
        let profit = Number(data.profit) || 0;
        const feeMultiplier = data.feeMultiplier || 1;
        const profitStatus = data.profitStatus || (data.treatmentStatus === "Done" ? "full" : "in-progress");

        casesList.push({
          id: docSnap.id,
          caseName: data.caseName || "Unnamed Case",
          toothNumber: data.toothNumber || "—",
          actualProcedure,
          revenue,
          cost,
          profit,
          feeMultiplier,
          profitStatus,
          completedAt: data.completedAt || data.updatedAt,
        });
      });

      setProfitCases(casesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Totals with subtotals
  const totals = useMemo(() => {
    const full = profitCases.filter(c => c.profitStatus === "full");
    const inProgress = profitCases.filter(c => c.profitStatus === "in-progress");

    return {
      totalRevenue: profitCases.reduce((sum, c) => sum + c.revenue, 0),
      totalCost: profitCases.reduce((sum, c) => sum + c.cost, 0),
      totalProfit: profitCases.reduce((sum, c) => sum + c.profit, 0),
      fullCases: full.length,
      fullProfit: full.reduce((sum, c) => sum + c.profit, 0),
      inProgressCases: inProgress.length,
      inProgressProfit: inProgress.reduce((sum, c) => sum + c.profit, 0),
    };
  }, [profitCases]);

  const monthlyProfitData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return { 
        date: date.toISOString().split('T')[0], 
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        profit: 0 
      };
    });

    profitCases.forEach(c => {
      if (c.completedAt) {
        const completedDate = c.completedAt?.seconds 
          ? new Date(c.completedAt.seconds * 1000) 
          : new Date(c.completedAt);
        
        const dateStr = completedDate.toISOString().split('T')[0];
        const dayData = last30Days.find(d => d.date === dateStr);
        if (dayData) dayData.profit += c.profit;
      }
    });

    return last30Days;
  }, [profitCases]);

  const averageDailyProfit = useMemo(() => {
    return profitCases.length === 0 ? 0 : Math.round(totals.totalProfit / 30);
  }, [profitCases, totals.totalProfit]);

  // ==================== REAL PDF EXPORT ====================
  const exportToPDF = async () => {
    if (profitCases.length === 0) {
      alert("No cases to export yet!");
      return;
    }

    setIsExporting(true);

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = document.createElement("div");
      element.style.fontFamily = "system-ui, -apple-system, sans-serif";
      element.style.padding = "40px";
      element.style.background = "#0a1428";
      element.style.color = "#ffffff";
      element.style.maxWidth = "1000px";
      element.style.margin = "0 auto";

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; margin: 0;">Profit Tracker Report</h1>
          <p style="color: #60a5fa; margin: 8px 0 0 0;">Generated on ${new Date().toLocaleDateString('en-GB')}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 50px;">
          <div style="background: #1e2937; padding: 25px; border-radius: 16px; text-align: center;">
            <p style="color: #34d399; font-size: 14px; margin: 0;">TOTAL NET PROFIT</p>
            <p style="font-size: 28px; font-weight: bold; margin: 12px 0 0 0;">
              ${totals.totalProfit.toLocaleString()} ${profitSettings?.currency || 'SAR'}
            </p>
          </div>
          <div style="background: #1e2937; padding: 25px; border-radius: 16px; text-align: center;">
            <p style="color: #60a5fa; font-size: 14px; margin: 0;">COMPLETED CASES</p>
            <p style="font-size: 28px; font-weight: bold; margin: 12px 0 0 0;">
              ${totals.fullProfit.toLocaleString()} ${profitSettings?.currency || 'SAR'}
            </p>
            <p style="font-size: 13px; color: #94a3b8;">${totals.fullCases} cases (100%)</p>
          </div>
          <div style="background: #1e2937; padding: 25px; border-radius: 16px; text-align: center;">
            <p style="color: #fb923c; font-size: 14px; margin: 0;">IN PROGRESS (50%)</p>
            <p style="font-size: 28px; font-weight: bold; margin: 12px 0 0 0;">
              ${totals.inProgressProfit.toLocaleString()} ${profitSettings?.currency || 'SAR'}
            </p>
            <p style="font-size: 13px; color: #94a3b8;">${totals.inProgressCases} cases</p>
          </div>
        </div>

        <h2 style="font-size: 22px; margin-bottom: 20px; color: #e2e8f0;">Recent Cases</h2>
        <table style="width: 100%; border-collapse: collapse; background: #1e2937; border-radius: 12px; overflow: hidden;">
          <thead>
            <tr style="background: #0f172a;">
              <th style="padding: 16px; text-align: left; border-bottom: 1px solid #334155;">Case Name</th>
              <th style="padding: 16px; text-align: left; border-bottom: 1px solid #334155;">Tooth</th>
              <th style="padding: 16px; text-align: left; border-bottom: 1px solid #334155;">Procedure</th>
              <th style="padding: 16px; text-align: right; border-bottom: 1px solid #334155;">Profit</th>
            </tr>
          </thead>
          <tbody>
            ${profitCases.slice(0, 15).map(c => `
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 16px;">${c.caseName}</td>
                <td style="padding: 16px;">#${c.toothNumber}</td>
                <td style="padding: 16px;">${getProcedureDisplayName(c.actualProcedure)}</td>
                <td style="padding: 16px; text-align: right; font-weight: bold; color: ${c.profitStatus === 'in-progress' ? '#fb923c' : '#34d399'}">
                  +${c.profit} ${profitSettings?.currency || 'SAR'}
                  ${c.profitStatus === 'in-progress' ? ' (50%)' : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="text-align: center; margin-top: 40px; color: #64748b; font-size: 14px;">
          Endoprognosis Profit Tracker • ${new Date().getFullYear()}
        </p>
      `;

      const opt = {
        margin: [20, 20, 20, 20] as [number, number, number, number],
        filename: `Profit_Tracker_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { 
          type: "jpeg" as const,
          quality: 0.98 
        },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#0a1428' 
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' as const 
        }
      };

      await html2pdf().from(element).set(opt).save();

      alert("✅ Profit Tracker Report downloaded successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset function
  const handleReset = async () => {
    if (!user) return;
    if (!confirm("⚠️ Are you sure you want to completely reset Profit Tracker?\n\nAll settings and data will be deleted.")) {
      return;
    }

    try {
      const settingsRef = doc(db, "users", user.uid, "settings", "profitSettings");
      await deleteDoc(settingsRef);
      alert("✅ Profit Tracker has been reset.");
      window.location.reload();
    } catch (err) {
      console.error("Reset failed:", err);
      alert("Failed to reset. Please try again.");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center text-xl">Loading Profit Tracker...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">💰 Profit Tracker</h1>
              <p className="text-gray-400">Real-time earnings • Done + In-Progress cases</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={exportToPDF} 
                disabled={isExporting}
                className="px-6 py-3.5 bg-[#1e2937] hover:bg-gray-700 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 text-sm sm:text-base"
              >
                {isExporting ? "Generating PDF..." : "📄 Export PDF Report"}
              </button>
              <button 
                onClick={handleReset} 
                className="px-6 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-sm sm:text-base"
              >
                Reset Tracker
              </button>
            </div>
          </div>

          {showSetup ? (
            <ProfitSetupWizard onComplete={() => window.location.reload()} />
          ) : (
            <div className="space-y-10 sm:space-y-12">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 sm:p-8">
                  <p className="text-emerald-400 text-sm">TOTAL NET PROFIT</p>
                  <p className="text-4xl sm:text-5xl font-bold mt-4">{totals.totalProfit.toLocaleString()} {profitSettings?.currency}</p>
                </div>
                <div className="bg-gradient-to-br from-sky-600/10 to-sky-500/10 border border-sky-500/30 rounded-3xl p-6 sm:p-8">
                  <p className="text-sky-400 text-sm">Completed Cases</p>
                  <p className="text-4xl sm:text-5xl font-bold mt-4 text-sky-400">{totals.fullProfit.toLocaleString()} {profitSettings?.currency}</p>
                  <p className="text-sm text-gray-400 mt-2">{totals.fullCases} cases (100%)</p>
                </div>
                <div className="bg-gradient-to-br from-orange-600/10 to-orange-500/10 border border-orange-500/30 rounded-3xl p-6 sm:p-8">
                  <p className="text-orange-400 text-sm">In Progress (50%)</p>
                  <p className="text-4xl sm:text-5xl font-bold mt-4 text-orange-400">{totals.inProgressProfit.toLocaleString()} {profitSettings?.currency}</p>
                  <p className="text-sm text-gray-400 mt-2">{totals.inProgressCases} cases (50% fee)</p>
                </div>
              </div>

              {/* Monthly Chart */}
              <div className="bg-[#1e2937] rounded-3xl p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6">Profit Trend (Last 30 Days)</h2>
                <div className="h-80 sm:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyProfitData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="day" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e2937', border: 'none', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cases List */}
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-6">All Cases Contributing to Profit</h2>
                
                {profitCases.length === 0 ? (
                  <div className="bg-[#1e2937] rounded-3xl p-16 text-center">
                    <p className="text-xl text-gray-400">No completed or in-progress cases yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profitCases.map((c) => {
                      const isInProgress = c.profitStatus === "in-progress";
                      return (
                        <div 
                          key={c.id} 
                          className={`bg-[#1e2937] rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 transition-all ${
                            isInProgress ? 'border-l-4 border-orange-500' : 'border-l-4 border-emerald-500'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="font-semibold text-lg">{c.caseName}</div>
                              {isInProgress && (
                                <span className="px-3 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full">
                                  50% IN PROGRESS
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400">
                              Tooth #{c.toothNumber} • {getProcedureDisplayName(c.actualProcedure)}
                            </div>
                          </div>

                          <div className="text-right sm:text-right">
                            <div className={`text-2xl font-bold ${isInProgress ? 'text-orange-400' : 'text-emerald-400'}`}>
                              +{c.profit} {profitSettings?.currency}
                              {isInProgress && <span className="text-sm ml-2">(50%)</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              Rev: {c.revenue} | Cost: {c.cost}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}