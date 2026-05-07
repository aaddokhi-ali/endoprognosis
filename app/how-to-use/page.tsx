// app/how-to-use/page.tsx
"use client";
import Navigation from "../components/navigation";
import Image from "next/image";
import Link from "next/link";

export default function HowToUsePage() {
  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Hero Section */}
        <div className="relative h-[460px] bg-cover bg-center" 
             style={{ backgroundImage: "url('https://iili.io/B6uUNfI.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#0a1428]" />
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={280}
              height={90}
              className="mb-8 drop-shadow-2xl"
              priority
            />
            <h1 className="text-5xl md:text-6xl font-serif tracking-wider mb-4">How to Use</h1>
            <p className="text-xl text-gray-300">Complete guide to Endoprognosis tools</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 md:p-16 space-y-16">

            {/* Section 1: Modified DPI Predictor */}
            <div>
              <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                <span>1.</span> Modified Dental Practicality Index (Modified DPI)
              </h2>
              <p className="mb-8 text-gray-300 text-lg">
                The calculator uses a modified Dental Practicality Index to estimate 4-year tooth survival. 
                Lower total points = better long-term prognosis.
              </p>

              <div className="space-y-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                  <h3 className="font-semibold text-xl mb-4 text-[#10b981]">Coronal Structure & Ferrule Effect</h3>
                  <div className="flex flex-wrap gap-x-8 gap-y-3 text-lg">
                    <div><span className="inline-block px-5 py-2 bg-[#10b981] text-black rounded-3xl font-bold">0</span> Adequate remaining structure (≥70%)</div>
                    <div><span className="inline-block px-5 py-2 bg-[#f59e0b] text-black rounded-3xl font-bold">3–4</span> Moderate loss (50–70%)</div>
                    <div><span className="inline-block px-5 py-2 bg-[#ef4444] text-white rounded-3xl font-bold">6–7</span> Significant loss (30–50%)</div>
                    <div><span className="inline-block px-5 py-2 bg-[#ef4444] text-white rounded-3xl font-bold">10</span> Severe loss (&lt;30%) + missing ferrule</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                  <h3 className="font-semibold text-xl mb-4 text-[#10b981]">Periodontal Condition</h3>
                  <div className="flex flex-wrap gap-x-8 gap-y-3 text-lg">
                    <div><span className="inline-block px-5 py-2 bg-[#10b981] text-black rounded-3xl font-bold">0</span> Healthy periodontium</div>
                    <div><span className="inline-block px-5 py-2 bg-[#eab308] text-black rounded-3xl font-bold">1</span> Gingivitis only</div>
                    <div><span className="inline-block px-5 py-2 bg-[#f59e0b] text-black rounded-3xl font-bold">3</span> Mild to moderate periodontitis</div>
                    <div><span className="inline-block px-5 py-2 bg-[#ef4444] text-white rounded-3xl font-bold">6</span> Advanced periodontal disease</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                  <h3 className="font-semibold text-xl mb-4 text-[#10b981]">Oral Hygiene Multiplier</h3>
                  <div className="space-y-4 text-lg">
                    <div><span className="inline-block px-5 py-2 bg-[#10b981] text-black rounded-3xl font-bold">×1</span> Good / compliant oral hygiene</div>
                    <div><span className="inline-block px-5 py-2 bg-[#eab308] text-black rounded-3xl font-bold">×2</span> Fair oral hygiene (doubles perio points)</div>
                    <div><span className="inline-block px-5 py-2 bg-[#ef4444] text-white rounded-3xl font-bold">×3</span> Poor / neglected oral hygiene (triples perio points)</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                  <h3 className="font-semibold text-xl mb-4 text-[#10b981]">Medical Status</h3>
                  <div className="flex flex-wrap gap-x-8 gap-y-3 text-lg">
                    <div><span className="inline-block px-5 py-2 bg-[#10b981] text-black rounded-3xl font-bold">0</span> ASA I – Medically fit</div>
                    <div><span className="inline-block px-5 py-2 bg-[#eab308] text-black rounded-3xl font-bold">1</span> ASA II – Controlled condition</div>
                    <div><span className="inline-block px-5 py-2 bg-[#f59e0b] text-black rounded-3xl font-bold">3</span> ASA III – Uncontrolled condition</div>
                    <div><span className="inline-block px-5 py-2 bg-[#ef4444] text-white rounded-3xl font-bold">6</span> ASA IV or higher</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                  <h3 className="font-semibold text-xl mb-4 text-[#10b981]">Context of Treatment</h3>
                  <div className="flex flex-wrap gap-x-8 gap-y-3 text-lg">
                    <div><span className="inline-block px-5 py-2 bg-[#10b981] text-black rounded-3xl font-bold">0</span> Isolated dental problem</div>
                    <div><span className="inline-block px-5 py-2 bg-[#eab308] text-black rounded-3xl font-bold">1</span> Prosthodontic plan / abutment</div>
                    <div><span className="inline-block px-5 py-2 bg-[#f59e0b] text-black rounded-3xl font-bold">2</span> Complex prosthodontic plan</div>
                    <div><span className="inline-block px-5 py-2 bg-[#ef4444] text-white rounded-3xl font-bold">6</span> Retention would compromise overall plan</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Crack Tooth Classifier */}
            <div>
              <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                <span>2.</span> Crack Tooth Classifier (CTC)
              </h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
                <p className="mb-6 text-lg">The CTC helps classify cracked teeth and detect possible vertical root fractures using the Iowa Classification system.</p>
                <div className="space-y-6 text-lg">
                  <div><strong>Step 1:</strong> Enter tooth number and confirm if it is already root canal treated.</div>
                  <div><strong>Step 2:</strong> Record patient symptoms (pain on biting, sharp pain to cold/sweet, spontaneous pain).</div>
                  <div><strong>Step 3:</strong> Complete clinical examination (bite test, transillumination, marginal ridge, restoration status, percussion, swelling, sinus tract, and mobility).</div>
                  <div><strong>Step 4:</strong> Click the 6 probing circles on the occlusal diagram to record pocket depths.</div>
                  <div><strong>Step 5:</strong> Enter radiographic findings (periapical lesion, J-shaped lesion, apico-marginal defect).</div>
                  <div><strong>Result:</strong> The tool will show either Crown-Originating Fracture with Iowa stage or a high-probability Vertical Root Fracture warning.</div>
                </div>
              </div>
            </div>

            {/* Section 3: Restorative Assessment */}
            <div>
              <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                <span>3.</span> Understanding the Restorative Assessment
              </h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
                <div className="space-y-6 text-lg">
                  <div><strong>Remaining coronal structure percentage</strong> is calculated from the tooth diagram you clicked in Step 1.</div>
                  <div><strong>Ferrule walls</strong> (mesial, distal, buccal, lingual) show which walls have sufficient height for a good crown margin.</div>
                  <div><strong>Recommended restoration</strong> is based on remaining structure, ferrule presence, and whether the tooth is posterior or anterior.</div>
                  <div>The system prioritizes coronal seal, cuspal coverage for posteriors, minimal tooth removal, and fiber post use when indicated.</div>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="mt-16 bg-[#450a0a] text-[#fda4af] p-10 rounded-2xl border border-red-500/30">
              <strong>Important Note:</strong><br />
              These tools are clinical decision support aids based on scientific literature. They do <strong>not</strong> replace your clinical judgment, radiographic evaluation, or patient discussion. Always use your professional experience when making final treatment decisions.
            </div>

            <div className="text-center mt-16">
              <Link 
                href="/home" 
                className="inline-block bg-[#10b981] hover:bg-white text-black px-12 py-5 rounded-2xl text-xl font-semibold transition"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}