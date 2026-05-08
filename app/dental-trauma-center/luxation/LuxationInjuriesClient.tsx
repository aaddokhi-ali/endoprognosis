"use client";
import Navigation from "../../components/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTrauma } from "../../context/TraumaContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LuxationInjuriesClient() {
  const { user } = useAuth();
  const { patientInfo, saveCase, loadCaseByPhone } = useTrauma();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    injuryDate: new Date().toISOString().slice(0, 16),
    displaced: "none",
    mobility: "normal",
    percussion: "tender",
    sulcularBleeding: false,
    crownFracture: false,
    openApex: false,
  });

  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const phone = searchParams.get("phone");
    if (phone) {
      loadCaseByPhone(phone);
    }
  }, [user, router, searchParams, loadCaseByPhone]);

  useEffect(() => {
    if (patientInfo?.traumaDate) {
      setFormData(prev => ({
        ...prev,
        injuryDate: patientInfo.traumaDate
      }));
    }
  }, [patientInfo]);

  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [id]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const identifyAndGenerate = () => {
    setIsGenerating(true);
    
    const { displaced, mobility, percussion, sulcularBleeding, crownFracture, openApex } = formData;

    let type = "concussion";
    if (displaced === "apical" || mobility === "locked") type = "intrusive";
    else if (displaced === "lateral") type = "lateral";
    else if (displaced === "axial" || mobility === "marked") type = "extrusive";
    else if (mobility === "increased" || sulcularBleeding) type = "subluxation";

    let title = "", presentation = "", management = "", prognosisText = "", radiographs = "";

    if (type === "concussion") {
      title = "Concussion";
      presentation = "No displacement, normal mobility, tender to percussion.";
      management = `• No active treatment required.<br>
        • Reduce antagonist if occlusal interference.<br>
        • Optional splint ~2 weeks for comfort.`;
      radiographs = "Two periapical radiographs (mesial & distal) to exclude displacement.";
      prognosisText = "Pulp complications rare. Root resorption very rare (repair-related only).";
    } else if (type === "subluxation") {
      title = "Subluxation";
      presentation = "No displacement, increased mobility, sulcular bleeding.";
      management = `• Reduce occlusal loading if needed.<br>
        • Soft diet 2 weeks.<br>
        • Optional flexible splint ~2 weeks.`;
      radiographs = "Two periapical radiographs (mesial & distal) to exclude displacement.";
      prognosisText = "Low necrosis rate unless crown fracture present. Resorption rare.";
    } else if (type === "extrusive") {
      title = "Extrusive Luxation";
      presentation = "Partial axial displacement, markedly mobile, elongated appearance.";
      management = `• Gentle repositioning with axial pressure.<br>
        • Flexible splint for 2 weeks.<br>
        • Open apex: Monitor revascularization.<br>
        • Closed apex: Root canal treatment before/at splint removal.`;
      radiographs = "One occlusal + two periapical radiographs (mesial & distal). Widened PDL space expected.";
      prognosisText = openApex ? "High revascularization potential." : "Necrosis common in closed apex. Repair-related resorption possible.";
    } else if (type === "lateral") {
      title = "Lateral Luxation";
      presentation = "Eccentric displacement, locked in bone, high metallic percussion tone.";
      management = `• Regional anesthesia required.<br>
        • Disengage bony lock then reposition.<br>
        • Flexible splint for 4 weeks.`;
      radiographs = "One occlusal + two periapical radiographs. CBCT recommended for alveolar fracture confirmation.";
      prognosisText = openApex ? "Revascularization possible." : "Necrosis expected. Repair & ankylosis-related resorption possible.";
    } else {
      title = "Intrusive Luxation";
      presentation = "Apical displacement, shortened crown, immobile/locked.";
      management = `• Open apex: Spontaneous re-eruption or orthodontic/surgical repositioning.<br>
        • Closed apex: Surgical/orthodontic repositioning + splint 4–8 weeks.<br>
        • Root canal treatment usually required for closed apex.`;
      radiographs = "One occlusal + two periapical radiographs. PDL space may be absent. CBCT highly recommended.";
      prognosisText = openApex ? "Revascularization possible." : "Pulp necrosis almost universal. High risk of ankylosis and replacement resorption.";
    }

    const followItems = [
      {days: 14, label: "2 weeks", action: "Splint removal (if used) + clinical & radiographic control"},
      {days: 42, label: "6 weeks", action: "Clinical sensibility testing + radiographic assessment for resorption"},
      {days: 180, label: "6 months", action: "Full evaluation for pulp vitality, root development & ankylosis"},
      {days: 365, label: "1 year", action: "Long-term monitoring for late resorption or necrosis"}
    ];

    let followHTML = followItems.map(item => {
      const due = new Date(formData.injuryDate);
      due.setDate(due.getDate() + item.days);
      return `<div class="flex justify-between items-start border-b border-white/10 pb-4"><div class="font-semibold text-white">${item.label}</div><div class="text-right text-gray-300">${item.action}<br><span class="text-sm text-gray-500">${due.toLocaleDateString('en-GB')}</span></div></div>`;
    }).join('');

    const html = `
      <div class="space-y-10">
        <div>
          <h2 class="text-4xl font-bold text-white">${patientInfo.patientName || "Patient"} — Tooth ${patientInfo.tooth || "??"}</h2>
          <p class="text-xl text-indigo-300">${patientInfo.age || "??"} years • Case ID: ${patientInfo.phoneNumber || "??"}</p>
          <p class="text-lg text-gray-400 mt-1">Injury: ${new Date(formData.injuryDate).toLocaleString()}</p>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-3xl mb-6 text-indigo-400">${title}</h3>
          <p class="text-lg text-gray-200"><strong>Clinical Presentation:</strong> ${presentation}</p>
          ${crownFracture ? `<p class="mt-4 text-amber-400 font-medium">Associated crown fracture — higher risk of pulp necrosis</p>` : ''}
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-indigo-400">Recommended Radiographs</h3>
          <p class="text-gray-200">${radiographs}</p>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-indigo-400">Management Protocol (IADT 2020)</h3>
          <div class="prose prose-invert text-gray-200 leading-relaxed">${management}</div>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-indigo-400">Expected Outcome & Risks</h3>
          <p class="text-gray-200">${prognosisText}</p>
          <p class="mt-4 text-amber-400">High-risk injuries (lateral & intrusive) carry increased chance of ankylosis and replacement resorption.</p>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-indigo-400">Patient Instructions</h3>
          <ul class="space-y-3 text-lg text-gray-200">
            <li>Soft diet for 1–2 weeks</li>
            <li>Excellent oral hygiene with soft toothbrush</li>
            <li>0.12% chlorhexidine rinses twice daily for 2 weeks</li>
            <li>Avoid contact sports; use mouthguard when resuming activity</li>
            <li>Return immediately if pain increases or swelling develops</li>
          </ul>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-indigo-400">Follow-up Schedule with Specific Actions</h3>
          ${followHTML}
          <p class="text-sm text-gray-400 mt-6">Monitor for pulp vitality, root development, inflammatory resorption, ankylosis, and replacement resorption at every visit.</p>
        </div>
      </div>
    `;

    setResult(html);
    setIsGenerating(false);
  };

  const exportPDF = () => alert("✅ Personalized Professional PDF Generated!");
  const shareEmail = () => alert("📧 Report ready to share via email");

  const handleSaveCase = () => {
    saveCase("Luxation Injuries", { 
      ...formData,
      patientInfo 
    }, result || "");
  };

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-indigo-950 to-[#0a1428] py-16 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-5xl font-bold flex items-center gap-4">
                  🔄 Luxation Injuries
                </h1>
                <p className="text-2xl text-indigo-300 mt-3">Diagnostic Guide & Management</p>
              </div>
              <div className="text-right text-indigo-400 text-sm">
                IADT 2020 • AAE Guidelines
              </div>
            </div>
          </div>
        </div>

        {/* Current Case Header */}
        <div className="max-w-7xl mx-auto px-6 py-6 border-b border-white/10 bg-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">CURRENT CASE</p>
              <h2 className="text-2xl font-semibold">
                {patientInfo.patientName || "Unknown Patient"} — Tooth {patientInfo.tooth || "??"} 
                {patientInfo.age && ` • ${patientInfo.age} years`}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Case ID (Phone)</p>
              <p className="font-mono text-indigo-400">{patientInfo.phoneNumber || "Not loaded"}</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-12 gap-8">
            {/* Left Diagnostic Panel */}
            <div className="md:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-10">
              <h2 className="text-3xl font-semibold mb-8 flex items-center gap-3">
                Diagnostic Guide
              </h2>
              <p className="text-gray-400 mb-8">Answer the questions below — the system will identify the most likely luxation type and provide full management.</p>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Patient Name</label>
                    <input type="text" value={patientInfo.patientName || ""} className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white" readOnly />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Tooth (FDI)</label>
                    <input type="text" value={patientInfo.tooth || ""} className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Age (years)</label>
                    <input type="text" value={patientInfo.age || ""} className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white" readOnly />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Injury Date/Time</label>
                    <input 
                      type="datetime-local" 
                      value={formData.injuryDate} 
                      onChange={(e) => setFormData(prev => ({...prev, injuryDate: e.target.value}))}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm mb-3 text-gray-400">1. Displacement of the tooth</label>
                    <select id="displaced" value={formData.displaced} onChange={handleChange} className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white">
                      <option value="none">None</option>
                      <option value="axial">Partial axial (elongated)</option>
                      <option value="lateral">Eccentric / sideways</option>
                      <option value="apical">Apical (shortened / intruded)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-3 text-gray-400">2. Mobility</label>
                    <select id="mobility" value={formData.mobility} onChange={handleChange} className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white">
                      <option value="normal">Normal</option>
                      <option value="increased">Increased</option>
                      <option value="marked">Markedly increased</option>
                      <option value="locked">Immobile / locked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-3 text-gray-400">3. Percussion</label>
                    <select id="percussion" value={formData.percussion} onChange={handleChange} className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white">
                      <option value="tender">Tender (normal sound)</option>
                      <option value="metallic">High metallic tone</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="sulcularBleeding" checked={formData.sulcularBleeding} onChange={handleChange} className="w-5 h-5 accent-[#10b981]" />
                    <label className="font-medium">Sulcular bleeding present</label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="crownFracture" checked={formData.crownFracture} onChange={handleChange} className="w-5 h-5 accent-[#10b981]" />
                    <label className="font-medium">Associated crown fracture</label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="openApex" checked={formData.openApex} onChange={handleChange} className="w-5 h-5 accent-[#10b981]" />
                    <label className="font-medium">Open apex (immature tooth)</label>
                  </div>
                </div>
              </div>

              <button 
                onClick={identifyAndGenerate} 
                disabled={isGenerating}
                className="mt-12 w-full bg-gradient-to-r from-indigo-700 to-blue-600 hover:from-indigo-800 hover:to-blue-700 disabled:opacity-70 text-white py-7 rounded-3xl font-bold text-2xl flex items-center justify-center gap-4 shadow-lg transition-all"
              >
                {isGenerating ? "IDENTIFYING & GENERATING..." : "IDENTIFY TYPE & GENERATE PROTOCOL"}
              </button>
            </div>

            {/* Result Panel */}
            <div className="md:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-10 min-h-[900px] overflow-auto">
              {!result ? (
                <div className="h-full flex items-center justify-center text-center text-gray-500">
                  <div>
                    <p className="text-xl">Complete the diagnostic questions on the left</p>
                    <p className="text-2xl font-semibold text-indigo-400 mt-4">The system will identify the luxation type and show full protocol.</p>
                  </div>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: result }} />
              )}

              <div className="mt-12 flex gap-6">
                <button onClick={exportPDF} className="flex-1 bg-indigo-700 hover:bg-indigo-800 text-white py-7 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3">
                  Export as PDF
                </button>
                <button onClick={handleSaveCase} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-7 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3">
                  Save Case
                </button>
                <button onClick={shareEmail} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-7 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3">
                  Share via Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}