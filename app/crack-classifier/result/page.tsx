// app/crack-classifier/result/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Navigation from "../../components/navigation";
import ProtectedRoute from "../../components/protectedroute";

export default function CrackClassifierResult() {
  const [result, setResult] = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [furtherNote, setFurtherNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const savedResult = localStorage.getItem("lastCrackResult");
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        setResult(parsed);
      } catch (e) {
        console.error("Failed to parse crack result from localStorage");
        router.push("/crack-classifier");
      }
    } else {
      router.push("/crack-classifier");
    }
  }, [router]);

  const handleSaveCase = async () => {
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
        type: "crack-classifier",

        // Full patient inputs
        patientInputs: {
          ...result.formData,
          deepPockets: result.deepPockets,
          pocketColors: result.pocketColors,
        },

        // Full prediction result
        predictionResult: {
          crackType: result.crackType,
          isVRF: result.isVRF || false,
          iowaStage: result.iowaStage || "",
          successRate: result.successRate || "",
          recommendation: result.recommendation || "",
          introText: result.introText || "",
        },

        // Flat fields for My Cases
        toothNumber: result.toothNumber || "",
        toothType: result.toothType || "Molar",
        classification: result.crackType || "",
        iowaStage: result.iowaStage || "",
        isVRF: result.isVRF || false,
        survivalEstimate: result.successRate ? parseInt(result.successRate) : null,

        createdAt: serverTimestamp(),
        userId: user?.uid,
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
      alert("Failed to save the case. Please try again.");
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

  return (
    <ProtectedRoute>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white pb-12 sm:pb-20">
        {/* Hero Section */}
        <div className="relative h-[380px] sm:h-[420px] bg-cover bg-center" 
             style={{ backgroundImage: "url('https://iili.io/BwkLI0N.jpg')" }}>
          <div className="absolute inset-0 bg-black/75"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#0f6cbd] via-[#10b981] to-[#0f6cbd] bg-clip-text text-transparent">
              Crack Tooth Classification Result
            </h1>
            <p className="text-xl sm:text-2xl text-gray-200">Tooth #{result.toothNumber}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-10">
            <Link 
              href="/crack-classifier" 
              className="bg-gray-700 hover:bg-gray-600 px-6 sm:px-8 py-4 rounded-2xl text-lg font-semibold flex items-center gap-2 transition w-full sm:w-auto justify-center"
            >
              ← New Crack Case
            </Link>

            {user && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="bg-[#10b981] hover:bg-[#0ea46c] px-6 sm:px-10 py-4 rounded-2xl text-lg font-semibold flex items-center gap-3 transition-all w-full sm:w-auto justify-center"
              >
                💾 Save This Case
              </button>
            )}

            {user && (
              <Link 
                href="/mycases"
                className="bg-white/10 hover:bg-white/20 px-6 sm:px-8 py-4 rounded-2xl text-lg font-semibold transition w-full sm:w-auto justify-center"
              >
                View My Cases
              </Link>
            )}
          </div>

          {/* Main Result Container */}
          <div className="bg-[#1e2937] rounded-3xl p-6 sm:p-10 shadow-2xl border border-gray-700">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-10 text-[#0f6cbd]">📋 Crack Tooth Classification Result</h2>

            <div className="text-center mb-10 sm:mb-12">
              <p className="text-xl sm:text-2xl font-medium">
                Tooth <strong>#{result.toothNumber}</strong> — {result.toothType}
              </p>
            </div>

            {/* Classification Box */}
            <div className={`text-center py-12 sm:py-16 rounded-3xl text-4xl sm:text-5xl font-bold mb-10 sm:mb-12 border-4 transition-all
              ${result.isVRF 
                ? 'border-[#ef4444] bg-red-950/40 text-[#ef4444]' 
                : 'border-[#10b981] bg-green-950/40 text-[#10b981]'}`}>
              {result.isVRF 
                ? "High Probability of Vertical Root Fracture (VRF)" 
                : result.crackType}
            </div>

            {/* Iowa Classification */}
            {result.iowaStage && (
              <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-10 mb-10 sm:mb-12 border border-gray-600 text-center">
                <p className="text-lg text-gray-400 mb-1">Iowa Classification (Krell & Caplan)</p>
                <p className="text-5xl sm:text-6xl font-bold text-[#10b981] mb-4">Stage {result.iowaStage}</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#60a5fa]">
                  {result.successRate} <span className="text-base sm:text-xl font-normal text-gray-400">1-year success rate after treatment</span>
                </p>
              </div>
            )}

            {/* Recommendation */}
            <div className="bg-[#0f172a] p-6 sm:p-10 rounded-2xl border-l-8 border-[#0f6cbd] text-lg leading-relaxed mb-12">
              <strong className="text-[#94a3b8] block mb-6 text-center text-xl">Recommendation</strong>
              <p className="text-center">
                {result.isVRF 
                  ? "In cases with high probability of vertical root fracture, confirmation via exploratory surgery or careful monitoring during initial treatment is recommended. CBCT has limited reliability in detecting such fractures. Given the generally poor long-term prognosis, extraction is frequently the most predictable treatment option."
                  : result.recommendation}
              </p>
            </div>

            <p className="text-center mt-16 text-red-400 text-sm leading-relaxed px-4">
              ⚠️ This result is for clinical decision support only.<br/>
              Always apply your professional judgment.
            </p>
          </div>
        </div>

        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 sm:p-6">
            <div className="bg-[#1e2937] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-700">
              <h3 className="text-2xl font-bold mb-6 text-[#0f6cbd]">Save Case</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Case Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white focus:outline-none focus:border-[#10b981]"
                    placeholder="e.g. Mr. Ahmed - Tooth 36 Crack"
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

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
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

        <footer className="text-center py-8 text-sm text-gray-500">
          © 2026 Endoprognosis Project. All rights reserved.
        </footer>
      </div>
    </ProtectedRoute>
  );
}