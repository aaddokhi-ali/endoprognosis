"use client";
import Navigation from "../../components/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTrauma } from "../../context/TraumaContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdvancedFractures() {
  const { user } = useAuth();
  const { patientInfo, saveCase, loadCaseByPhone } = useTrauma();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    fractureType: "crownroot",
    rootLocation: "middle",
    teethInvolved: "single",
    displaced: false,
    pulpExposure: false,
    injuryDate: new Date().toISOString().slice(0, 16),
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

  const generateFractureProtocol = () => {
    setIsGenerating(true);
    
    const { fractureType, rootLocation, teethInvolved, displaced, pulpExposure } = formData;

    let title = "", definition = "", clinical = "", radiographic = "", management = "", prognosis = "";

    if (fractureType === "crownroot") {
      title = "Crown-Root Fracture";
      definition = "Fracture involving enamel, dentin, and cementum with or without pulp exposure. Usually starts mid-crown facially and extends subgingivally palatally.";
      clinical = "Coronal fragment displaced incisally causing occlusal pain. Tender to percussion. Mobile coronal fragment.";
      radiographic = "Labio-lingual fractures show only incisal/labial part. Proximal fractures more visible. CBCT recommended for full extent.";
      management = `• Temporary stabilization of loose fragment.<br>
        • Treatment options: Fragment removal + gingival reattachment, surgical exposure (gingivectomy/osteotomy), orthodontic or surgical extrusion, or extraction if severe apical extension.<br>
        • Pulp management: Partial pulpotomy in immature teeth or root canal treatment in mature teeth if pulp exposed.`;
      prognosis = "Depends on fracture extent below bone level and restorability. Good if managed with extrusion techniques.";
    } else if (fractureType === "root") {
      const location = rootLocation;
      title = `Root Fracture (${location.charAt(0).toUpperCase() + location.slice(1)} Third)`;
      definition = "Fracture involving dentin, cementum ± pulp. Coronal fragment may be mobile or displaced.";
      clinical = "Tender to percussion. Coronal fragment mobility. Pulp sensibility may be initially negative.";
      radiographic = "Radiolucent line at fracture. Multiple angled radiographs essential. CBCT for middle third and cervical fractures.";
      let splintDuration = location === "cervical" ? "up to 4 months" : "4 weeks";
      management = `• Reposition if displaced.<br>
        • Flexible splint for ${splintDuration} (${location} third).<br>
        • Monitor healing. Endodontic treatment of coronal segment only if pulp necrosis develops.`;
      prognosis = location === "cervical" ? "Guarded due to mobility and poor crown-root ratio." : "Favorable, especially in immature teeth.";
    } else {
      title = "Alveolar Process Fracture";
      definition = "Fracture of alveolar bone involving one or more teeth moving as a segment.";
      clinical = "Segmental mobility. Occlusal interference. Dull percussion sound. Gingival lacerations common.";
      radiographic = "Fracture line changes with beam angulation (unlike root fractures). Panoramic + CBCT recommended.";
      management = `• Reposition segment under anesthesia (may need to disengage apical lock).<br>
        • Flexible splint for 4 weeks including adjacent stable teeth.<br>
        • Suture gingival lacerations.<br>
        • Individual tooth pulp monitoring — high risk of necrosis.`;
      prognosis = "High risk of pulp necrosis due to vascular compromise. Generally good periodontal healing expected.";
    }

    const followItems = [
      {days: 28, label: "4 weeks", action: "Splint removal (if applicable) + clinical & radiographic control"},
      {days: 42, label: "6 weeks", action: "Clinical & radiographic evaluation. Assess healing and pulp status."},
      {days: 90, label: "3 months", action: "Monitor for pulp necrosis, root resorption, and bone healing."},
      {days: 180, label: "6 months", action: "Full clinical & radiographic evaluation."},
      {days: 365, label: "1 year", action: "Assess long-term healing and complications."}
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
          <p class="text-xl text-amber-300">${patientInfo.age || "??"} years • Case ID: ${patientInfo.phoneNumber || "??"}</p>
          <p class="text-lg text-gray-400 mt-1">Injury: ${new Date(formData.injuryDate).toLocaleString()}</p>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-amber-400">${title}</h3>
          <p class="text-lg text-gray-200"><strong>Definition:</strong> ${definition}</p>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-amber-400">Clinical & Radiographic Findings</h3>
          <p class="text-gray-200"><strong>Clinical:</strong> ${clinical}</p>
          <p class="mt-4 text-gray-200"><strong>Radiographic:</strong> ${radiographic}</p>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-amber-400">Personalized Management</h3>
          <div class="prose prose-invert text-gray-200 leading-relaxed">
            ${management}
          </div>
          ${pulpExposure ? `<p class="mt-4 text-amber-400 font-medium">Pulp exposure confirmed — prioritize vital pulp therapy in immature teeth. In mature teeth, root canal treatment is usually required.</p>` : ''}
          ${displaced ? `<p class="mt-4 text-amber-400 font-medium">Displacement present — immediate repositioning required.</p>` : ''}
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-amber-400">Follow-up Schedule with Specific Dates</h3>
          ${followHTML}
          <p class="text-sm text-gray-400 mt-4">Monitor for pulp necrosis (at least two signs/symptoms), root resorption, and periodontal healing at every visit.</p>
        </div>
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-amber-400">Prognosis</h3>
          <p class="text-gray-200">${prognosis}</p>
        </div>
      </div>
    `;

    setResult(html);
    setIsGenerating(false);
  };

  const exportPDF = async () => {
    if (!result) {
      alert("Please generate the protocol first!");
      return;
    }

    try {
      setIsGenerating(true);

      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      let cleanHTML = result
        .replace(/text-amber-300/g, 'color: #fcd34d')
        .replace(/text-amber-400/g, 'color: #fbbf24')
        .replace(/text-emerald-400/g, 'color: #34d399')
        .replace(/bg-white\/5/g, 'background-color: #1a2338')
        .replace(/border-white\/10/g, 'border-color: #334155')
        .replace(/text-gray-400/g, 'color: #9ca3af')
        .replace(/text-gray-300/g, 'color: #d1d5db')
        .replace(/text-gray-200/g, 'color: #e5e7eb');

      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif; 
                    color: white; 
                    background: #0a1428; 
                    padding: 40px 30px; 
                    line-height: 1.6;">
          ${cleanHTML}
        </div>
      `;

      document.body.appendChild(element);

      const opt = {
        margin: [15, 20, 15, 20] as [number, number, number, number],
        filename: `Advanced_Fracture_Protocol_${(patientInfo.patientName || "Patient").replace(/\s+/g, "_")}_Tooth${patientInfo.tooth || "XX"}.pdf`,
        image: { 
          type: "jpeg" as const, 
          quality: 0.98 
        },
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
      setIsGenerating(false);
    }
  };

  const handleSaveCase = () => {
    saveCase("Advanced Fractures", { 
      ...formData,
      patientInfo 
    }, result || "");
  };

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-amber-950 to-[#0a1428] py-16 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-5xl font-bold flex items-center gap-4">
                  🦴 Advanced Fractures
                </h1>
                <p className="text-2xl text-amber-300 mt-3">Crown-Root • Root • Alveolar Fractures — Personalized Management</p>
              </div>
              <div className="text-right text-amber-400 text-sm">
                AAE 2013 Guidelines • IADT 2020
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
              <p className="font-mono text-amber-400">{patientInfo.phoneNumber || "Not loaded"}</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-12 gap-8">
            {/* Left Input Panel */}
            <div className="md:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-10">
              <h2 className="text-3xl font-semibold mb-8 flex items-center gap-3">
                Patient & Fracture Details
              </h2>

              <div className="space-y-8">
                {/* Patient Identification - Transferred Data */}
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
                    <label className="block text-sm mb-2 text-gray-400">Gender</label>
                    <input type="text" value={patientInfo.gender || ""} className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white" readOnly />
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

                {/* Fracture Parameters */}
                <div className="pt-6 border-t border-white/10">
                  <h3 className="font-semibold text-xl mb-6 text-[#10b981]">Fracture Category & Parameters</h3>
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm mb-2 text-gray-400">Fracture Type</label>
                      <select id="fractureType" value={formData.fractureType} onChange={handleChange}
                        className="w-full bg-[#0a1428] border border-white/30 rounded-2xl px-5 py-4 text-white 
                                   focus:outline-none focus:border-[#10b981] appearance-none">
                        <option value="crownroot" className="bg-[#0a1428] text-white py-3">Crown-Root Fracture</option>
                        <option value="root" className="bg-[#0a1428] text-white py-3">Root Fracture</option>
                        <option value="alveolar" className="bg-[#0a1428] text-white py-3">Alveolar Process Fracture</option>
                      </select>
                    </div>

                    {formData.fractureType === "root" && (
                      <div>
                        <label className="block text-sm mb-2 text-gray-400">Root Fracture Location</label>
                        <select id="rootLocation" value={formData.rootLocation} onChange={handleChange}
                          className="w-full bg-[#0a1428] border border-white/30 rounded-2xl px-5 py-4 text-white 
                                     focus:outline-none focus:border-[#10b981] appearance-none">
                          <option value="apical" className="bg-[#0a1428] text-white py-3">Apical Third</option>
                          <option value="middle" className="bg-[#0a1428] text-white py-3">Middle Third</option>
                          <option value="cervical" className="bg-[#0a1428] text-white py-3">Cervical Third</option>
                        </select>
                      </div>
                    )}

                    {formData.fractureType === "alveolar" && (
                      <div>
                        <label className="block text-sm mb-2 text-gray-400">Number of Teeth Involved</label>
                        <select id="teethInvolved" value={formData.teethInvolved} onChange={handleChange}
                          className="w-full bg-[#0a1428] border border-white/30 rounded-2xl px-5 py-4 text-white 
                                     focus:outline-none focus:border-[#10b981] appearance-none">
                          <option value="single" className="bg-[#0a1428] text-white py-3">Single Tooth</option>
                          <option value="multiple" className="bg-[#0a1428] text-white py-3">Multiple Teeth (Segment)</option>
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="displaced" checked={formData.displaced} onChange={handleChange} className="w-5 h-5 accent-[#10b981]" />
                      <label className="font-medium">Fragment / Segment displaced</label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="pulpExposure" checked={formData.pulpExposure} onChange={handleChange} className="w-5 h-5 accent-[#10b981]" />
                      <label className="font-medium">Pulp exposure present</label>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={generateFractureProtocol} 
                disabled={isGenerating}
                className="mt-12 w-full bg-gradient-to-r from-indigo-700 to-blue-600 hover:from-indigo-800 hover:to-blue-700 disabled:opacity-70 text-white py-7 rounded-3xl font-bold text-2xl flex items-center justify-center gap-4 shadow-lg transition-all"
              >
                {isGenerating ? "GENERATING..." : "GENERATE PERSONALIZED PROTOCOL"}
              </button>
            </div>

            {/* Result Panel */}
            <div className="md:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-10 min-h-[950px] overflow-auto">
              {!result ? (
                <div className="h-full flex items-center justify-center text-center text-gray-500">
                  <div>
                    <p className="text-xl">Fill the parameters and click</p>
                    <p className="text-2xl font-semibold text-amber-400 mt-4">"GENERATE PERSONALIZED PROTOCOL"</p>
                  </div>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: result }} />
              )}

              {/* Bottom Actions */}
              <div className="mt-12 flex gap-6">
                <button 
                  onClick={exportPDF} 
                  disabled={isGenerating || !result}
                  className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:bg-gray-600 disabled:cursor-not-allowed 
                             text-white py-7 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3 transition-all"
                >
                  {isGenerating ? "GENERATING PDF..." : "Export as PDF"}
                </button>
                <button 
                  onClick={handleSaveCase} 
                  disabled={!result}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed 
                             text-white py-7 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3 transition-all"
                >
                  Save Case
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}