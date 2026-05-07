// app/crack-classifier/page.tsx
"use client";
import Navigation from "../components/navigation";
import ProtectedRoute from "../components/protectedroute";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { casesService, detectProcedureCategory } from "../lib/casesService";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function CrackToothClassifier() {
  const [isDark, setIsDark] = useState(true);
  const [deepPockets, setDeepPockets] = useState(0);
  const [pocketColors, setPocketColors] = useState({
    p1: "#4ade80", p2: "#4ade80", p3: "#4ade80",
    p4: "#4ade80", p5: "#4ade80", p6: "#4ade80"
  });
  const [loading, setLoading] = useState(false);
  const [showPocketModal, setShowPocketModal] = useState(false);
  const [currentPocket, setCurrentPocket] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    toothNumber: "",
    toothType: "Molar",
    rctStatus: "0",
    painBiting: "0",
    sharpCold: "0",
    spontLingering: "0",
    biteTest: "0",
    transillum: "0",
    marginalRidge: "0",
    restoration: "0",
    percussion: "0",
    swelling: "0",
    sinus: "0",
    periLesion: "0",
    jLesion: "0",
    apicoMarginal: "0",
    mobility: "0",
  });

  const { user } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "toothNumber") {
      const premolars = ["14","15","24","25","34","35","44","45"];
      const newType = premolars.includes(value) ? "Premolar" : value ? "Molar" : "Molar";
      setFormData(prev => ({ ...prev, toothType: newType }));
    }
  };

  const openPocketModal = (n: number) => {
    setCurrentPocket(n);
    setShowPocketModal(true);
  };

  const confirmPocketDepth = (val: number) => {
    let newColor = "#4ade80";
    let newDeepPockets = deepPockets;

    if (val === 2) {
      newColor = "#ef4444";
      newDeepPockets = 1;
    } else if (val === 1) {
      newColor = "#eab308";
    }

    setPocketColors(prev => ({ ...prev, [`p${currentPocket}`]: newColor }));
    setDeepPockets(newDeepPockets);
    setShowPocketModal(false);
    setCurrentPocket(null);
  };

  const calculateCrackProbability = () => {
    if (!formData.toothNumber) {
      alert("Please select a tooth number");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const crackVisible = formData.transillum === "1";
      const distalMargin = parseInt(formData.marginalRidge) === 1;
      const deepPocket = deepPockets > 0;
      const percussion = parseInt(formData.percussion) === 1;
      const periLesion = parseInt(formData.periLesion) === 1;
      const swelling = parseInt(formData.swelling) === 1;
      const sinus = parseInt(formData.sinus) === 1;
      const mobility = parseInt(formData.mobility) === 1;
      const isRCT = formData.rctStatus === "1";
      const largeRest = parseInt(formData.restoration) >= 3;

      let crackType = "Crown-Originating Fracture (COF)";
      let iowaStage = "";
      let successRate = "";
      let isVRF = false;
      let recommendation = "";
      let introText = "";

      // VRF Special Case
      if (isRCT && largeRest && (deepPocket || swelling || sinus || mobility)) {
        crackType = "Vertical Root Fracture (VRF)";
        isVRF = true;
        introText = "Vertical Root Fracture (VRF) Highly Suspected";
        recommendation = "Confirm with exploratory surgery or by initiating treatment and follow-up for symptoms to heal or persist to confirm the diagnosis. Note that CBCT cannot reliably confirm the presence of a crack. Prognosis is generally poor — extraction is often the most predictable option.";
      } 
      // Normal Crack Flow
      else {
        crackType = "Crown-Originating Fracture (COF)";

        let stage = "I";
        let success = "93%";

        if (deepPocket) {
          stage = "IV";
          success = "41%";
        } else if (distalMargin) {
          if (percussion || periLesion) {
            stage = "III";
            success = "69%";
          } else {
            stage = "II";
            success = "84%";
          }
        }

        iowaStage = stage;
        successRate = success;

        recommendation = isRCT 
          ? "Tooth is already root canal treated. Focus on crack stabilization and monitoring for propagation. Consider cuspal coverage or full coverage restoration if not already present."
          : "Immediate stabilization with provisional crown. Proceed with root canal treatment if pulp is irreversibly inflamed.";
      }

      const resultData = {
        formData: { ...formData },
        deepPockets,
        pocketColors: { ...pocketColors },
        crackType,
        isVRF,
        iowaStage,
        successRate,
        recommendation,
        introText,
        toothNumber: formData.toothNumber,
        toothType: formData.toothType,
      };

      localStorage.setItem("lastCrackResult", JSON.stringify(resultData));
      window.location.href = "/crack-classifier/result";

    }, 800);
  };

  return (
    <ProtectedRoute>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Hero Section */}
        <div className="relative h-[420px] bg-cover bg-center" 
             style={{ backgroundImage: "url('https://iili.io/BwkLI0N.jpg')" }}>
          <div className="absolute inset-0 bg-black/75"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#0f6cbd] via-[#10b981] to-[#0f6cbd] bg-clip-text text-transparent">
              Crack Tooth Classifier
            </h1>
            <p className="text-2xl text-gray-200">Iowa Classification + VRF Detection</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="bg-[#1e2937] rounded-3xl p-10 shadow-2xl">

            {/* 1. Tooth & Case */}
            <div className="border-l-8 border-[#3b82f6] bg-[#0f172a] p-8 rounded-2xl mb-10">
              <h3 className="text-xl font-semibold mb-6">1. Tooth & Case Identification</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tooth Number</label>
                  <select name="toothNumber" value={formData.toothNumber} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="">Select tooth number</option>
                    {["14","15","16","17","18","24","25","26","27","28","34","35","36","37","38","44","45","46","47","48"].map(n => (
                      <option key={n} value={n}>#{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tooth Type</label>
                  <input type="text" value={formData.toothType} readOnly className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-gray-400" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Root Canal Treated?</label>
                  <select name="rctStatus" value={formData.rctStatus} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Symptoms */}
            <div className="border-l-8 border-[#eab308] bg-[#0f172a] p-8 rounded-2xl mb-10">
              <h3 className="text-xl font-semibold mb-6">2. Patient Symptoms / History</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Pain on biting / chewing</label>
                  <select name="painBiting" value={formData.painBiting} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Sharp pain to cold/sweet</label>
                  <select name="sharpCold" value={formData.sharpCold} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Spontaneous / lingering pain</label>
                  <select name="spontLingering" value={formData.spontLingering} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Clinical Examination */}
            <div className="border-l-8 border-[#ef4444] bg-[#0f172a] p-8 rounded-2xl mb-10">
              <h3 className="text-xl font-semibold mb-6">3. Clinical Examination Findings</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Bite Test</label>
                  <select name="biteTest" value={formData.biteTest} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">Negative</option><option value="1">Positive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Crack Line Visible using light source?</label>
                  <select name="transillum" value={formData.transillum} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Marginal Ridge Involved</label>
                  <select name="marginalRidge" value={formData.marginalRidge} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">None / Mesial only</option>
                    <option value="1">Distal only or Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Restoration Status</label>
                  <select name="restoration" value={formData.restoration} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No restoration</option>
                    <option value="1">Occlusal</option>
                    <option value="2">MO</option>
                    <option value="3">DO</option>
                    <option value="4">MOD / Crown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Percussion Sensitivity</label>
                  <select name="percussion" value={formData.percussion} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Presence of Swelling</label>
                  <select name="swelling" value={formData.swelling} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Sinus Tract Present</label>
                  <select name="sinus" value={formData.sinus} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Mobility (Yes / No)</label>
                  <select name="mobility" value={formData.mobility} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>

              {/* Tooth Diagram */}
              <div className="mt-10 p-8 bg-[#0f172a] rounded-2xl border border-gray-700">
                <svg width="500" height="380" viewBox="0 0 500 380" xmlns="http://www.w3.org/2000/svg" className="mx-auto block">
                  <ellipse cx="250" cy="190" rx="135" ry="105" fill="#e2e8f0" stroke="#1e2937" strokeWidth="28"/>
                  <circle cx="190" cy="145" r="28" fill="#cbd5e1" stroke="#1e2937" strokeWidth="12"/>
                  <circle cx="310" cy="145" r="28" fill="#cbd5e1" stroke="#1e2937" strokeWidth="12"/>
                  <circle cx="185" cy="235" r="28" fill="#cbd5e1" stroke="#1e2937" strokeWidth="12"/>
                  <circle cx="315" cy="235" r="28" fill="#cbd5e1" stroke="#1e2937" strokeWidth="12"/>
                  
                  {[1,2,3,4,5,6].map(n => (
                    <circle 
                      key={n}
                      cx={n===1 ? 165 : n===2 ? 250 : n===3 ? 335 : n===4 ? 165 : n===5 ? 250 : 335} 
                      cy={n===1 || n===4 ? 145 : n===2 ? 125 : n===3 || n===6 ? 145 : 255} 
                      r="24" 
                      fill={pocketColors[`p${n}` as keyof typeof pocketColors]} 
                      stroke="#1e2937" 
                      strokeWidth="10" 
                      onClick={() => openPocketModal(n)} 
                      style={{cursor:'pointer'}} 
                    />
                  ))}
                  
                  <text x="250" y="45" fontSize="26" textAnchor="middle" fontWeight="bold" fill="#cbd5e1">Occlusal View</text>
                  <text x="100" y="185" fontSize="18" textAnchor="middle" fill="#cbd5e1">Mesial</text>
                  <text x="400" y="185" fontSize="18" textAnchor="middle" fill="#cbd5e1">Distal</text>
                  <text x="250" y="90" fontSize="18" textAnchor="middle" fill="#cbd5e1">Buccal</text>
                  <text x="250" y="290" fontSize="18" textAnchor="middle" fill="#cbd5e1">Lingual</text>
                </svg>
                <p className="text-center mt-6 text-sm text-gray-400">Click circles to record probing depth</p>
                <p className="text-center font-bold text-[#10b981] text-xl mt-3">Deep pockets: {deepPockets}</p>
              </div>
            </div>

            {/* 4. Radiographic */}
            <div className="border-l-8 border-[#10b981] bg-[#0f172a] p-8 rounded-2xl mb-10">
              <h3 className="text-xl font-semibold mb-6">4. Radiographic Findings</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Periapical Lesion</label>
                  <select name="periLesion" value={formData.periLesion} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">J-shaped lesion / Halo</label>
                  <select name="jLesion" value={formData.jLesion} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Apico-marginal defect on CBCT</label>
                  <select name="apicoMarginal" value={formData.apicoMarginal} onChange={handleChange} className="w-full bg-[#0f172a] border border-gray-600 rounded-2xl p-4 text-white">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={calculateCrackProbability}
              disabled={loading || !formData.toothNumber}
              className="w-full bg-[#0f6cbd] hover:bg-[#0a5a9c] py-6 rounded-2xl text-xl font-semibold mt-8 disabled:opacity-70"
            >
              {loading ? "Analyzing the case..." : "Calculate Crack Probability & Classification"}
            </button>
          </div>

          <div className="text-center mt-12">
            <Link href="/home" className="inline-block bg-[#64748b] hover:bg-[#475569] text-white px-10 py-4 rounded-full text-lg transition">
              ← Back to Home Page
            </Link>
          </div>

          <p className="text-center mt-16 text-sm text-gray-500">
            This is a clinical decision support tool only.<br />
            © 2026 Endoprognosis Project. All rights reserved.
          </p>
        </div>

        {/* Pocket Depth Modal */}
        {showPocketModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
            <div className="bg-[#1e2937] p-8 rounded-3xl w-full max-w-sm mx-4 border border-gray-600">
              <h3 className="text-xl font-semibold mb-6 text-center">Probing Depth at this site?</h3>
              <div className="space-y-3">
                <button onClick={() => confirmPocketDepth(0)} className="w-full py-4 bg-[#4ade80] hover:bg-green-600 text-black font-semibold rounded-2xl">Normal (&lt; 3 mm)</button>
                <button onClick={() => confirmPocketDepth(1)} className="w-full py-4 bg-[#eab308] hover:bg-yellow-600 text-black font-semibold rounded-2xl">Attachment loss (3–4.9 mm)</button>
                <button onClick={() => confirmPocketDepth(2)} className="w-full py-4 bg-[#ef4444] hover:bg-red-600 text-white font-semibold rounded-2xl">Deep (≥ 5 mm)</button>
              </div>
              <button onClick={() => setShowPocketModal(false)} className="mt-6 w-full py-3 text-gray-400 hover:text-white">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}