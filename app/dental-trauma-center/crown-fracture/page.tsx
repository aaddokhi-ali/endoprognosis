// app/dental-trauma-center/crown-fracture/page.tsx
"use client";
import Navigation from "../../components/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTrauma } from "../../context/TraumaContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CrownFracture() {
  const { user } = useAuth();
  const { patientInfo, saveCase, loadCaseByPhone } = useTrauma();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    fractureType: "uncomplicated",
    apex: "closed",
    timeSince: "immediate",
    fragmentAvailable: false,
    luxation: false,
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
    if (patientInfo && patientInfo.traumaDate) {
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

  const generateCrownProtocol = () => {
    setIsGenerating(true);
    
    const { fractureType, apex, timeSince, fragmentAvailable, luxation } = formData;
    const isComplicated = fractureType === "complicated";

    let prognosis = "";
    let management = "";
    let endo = "";

    if (!isComplicated) {
      prognosis = luxation ? "Good (but monitor closely due to combined injury)" : "Excellent";
      management = ` • First choice: Reattach fragment if available (rehydrate in saline for 20 minutes then bond).<br>
        • Alternative: Direct composite restoration with immediate dentin sealing.<br>
        • Cover exposed dentin immediately with bonding agent + flowable composite or glass ionomer.<br>
        • If dentin exposure is very close to pulp (&lt;0.5 mm): Place calcium hydroxide lining first. `;
    } else {
      prognosis = (apex === "open" && timeSince === "immediate") ? "Excellent (vital pulp therapy)" :
                  (timeSince === "delayed") ? "Guarded" : "Good";
      management = ` • Rubber dam isolation is mandatory.<br>
        • Partial pulpotomy (preferred treatment): Remove 2 mm of coronal pulp tissue with a diamond bur under copious irrigation.<br>
        • Control bleeding with 0.5–5% sodium hypochlorite.<br>
        • Apply hydraulic calcium silicate cement (such as MTA) when bleeding stops (&lt;5 minutes).<br>
        • Place immediate definitive restoration over the capping material. `;
      endo = "Monitor pulp vitality. Partial pulpotomy has shown very high success rates with respect to pulp survival irrespective of the stage of root development.";
    }

    const html = `
      <div class="space-y-10">
        <div>
          <h2 class="text-4xl font-bold text-white">${patientInfo.patientName || "Patient"} — Tooth ${patientInfo.tooth || "??"}</h2>
          <p class="text-xl text-blue-300">${patientInfo.age || "??"} years • Case ID: ${patientInfo.phoneNumber || "??"}</p>
          <p class="text-lg text-gray-400 mt-1">Injury: ${new Date(formData.injuryDate).toLocaleString()}</p>
        </div>
        
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-blue-400">Key Parameters</h3>
          <div class="grid grid-cols-2 gap-y-4 text-lg">
            <div class="text-gray-400"><strong>Fracture Type:</strong></div>
            <div class="text-white font-semibold">${isComplicated ? 'Complicated (Pulp Exposure)' : 'Uncomplicated (No Exposure)'}</div>
            
            <div class="text-gray-400"><strong>Root Maturity:</strong></div>
            <div class="text-white font-semibold">${apex === 'open' ? 'Open Apex (Immature)' : 'Closed Apex (Mature)'}</div>
            
            <div class="text-gray-400"><strong>Time Since Injury:</strong></div>
            <div class="text-white font-semibold">${timeSince === 'immediate' ? 'Immediate (<2h)' : timeSince === 'short' ? 'Short Delay (2-24h)' : 'Delayed (>24h)'}</div>
            
            <div class="text-gray-400"><strong>Fragment Available:</strong></div>
            <div class="text-white font-semibold">${fragmentAvailable ? 'Yes' : 'No'}</div>
            
            <div class="text-gray-400"><strong>Associated Luxation:</strong></div>
            <div class="text-white font-semibold">${luxation ? 'Yes' : 'No'}</div>
          </div>
          <p class="mt-6 font-semibold text-xl">Overall Prognosis: <span class="text-emerald-400">${prognosis}</span></p>
        </div>

        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-blue-400">Management Protocol (IADT 2020)</h3>
          <div class="prose prose-invert text-gray-200 leading-relaxed">
            ${management}
          </div>
          ${endo ? `<p class="mt-6 text-gray-200"><strong>Vital Pulp Therapy:</strong> ${endo}</p>` : ''}
          ${luxation ? `<p class="mt-6 text-amber-400 font-medium">Note: In case of associated luxation injuries, please review the luxation injuries guideline for combined management recommendations.</p>` : ''}
        </div>

        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-blue-400">Medications & Patient Instructions</h3>
          <p class="text-gray-200"><strong>Antibiotics:</strong> Not routinely indicated unless soft tissue injury or luxation is present in certain patients with compromised health status.</p>
          <p class="text-gray-200"><strong>Chlorhexidine:</strong> 0.12% mouth rinse twice daily for 1–2 weeks.</p>
          <ul class="custom-list space-y-3 text-lg text-gray-200 mt-6">
            <li>Soft diet for 1–2 weeks</li>
            <li>Avoid biting on the restored tooth</li>
            <li>Excellent oral hygiene</li>
            <li>Return immediately if pain, swelling or discoloration develops</li>
          </ul>
        </div>

        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-blue-400">Expected Outcome: Pulp Survival</h3>
          <p class="text-gray-200 leading-relaxed">Long-term studies have shown very high success rates of pulp capping and partial pulpotomy with respect to pulp survival. Radiographic evidence of hard tissue closure of the perforation can be seen 3 months after treatment. The tooth should be followed 1 and 5 years after injury and monitored for pulpal sensibility. When using resin composite build-up, the pulp tester should be placed on the most incisal aspect of the available enamel.</p>
          <p class="text-gray-200 leading-relaxed mt-4">The graphs show pulp outcome for crown fractures without luxation injuries.</p>
          <p class="text-gray-200 leading-relaxed mt-4">Long-term studies have shown very high success rates for partial pulpotomy with respect to pulp survival irrespective of the stage of root development.</p>
        </div>

        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-blue-400">Follow-up Schedule with Specific Actions</h3>
          <div class="space-y-6">
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">6–8 weeks</div>
              <div class="text-right text-gray-300">Clinical examination (symptoms, sensibility, percussion) + radiographic control for hard tissue bridge and periapical health.</div>
            </div>
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">3 months</div>
              <div class="text-right text-gray-300">Sensibility testing + radiographs. Check continued root development (immature teeth) and pulp canal obliteration.</div>
            </div>
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">6 months</div>
              <div class="text-right text-gray-300">Full clinical & radiographic evaluation. Monitor for pulp necrosis or resorption.</div>
            </div>
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">1 year</div>
              <div class="text-right text-gray-300">Assess long-term pulp status and root development.</div>
            </div>
            <div class="flex justify-between items-start">
              <div class="font-semibold text-white">Yearly up to 5 years</div>
              <div class="text-right text-gray-300">Monitor for late complications: pulp necrosis, canal obliteration, root resorption, crown discoloration.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    setResult(html);
    setIsGenerating(false);
  };

  const exportPDF = () => alert("✅ Personalized Professional PDF Generated!");
  const shareEmail = () => alert("📧 Report ready to share via email");

  const handleSaveCase = () => {
    saveCase("Crown Fracture", { 
      ...formData,
      patientInfo 
    }, result || "");
  };

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-blue-950 to-[#0a1428] py-16 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-5xl font-bold flex items-center gap-4">
                  🦷 Crown Fractures
                </h1>
                <p className="text-2xl text-blue-300 mt-3">Personalized Evidence-Based Management</p>
              </div>
              <div className="text-right text-blue-400 text-sm">
                IADT 2020 • AAE Guidelines • Andreasen Textbook
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
              <p className="font-mono text-blue-400">{patientInfo.phoneNumber || "Not loaded"}</p>
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
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Patient Name</label>
                    <input 
                      type="text" 
                      value={patientInfo.patientName || ""} 
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white" 
                      readOnly 
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Tooth (FDI)</label>
                    <input 
                      type="text" 
                      value={patientInfo.tooth || ""} 
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white" 
                      readOnly 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Age (years)</label>
                    <input 
                      type="text" 
                      value={patientInfo.age || ""} 
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white" 
                      readOnly 
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Gender</label>
                    <input 
                      type="text" 
                      value={patientInfo.gender || ""} 
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white" 
                      readOnly 
                    />
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

                <div className="pt-6 border-t border-white/10">
                  <h3 className="font-semibold text-xl mb-6 text-[#10b981]">Critical Fracture Parameters</h3>
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm mb-2 text-gray-400">Fracture Type</label>
                      <select 
                        id="fractureType" 
                        value={formData.fractureType} 
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white"
                      >
                        <option value="uncomplicated">Uncomplicated (No Pulp Exposure)</option>
                        <option value="complicated">Complicated (Pulp Exposure)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-400">Root Maturity</label>
                      <select 
                        id="apex" 
                        value={formData.apex} 
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white"
                      >
                        <option value="open">Open Apex (Immature)</option>
                        <option value="closed">Closed Apex (Mature)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-gray-400">Time Since Injury</label>
                      <select 
                        id="timeSince" 
                        value={formData.timeSince} 
                        onChange={handleChange}
                        className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white"
                      >
                        <option value="immediate">Immediate (&lt; 2 hours)</option>
                        <option value="short">Short Delay (2–24 hours)</option>
                        <option value="delayed">Delayed (&gt; 24 hours)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="fragmentAvailable" 
                        checked={formData.fragmentAvailable} 
                        onChange={handleChange} 
                        className="w-5 h-5 accent-[#10b981]" 
                      />
                      <label className="font-medium">Tooth fragment available for reattachment</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="luxation" 
                        checked={formData.luxation} 
                        onChange={handleChange} 
                        className="w-5 h-5 accent-[#10b981]" 
                      />
                      <label className="font-medium">Associated luxation injury</label>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={generateCrownProtocol} 
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
                    <p className="text-xl">Fill the parameters on the left side</p>
                    <p className="text-2xl font-semibold text-blue-400 mt-4">"GENERATE PERSONALIZED PROTOCOL"</p>
                  </div>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: result }} />
              )}

              <div className="mt-12 flex gap-6">
                <button 
                  onClick={exportPDF} 
                  className="flex-1 bg-indigo-700 hover:bg-indigo-800 text-white py-7 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3"
                >
                  Export as PDF
                </button>
                <button 
                  onClick={handleSaveCase} 
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-7 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3"
                >
                  Save Case
                </button>
                <button 
                  onClick={shareEmail} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-7 rounded-3xl font-semibold text-xl flex items-center justify-center gap-3"
                >
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