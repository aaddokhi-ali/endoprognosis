// app/predictor/result/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navigation from "../../components/navigation";
import ProtectedRoute from "../../components/protectedroute";

export default function PredictorResult() {
  const [result, setResult] = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [furtherNote, setFurtherNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const savedResult = localStorage.getItem("lastCalculationResult");
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);

        let factors = Array.isArray(parsed.affectingFactors) 
          ? [...parsed.affectingFactors] 
          : [];

        factors = factors.filter(f => 
          !f.includes("Compromised coronal structure") &&
          !f.includes("Remaining coronal structure")
        );

        const structureFactor = factors.find(f => 
          f.includes("% loss of tooth structure") || 
          f.includes("Adequate remaining tooth structure")
        );
        
        if (structureFactor) {
          factors = [structureFactor, ...factors.filter(f => f !== structureFactor)];
        }

        const finalResult = { ...parsed, affectingFactors: factors.slice(0, 6) };
        setResult(finalResult);
      } catch (e) {
        console.error("Error parsing result:", e);
        router.push("/predictor");
      }
    } else {
      router.push("/predictor");
    }
  }, [router]);

  const goToRestorative = () => {
    if (!result?.toothNumber) {
      alert("Tooth number not found. Please try again.");
      return;
    }

    const restorativeData = {
      toothNumber: result.toothNumber,
      remainingPercent: result.remainingPercent || 100,
      parts: result.parts || {},
      ferruleWalls: result.ferruleWalls || {},
      oralHygiene: result.formData?.oralHygiene || "0",
      perio: result.formData?.perio || "0",
      fullResult: result   // ← Full result saved for back navigation
    };

    localStorage.setItem("restorativeData", JSON.stringify(restorativeData));
    window.location.href = "/restorative";
  };

  const handleSaveCase = async () => {
    if (!user?.uid) {
      alert("Please log in to save cases.");
      return;
    }

    if (!caseName?.trim() || !phoneNumber?.trim()) {
      alert("Please fill in Case Name and Phone Number");
      return;
    }

    setSaving(true);

    try {
      const caseData = {
        caseName: caseName.trim(),
        phoneNumber: phoneNumber.trim(),
        furtherNote: furtherNote.trim(),

        patientInputs: {
          ...result.formData,
          remainingPercent: result.remainingPercent,
          parts: result.parts,
          ferruleWalls: result.ferruleWalls,
        },

        predictionResult: {
          survivalPercentage: result.survivalPercentage,
          totalDPI: result.totalDPI,
          pulpalDiagnosis: result.pulpalDiagnosis,
          periapicalDiagnosis: result.periapicalDiagnosis,
          isPractical: result.isPractical,
          treatmentRec: result.treatmentRec,
          affectingFactors: result.affectingFactors || [],
          explanationNote: result.explanationNote,
          introParagraph: result.introParagraph,
        },

        gender: result.formData?.gender || "",
        ageGroup: result.formData?.ageGroup || "",
        asa: result.formData?.medical || "0",
        toothNumber: result.toothNumber || "",
        toothType: result.toothType || "Molar",
        pulpalDiagnosis: result.pulpalDiagnosis || "",
        periapicalDiagnosis: result.periapicalDiagnosis || "",
        periodontalStatus: result.formData?.perio || "0",
        survivalEstimate: result.survivalPercentage || 0,
        treatmentRec: result.treatmentRec || "",
        isPractical: result.isPractical ?? false,
        affectingFactors: result.affectingFactors || [],

        type: "predictor",                    // ← Added
        userId: user.uid,                     // ← Ensured
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),         // ← Added
        savedAt: new Date().toISOString(),
        isGuest: !user,
      };

      await addDoc(collection(db, "cases"), caseData);

      alert("✅ Case saved successfully!");
      setShowSaveModal(false);
      setCaseName("");
      setPhoneNumber("");
      setFurtherNote("");

        } catch (error: any) {
      console.error("Save failed:", error);

      if (error.code === "permission-denied") {
        alert("Permission denied. Check your Firestore rules or authentication.");
      } else if (error.code === "unavailable") {
        alert("Network error. Please check your connection.");
      } else {
        alert(`Unexpected error: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }

  };

  if (!result) {
    return (
      <ProtectedRoute>
        <Navigation />
        <div className="min-h-screen bg-[#0a1428] text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading result...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const survival = (result.survivalPercentage || 0).toFixed(1);
  const isRestorable = result.isPractical ?? false;

  return (
    <ProtectedRoute>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white pb-20">
        {/* Hero Section */}
        <div className="relative h-[420px] bg-cover bg-center" 
             style={{ backgroundImage: "url('https://iili.io/Bw4dt99.jpg')" }}>
          <div className="absolute inset-0 bg-black/75"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#0f6cbd] via-[#10b981] to-[#0f6cbd] bg-clip-text text-transparent">
              Prediction Result
            </h1>
            <p className="text-2xl text-gray-200">Tooth #{result.toothNumber}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex flex-wrap gap-4 mb-10">
            <Link 
              href="/predictor" 
              className="bg-gray-700 hover:bg-gray-600 px-8 py-4 rounded-2xl text-lg font-semibold flex items-center gap-2 transition"
            >
              ← New Case
            </Link>

            {user && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="bg-[#10b981] hover:bg-[#0ea46c] px-10 py-4 rounded-2xl text-lg font-semibold flex items-center gap-3 transition-all"
              >
                💾 Save This Case
              </button>
            )}

            {user && (
              <Link 
                href="/mycases"
                className="bg-white/10 hover:bg-white/20 px-8 py-4 rounded-2xl text-lg font-semibold transition"
              >
                View My Cases
              </Link>
            )}
          </div>

          {/* Main Result Container */}
          <div className="bg-[#1e2937] rounded-3xl p-10 shadow-2xl border border-gray-700">
            <h2 className="text-4xl font-bold text-center mb-10 text-[#0f6cbd]">📋 Result Summary</h2>

            <div className="text-center mb-12">
              <p className="text-xl leading-relaxed text-gray-200">
                Based on the survival calculation, the probability of retaining this tooth over the next 4 years is approximately <strong>{survival}%</strong>. 
                This estimate depends on the quality of the final restoration, the patient’s compliance with oral hygiene measures, absence of parafunctional habits (such as bruxism), and other clinical factors.
              </p>
            </div>

            <div className="text-center mb-12">
              <p className="text-2xl font-medium">
                <strong>Diagnosis:</strong> {result.pulpalDiagnosis} with {result.periapicalDiagnosis}
              </p>
            </div>

            <div className="bg-[#0f172a] rounded-3xl p-10 mb-12 border border-gray-600">
              <div className="text-center mb-8">
                <p className="text-lg text-gray-400 mb-1">Modified DPI points</p>
                <p className="text-6xl font-bold text-[#3b82f6]">{result.totalDPI}</p>
              </div>

              <div className="text-center mb-10">
                <p className="text-3xl font-bold">
                  4-year survival estimate: 
                  <span className="text-[#60a5fa] ml-3">{survival}%</span>
                </p>
              </div>

              {result.affectingFactors && result.affectingFactors.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-700">
                  <p className="text-lg font-semibold text-gray-300 mb-4 text-center">
                    Factors Affecting Survivability:
                  </p>
                  <ul className="space-y-3 max-w-2xl mx-auto">
                    {result.affectingFactors.map((factor: string, index: number) => (
                      <li key={index} className="flex items-start gap-3 text-gray-300">
                        <span className="text-[#ef4444] mt-1.5">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className={`text-center py-16 rounded-3xl text-5xl font-bold mb-12 border-4 transition-all
              ${isRestorable 
                ? 'border-[#10b981] bg-green-950/40 text-[#10b981]' 
                : 'border-[#ef4444] bg-red-950/40 text-[#ef4444]'}`}>
              {isRestorable ? '✅ Practical to Retain' : '⚠️ Impractical to Retain'}
            </div>

            {result.treatmentRec && (
              <div className="bg-[#0f172a] p-8 rounded-2xl mb-12 text-center border border-gray-600">
                <p className="text-xl font-semibold mb-3">Treatment Recommendation</p>
                <p className="text-2xl">{result.treatmentRec}</p>
              </div>
            )}

            <div className="bg-[#0f172a] p-10 rounded-2xl border-l-8 border-[#0f6cbd] text-lg leading-relaxed mb-12">
              <strong className="text-[#94a3b8] block mb-4">Clinical Note:</strong>
              <p dangerouslySetInnerHTML={{ __html: result.explanationNote || '' }} />
            </div>

            {isRestorable && (
              <button 
                onClick={goToRestorative}
                className="w-full bg-[#10b981] hover:bg-[#0ea46c] text-[#0f172a] font-bold py-7 rounded-2xl text-2xl transition-all active:scale-[0.98]"
              >
                📋 View Suggested Restorative Treatment
              </button>
            )}

            <p className="text-center mt-16 text-red-400 text-sm leading-relaxed">
              ⚠️ This result is for clinical decision support only.<br/>
              Always apply your professional judgment.
            </p>
          </div>
        </div>

        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-6">
            <div className="bg-[#1e2937] rounded-3xl p-8 max-w-md w-full border border-gray-700">
              <h3 className="text-2xl font-bold mb-6 text-[#0f6cbd]">Save Case</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Case Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white focus:outline-none focus:border-[#10b981]"
                    placeholder="e.g. Mr. Ahmed - Tooth 36"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white focus:outline-none focus:border-[#10b981]"
                    placeholder="+966 50 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Additional Notes (Optional)</label>
                  <textarea
                    value={furtherNote}
                    onChange={(e) => setFurtherNote(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 h-24 text-white focus:outline-none focus:border-[#10b981]"
                    placeholder="Any extra clinical observations..."
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCase}
                  disabled={saving || !caseName.trim() || !phoneNumber.trim()}
                  className="flex-1 py-4 bg-[#10b981] hover:bg-[#0ea46c] rounded-2xl font-semibold disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
                >
                  {saving ? "Saving..." : "💾 Save Case"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/references" className="hover:text-white transition">References</Link>
            <Link href="/how-to-use" className="hover:text-white transition">How to Use</Link>
            <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
          </div>
          <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}