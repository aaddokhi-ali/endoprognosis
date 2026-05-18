// app/predictor/result/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  setDoc, 
  doc 
} from "firebase/firestore";
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // ==================== DEBUG: CURRENT USER FOR FIRESTORE ====================
  useEffect(() => {
    console.log("🔍 [PredictorResult] Current user for Firestore:", {
      uid: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous,
      authLoading: authLoading,
      hasUser: !!user,
    });
  }, [user, authLoading]);
  // =========================================================================

  // Load result from localStorage
  useEffect(() => {
    const savedResult = localStorage.getItem("lastCalculationResult");
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);

        let factors = Array.isArray(parsed.affectingFactors)
          ? [...parsed.affectingFactors]
          : [];

        // Clean duplicate structure factors
        factors = factors.filter(
          (f) =>
            !f.includes("Compromised coronal structure") &&
            !f.includes("Remaining coronal structure")
        );

        const structureFactor = factors.find(
          (f) =>
            f.includes("% loss of tooth structure") ||
            f.includes("Adequate remaining tooth structure")
        );

        if (structureFactor) {
          factors = [structureFactor, ...factors.filter((f) => f !== structureFactor)];
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

  // Back to Predictor (with same case data preserved)
  const goBackToPredictor = () => {
    router.push("/predictor");
  };

  const goToRestorative = () => {
    if (!result?.toothNumber) {
      alert("Tooth number not found.");
      return;
    }

    const restorativeData = {
      toothNumber: result.toothNumber,
      remainingPercent: result.remainingPercent || 100,
      parts: result.parts || {},
      ferruleWalls: result.ferruleWalls || {},
      oralHygiene: result.formData?.oralHygiene || "0",
      perio: result.formData?.perio || "0",
      fullResult: result,
    };

    localStorage.setItem("restorativeData", JSON.stringify(restorativeData));
    window.location.href = "/restorative";
  };

  // ==================== FIXED SAVE FUNCTION ====================
 const handleSaveCase = async () => {
  if (authLoading) {
    alert("Authentication is still loading. Please wait.");
    return;
  }
  if (!user?.uid) {
    alert("Please log in to save cases.");
    return;
  }
  if (!caseName?.trim() || !phoneNumber?.trim()) {
    alert("Please fill in Case Name and Phone Number");
    return;
  }
  if (saving) return;   // Prevent multiple clicks

  setSaving(true);
  console.log("🚀 Starting save with user:", user.uid);

  try {
    const caseKey = `${user.uid}_predictor_${result.toothNumber}_${Date.now()}`;

    // Quick duplicate check
    const q = query(
      collection(db, "cases"),
      where("userId", "==", user.uid),
      where("toothNumber", "==", result.toothNumber),
      where("type", "==", "predictor")
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      for (const docSnap of snapshot.docs) {
        const existing = docSnap.data();
        const isSameResult =
          existing.survivalEstimate === (result.survivalPercentage || 0) &&
          existing.epPoints === (result.totalDPI || 0) &&
          existing.pulpalDiagnosis === (result.pulpalDiagnosis || "") &&
          existing.periapicalDiagnosis === (result.periapicalDiagnosis || "");

        if (isSameResult) {
          alert("This case was already saved.\n\nPlease check My Cases.");
          setShowSaveModal(false);
          setSaving(false);
          return;
        }
      }
    }

    const newCaseRef = doc(db, "cases", caseKey);

    const caseData = {
      caseName: caseName.trim(),
      phoneNumber: phoneNumber.trim(),
      furtherNote: furtherNote.trim() || "",

      gender: result.formData?.gender || "",
      ageGroup: result.formData?.ageGroup || "",
      asa: result.formData?.medical || "0",
      periodontalStatus: result.formData?.perio || "0",

      toothNumber: result.toothNumber || "",
      toothType: result.toothType || "Molar",
      survivalEstimate: result.survivalPercentage || 0,
      epPoints: result.totalDPI || 0,
      pulpalDiagnosis: result.pulpalDiagnosis || "",
      periapicalDiagnosis: result.periapicalDiagnosis || "",
      treatmentRec: result.treatmentRec || "",
      isPractical: result.isPractical ?? false,
      affectingFactors: Array.isArray(result.affectingFactors) ? result.affectingFactors : [],

      patientInputs: result.formData || {},
      predictionResult: {
        survivalPercentage: result.survivalPercentage || 0,
        totalDPI: result.totalDPI || 0,
        affectingFactors: Array.isArray(result.affectingFactors) ? result.affectingFactors : [],
      },

      type: "predictor",
      userId: user.uid,
      caseKey: caseKey,
      createdAt: serverTimestamp(),
      savedAt: new Date().toISOString(),
    };

    await setDoc(newCaseRef, caseData);

    console.log("✅ Case saved successfully with ID:", caseKey);

    setShowSaveModal(false);
    setCaseName("");
    setPhoneNumber("");
    setFurtherNote("");
    localStorage.removeItem("lastCalculationResult");

    alert("✅ Case saved successfully!");

  } catch (error: any) {
    console.error("❌ Save Error:", error.code, error.message);
    alert("Failed to save case. Please try again.");
  } finally {
    setSaving(false);
  }
};

  // ==================== PROFESSIONAL PDF EXPORT ====================
  const exportAsPDF = async () => {
    if (!result) {
      alert("Please generate the protocol first!");
      return;
    }

    try {
      setIsGeneratingPDF(true);

      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      let cleanHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif; color: white; background: #0a1428; padding: 40px 30px; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-size: 42px; font-weight: bold; background: linear-gradient(to right, #0f6cbd, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              Prediction Result
            </h1>
            <p style="font-size: 24px; color: #60a5fa;">Tooth #${result.toothNumber}</p>
          </div>

          <div style="background: #1e2937; padding: 30px; border-radius: 16px; margin-bottom: 30px; text-align: center;">
            <p style="font-size: 20px; color: #9ca3af;">4-Year Survival Probability</p>
            <div style="font-size: 72px; font-weight: bold; color: #60a5fa; margin: 20px 0;">
              ${(result.survivalPercentage || 0).toFixed(1)}%
            </div>
            <p style="color: #9ca3af; max-width: 600px; margin: 0 auto;">
              This estimate depends on the quality of the final restoration, the patient’s compliance with oral hygiene measures, absence of parafunctional habits (such as bruxism), and other clinical factors.
            </p>
          </div>

          <div style="background: #1e2937; padding: 25px; border-radius: 16px; margin-bottom: 30px; text-align: center;">
            <p style="font-size: 20px;"><strong>Diagnosis:</strong> ${result.pulpalDiagnosis} with ${result.periapicalDiagnosis}</p>
          </div>

          <div style="background: #0f172a; padding: 30px; border-radius: 16px; margin-bottom: 30px; text-align: center;">
            <p style="color: #94a3b8; margin-bottom: 10px;">EP (Endoprognosis) Points</p>
            <p style="font-size: 52px; font-weight: bold; color: #3b82f6;">${result.totalDPI || 0}</p>
          </div>

          <div style="text-align: center; padding: 30px; border-radius: 16px; font-size: 32px; font-weight: bold; margin-bottom: 30px; 
                      ${result.isPractical 
                        ? 'background: #052e16; border: 4px solid #10b981; color: #10b981;' 
                        : 'background: #450a0a; border: 4px solid #ef4444; color: #ef4444;'}">
            ${result.isPractical ? "✅ Practical to Retain" : "⚠️ Impractical to Retain"}
          </div>

          ${result.treatmentRec ? `
          <div style="background: #1e2937; padding: 25px; border-radius: 16px; margin-bottom: 30px;">
            <p style="font-size: 18px; color: #94a3b8;">Treatment Recommendation</p>
            <p style="font-size: 22px; margin-top: 10px;">${result.treatmentRec}</p>
          </div>` : ''}

          ${result.affectingFactors && result.affectingFactors.length > 0 ? `
          <div style="margin-top: 30px;">
            <p style="font-size: 18px; color: #94a3b8; margin-bottom: 15px;">Factors Affecting Survivability:</p>
            <ul style="list-style: none; padding: 0;">
              ${result.affectingFactors.map((factor: string) => `
                <li style="padding: 10px 0; border-bottom: 1px solid #334155;">• ${factor}</li>
              `).join('')}
            </ul>
          </div>` : ''}
        </div>
      `;

      const element = document.createElement("div");
      element.innerHTML = cleanHTML;
      document.body.appendChild(element);

      const opt = {
        margin: [15, 20, 15, 20] as [number, number, number, number],
        filename: `Endoprognosis_Result_Tooth${result.toothNumber}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          backgroundColor: "#0a1428",
          letterRendering: true
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait" as const
        }
      };

      await html2pdf().from(element).set(opt).save();

      document.body.removeChild(element);
      alert("✅ PDF successfully downloaded!");

    } catch (error) {
      console.error("PDF Error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
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
      <div className="min-h-screen bg-[#0a1428] text-white pb-12 sm:pb-20">
        {/* Hero Section */}
        <div
          className="relative h-[380px] sm:h-[420px] bg-cover bg-center"
          style={{ backgroundImage: "url('https://iili.io/Bw4dt99.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/75"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#0f6cbd] via-[#10b981] to-[#0f6cbd] bg-clip-text text-transparent">
              Prediction Result
            </h1>
            <p className="text-xl sm:text-2xl text-gray-200">Tooth #{result.toothNumber}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Single Back Button */}
          <div className="flex justify-start mb-8 sm:mb-10">
            <button
              onClick={goBackToPredictor}
              className="bg-gray-700 hover:bg-gray-600 px-6 sm:px-8 py-4 rounded-2xl text-lg font-semibold flex items-center gap-2 transition"
            >
              ← Back to Predictor
            </button>
          </div>

          {/* Main Result Container */}
          <div className="bg-[#1e2937] rounded-3xl p-6 sm:p-10 shadow-2xl border border-gray-700">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-10 text-[#0f6cbd]">📋 Result Summary</h2>

            {/* Enhanced Survival Statement */}
            <div className="text-center mb-10 sm:mb-12">
              <p className="text-lg sm:text-xl leading-relaxed text-gray-200 mb-6 px-2">
                Based on the survival calculation, the probability of retaining this tooth{" "}
                <strong>#{result.toothNumber}</strong> over the next 4 years is approximately
              </p>
              <div className="text-5xl sm:text-6xl font-bold text-[#60a5fa] mb-3">
                {survival}%
              </div>
              <p className="text-sm text-gray-400 max-w-2xl mx-auto px-4">
                This estimate depends on the quality of the final restoration, the patient's compliance
                with oral hygiene measures, absence of parafunctional habits (such as bruxism), and
                other clinical factors.
              </p>
            </div>

            {/* Diagnosis */}
            <div className="text-center mb-10 sm:mb-12 px-4">
              <p className="text-xl sm:text-2xl font-medium">
                <strong>Diagnosis:</strong> {result.pulpalDiagnosis} with {result.periapicalDiagnosis}
              </p>
            </div>

            {/* EP Points */}
            <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-10 mb-10 sm:mb-12 border border-gray-600">
              <div className="text-center mb-8">
                <p className="text-lg text-gray-400 mb-1">EP (Endoprognosis) Points</p>
                <p className="text-5xl sm:text-6xl font-bold text-[#3b82f6]">{result.totalDPI || 0}</p>
              </div>

              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold">
                  4-year survival estimate:{" "}
                  <span className="text-[#60a5fa]">{survival}%</span>
                </p>
              </div>

              {result.affectingFactors?.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-700">
                  <p className="text-lg font-semibold text-gray-300 mb-4 text-center">
                    Factors Affecting Survivability:
                  </p>
                  <ul className="space-y-3 max-w-2xl mx-auto">
                    {result.affectingFactors.map((factor: string, index: number) => (
                      <li key={index} className="flex items-start gap-3 text-gray-300 px-2">
                        <span className="text-[#ef4444] mt-1.5">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Practical / Impractical */}
            <div
              className={`text-center py-12 sm:py-16 rounded-3xl text-4xl sm:text-5xl font-bold mb-10 sm:mb-12 border-4 transition-all ${
                isRestorable
                  ? "border-[#10b981] bg-green-950/40 text-[#10b981]"
                  : "border-[#ef4444] bg-red-950/40 text-[#ef4444]"
              }`}
            >
              {isRestorable ? "✅ Practical to Retain" : "⚠️ Impractical to Retain"}
            </div>

            {/* Treatment Recommendation */}
            {result.treatmentRec && (
              <div className="bg-[#0f172a] p-6 sm:p-8 rounded-2xl mb-10 sm:mb-12 text-center border border-gray-600">
                <p className="text-lg sm:text-xl font-semibold mb-3">Treatment Recommendation</p>
                <p className="text-xl sm:text-2xl">{result.treatmentRec}</p>
              </div>
            )}

            {/* Action Buttons - Save + Export */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10 sm:mb-12">
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex-1 bg-[#10b981] hover:bg-[#0ea46c] text-[#0f172a] font-bold py-5 sm:py-6 rounded-2xl text-lg sm:text-xl transition-all active:scale-[0.98]"
              >
                💾 Save This Case
              </button>
              <button
                onClick={exportAsPDF}
                disabled={isGeneratingPDF}
                className="flex-1 bg-white/10 hover:bg-white/20 font-bold py-5 sm:py-6 rounded-2xl text-lg sm:text-xl transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isGeneratingPDF ? "Generating PDF..." : "📄 Export as PDF"}
              </button>
            </div>

            {/* Restorative Button */}
            {isRestorable && (
              <button
                onClick={goToRestorative}
                className="w-full bg-[#10b981] hover:bg-[#0ea46c] text-[#0f172a] font-bold py-6 sm:py-7 rounded-2xl text-xl sm:text-2xl transition-all active:scale-[0.98] mb-10 sm:mb-12"
              >
                📋 View Suggested Restorative Treatment
              </button>
            )}

            <p className="text-center text-red-400 text-sm leading-relaxed px-4">
              ⚠️ This result is for clinical decision support only.<br />
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
                  <label className="block text-sm text-gray-400 mb-2">
                    Case Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white focus:outline-none focus:border-[#10b981]"
                    placeholder="e.g. Mr. Ahmed - Tooth 36"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
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
  className="flex-1 py-4 bg-[#10b981] hover:bg-[#0ea46c] rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
>
  {saving ? "Saving Case... Please wait" : "💾 Save Case"}
</button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap justify-center gap-x-6 sm:gap-x-8 gap-y-2">
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