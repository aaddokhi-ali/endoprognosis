// app/cases/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import Navigation from "../../components/navigation";
import ProtectedRoute from "../../components/protectedroute";

import { 
  calculateProfitForCase, 
  getProcedureDisplayName,
  isImpracticalCase 
} from "../../utils/profitCalculator";

interface CaseData {
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
  treatmentRec: string;
  treatmentStatus: string;
  followUpDate?: string;
  furtherNote?: string;
  survivalEstimate?: number;
  isPractical?: boolean;
  // Profit fields
  actualProcedure?: string;
  revenue?: number;
  cost?: number;
  profit?: number;
  feeMultiplier?: number;
  profitStatus?: "full" | "in-progress";
  [key: string]: any;
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [profitSettings, setProfitSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit states
  const [treatmentStatus, setTreatmentStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [furtherNote, setFurtherNote] = useState("");
  const [actualProcedureOverride, setActualProcedureOverride] = useState<string>("");

  const [profitResult, setProfitResult] = useState<any>(null);

  useEffect(() => {
    if (!user || !id) return;

    const fetchCaseAndSettings = async () => {
      try {
        const caseRef = doc(db, "cases", id as string);
        const caseSnap = await getDoc(caseRef);

        if (!caseSnap.exists()) {
          alert("Case not found");
          router.push("/mycases");
          return;
        }

        const data = caseSnap.data() as CaseData;
        setCaseData({ ...data, id: caseSnap.id });

        // Set edit form values
        setTreatmentStatus(data.treatmentStatus || "No Treatment");
        setFollowUpDate(data.followUpDate || "");
        setFurtherNote(data.furtherNote || "");
        setActualProcedureOverride(data.actualProcedure || "");

        // Fetch profit settings
        const settingsRef = doc(db, "users", user.uid, "settings", "profitSettings");
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          setProfitSettings(settingsSnap.data());
        }
      } catch (err) {
        console.error(err);
        alert("Failed to load case details");
      } finally {
        setLoading(false);
      }
    };

    fetchCaseAndSettings();
  }, [id, user, router]);

  // Re-calculate profit whenever status or procedure changes
  useEffect(() => {
    if (!caseData || !profitSettings) return;

    const result = calculateProfitForCase(
      caseData.treatmentRec || "",
      caseData.toothType || "",
      actualProcedureOverride || null,
      treatmentStatus,
      profitSettings,
      caseData.isPractical ?? true
    );

    setProfitResult(result);
  }, [treatmentStatus, actualProcedureOverride, caseData, profitSettings]);

  const handleSave = async () => {
    if (!caseData || !user) return;
    setSaving(true);

    try {
      const caseRef = doc(db, "cases", caseData.id);

      const updateData: any = {
        treatmentStatus,
        followUpDate: followUpDate || null,
        furtherNote: furtherNote.trim(),
        updatedAt: serverTimestamp(),
      };

      if (profitResult) {
        updateData.actualProcedure = profitResult.actualProcedure;
        updateData.revenue = profitResult.revenue;
        updateData.cost = profitResult.cost;
        updateData.profit = profitResult.profit;
        updateData.feeMultiplier = profitResult.feeMultiplier;
        updateData.profitStatus = profitResult.profitStatus;
        
        if (treatmentStatus === "Done" || treatmentStatus === "In-Progress") {
          updateData.completedAt = serverTimestamp();
        }
      }

      await updateDoc(caseRef, updateData);

      alert("✅ Case updated successfully!");
      router.push("/mycases");
    } catch (err) {
      console.error(err);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
          <p className="text-xl">Loading case details...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!caseData) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
          <p className="text-xl text-red-400">Case not found</p>
        </div>
      </ProtectedRoute>
    );
  }

  const isImpractical = isImpracticalCase(caseData.treatmentRec || "", caseData.isPractical ?? true);

  return (
    <ProtectedRoute>
      <Navigation />
      <div className="min-h-screen bg-[#0a1428] text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <button
            onClick={() => router.push("/mycases")}
            className="mb-6 text-gray-400 hover:text-white flex items-center gap-2"
          >
            ← Back to My Cases
          </button>

          <div className="bg-[#1e2937] rounded-3xl p-10">
            <h1 className="text-4xl font-bold mb-1">{caseData.caseName}</h1>
            
            {/* Phone Number Added */}
            {caseData.phoneNumber && (
              <p className="text-[#60a5fa] text-xl flex items-center gap-2 mb-6">
                📞 {caseData.phoneNumber}
              </p>
            )}

            <p className="text-[#60a5fa] text-2xl">
              Tooth #{caseData.toothNumber} • {caseData.toothType}
            </p>

            {/* ==================== RESEARCH / PREDICTOR INFORMATION ==================== */}
            <div className="mt-10 bg-[#0f172a] border border-gray-700 rounded-3xl p-8">
              <h3 className="text-xl font-semibold mb-6 text-gray-300">Predictor & Clinical Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-sm">
                <div>
                  <span className="text-gray-400 block">Gender / Age Group</span>
                  <p className="font-medium text-white mt-1">
                    {caseData.gender || "—"} • {caseData.ageGroup || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 block">ASA Classification</span>
                  <p className="font-medium text-white mt-1">{caseData.asa || "—"}</p>
                </div>

                <div>
                  <span className="text-gray-400 block">Pulpal Diagnosis</span>
                  <p className="font-medium text-white mt-1">{caseData.pulpalDiagnosis || "—"}</p>
                </div>

                <div>
                  <span className="text-gray-400 block">Periapical Diagnosis</span>
                  <p className="font-medium text-white mt-1">{caseData.periapicalDiagnosis || "—"}</p>
                </div>

                <div>
                  <span className="text-gray-400 block">Periodontal Status</span>
                  <p className="font-medium text-white mt-1">{caseData.periodontalStatus || "—"}</p>
                </div>

                <div>
                  <span className="text-gray-400 block">Survival Estimate</span>
                  <p className="font-medium text-white mt-1">
                    {caseData.survivalEstimate ? `${caseData.survivalEstimate}%` : "—"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <span className="text-gray-400 block mb-1">Remaining Tooth Structure</span>
                  <p className="font-medium text-white">
                    {caseData.remainingToothStructure || 
                     (caseData.remainingPercent !== undefined 
                       ? `${caseData.remainingPercent}% remaining` 
                       : "Not recorded")}
                  </p>
                </div>

                {caseData.affectingFactors && caseData.affectingFactors.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-gray-400 block mb-2">Affecting Factors / Predictors</span>
                    <div className="flex flex-wrap gap-2">
                      {caseData.affectingFactors.map((factor, i) => (
                        <span key={i} className="bg-gray-800 text-gray-300 text-xs px-4 py-1.5 rounded-full">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isImpractical && (
                <div className="mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-2xl text-red-400 text-sm">
                  ⚠️ This case was marked as <strong>Impractical to Retain</strong>. 
                  No automatic treatment recommendation was generated. You must manually select the actual procedure performed.
                </div>
              )}
            </div>

            {/* Treatment Status & Follow-up */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Treatment Status</label>
                <select
                  value={treatmentStatus}
                  onChange={(e) => setTreatmentStatus(e.target.value)}
                  className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-lg"
                >
                  <option value="No Treatment">No Treatment</option>
                  <option value="In-Progress">In Progress</option>
                  <option value="Done">Treatment Done</option>
                  <option value="Postpone">Postpone</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4"
                />
              </div>
            </div>

            {/* ==================== PROFIT CALCULATION SECTION ==================== */}
            {(treatmentStatus === "Done" || treatmentStatus === "In-Progress") && profitSettings && (
              <div className="mt-10 bg-[#0f172a] border border-gray-700 rounded-3xl p-8">
                <h3 className="text-xl font-semibold mb-6">💰 Profit Calculation</h3>

                {profitResult ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start bg-[#1e2937] p-6 rounded-2xl">
                      <div className="flex-1">
                        <p className="text-gray-400">Procedure</p>
                        <p className="text-2xl font-medium mt-1">{profitResult.procedureName}</p>
                        
                        {profitResult.isAutoDetected && (
                          <p className="text-emerald-400 text-sm mt-2">✓ Auto-detected from treatment recommendation</p>
                        )}
                        
                        {profitResult.requiresManualSelection && (
                          <p className="text-orange-400 text-sm mt-2">
                            ⚠️ Manual selection required (Impractical case or no clear recommendation)
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-4xl font-bold text-emerald-400">
                          +{profitResult.profit} {profitSettings.currency}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {profitResult.feeMultiplier === 0.5 && "50% (In Progress)"}
                          {profitResult.feeMultiplier === 1 && "Full Amount"}
                        </p>
                      </div>
                    </div>

                    {/* Manual Override */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Override / Select Procedure {profitResult.requiresManualSelection && "(Required)"}
                      </label>
                      <select
                        value={actualProcedureOverride}
                        onChange={(e) => setActualProcedureOverride(e.target.value)}
                        className="w-full bg-[#1e2937] border border-gray-600 rounded-2xl p-4"
                      >
                        <option value="">Use Auto-Detected (if available)</option>
                        <option value="rct-anterior">Root Canal Treatment – Anterior</option>
                        <option value="rct-premolar">Root Canal Treatment – Premolar</option>
                        <option value="rct-molar">Root Canal Treatment – Molar</option>
                        <option value="retreat-anterior">Root Canal Retreatment – Anterior</option>
                        <option value="retreat-premolar">Root Canal Retreatment – Premolar</option>
                        <option value="retreat-molar">Root Canal Retreatment – Molar</option>
                        <option value="vpt">Vital Pulp Therapy</option>
                        <option value="apico">Endodontic Microsurgery (Apicoectomy)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-yellow-400">Could not calculate profit. Please select a procedure manually above.</p>
                )}
              </div>
            )}

            {/* Further Note */}
            <div className="mt-10">
              <label className="block text-sm text-gray-400 mb-2">Further Clinical Notes</label>
              <textarea
                value={furtherNote}
                onChange={(e) => setFurtherNote(e.target.value)}
                className="w-full bg-[#0f172a] border border-gray-600 rounded-3xl p-6 h-40 resize-y"
                placeholder="Add any observations, complications, patient feedback, or additional clinical notes..."
              />
            </div>

            <div className="mt-10 flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#10b981] hover:bg-[#0ea46c] py-5 rounded-2xl font-bold text-xl disabled:opacity-70"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>

              <button
                onClick={() => router.push("/mycases")}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-5 rounded-2xl font-bold text-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}