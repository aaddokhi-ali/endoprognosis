// app/predictor/page.tsx
"use client";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { casesService, detectProcedureCategory } from "../lib/casesService";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Image from "next/image";

export default function EndodonticPrognosisPredictor() {
  const [step, setStep] = useState(1);
  const [isDark, setIsDark] = useState(true);

  // Guest Mode Check
  const isGuest = typeof window !== "undefined" && localStorage.getItem("isGuest") === "true";

  const [formData, setFormData] = useState({
    casePresentation: "3",
    toothNumber: "",
    ageGroup: "26-40 years",
    gender: "Male",
    oralHygiene: "0",
    perio: "0",
    medical: "0",
    medications: "0",
    needHelpDiagnosis: "yes",
    painCold: "no",
    painHot: "no",
    spontaneous: "no",
    painSweets: "no",
    coldTest: "",
    percussion: "",
    sinus: "",
    swelling: "no",
    periApical: "no",
    rootTreated: "no",
    rootAccessed: "no",
    pulpalManual: "",
    periManual: "",
    endo: "0",
    instrumentSep: "no",
    sepLocation: "coronal",
    sepStage: "before",
    perforation: "no",
    perfLocation: "coronal",
    perfTime: "recent",
    prostho: "0",
  });

  const [parts, setParts] = useState({
    mesial: true,
    distal: true,
    buccal: true,
    lingual: true,
    occlusal: true,
  });
  const [ferruleWalls, setFerruleWalls] = useState({
    mesial: false,
    distal: false,
    buccal: false,
    lingual: false,
  });
  const [remainingPercent, setRemainingPercent] = useState(100);
  const [loading, setLoading] = useState(false);

  // Save Case States
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [furtherNote, setFurtherNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePart = (part: string) => {
    const newParts = { ...parts, [part]: !parts[part as keyof typeof parts] };
    setParts(newParts);
    updateRemaining(newParts, ferruleWalls);
  };

  const toggleFerrule = (wall: string) => {
    const newFerrule = { ...ferruleWalls, [wall]: !ferruleWalls[wall as keyof typeof ferruleWalls] };
    setFerruleWalls(newFerrule);
    updateRemaining(parts, newFerrule);
  };

  const updateRemaining = (currentParts: any, currentFerrule: any) => {
    let percent = 0;
    if (currentParts.mesial) percent += 20;
    if (currentParts.distal) percent += 20;
    if (currentParts.buccal) percent += 25;
    if (currentParts.lingual) percent += 25;
    if (currentParts.occlusal) percent += 10;
    if (percent === 0) percent = 5;
    setRemainingPercent(percent);
  };

  const toggleTheme = () => setIsDark(!isDark);

  const calculate = () => {
    setLoading(true);

    setTimeout(() => {
      const helpMode = formData.needHelpDiagnosis;
      let pulpal = "";
      let peri = "";
      let lesion = formData.periApical === "yes";

      if (helpMode === "yes") {
        if (formData.rootTreated === "yes") {
          pulpal = "Previously root canal treated";
        } else if (formData.rootAccessed === "yes") {
          pulpal = "Previously initiated root canal treatment";
        } else {
          const painToSweets = formData.painSweets === "yes";
          const coldSevere = formData.coldTest === "severe";
          const hasHotPain = formData.painHot === "yes";

          if (painToSweets) {
            if (coldSevere || hasHotPain) {
              pulpal = "Irreversible Pulpitis";
            } else {
              pulpal = "Reversible Pulpitis";
            }
          } else if (coldSevere || hasHotPain) {
            pulpal = "Irreversible Pulpitis";
          } else if (formData.coldTest === "over") {
            pulpal = "Reversible Pulpitis";
          } else if (formData.coldTest === "no") {
            pulpal = "Pulp Necrosis";
          } else {
            pulpal = "Normal Pulp";
          }
        }

        const sinus = formData.sinus;
        const swelling = formData.swelling;
        const perc = formData.percussion;

        if (sinus === "traceable") {
          peri = "Chronic Apical Abscess";
          lesion = true;
        } else if (swelling === "yes") {
          peri = "Acute Apical Abscess";
          lesion = true;
        } else if (perc === "tender") {
          peri = "Symptomatic Apical Periodontitis";
          lesion = true;
        } else if (lesion) {
          peri = "Asymptomatic Apical Periodontitis";
        } else {
          peri = "Normal Apical tissue";
        }
      } else {
        pulpal = formData.pulpalManual || "Not selected";
        peri = formData.periManual || "Not selected";
      }

      if (["Asymptomatic Apical Periodontitis", "Symptomatic Apical Periodontitis", "Acute Apical Abscess", "Chronic Apical Abscess"].includes(peri)) {
        lesion = true;
      }

      const toothNum = formData.toothNumber.trim();
      const isAnterior = ["11","12","13","21","22","23","31","32","33","41","42","43"].includes(toothNum);
      const isPremolar = ["14","15","24","25","34","35","44","45"].includes(toothNum);
      const toothType = isAnterior ? "Anterior" : isPremolar ? "Premolar" : "Molar";

      let survival = lesion ? 86 : 96;

      const medical = parseInt(formData.medical) || 0;
      const basePerio = parseInt(formData.perio) || 0;
      const oralHygiene = parseInt(formData.oralHygiene) || 0;
      const meds = parseInt(formData.medications) || 0;

      let perioMultiplier = oralHygiene === 1 ? 2 : oralHygiene === 2 ? 3 : 1;
      let perio = Math.min(10, Math.round(basePerio * perioMultiplier));
      if (meds >= 1) perio = Math.min(10, perio + 1);

      const endo = parseInt(formData.endo) || 0;
      const context = parseInt(formData.prostho) || 0;
      let percent = remainingPercent;

      const mesialDistalMissing = (ferruleWalls.mesial ? 1 : 0) + (ferruleWalls.distal ? 1 : 0);
      const buccalLingualMissing = (ferruleWalls.buccal ? 1 : 0) + (ferruleWalls.lingual ? 1 : 0);
      const ferrulePoints = (mesialDistalMissing * 2) + (buccalLingualMissing * 3);

      let struct = (percent > 70 ? 0 : percent > 50 ? 4 : percent > 30 ? 7 : 10);
      if (isAnterior) struct = Math.max(0, struct - 1);
      else struct += 2;
      struct += ferrulePoints;
      if (ferrulePoints >= 4 || mesialDistalMissing >= 2 || buccalLingualMissing >= 2) struct = Math.max(struct, 10);

      let totalDPI = endo + perio + struct + context + medical;
      if (lesion) totalDPI += 1;

      let proceduralPenalty = 0;
      if (formData.instrumentSep === "yes") proceduralPenalty += 3;
      if (formData.perforation === "yes") proceduralPenalty += 3;
      totalDPI += proceduralPenalty;

      if (!isAnterior) survival -= 3;
      if (!isAnterior && !isPremolar) survival -= 3;
      survival -= Math.min(32, Math.round((100 - percent) * 0.48));
      survival -= (basePerio === 1 ? 4 : basePerio === 3 ? 11 : basePerio === 6 ? 24 : 0);
      survival -= (endo >= 2 ? 7 : 0);
      survival -= proceduralPenalty;
      survival = Math.max(40, Math.min(96, survival));

      let isRestorable = false;
      let requiredSurvival = isAnterior ? 40 : isPremolar ? 48 : 52;
      let requiredStructure = isAnterior ? 5 : isPremolar ? 20 : 32;

      if (ferrulePoints >= 4) requiredSurvival += 6;
      else if (ferrulePoints >= 2) requiredSurvival += 3;
      if (basePerio >= 3 && oralHygiene >= 1) requiredSurvival += 4;
      if (totalDPI >= 16) requiredSurvival += 3;

      if (isAnterior) {
        isRestorable = (survival >= requiredSurvival && remainingPercent >= requiredStructure);
      } else if (isPremolar) {
        isRestorable = (survival >= requiredSurvival && remainingPercent >= requiredStructure);
      } else {
        isRestorable = (survival >= requiredSurvival && remainingPercent >= requiredStructure);
      }

        // ==================== FINAL CLEAN & ACCURATE AFFECTING FACTORS ====================
      const affectingFactors: string[] = [];

      if (lesion) affectingFactors.push("Presence of periapical lesion");
      if (basePerio >= 3) affectingFactors.push("Advanced periodontal disease");
      if (medical >= 1) affectingFactors.push("Medical compromise (ASA II or higher)");
      if (endo >= 2) affectingFactors.push("High endodontic complexity");
      if (formData.instrumentSep === "yes") affectingFactors.push("Instrument separation");
      if (formData.perforation === "yes") affectingFactors.push("Root perforation");
      if (context >= 1) affectingFactors.push("Prosthodontic complexity");

            // ==================== FIXED SMART TOOTH STRUCTURE + FERRULE LOGIC ====================
      // According to your rule: If 100% ferrule intact → DO NOT mention ferrule at all
      const missingPercent = 100 - percent;
      const totalFerruleWalls = 4;
      const missingFerruleWalls = Object.values(ferruleWalls).filter(v => v === true).length; 
      // true = missing (clicked by user)

      let structureText = "";

      if (missingPercent > 0) {
        structureText = `${missingPercent}% loss of tooth structure`;
        
        if (missingFerruleWalls >= 3) {
          structureText += ` with no ferrule effect`;
        } else if (missingFerruleWalls >= 1) {
          structureText += ` with insufficient ferrule`;
        }
        // If missingFerruleWalls === 0 → No ferrule text added (as you requested)
      } else {
        structureText = `Adequate remaining tooth structure`;
      }

      affectingFactors.unshift(structureText);   // Always first factor

      // === Oral Hygiene ===
      if (oralHygiene >= 1) {
        affectingFactors.push("Non-compliance with oral hygiene measures");
      }

      const finalFactors = affectingFactors.slice(0, 6);
      // ===================================================================
      const treatmentRec = isRestorable 
        ? (pulpal === "Previously root canal treated" ? "Root Canal Retreatment" 
           : endo === 6 ? "Microsurgical Endodontics"
           : pulpal === "Reversible Pulpitis" ? "Vital Pulp Therapy" 
           : "Root Canal Treatment") 
        : "";

      const explanationNote = isRestorable
        ? `This tooth is considered <strong>practical to retain</strong> because the estimated 4-year survival rate meets the minimum threshold required for a ${toothType} tooth. The remaining coronal structure (${remainingPercent}%) provides acceptable foundation for final restoration.`
        : `Retention of this tooth is considered <strong>impractical</strong>. The estimated 4-year survival rate (${survival.toFixed(1)}%) falls below the acceptable threshold for a ${toothType} tooth.`;

      const casePresText = formData.casePresentation === "3" ? "Asymptomatic" : formData.casePresentation === "2" ? "Symptomatic without swelling" : "Symptomatic with swelling";
      const introParagraph = `The case presented is related to a <strong>${formData.gender.toLowerCase()}</strong> patient, age between <strong>${formData.ageGroup}</strong>. Tooth <strong>#${toothNum}</strong> (${toothType} tooth) is <strong>${casePresText.toLowerCase()}</strong> with <strong>${remainingPercent}%</strong> remaining coronal tooth structure.`;

      const resultData = {
        toothNumber: formData.toothNumber,
        survivalPercentage: survival,
        isPractical: isRestorable,
        totalDPI: totalDPI,
        pulpalDiagnosis: pulpal,
        periapicalDiagnosis: peri,
        remainingPercent: remainingPercent,
        procedureCategory: detectProcedureCategory(pulpal, treatmentRec, isRestorable),
        formData: { ...formData },
        parts: { ...parts },
        ferruleWalls: { ...ferruleWalls },
        treatmentRec,
        toothType,
        explanationNote,
        introParagraph,
        casePresText,
        affectingFactors: finalFactors,
      };

      localStorage.setItem("lastCalculationResult", JSON.stringify(resultData));
      setLoading(false);
      window.location.href = "/predictor/result";

    }, 800);
  };

  const handleSaveCase = async () => {
    if (!caseName?.trim() || !phoneNumber?.trim()) {
      alert("Please fill in Case Name and Phone Number");
      return;
    }

    setSaving(true);

    try {
      const cleanCaseData = {
        caseName: caseName.trim(),
        phoneNumber: phoneNumber.trim(),
        followUpDate: followUpDate || null,
        gender: formData.gender || "",
        ageGroup: formData.ageGroup || "",
        asa: formData.medical || "I",
        toothNumber: formData.toothNumber || "",
        toothType: "Molar",
        pulpalDiagnosis: "",
        periapicalDiagnosis: "",
        periapicalLesion: formData.periApical || "no",
        periodontalStatus: formData.perio || "0",
        proceduralError: formData.instrumentSep === "yes" ? "Instrument Separation" : 
                        (formData.perforation === "yes" ? "Perforation" : "None"),
        treatmentCompletion: "No Treatment",
        survivalEstimate: 0,
        treatmentRec: "",
        isPractical: false,
        furtherNote: furtherNote.trim(),
        createdAt: serverTimestamp(),
        userId: user?.uid,
        savedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "cases"), cleanCaseData);

      alert("Case saved successfully!");

      setShowSaveModal(false);
      setCaseName("");
      setPhoneNumber("");
      setFollowUpDate("");
      setFurtherNote("");

    } catch (error: any) {
      console.error("Save failed:", error);
      alert("Failed to save the case. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (typeof window !== "undefined") {
    (window as any).goToRestorative = (toothNumber: string) => {
      const restorativeData = { toothNumber };
      localStorage.setItem("restorativeData", JSON.stringify(restorativeData));
      window.location.href = "/restorative";
    };
  }

  return (
    <ProtectedRoute>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Modern Hero Section */}
        <div className="relative h-[380px] sm:h-[420px] bg-cover bg-center" style={{ backgroundImage: "url('https://iili.io/Bw4dt99.jpg')" }}>
          <div className="absolute inset-0 bg-black/75"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#0f6cbd] via-[#10b981] to-[#0f6cbd] bg-clip-text text-transparent">
              Endodontic Prognosis Predictor
            </h1>
            <p className="text-2xl text-gray-200">4-year Tooth Survival Estimate</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex justify-between mb-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-2 rounded-full mx-1 transition-all ${step >= s ? 'bg-[#10b981]' : 'bg-gray-700'}`} />
            ))}
          </div>

          <div className="bg-[#1e2937] rounded-3xl p-10 shadow-2xl">
            <h2 className="text-3xl font-bold mb-8 text-[#0f6cbd]">Step {step} of 3</h2>

            {step === 1 && (
              <div className="space-y-10">
                <div className="border-l-8 border-[#3b82f6] bg-[#0f172a] p-6 rounded-2xl">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Case Presentation</label>
                      <select name="casePresentation" value={formData.casePresentation} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="3">Asymptomatic</option>
                        <option value="2">Symptomatic without swelling</option>
                        <option value="1">Symptomatic with swelling</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Tooth Number</label>
                      <select name="toothNumber" value={formData.toothNumber} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="">Select tooth number</option>
                        {["11","12","13","14","15","16","17","18","21","22","23","24","25","26","27","28","31","32","33","34","35","36","37","38","41","42","43","44","45","46","47","48"].map(n => (
                          <option key={n} value={n}>#{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-l-8 border-[#eab308] bg-[#0f172a] p-6 rounded-2xl">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Patient Age</label>
                      <select name="ageGroup" value={formData.ageGroup} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="1-12 years">1-12 years</option>
                        <option value="13-25 years">13-25 years</option>
                        <option value="26-40 years">26-40 years</option>
                        <option value="Over 40 years">Over 40 years</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-8">
                    <label className="block text-sm text-gray-400 mb-2">Oral Hygiene</label>
                    <select name="oralHygiene" value={formData.oralHygiene} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                      <option value="0">Compliant / Good</option>
                      <option value="1">Fair</option>
                      <option value="2">Neglected / Poor</option>
                    </select>
                  </div>
                </div>

                <div className="border-l-8 border-[#ef4444] bg-[#0f172a] p-6 rounded-2xl">
                  <label className="block text-sm text-gray-400 mb-2">Periodontal Consideration</label>
                  <select name="perio" value={formData.perio} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                    <option value="0">Healthy periodontium</option>
                    <option value="1">Gingivitis</option>
                    <option value="3">Initial and moderate periodontitis</option>
                    <option value="6">Advanced periodontal disease / mobility / probing depth &gt;5 mm</option>
                  </select>
                </div>

                <div className="border-l-8 border-[#10b981] bg-[#0f172a] p-6 rounded-2xl">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Medical Status</label>
                      <select name="medical" value={formData.medical} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="0">ASA I – Medically fit</option>
                        <option value="1">ASA II – Controlled medical condition</option>
                        <option value="3">ASA III – Uncontrolled medical condition</option>
                        <option value="6">ASA IV or higher</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Medications</label>
                      <select name="medications" value={formData.medications} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="0">Not taken</option>
                        <option value="1">Does not require modifications</option>
                        <option value="2">Require modifications</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-600 rounded-2xl p-6 sm:p-8 bg-[#0f172a]">
                  <div className="flex justify-center">
                    <svg 
                      width="440" 
                      height="340" 
                      viewBox="0 0 440 340" 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="w-full max-w-[440px] h-auto mx-auto touch-manipulation"
                    >
                      <rect x="80" y="80" width="280" height="190" rx="25" ry="25" fill="#f1f1f1" stroke="#333" strokeWidth="25"/>
                      <rect id="mesial" x="100" y="105" width="65" height="140" rx="12" fill={parts.mesial ? "#4ade80" : "#e5e5e5"} stroke="#333" strokeWidth="10" onClick={() => togglePart('mesial')} style={{cursor:'pointer'}}/>
                      <rect id="distal" x="275" y="105" width="65" height="140" rx="12" fill={parts.distal ? "#4ade80" : "#e5e5e5"} stroke="#333" strokeWidth="10" onClick={() => togglePart('distal')} style={{cursor:'pointer'}}/>
                      <rect id="buccal" x="125" y="85" width="190" height="55" rx="12" fill={parts.buccal ? "#4ade80" : "#e5e5e5"} stroke="#333" strokeWidth="10" onClick={() => togglePart('buccal')} style={{cursor:'pointer'}}/>
                      <rect id="lingual" x="125" y="210" width="190" height="55" rx="12" fill={parts.lingual ? "#4ade80" : "#e5e5e5"} stroke="#333" strokeWidth="10" onClick={() => togglePart('lingual')} style={{cursor:'pointer'}}/>
                      <circle id="occlusal" cx="220" cy="175" r="52" fill={parts.occlusal ? "#4ade80" : "#e5e5e5"} stroke="#333" strokeWidth="14" onClick={() => togglePart('occlusal')} style={{cursor:'pointer'}}/>
                      <rect id="ferruleMesial" x="48" y="68" width="14" height="214" rx="7" fill="transparent" stroke={ferruleWalls.mesial ? "#ef4444" : "#666"} strokeWidth="10" strokeDasharray={ferruleWalls.mesial ? "none" : "8,5"} onClick={() => toggleFerrule('mesial')} style={{cursor:'pointer'}}/>
                      <rect id="ferruleDistal" x="378" y="68" width="14" height="214" rx="7" fill="transparent" stroke={ferruleWalls.distal ? "#ef4444" : "#666"} strokeWidth="10" strokeDasharray={ferruleWalls.distal ? "none" : "8,5"} onClick={() => toggleFerrule('distal')} style={{cursor:'pointer'}}/>
                      <rect id="ferruleBuccal" x="68" y="48" width="304" height="14" rx="7" fill="transparent" stroke={ferruleWalls.buccal ? "#ef4444" : "#666"} strokeWidth="10" strokeDasharray={ferruleWalls.buccal ? "none" : "8,5"} onClick={() => toggleFerrule('buccal')} style={{cursor:'pointer'}}/>
                      <rect id="ferruleLingual" x="68" y="278" width="304" height="14" rx="7" fill="transparent" stroke={ferruleWalls.lingual ? "#ef4444" : "#666"} strokeWidth="10" strokeDasharray={ferruleWalls.lingual ? "none" : "8,5"} onClick={() => toggleFerrule('lingual')} style={{cursor:'pointer'}}/>
                    </svg>
                  </div>
                  <p className="mt-8 text-sm text-gray-400 text-center px-4">
                    Click on the tooth walls and occlusal surface to indicate remaining coronal structure.<br/>
                    <strong>Click the outer lines around the tooth to indicate missing ferrule effect.</strong>
                  </p>
                  <p className="text-2xl font-bold text-[#0f6cbd] mt-6 text-center">
                    Remaining coronal structure: <span className="text-white">{remainingPercent}%</span>
                  </p>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-[#0f6cbd] hover:bg-[#0a5a9c] py-6 rounded-2xl text-xl font-semibold mt-8"
                >
                  Next → Clinical Examination & Diagnosis
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-10">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Need help with endodontic diagnosis?</label>
                  <select name="needHelpDiagnosis" value={formData.needHelpDiagnosis} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="yes">Yes (use automatic investigation)</option>
                    <option value="no">No (I will select diagnosis manually)</option>
                  </select>
                </div>

                {formData.needHelpDiagnosis === "yes" && (
                  <div className="border border-[#3b82f6] p-8 rounded-2xl">
                    <h3 className="font-bold text-lg mb-6 text-[#3b82f6]">Endodontic Investigation</h3>
                    <h4 className="font-semibold mb-4">1. History of Chief Complaint</h4>
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Pain with Cold</label>
                        <select name="painCold" value={formData.painCold} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Pain with Hot</label>
                        <select name="painHot" value={formData.painHot} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Spontaneous Pain</label>
                        <select name="spontaneous" value={formData.spontaneous} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Pain to Sweets (candy, chocolate, etc.)</label>
                        <select name="painSweets" value={formData.painSweets} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>

                    <h4 className="font-semibold mb-4">2. Clinical Finding</h4>
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Cold testing</label>
                        <select name="coldTest" value={formData.coldTest} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="">Select</option>
                          <option value="normal">Within normal limit</option>
                          <option value="over">Over stimulation (less than 30 seconds)</option>
                          <option value="severe">Severe stimulation (more than 30 seconds)</option>
                          <option value="no">No response</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Percussion test</label>
                        <select name="percussion" value={formData.percussion} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="">Select</option>
                          <option value="tender">Tender to percussion</option>
                          <option value="no">No tenderness to percussion</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Presence of sinus tract</label>
                        <select name="sinus" value={formData.sinus} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="">Select</option>
                          <option value="traceable">There is a traceable sinus tract</option>
                          <option value="not-traceable">There is sinus tract but could not trace it</option>
                          <option value="no">There is no sinus tract</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Presence of swelling</label>
                        <select name="swelling" value={formData.swelling} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>

                    <h4 className="font-semibold mb-4">3. Radiographic Finding</h4>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Periapical lesion</label>
                        <select name="periApical" value={formData.periApical} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Root canal Treated</label>
                        <select name="rootTreated" value={formData.rootTreated} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Root canal system accessed</label>
                        <select name="rootAccessed" value={formData.rootAccessed} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {formData.needHelpDiagnosis === "no" && (
                  <div className="border border-[#0f6cbd] p-8 rounded-2xl">
                    <h3 className="font-bold text-lg mb-6">Manual Diagnosis</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Working Diagnosis - Pulpal</label>
                        <select name="pulpalManual" value={formData.pulpalManual} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="">Select</option>
                          <option value="Reversible Pulpitis">Reversible Pulpitis</option>
                          <option value="Irreversible Pulpitis">Irreversible Pulpitis</option>
                          <option value="Pulp Necrosis">Pulp Necrosis</option>
                          <option value="Previously initiated root canal treatment">Previously initiated root canal treatment</option>
                          <option value="Previously root canal treated">Previously root canal treated</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Working Diagnosis - Periapical</label>
                        <select name="periManual" value={formData.periManual} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                          <option value="">Select</option>
                          <option value="Normal Apical tissue">Normal Apical tissue</option>
                          <option value="Symptomatic Apical Periodontitis">Symptomatic Apical Periodontitis</option>
                          <option value="Asymptomatic Apical Periodontitis">Asymptomatic Apical Periodontitis</option>
                          <option value="Acute Apical Abscess">Acute Apical Abscess</option>
                          <option value="Chronic Apical Abscess">Chronic Apical Abscess</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Endodontic score</label>
                  <select name="endo" value={formData.endo} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                    <option value="0">No treatment required</option>
                    <option value="1">Accessible root canal treatment or retreatment</option>
                    <option value="2">Challenging root canal anatomy / complex retreatment</option>
                    <option value="6">Untreatable root canal system</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Instrument Separation</label>
                  <select name="instrumentSep" value={formData.instrumentSep} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  {formData.instrumentSep === "yes" && (
                    <div className="mt-4 p-6 bg-[#0f172a] border border-gray-600 rounded-2xl">
                      <label className="block text-sm text-gray-400 mb-2">Location</label>
                      <select name="sepLocation" value={formData.sepLocation} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="coronal">Coronal</option>
                        <option value="middle">Middle</option>
                        <option value="apical">Apical</option>
                      </select>
                      <label className="block text-sm text-gray-400 mb-2 mt-4">Stage</label>
                      <select name="sepStage" value={formData.sepStage} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="before">Before cleaning</option>
                        <option value="after">After cleaning</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Perforation</label>
                  <select name="perforation" value={formData.perforation} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                  {formData.perforation === "yes" && (
                    <div className="mt-4 p-6 bg-[#0f172a] border border-gray-600 rounded-2xl">
                      <label className="block text-sm text-gray-400 mb-2">Location</label>
                      <select name="perfLocation" value={formData.perfLocation} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="coronal">Coronal</option>
                        <option value="middle">Middle</option>
                        <option value="apical">Apical</option>
                      </select>
                      <label className="block text-sm text-gray-400 mb-2 mt-4">Time</label>
                      <select name="perfTime" value={formData.perfTime} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                        <option value="recent">Recent</option>
                        <option value="old">Old</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Context</label>
                  <select name="prostho" value={formData.prostho} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4">
                    <option value="0">Isolated dental problem</option>
                    <option value="1">Prosthodontic plan / abutment</option>
                    <option value="2">Complex prosthodontic plan</option>
                    <option value="6">Retention would compromise plan</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-6 rounded-2xl text-xl font-semibold"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={calculate}
                    disabled={loading}
                    className="flex-1 bg-[#0f6cbd] hover:bg-[#0a5a9c] py-6 rounded-2xl text-xl font-semibold"
                  >
                    {loading ? "Calculating..." : "Generate Result Summary"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Case Modal - Fully preserved */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
            <div className="bg-[#1e2937] rounded-3xl p-8 max-w-md w-full mx-4 border border-gray-700">
              <h3 className="text-2xl font-bold mb-6 text-[#0f6cbd]">Save Case 📋</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Case Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white focus:outline-none focus:border-[#0f6cbd]"
                    placeholder="e.g. Mr. Ahmed - Tooth 36"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white focus:outline-none focus:border-[#0f6cbd]"
                    placeholder="+966 50 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Follow-up Date (Optional)</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white focus:outline-none focus:border-[#0f6cbd]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Further Note (Optional)</label>
                  <textarea
                    value={furtherNote}
                    onChange={(e) => setFurtherNote(e.target.value)}
                    className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white focus:outline-none focus:border-[#0f6cbd] h-24 resize-y"
                    placeholder="Any additional clinical notes, observations, or comments..."
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
                  {saving ? (
                    <>
                      <svg 
                        className="animate-spin h-5 w-5 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        ></circle>
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        ></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "💾 Save Case"
                  )}
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