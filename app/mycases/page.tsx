// app/mycases/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";

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
  treatmentStatus: string;
  followUpDate: string | null;
  furtherNote?: string;
  type?: string;
  classification?: string;
  iowaStage?: string;
  isVRF?: boolean;
  createdAt: any;
}

export default function MyCases() {
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Crack Cases" | "No Treatment" | "In-Progress" | "Done" | "Postpone">("All");

  const { user } = useAuth();
  const router = useRouter();

  // Realtime listener
  useEffect(() => {
    if (!user) {
      setError("Please log in to view your cases.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "cases"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const casesList: SavedCase[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          casesList.push({
            id: doc.id,
            ...data,
            treatmentStatus: data.treatmentStatus || "No Treatment",
            followUpDate: data.followUpDate || null,
            affectingFactors: data.affectingFactors || [],
          } as SavedCase);
        });

        setCases(casesList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching cases:", err);
        setError("Failed to load your cases.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredCases = useMemo(() => {
    let result = cases;

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();

      result = result.filter(c => {
        const searchableText = [
          c.caseName,
          c.phoneNumber,
          c.toothNumber,
          c.toothType,
          c.pulpalDiagnosis,
          c.periapicalDiagnosis,
          c.periodontalStatus,
          c.remainingToothStructure,
          c.gender,
          c.ageGroup,
          c.asa,
          c.treatmentRec,
          ...(c.affectingFactors || [])
        ].join(" ").toLowerCase();

        if (searchableText.includes(term)) return true;

        // Specific smart search
        if (term.includes("female") && c.gender?.toLowerCase() === "female") return true;
        if (term.includes("male") && c.gender?.toLowerCase() === "male") return true;

        if (c.ageGroup && term.includes(c.ageGroup.toLowerCase())) return true;
        if (c.periodontalStatus && term.includes(c.periodontalStatus.toLowerCase())) return true;

        if (term.includes("perio") || term.includes("periodontal")) {
          return (c.periodontalStatus && c.periodontalStatus !== "None");
        }

        if (term.includes("remaining") || term.includes("structure") || term.includes("ferrule")) {
          return !!c.remainingToothStructure;
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

  const openCaseDetail = (caseId: string) => {
    router.push(`/cases/${caseId}`);
  };

  if (!user) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
          <p>Please log in to view your cases.</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">My Saved Cases 📋</h1>
              <p className="text-gray-400 mt-1">{cases.length} cases total</p>
            </div>

            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Search by name, phone, tooth, gender, age group, perio, remaining structure, diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1e2937] border border-gray-600 rounded-2xl pl-12 py-4 text-white placeholder-gray-400"
              />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-10 border-b border-gray-700 pb-4 overflow-x-auto pb-6">
            {["All", "Crack Cases", "No Treatment", "In-Progress", "Done", "Postpone"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 rounded-2xl text-sm font-medium transition-all whitespace-nowrap ${
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
          {error && <p className="text-center text-red-400 py-10">{error}</p>}

          {!loading && filteredCases.length === 0 && (
            <div className="text-center py-20">
              <p className="text-2xl">No matching cases found</p>
            </div>
          )}

          {/* Crack Cases */}
          {activeTab === "Crack Cases" && filteredCases.length > 0 && (
            <div className="mb-16">
              <h2 className="text-3xl font-semibold mb-8">🦷 Crack Tooth Cases ({filteredCases.length})</h2>
              <div className="grid gap-6">
                {filteredCases.map((c) => (
                  <div key={c.id} className="bg-[#1e2937] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                      <h3 className="text-2xl font-bold">{c.caseName}</h3>
                      {c.phoneNumber && (
                        <p className="text-[#60a5fa] text-lg mt-2 flex items-center gap-2">
                          📞 {c.phoneNumber}
                        </p>
                      )}
                      <p className="text-gray-400 mt-1">Tooth #{c.toothNumber}</p>
                    </div>
                    <button
                      onClick={() => openCaseDetail(c.id)}
                      className="bg-[#0f6cbd] hover:bg-[#0a5a9c] px-8 py-4 rounded-2xl font-semibold w-full sm:w-auto"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictor Cases */}
          {activeTab !== "Crack Cases" && Object.entries(categorizedCases).map(([category, caseList]) => (
            <div key={category} className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 border-b border-gray-700 pb-3">
                {category} <span className="text-gray-400">({caseList.length})</span>
              </h2>

              <div className="grid gap-6">
                {caseList.map((c) => (
                  <div key={c.id} className="bg-[#1e2937] rounded-3xl p-6 sm:p-8 hover:border-[#0f6cbd] border border-transparent transition-all">
                    <div className="flex flex-col lg:flex-row justify-between gap-8">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold">{c.caseName}</h3>
                        
                        {/* Phone Number Added */}
                        {c.phoneNumber && (
                          <p className="text-[#60a5fa] text-lg mt-2 flex items-center gap-2">
                            📞 {c.phoneNumber}
                          </p>
                        )}

                        <p className="text-[#60a5fa] text-lg mt-1">
                          Tooth #{c.toothNumber} • {c.toothType}
                        </p>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400 block">Gender / Age</span>
                            <p className="font-medium">{c.gender || "—"} • {c.ageGroup || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 block">ASA</span>
                            <p className="font-medium">{c.asa || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Pulpal Diagnosis</span>
                            <p className="font-medium">{c.pulpalDiagnosis || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Periapical Diagnosis</span>
                            <p className="font-medium">{c.periapicalDiagnosis || "—"}</p>
                          </div>
                        </div>

                        <div className="mt-5">
                          <span className="text-gray-400 text-sm block mb-1">Periodontal Status</span>
                          <p className="font-medium">{c.periodontalStatus || "—"}</p>
                        </div>

                        {(c.remainingToothStructure || c.remainingPercent !== undefined) && (
                          <div className="mt-5">
                            <span className="text-gray-400 text-sm block mb-1">Remaining Tooth Structure</span>
                            <p className="font-medium">
                              {c.remainingToothStructure || `${c.remainingPercent}% remaining`}
                            </p>
                          </div>
                        )}

                        {c.affectingFactors && c.affectingFactors.length > 0 && (
                          <div className="mt-5">
                            <span className="text-gray-400 text-sm block mb-2">Key Affecting Factors</span>
                            <div className="flex flex-wrap gap-2">
                              {c.affectingFactors.slice(0, 6).map((factor, i) => (
                                <span key={i} className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-300">
                                  {factor}
                                </span>
                              ))}
                              {c.affectingFactors.length > 6 && (
                                <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400">
                                  +{c.affectingFactors.length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-start sm:items-end justify-between gap-6">
                        <div className="text-left sm:text-right">
                          <div className={`text-5xl font-bold ${c.isPractical ? 'text-[#10b981]' : 'text-red-400'}`}>
                            {c.survivalEstimate || "—"}%
                          </div>
                          <div className={`text-sm mt-1 ${c.isPractical ? 'text-[#10b981]' : 'text-red-400'}`}>
                            {c.isPractical ? '✅ Practical to Retain' : '⚠️ Impractical to Retain'}
                          </div>
                        </div>

                        <div>
                          <p className="text-gray-400 text-sm mb-1">Current Status</p>
                          <p className="font-medium text-lg">{c.treatmentStatus}</p>
                        </div>

                        <button
                          onClick={() => openCaseDetail(c.id)}
                          className="bg-[#0f6cbd] hover:bg-[#0a5a9c] px-8 sm:px-10 py-4 rounded-2xl font-semibold text-lg w-full sm:w-auto"
                        >
                          View & Edit Full Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}