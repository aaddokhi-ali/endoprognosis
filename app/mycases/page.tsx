// app/mycases/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc 
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";

interface SavedCase {
  id: string;
  caseName: string;
  phoneNumber: string;
  gender: string;
  ageGroup: string;
  asa: string;
  toothNumber: string;
  toothType: string;
  pulpalDiagnosis: string;
  periapicalDiagnosis: string;
  periodontalStatus: string;
  survivalEstimate: number;
  treatmentRec: string;
  isPractical: boolean;
  affectingFactors: string[];
  furtherNote: string;
  treatmentStatus: string;
  followUpDate: string | null;
  createdAt: any;
  savedAt: string;

  remainingToothStructure?: string;
  remainingPercent?: number;
  patientInputs?: {
    remainingPercent?: number;
    parts?: any;
    ferruleWalls?: any;
    oralHygiene?: string;
    perio?: string;
    [key: string]: any;
  };

  type?: string;
  classification?: string;
  iowaStage?: string;
  isVRF?: boolean;
  successRate?: string;
}

export default function MyCases() {
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavedCase>>({});
  const [activeTab, setActiveTab] = useState<"All" | "Crack Cases" | "No Treatment" | "In-Progress" | "Done" | "Postpone">("All");

  const { user } = useAuth();

  const ageGroups = ["<20", "20-30", "31-40", "41-50", "51-60", "61-70", ">70"];
  const asaOptions = ["I", "II", "III", "IV"];
  const perioOptions = ["None", "Localized", "Generalized"];
  const genderOptions = ["Male", "Female"];

  useEffect(() => {
    if (!user) {
      setError("Please log in to view your cases.");
      setLoading(false);
      return;
    }

    const fetchCases = async () => {
      try {
        setLoading(true);
        setError(null);

        const q = query(
          collection(db, "cases"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const casesList: SavedCase[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          casesList.push({
            id: doc.id,
            ...data,
            treatmentStatus: data.treatmentStatus || "No Treatment",
            followUpDate: data.followUpDate || null,
            affectingFactors: data.affectingFactors || [],
            type: data.type || "predictor",
          } as SavedCase);
        });

        setCases(casesList);
      } catch (err: any) {
        console.error("Error fetching cases:", err);
        setError("Failed to load your cases. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [user]);

  const filteredCases = useMemo(() => {
    let result = cases;

    result = result.map((c) => {
      if (c.type === "crack-classifier") return c;

      const factors = Array.isArray(c.affectingFactors) ? [...c.affectingFactors] : [];

      const remainingPercent = 
        c.patientInputs?.remainingPercent ?? 
        c.remainingPercent ?? 
        100;

      const missingPercent = 100 - remainingPercent;
      const ferruleWalls = c.patientInputs?.ferruleWalls || {};
      const ferruleCount = Object.values(ferruleWalls).filter(Boolean).length;

      let structureText = "";

      if (missingPercent > 0) {
        structureText = `${missingPercent}% loss of tooth structure`;

        if (ferruleCount === 0) {
          structureText += ` with no ferrule effect`;
        } else if (ferruleCount === 1) {
          structureText += ` with no ferrule at one side`;
        } else if (ferruleCount < 3) {
          structureText += ` with insufficient ferrule`;
        }
      } else {
        structureText = `Adequate remaining tooth structure`;
      }

      if (!factors.some(f => f.includes("loss of tooth structure") || f.includes("Remaining tooth structure"))) {
        factors.unshift(structureText);
      }

      const hygieneIndex = factors.findIndex(f => 
        f.toLowerCase().includes("oral hygiene") || 
        f.toLowerCase().includes("hygiene")
      );

      if (hygieneIndex !== -1) {
        factors[hygieneIndex] = "Non-compliance with oral hygiene measures";
      }

      return {
        ...c,
        affectingFactors: factors
      };
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();

      result = result.filter(c => {
        const searchableText = [
          c.caseName,
          c.phoneNumber,
          c.toothNumber,
          c.pulpalDiagnosis,
          c.periapicalDiagnosis,
          c.periodontalStatus,
          c.classification,
          c.iowaStage,
          c.remainingToothStructure,
          ...(c.affectingFactors || [])
        ].join(" ").toLowerCase();

        if (searchableText.includes(term)) return true;

        if (term.includes("vrf") || term.includes("vertical")) return c.isVRF === true;
        if (term.includes("cof") || term.includes("crown")) {
          return c.isVRF === false && c.type === "crack-classifier";
        }

        return false;
      });
    }

    if (activeTab === "Crack Cases") {
      result = result.filter(c => c.type === "crack-classifier");
    } else if (activeTab !== "All") {
      result = result.filter(c => c.treatmentStatus === activeTab);
    }

    return result;
  }, [cases, searchTerm, activeTab]);

  const categorizedCases = useMemo(() => {
    const groups: { [key: string]: SavedCase[] } = {
      "Root Canal Treatment (RCT)": [],
      "Root Canal Retreatment (RCreT)": [],
      "Endodontic Microsurgery (Apico)": [],
      "Vital Pulp Therapy (VPT)": [],
      "Other": []
    };

    filteredCases.forEach((c) => {
      if (c.type === "crack-classifier") return;

      const tr = (c.treatmentRec || "").toLowerCase();
      if (tr.includes("root canal treatment") || tr.includes("rct")) {
        groups["Root Canal Treatment (RCT)"].push(c);
      } else if (tr.includes("retreatment") || tr.includes("rcret")) {
        groups["Root Canal Retreatment (RCreT)"].push(c);
      } else if (tr.includes("microsurgery") || tr.includes("apico")) {
        groups["Endodontic Microsurgery (Apico)"].push(c);
      } else if (tr.includes("vital pulp") || tr.includes("vpt")) {
        groups["Vital Pulp Therapy (VPT)"].push(c);
      } else {
        groups["Other"].push(c);
      }
    });

    return Object.fromEntries(
      Object.entries(groups).filter(([_, list]) => list.length > 0)
    );
  }, [filteredCases]);

   // ==================== EDIT & DELETE FUNCTIONS ====================

  const startEditing = (c: SavedCase) => {
    setEditingId(c.id);
    setEditForm({
      caseName: c.caseName,
      phoneNumber: c.phoneNumber,
      treatmentStatus: c.treatmentStatus || "No Treatment",
      followUpDate: c.followUpDate || "",
      furtherNote: c.furtherNote || "",
      gender: c.gender,
      ageGroup: c.ageGroup,
      asa: c.asa,
      periodontalStatus: c.periodontalStatus || "",
    });
  };

  const saveEdit = async (caseId: string) => {
    if (!user) {
      alert("You must be logged in to edit cases.");
      return;
    }

    try {
      const caseRef = doc(db, "cases", caseId);
      
      const updateData = {
        caseName: editForm.caseName || "",
        phoneNumber: editForm.phoneNumber || "",
        treatmentStatus: editForm.treatmentStatus || "No Treatment",
        followUpDate: editForm.followUpDate || null,
        furtherNote: editForm.furtherNote || "",
        gender: editForm.gender || "",
        ageGroup: editForm.ageGroup || "",
        asa: editForm.asa || "",
        periodontalStatus: editForm.periodontalStatus || "",
        updatedAt: new Date(),
      };

      await updateDoc(caseRef, updateData);

      setCases(prev => prev.map(c => 
        c.id === caseId ? { ...c, ...updateData } : c
      ));

      setEditingId(null);
      setEditForm({});
      alert("✅ Case updated successfully!");
    } catch (err: any) {
      console.error("Update failed:", err);
      if (err.code === "permission-denied") {
        alert("Permission denied. Please log in again.");
      } else {
        alert("Failed to update case. Please check console.");
      }
    }
  };

  const deleteCase = async (caseId: string) => {
    if (!confirm("Are you sure you want to permanently delete this case?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "cases", caseId));
      setCases(prev => prev.filter(c => c.id !== caseId));
      alert("Case deleted successfully.");
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert("Failed to delete case. Please try again.");
    }
  };

  const shareViaWhatsApp = (c: SavedCase) => {
    let text = `Endoprognosis Case:\nPatient: ${c.caseName}\nPhone: ${c.phoneNumber}\nTooth: #${c.toothNumber}`;

    if (c.type === "crack-classifier") {
      text += `\nClassification: ${c.classification || "—"}\nIowa Stage: ${c.iowaStage || "—"}`;
    } else {
      text += `\nDiagnosis: ${c.pulpalDiagnosis} with ${c.periapicalDiagnosis}\nSurvival: ${c.survivalEstimate}%`;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareViaEmail = (c: SavedCase) => {
    const subject = `Endoprognosis Case - ${c.caseName}`;
    let body = `Patient: ${c.caseName}\nPhone: ${c.phoneNumber}\nTooth: #${c.toothNumber}\n`;

    if (c.type === "crack-classifier") {
      body += `Classification: ${c.classification || "—"}\nIowa Stage: ${c.iowaStage || "—"}\n`;
    } else {
      body += `Diagnosis: ${c.pulpalDiagnosis} with ${c.periapicalDiagnosis}\nSurvival Estimate: ${c.survivalEstimate}%\n`;
    }

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (!user) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-[#0a1428] text-white flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl mb-4">Please Log In</h2>
            <p>You need to be logged in to view your saved cases.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const totalCases = cases.length;
  const crackCasesCount = cases.filter(c => c.type === "crack-classifier").length;

  return (
    <ProtectedRoute>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold">My Saved Cases 📋</h1>
              <p className="text-gray-400 mt-1">{totalCases} {totalCases === 1 ? "case" : "cases"} total</p>
              {crackCasesCount > 0 && (
                <p className="text-sm text-emerald-400 mt-1">{crackCasesCount} Crack Tooth Cases</p>
              )}
            </div>

            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Search by name, phone, tooth, diagnosis, classification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1e2937] border border-gray-600 rounded-2xl pl-12 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#0f6cbd]"
              />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-10 border-b border-gray-700 pb-4">
            {["All", "Crack Cases", "No Treatment", "In-Progress", "Done", "Postpone"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
                  activeTab === tab 
                    ? "bg-[#0f6cbd] text-white" 
                    : "bg-[#1e2937] hover:bg-gray-700 text-gray-300"
                }`}
              >
                {tab === "Crack Cases" ? "🦷 Crack Tooth Cases" : tab}
              </button>
            ))}
          </div>

          {loading && <p className="text-center text-xl py-20">Loading your cases...</p>}

          {error && (
            <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 p-6 rounded-2xl text-center mb-8">
              {error}
              <button onClick={() => window.location.reload()} className="mt-4 underline hover:text-white block">
                Refresh Page
              </button>
            </div>
          )}

          {!loading && !error && filteredCases.length === 0 && (
            <div className="text-center py-20">
              <p className="text-2xl mb-4">No matching cases found</p>
            </div>
          )}

          {/* ==================== CRACK CASES SECTION ==================== */}
          {activeTab === "Crack Cases" && filteredCases.length > 0 && (
            <div className="mb-16">
              <h2 className="text-3xl font-semibold mb-8 flex items-center gap-3">
                🦷 Crack Tooth Cases 
                <span className="text-gray-400 text-lg font-normal">({filteredCases.length})</span>
              </h2>

              <div className="grid gap-6">
                {filteredCases.map((c) => (
                  <div 
                    key={c.id} 
                    className="bg-[#1e2937] rounded-3xl p-8 border border-gray-700 hover:border-red-500 transition-all duration-300"
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-8">
                      <div className="flex-1">
                        {editingId === c.id ? (
                          <>
                            <input
                              type="text"
                              value={editForm.caseName || ""}
                              onChange={(e) => setEditForm({ ...editForm, caseName: e.target.value })}
                              className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white text-2xl font-bold mb-3"
                            />
                            <input
                              type="tel"
                              value={editForm.phoneNumber || ""}
                              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                              className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-3 text-white mb-4"
                              placeholder="Phone Number"
                            />
                          </>
                        ) : (
                          <>
                            <h3 className="text-3xl font-bold">{c.caseName}</h3>
                            <p className="text-[#60a5fa] text-xl font-medium mt-2 flex items-center gap-2">
                              📞 {c.phoneNumber}
                            </p>
                            <p className="text-gray-400 mt-3 text-lg">
                              Tooth #{c.toothNumber} • {c.toothType || "—"}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="inline-block bg-red-500/10 border border-red-500/30 rounded-2xl px-6 py-4 min-w-[200px]">
                          <p className="text-red-400 text-xs font-medium tracking-widest uppercase">Crack Classification</p>
                          <div className="text-4xl font-bold text-white mt-2">
                            {c.classification || "Not Classified"}
                          </div>
                          {c.iowaStage && (
                            <p className="text-emerald-400 mt-1">Iowa Stage: {c.iowaStage}</p>
                          )}
                        </div>

                        {c.isVRF !== undefined && (
                          <div className={`mt-4 inline-block px-5 py-2 rounded-full text-sm font-semibold ${
                            c.isVRF ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                          }`}>
                            {c.isVRF ? "⚠️ VRF Suspected" : "✅ No VRF"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                      <div>
                        <span className="text-gray-400 block mb-1">Gender / Age</span>
                        {editingId === c.id ? (
                          <div className="flex gap-2">
                            <select
                              value={editForm.gender || ""}
                              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                              className="bg-[#0f172a] border border-gray-600 rounded-xl p-2 text-white flex-1"
                            >
                              <option value="">Gender</option>
                              {genderOptions.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                            <select
                              value={editForm.ageGroup || ""}
                              onChange={(e) => setEditForm({ ...editForm, ageGroup: e.target.value })}
                              className="bg-[#0f172a] border border-gray-600 rounded-xl p-2 text-white flex-1"
                            >
                              <option value="">Age Group</option>
                              {ageGroups.map(age => (
                                <option key={age} value={age}>{age}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <p className="font-medium">{c.gender}, {c.ageGroup}</p>
                        )}
                      </div>

                      <div>
                        <span className="text-gray-400 block mb-1">ASA</span>
                        {editingId === c.id ? (
                          <select
                            value={editForm.asa || ""}
                            onChange={(e) => setEditForm({ ...editForm, asa: e.target.value })}
                            className="w-full bg-[#0f172a] border border-gray-600 rounded-xl p-2 text-white"
                          >
                            <option value="">Select ASA</option>
                            {asaOptions.map(asa => (
                              <option key={asa} value={asa}>ASA {asa}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="font-medium">{c.asa}</p>
                        )}
                      </div>

                      <div>
                        <span className="text-gray-400 block mb-1">Perio Status</span>
                        {editingId === c.id ? (
                          <select
                            value={editForm.periodontalStatus || ""}
                            onChange={(e) => setEditForm({ ...editForm, periodontalStatus: e.target.value })}
                            className="w-full bg-[#0f172a] border border-gray-600 rounded-xl p-2 text-white"
                          >
                            <option value="">Select Status</option>
                            {perioOptions.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="font-medium">{c.periodontalStatus || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Treatment Status</label>
                        {editingId === c.id ? (
                          <select
                            value={editForm.treatmentStatus || "No Treatment"}
                            onChange={(e) => setEditForm({ ...editForm, treatmentStatus: e.target.value })}
                            className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-3"
                          >
                            <option value="No Treatment">No Treatment</option>
                            <option value="In-Progress">In Progress</option>
                            <option value="Done">Treatment Done</option>
                            <option value="Postpone">Postpone</option>
                          </select>
                        ) : (
                          <p className="font-medium text-lg">{c.treatmentStatus || "No Treatment"}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Follow-up Date</label>
                        {editingId === c.id ? (
                          <input
                            type="date"
                            value={editForm.followUpDate || ""}
                            onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                            className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-3"
                          />
                        ) : (
                          <p className="font-medium">
                            {c.followUpDate 
                              ? new Date(c.followUpDate).toLocaleDateString() 
                              : "Not set"}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-400 mb-2">Further Note</label>
                        {editingId === c.id ? (
                          <textarea
                            value={editForm.furtherNote || ""}
                            onChange={(e) => setEditForm({ ...editForm, furtherNote: e.target.value })}
                            className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 h-24 resize-y"
                            placeholder="Add clinical notes or observations..."
                          />
                        ) : (
                          <p className="text-gray-300 italic">
                            {c.furtherNote || "No notes added"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 text-xs text-gray-500 border-t border-gray-700 pt-4">
                      Added on: {c.createdAt ? 
                        new Date(c.createdAt.seconds * 1000).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        }) : "Unknown date"}
                    </div>

                    <div className="mt-8 flex gap-4">
                      {editingId === c.id ? (
                        <>
                          <button 
                            onClick={() => saveEdit(c.id)} 
                            className="flex-1 bg-[#10b981] hover:bg-[#0ea46c] py-4 rounded-2xl font-semibold"
                          >
                            Save Changes
                          </button>
                          <button 
                            onClick={() => { setEditingId(null); setEditForm({}); }} 
                            className="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl font-semibold"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => deleteCase(c.id)} 
                            className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-semibold text-white"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => startEditing(c)} 
                          className="flex-1 bg-[#0f6cbd] hover:bg-[#0a5a9c] py-4 rounded-2xl font-semibold"
                        >
                          Edit Case
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== PREDICTOR CASES SECTION ==================== */}
          {activeTab !== "Crack Cases" && Object.entries(categorizedCases).map(([category, caseList]) => (
            <div key={category} className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3 border-b border-gray-700 pb-3">
                {category.includes("RCT") && "🦷"}
                {category.includes("RCreT") && "🔄"}
                {category.includes("Apico") && "🔬"}
                {category.includes("VPT") && "🌱"}
                {category.includes("Other") && "📁"}
                {category} 
                <span className="text-gray-400 text-lg font-normal">({caseList.length})</span>
              </h2>

              <div className="grid gap-6">
                {caseList.map((c) => (
                  <div key={c.id} className="bg-[#1e2937] rounded-3xl p-8 border border-gray-700 hover:border-[#0f6cbd] transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        {editingId === c.id ? (
                          <>
                            <input
                              type="text"
                              value={editForm.caseName || ""}
                              onChange={(e) => setEditForm({ ...editForm, caseName: e.target.value })}
                              className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-3 text-white text-2xl font-bold mb-2"
                            />
                            <input
                              type="tel"
                              value={editForm.phoneNumber || ""}
                              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                              className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-3 text-white"
                              placeholder="Phone Number"
                            />
                          </>
                        ) : (
                          <>
                            <h3 className="text-2xl font-bold">{c.caseName}</h3>
                            <p className="text-[#60a5fa] text-lg font-medium mt-1 flex items-center gap-2">
                              📞 {c.phoneNumber}
                            </p>
                            <p className="text-gray-400 mt-1">
                              Tooth #{c.toothNumber} • {c.toothType}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-5xl font-bold text-[#60a5fa]">{c.survivalEstimate}%</div>
                        <div className={`text-sm font-medium mt-1 ${c.isPractical ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {c.isPractical ? '✅ Practical to Retain' : '⚠️ Impractical to Retain'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                      <div>
                        <span className="text-gray-400 block">Gender / Age</span>
                        <p>{c.gender}, {c.ageGroup}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 block">ASA</span>
                        <p className="font-medium">{c.asa}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Perio Status</span>
                        <p>{c.periodontalStatus}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Diagnosis</span>
                        <p className="font-medium">{c.pulpalDiagnosis}</p>
                      </div>
                    </div>

                    {c.remainingToothStructure && (
                      <div className="mt-6 p-4 bg-[#0f172a] rounded-2xl border border-gray-700">
                        <p className="text-gray-400 text-sm">Remaining Tooth Structure</p>
                        <p className="font-medium text-white mt-1">{c.remainingToothStructure}</p>
                      </div>
                    )}

                    {c.affectingFactors && c.affectingFactors.length > 0 && (
                      <div className="mt-6">
                        <p className="text-gray-400 text-sm mb-2">Survival affected by:</p>
                        <div className="flex flex-wrap gap-2">
                          {c.affectingFactors.map((factor, i) => (
                            <span key={i} className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-300">
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Treatment Status</label>
                        {editingId === c.id ? (
                          <select
                            value={editForm.treatmentStatus || "No Treatment"}
                            onChange={(e) => setEditForm({ ...editForm, treatmentStatus: e.target.value })}
                            className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-3"
                          >
                            <option value="No Treatment">No Treatment</option>
                            <option value="In-Progress">In Progress</option>
                            <option value="Done">Treatment Done</option>
                            <option value="Postpone">Postpone</option>
                          </select>
                        ) : (
                          <p className="font-medium text-lg">{c.treatmentStatus || "No Treatment"}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Follow-up Date</label>
                        {editingId === c.id ? (
                          <input
                            type="date"
                            value={editForm.followUpDate || ""}
                            onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                            className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-3"
                          />
                        ) : (
                          <p className="font-medium">
                            {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "Not set"}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-400 mb-2">Further Note</label>
                        {editingId === c.id ? (
                          <textarea
                            value={editForm.furtherNote || ""}
                            onChange={(e) => setEditForm({ ...editForm, furtherNote: e.target.value })}
                            className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 h-24 resize-y"
                            placeholder="Add clinical notes or observations..."
                          />
                        ) : (
                          <p className="text-gray-300 italic">
                            {c.furtherNote || "No notes added"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 text-xs text-gray-500 border-t border-gray-700 pt-4">
                      Added on: {c.createdAt ? 
                        new Date(c.createdAt.seconds * 1000).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        }) : "Unknown date"}
                    </div>

                    <div className="mt-8 flex gap-4">
                      {editingId === c.id ? (
                        <>
                          <button onClick={() => saveEdit(c.id)} className="flex-1 bg-[#10b981] hover:bg-[#0ea46c] py-3 rounded-2xl font-semibold">Save Changes</button>
                          <button onClick={() => { setEditingId(null); setEditForm({}); }} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-2xl font-semibold">Cancel</button>
                          <button onClick={() => deleteCase(c.id)} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-2xl font-semibold text-white">Delete Case</button>
                        </>
                      ) : (
                        <button onClick={() => startEditing(c)} className="flex-1 bg-[#0f6cbd] hover:bg-[#0a5a9c] py-3 rounded-2xl font-semibold">Edit Case</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>

        <footer className="text-center py-8 text-sm text-gray-500">
          © 2026 Endoprognosis Project. All rights reserved.
        </footer>
      </div>
    </ProtectedRoute>
  );
}