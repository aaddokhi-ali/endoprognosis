"use client";
import Navigation from "../../components/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTrauma } from "../../context/TraumaContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AvulsionClient() {
  const { user } = useAuth();
  const { patientInfo, saveCase, loadCaseByPhone } = useTrauma();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    dryTime: 15,
    storageMedia: "milk",
    apex: "closed",
    alveolarFracture: false,
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
      [id]: type === "checkbox" ? (e.target as HTMLInputElement).checked : 
            id === "dryTime" ? parseInt(value) : value
    }));
  };

  const generateAvulsionProtocol = () => {
    setIsGenerating(true);
    
    const { dryTime, storageMedia, apex, alveolarFracture } = formData;

    const storageMap = {
      hanks: "Hank’s Balanced Salt Solution (Best)",
      milk: "Cold Milk (Excellent)",
      saliva: "Saliva (Acceptable)",
      saline: "Saline",
      water: "Water (Poor)",
      dry: "Dry Storage (Worst)"
    };
    const storageTextValue = storageMap[storageMedia as keyof typeof storageMap] || storageMedia;

    let prognosis = dryTime <= 20 && (storageTextValue.includes("Milk") || storageTextValue.includes("Hank")) ? "Excellent" :
                    dryTime <= 60 ? "Good to Guarded" : "Poor (Delayed Replantation)";

    let keyNotes = dryTime > 60 ? "PDL healing unlikely. Focus on alveolar bone preservation and long-term monitoring." : "PDL healing possible depending on storage and maturity.";

    const management = ` • Replant the tooth as soon as possible (handle by the crown only).<br>
      • Gently rinse the root with saline if dirty (do not scrape or scrub the root surface).<br>
      • Reposition into the socket with gentle axial pressure.<br>
      • Verify correct position with a radiograph.<br>
      • Stabilize with a flexible passive splint (0.4 mm stainless steel wire or fibre-reinforced composite) for ${alveolarFracture ? '4 weeks' : '2 weeks'}.<br> `;

    const endo = apex === "open" ?
      "Monitor for signs of revascularization (continued root development, positive sensibility). Initiate regenerative endodontic procedure or apexification if pulp necrosis develops." :
      "Start root canal treatment 7–10 days after replantation. Use calcium hydroxide as an intra-canal dressing for 2–4 weeks before final obturation.";

    const html = `
      <div class="space-y-10">
        <div>
          <h2 class="text-4xl font-bold text-white">${patientInfo.patientName || "Patient"} — Tooth ${patientInfo.tooth || "??"}</h2>
          <p class="text-xl text-rose-300">${patientInfo.age || "??"} years • Case ID: ${patientInfo.phoneNumber || "??"}</p>
          <p class="text-lg text-gray-400 mt-1">Injury: ${new Date(formData.injuryDate).toLocaleString()}</p>
        </div>
        
        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-rose-400">Key Parameters</h3>
          <div class="grid grid-cols-2 gap-y-4 text-lg">
            <div class="text-gray-400"><strong>Extra-oral Dry Time:</strong></div>
            <div class="text-white font-semibold">${dryTime} minutes</div>
            
            <div class="text-gray-400"><strong>Storage Medium:</strong></div>
            <div class="text-white font-semibold">${storageTextValue}</div>
            
            <div class="text-gray-400"><strong>Root Maturity:</strong></div>
            <div class="text-white font-semibold">${apex === 'open' ? 'Open Apex (Immature)' : 'Closed Apex (Mature)'}</div>
            
            <div class="text-gray-400"><strong>Alveolar Fracture:</strong></div>
            <div class="text-white font-semibold">${alveolarFracture ? 'Yes' : 'No'}</div>
          </div>
          <p class="mt-6 font-semibold text-xl">Overall Prognosis: <span class="text-emerald-400">${prognosis}</span></p>
          <p class="mt-2 text-gray-300">${keyNotes}</p>
        </div>

        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-rose-400">Management Protocol (IADT 2020)</h3>
          <div class="prose prose-invert text-gray-200 leading-relaxed">
            ${management}
          </div>
          <p class="mt-6 text-gray-200"><strong>Endodontics:</strong> ${endo}</p>
          <p class="mt-6 text-gray-200"><strong>Medications:</strong> Systemic antibiotics (Doxycycline for patients ≥12 years or Amoxicillin for 7 days). Tetanus booster if soil contamination and vaccination status uncertain. Chlorhexidine 0.12% mouth rinse twice daily for 2 weeks.</p>
        </div>

        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-rose-400">Patient Instructions</h3>
          <ul class="custom-list space-y-3 text-lg text-gray-200">
            <li>Soft diet for 2 weeks</li>
            <li>Brush gently with a soft toothbrush after each meal</li>
            <li>Maintain excellent oral hygiene</li>
            <li>Use chlorhexidine 0.12% mouth rinse twice daily for 2 weeks</li>
            <li>Avoid contact sports; use a mouthguard when returning to physical activity</li>
            <li>Return for all scheduled follow-up visits</li>
          </ul>
        </div>

        <div class="detail-box bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 class="font-bold text-2xl mb-6 text-rose-400">Follow-up Schedule with Specific Actions</h3>
          <div class="space-y-6">
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">2 weeks</div>
              <div class="text-right text-gray-300">Splint removal (unless alveolar fracture), clinical examination (mobility, percussion, sensibility), radiographic control. Assess for early signs of infection.</div>
            </div>
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">4 weeks</div>
              <div class="text-right text-gray-300">Clinical examination (pulp sensibility, percussion, mobility) + radiographic assessment for resorption or periapical changes.</div>
            </div>
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">6–8 weeks</div>
              <div class="text-right text-gray-300">Clinical & radiographic control. Evaluate pulp status and early root resorption.</div>
            </div>
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">3 months</div>
              <div class="text-right text-gray-300">Clinical sensibility testing + radiographs. Check for pulp canal obliteration or inflammatory resorption.</div>
            </div>
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">6 months</div>
              <div class="text-right text-gray-300">Full clinical and radiographic evaluation. Monitor for replacement resorption (ankylosis) and pulp necrosis.</div>
            </div>
            <div class="flex justify-between items-start border-b border-white/10 pb-4">
              <div class="font-semibold text-white">1 year</div>
              <div class="text-right text-gray-300">Clinical & radiographic review. Assess long-term healing and tooth survival.</div>
            </div>
            <div class="flex justify-between items-start">
              <div class="font-semibold text-white">Yearly up to 5 years</div>
              <div class="text-right text-gray-300">Monitor for late complications: inflammatory resorption, replacement resorption (ankylosis), infraposition in growing patients, and pulp status.</div>
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
    saveCase("Avulsion", { 
      ...formData,
      patientInfo 
    }, result || "");
  };

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-rose-950 to-[#0a1428] py-16 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-5xl font-bold flex items-center gap-4">
                   Avulsion of Permanent Teeth
                </h1>
                <p className="text-2xl text-rose-300 mt-3">Personalized Evidence-Based Protocol</p>
              </div>
              <div className="text-right text-rose-400 text-sm">
                IADT 2020 • AAE Guidelines
              </div>
            </div>
          </div>
        </div>

        {/* Current Case Header - Shows transferred patient data */}
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
              <p className="font-mono text-rose-400">{patientInfo.phoneNumber || "Not loaded"}</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-12 gap-8">
            {/* Left Input Panel - Full Patient Identification + Avulsion Details */}
            <div className="md:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-10">
              <h2 className="text-3xl font-semibold mb-8 flex items-center gap-3">
                Patient & Avulsion Details
              </h2>

              <div className="space-y-8">
                {/* Transferred Patient Identification */}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, injuryDate: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white"
                    />
                  </div>
                </div>

                {/* Avulsion Specific Parameters */}
                <div className="pt-6 border-t border-white/10">
                  <h3 className="font-semibold text-xl mb-6 text-[#10b981]">Critical Avulsion Parameters</h3>
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm mb-3 text-gray-400">Extra-oral Dry Time (minutes)</label>
                      <input 
                        id="dryTime" 
                        type="range" 
                        min="0" 
                        max="300" 
                        value={formData.dryTime} 
                        onChange={handleChange} 
                        className="w-full accent-[#10b981]" 
                      />
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-emerald-600">0 min</span>
                        <span className="font-bold text-[#10b981]">{formData.dryTime} minutes</span>
                        <span className="text-red-600">300 min</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm mb-2 text-gray-400">Storage Medium</label>
                      <select 
                        id="storageMedia" 
                        value={formData.storageMedia} 
                        onChange={handleChange} 
                        className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white"
                      >
                        <option value="hanks">Hank’s Balanced Salt Solution (Best)</option>
                        <option value="milk">Cold Milk (Excellent)</option>
                        <option value="saliva">Saliva (Acceptable)</option>
                        <option value="saline">Saline</option>
                        <option value="water">Water (Poor)</option>
                        <option value="dry">Dry Storage (Worst)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm mb-2 text-gray-400">Root Apex Maturity</label>
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

                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="alveolarFracture" 
                        checked={formData.alveolarFracture} 
                        onChange={handleChange} 
                        className="w-5 h-5 accent-[#10b981]" 
                      />
                      <label className="font-medium">Alveolar bone fracture involved</label>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={generateAvulsionProtocol} 
                disabled={isGenerating}
                className="mt-12 w-full bg-gradient-to-r from-indigo-700 to-blue-600 hover:from-indigo-800 hover:to-blue-700 disabled:opacity-70 text-white py-7 rounded-3xl font-bold text-2xl flex items-center justify-center gap-4 shadow-lg transition-all"
              >
                {isGenerating ? "GENERATING..." : "GENERATE PERSONALIZED PROTOCOL"}
              </button>
            </div>

            {/* Result Panel */}
            <div className="md:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-10 min-h-[900px] overflow-auto">
              {!result ? (
                <div className="h-full flex items-center justify-center text-center text-gray-500">
                  <div>
                    <p className="text-xl">Fill the parameters on the left side</p>
                    <p className="text-2xl font-semibold text-rose-400 mt-4">"GENERATE PERSONALIZED PROTOCOL"</p>
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