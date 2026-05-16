// app/components/ProfitSetupWizard.tsx
"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";

interface ProcedurePrice {
  revenue: number;
  cost: number;
}

interface ProfitSettings {
  currency: "SAR" | "USD";
  procedures: {
    [key: string]: ProcedurePrice;
  };
  activated: boolean;
  activatedAt: string;
  // New fields for workload and goals
  patientsPerDay: number;
  hoursPerWeek: number;
  monthlyTarget?: number; // optional
}

const defaultProcedures = {
  "rct-anterior": { revenue: 900, cost: 250 },
  "rct-premolar": { revenue: 1000, cost: 300 },
  "rct-molar": { revenue: 1500, cost: 450 },
  "retreat-anterior": { revenue: 1000, cost: 350 },
  "retreat-premolar": { revenue: 1200, cost: 400 },
  "retreat-molar": { revenue: 2000, cost: 600 },
  "vpt": { revenue: 700, cost: 200 },
  "apico": { revenue: 2500, cost: 800 },
} as const;

export default function ProfitSetupWizard({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<"SAR" | "USD">("SAR");
  const [prices, setPrices] = useState<{ [key: string]: ProcedurePrice }>({ ...defaultProcedures });
  const [patientsPerDay, setPatientsPerDay] = useState<number>(8);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(40);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handlePriceChange = (key: string, field: "revenue" | "cost", value: number) => {
    setPrices(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const saveSettings = async () => {
    if (!user) return;
    setLoading(true);

    const settings: ProfitSettings = {
      currency,
      procedures: prices,
      activated: true,
      activatedAt: new Date().toISOString(),
      patientsPerDay: patientsPerDay,
      hoursPerWeek: hoursPerWeek,
      monthlyTarget: monthlyTarget > 0 ? monthlyTarget : undefined,
    };

    try {
      await setDoc(doc(db, "users", user.uid, "settings", "profitSettings"), settings);
      alert("✅ Profit Tracker activated successfully!");
      onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4">
      <div className="bg-[#1e2937] rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-auto">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-center mb-2">Activate Profit Tracker</h2>
          <p className="text-gray-400 text-center mb-8">
            Set your prices once. The system will automatically calculate profit when you mark cases as "Done".
          </p>

          {/* Currency Selection */}
          <div className="mb-8">
            <label className="block text-sm text-gray-400 mb-3">Choose Currency</label>
            <div className="flex gap-4">
              <button
                onClick={() => setCurrency("SAR")}
                className={`flex-1 py-4 rounded-2xl font-semibold ${currency === "SAR" ? "bg-[#10b981] text-black" : "bg-gray-700 hover:bg-gray-600"}`}
              >
                SAR (Saudi Riyal)
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`flex-1 py-4 rounded-2xl font-semibold ${currency === "USD" ? "bg-[#10b981] text-black" : "bg-gray-700 hover:bg-gray-600"}`}
              >
                USD (US Dollar)
              </button>
            </div>
          </div>

          {/* Price Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Set Your Prices</h3>
            <div className="space-y-4 max-h-[420px] overflow-auto pr-2">
              {Object.entries(defaultProcedures).map(([key, defaultVal]) => (
                <div key={key} className="flex items-center gap-4 bg-[#0f172a] p-4 rounded-2xl">
                  <div className="flex-1 font-medium">
                    {key === "rct-anterior" && "Root Canal Treatment – Anterior"}
                    {key === "rct-premolar" && "Root Canal Treatment – Premolar"}
                    {key === "rct-molar" && "Root Canal Treatment – Molar"}
                    {key === "retreat-anterior" && "Root Canal Retreatment – Anterior"}
                    {key === "retreat-premolar" && "Root Canal Retreatment – Premolar"}
                    {key === "retreat-molar" && "Root Canal Retreatment – Molar"}
                    {key === "vpt" && "Vital Pulp Therapy"}
                    {key === "apico" && "Endodontic Microsurgery (Apicoectomy)"}
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      value={prices[key].revenue}
                      onChange={(e) => handlePriceChange(key, "revenue", Number(e.target.value))}
                      className="w-full bg-[#1e2937] border border-gray-600 rounded-xl p-3 text-center"
                      placeholder="Revenue"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">Revenue ({currency})</p>
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      value={prices[key].cost}
                      onChange={(e) => handlePriceChange(key, "cost", Number(e.target.value))}
                      className="w-full bg-[#1e2937] border border-gray-600 rounded-xl p-3 text-center"
                      placeholder="Cost"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">Avg. Cost ({currency})</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Section: Workload & Goals */}
          <div className="mb-8 bg-[#0f172a] p-6 rounded-3xl">
            <h3 className="text-lg font-semibold mb-6">Your Workload & Goals</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Average patients seen per day</label>
                <input
                  type="number"
                  value={patientsPerDay}
                  onChange={(e) => setPatientsPerDay(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#1e2937] border border-gray-600 rounded-2xl p-4 text-center text-xl"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Hours worked per week</label>
                <input
                  type="number"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#1e2937] border border-gray-600 rounded-2xl p-4 text-center text-xl"
                  min="1"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm text-gray-400 mb-2">
                Monthly Profit Target (optional)
              </label>
              <div className="flex">
                <input
                  type="number"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                  className="flex-1 bg-[#1e2937] border border-gray-600 rounded-2xl p-4 text-center text-xl"
                  placeholder="e.g. 45000"
                />
                <div className="ml-3 flex items-center text-gray-400 font-medium px-4 bg-[#1e2937] border border-gray-600 rounded-2xl">
                  {currency}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">This will help us show your progress toward your goal.</p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={loading}
            className="w-full py-5 bg-[#10b981] hover:bg-[#0ea46c] text-black font-bold rounded-2xl text-xl disabled:opacity-50"
          >
            {loading ? "Saving Settings..." : "Activate Profit Tracker"}
          </button>
        </div>
      </div>
    </div>
  );
}