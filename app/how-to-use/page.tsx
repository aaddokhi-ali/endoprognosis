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
        <div
          className="relative h-[460px] bg-cover bg-center"
          style={{ backgroundImage: "url('https://iili.io/B6uUNfI.jpg')" }}
        >
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

        <div className="max-w-5xl mx-auto px-6 py-16 space-y-12">

          {/* ── TOOL 1: Endodontic Prognosis Predictor ── */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 md:p-14">
            <h2 className="text-3xl font-bold text-[#10b981] mb-3 flex items-center gap-4">
              <span className="text-4xl">🦷</span> Endodontic Prognosis Predictor
            </h2>
            <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest">Tool 1</p>
            <p className="mb-8 text-gray-300 text-lg">
              Uses a modified Dental Practicality Index to estimate 4-year tooth survival after root canal
              treatment or retreatment. Lower total score = better long-term prognosis.
            </p>

            <div className="space-y-6">

              {/* Coronal Structure */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="font-semibold text-xl mb-5 text-[#10b981]">Coronal Structure & Ferrule Effect</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#10b981] text-black rounded-full font-bold text-sm">0 pts</span>
                    <span className="text-gray-300">Adequate remaining structure (≥70%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#f59e0b] text-black rounded-full font-bold text-sm">3–4 pts</span>
                    <span className="text-gray-300">Moderate loss (50–70%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#ef4444] text-white rounded-full font-bold text-sm">6–7 pts</span>
                    <span className="text-gray-300">Significant loss (30–50%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#ef4444] text-white rounded-full font-bold text-sm">10 pts</span>
                    <span className="text-gray-300">Severe loss (&lt;30%) + missing ferrule</span>
                  </div>
                </div>
              </div>

              {/* Periodontal Condition */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="font-semibold text-xl mb-5 text-[#10b981]">Periodontal Condition</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#10b981] text-black rounded-full font-bold text-sm">0 pts</span>
                    <span className="text-gray-300">Healthy periodontium</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#eab308] text-black rounded-full font-bold text-sm">1 pt</span>
                    <span className="text-gray-300">Gingivitis only</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#f59e0b] text-black rounded-full font-bold text-sm">3 pts</span>
                    <span className="text-gray-300">Mild to moderate periodontitis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#ef4444] text-white rounded-full font-bold text-sm">6 pts</span>
                    <span className="text-gray-300">Advanced periodontal disease</span>
                  </div>
                </div>
              </div>

              {/* Oral Hygiene Multiplier */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="font-semibold text-xl mb-5 text-[#10b981]">Oral Hygiene Multiplier</h3>
                <div className="space-y-4 text-base">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#10b981] text-black rounded-full font-bold text-sm">×1</span>
                    <span className="text-gray-300">Good / compliant oral hygiene</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#eab308] text-black rounded-full font-bold text-sm">×2</span>
                    <span className="text-gray-300">Fair oral hygiene — doubles the periodontal score</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#ef4444] text-white rounded-full font-bold text-sm">×3</span>
                    <span className="text-gray-300">Poor / neglected oral hygiene — triples the periodontal score</span>
                  </div>
                </div>
              </div>

              {/* Medical Status */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="font-semibold text-xl mb-5 text-[#10b981]">Medical Status (ASA Classification)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#10b981] text-black rounded-full font-bold text-sm">0 pts</span>
                    <span className="text-gray-300">ASA I — Medically fit</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#eab308] text-black rounded-full font-bold text-sm">1 pt</span>
                    <span className="text-gray-300">ASA II — Controlled condition</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#f59e0b] text-black rounded-full font-bold text-sm">3 pts</span>
                    <span className="text-gray-300">ASA III — Uncontrolled condition</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#ef4444] text-white rounded-full font-bold text-sm">6 pts</span>
                    <span className="text-gray-300">ASA IV or higher</span>
                  </div>
                </div>
              </div>

              {/* Context of Treatment */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="font-semibold text-xl mb-5 text-[#10b981]">Context of Treatment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#10b981] text-black rounded-full font-bold text-sm">0 pts</span>
                    <span className="text-gray-300">Isolated dental problem</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#eab308] text-black rounded-full font-bold text-sm">1 pt</span>
                    <span className="text-gray-300">Part of a prosthodontic plan / abutment tooth</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#f59e0b] text-black rounded-full font-bold text-sm">2 pts</span>
                    <span className="text-gray-300">Complex prosthodontic plan</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 px-4 py-1.5 bg-[#ef4444] text-white rounded-full font-bold text-sm">6 pts</span>
                    <span className="text-gray-300">Retention would compromise the overall plan</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── TOOL 2: Cracked Tooth Classifier ── */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 md:p-14">
            <h2 className="text-3xl font-bold text-[#10b981] mb-3 flex items-center gap-4">
              <span className="text-4xl">🔬</span> Cracked Tooth Classifier
            </h2>
            <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest">Tool 2</p>
            <p className="mb-8 text-gray-300 text-lg">
              Classifies cracked teeth and detects possible vertical root fractures using the Iowa
              Classification system. Follow these steps in order for accurate results.
            </p>

            <div className="space-y-4">
              {[
                {
                  step: "01",
                  title: "Tooth Information",
                  desc: "Enter the tooth number and confirm whether it has already received root canal treatment. This affects how the classification logic interprets subsequent findings.",
                },
                {
                  step: "02",
                  title: "Patient Symptoms",
                  desc: "Record reported symptoms: pain on biting, sharp pain to cold or sweet stimuli, and any spontaneous or lingering pain. These drive the pulpal diagnosis component.",
                },
                {
                  step: "03",
                  title: "Clinical Examination",
                  desc: "Complete the full examination panel — bite test, transillumination, marginal ridge integrity, existing restoration status, percussion response, presence of swelling, sinus tract, and mobility grade.",
                },
                {
                  step: "04",
                  title: "Periodontal Probing Diagram",
                  desc: "Click the 6 probing circles on the occlusal diagram to record pocket depths around the tooth. Isolated narrow pockets in specific locations are a key indicator of vertical root fracture.",
                },
                {
                  step: "05",
                  title: "Radiographic Findings",
                  desc: "Enter radiographic findings including periapical lesion, J-shaped lesion pattern, and apico-marginal defect. These findings, combined with clinical data, refine the final classification.",
                },
                {
                  step: "Result",
                  title: "Classification Output",
                  desc: "The tool outputs either a Crown-Originating Fracture with its Iowa stage (Craze Line → Fractured Cusp → Cracked Tooth → Split Tooth), or a high-probability Vertical Root Fracture warning with supporting clinical reasoning.",
                  highlight: true,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`flex gap-5 rounded-2xl p-6 border ${
                    item.highlight
                      ? "bg-[#10b981]/10 border-[#10b981]/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm
                    ${item.highlight ? "bg-[#10b981] text-black" : "bg-white/10 text-[#10b981]"}`}>
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">{item.title}</h4>
                    <p className="text-gray-300 text-base leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── TOOL 3: Dental Trauma Center ── */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 md:p-14">
            <h2 className="text-3xl font-bold text-[#10b981] mb-3 flex items-center gap-4">
              <span className="text-4xl">🚨</span> Dental Trauma Center
            </h2>
            <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest">Tool 3</p>
            <p className="mb-8 text-gray-300 text-lg">
              Guides management of traumatic dental injuries based on IADT guidelines and AAE
              recommendations. Select the injury type to receive a step-by-step protocol.
            </p>

            <div className="space-y-4">
              {[
                {
                  step: "01",
                  title: "Patient & Tooth Details",
                  desc: "Enter patient age, tooth type (primary or permanent), and the injured tooth number. Age and tooth type significantly alter management decisions — especially for avulsion and luxation injuries.",
                },
                {
                  step: "02",
                  title: "Injury Classification",
                  desc: "Select the injury category: fractures (enamel, enamel-dentine, crown-root, root fracture) or luxation injuries (concussion, subluxation, extrusion, lateral luxation, intrusion, avulsion).",
                },
                {
                  step: "03",
                  title: "Clinical & Pulpal Status",
                  desc: "Record pulp exposure status for fractures, or repositioning feasibility for luxations. For avulsions, record extra-oral dry time and storage medium — these are critical for replantation decisions.",
                },
                {
                  step: "04",
                  title: "Management Protocol",
                  desc: "The tool generates a prioritized management protocol: immediate actions, splinting duration if required, pulp therapy timeline, and follow-up schedule at 1 week, 1 month, 3 months, 6 months, and 1 year.",
                },
                {
                  step: "Result",
                  title: "Prognosis & Follow-Up Plan",
                  desc: "Output includes expected pulpal and periodontal healing outcomes, signs of complications to monitor (ankylosis, inflammatory resorption, pulp necrosis), and patient instructions to provide at discharge.",
                  highlight: true,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`flex gap-5 rounded-2xl p-6 border ${
                    item.highlight
                      ? "bg-[#10b981]/10 border-[#10b981]/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm
                    ${item.highlight ? "bg-[#10b981] text-black" : "bg-white/10 text-[#10b981]"}`}>
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-base mb-1">{item.title}</h4>
                    <p className="text-gray-300 text-base leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── TOOL 4: Restorative Recommendation Guide ── */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 md:p-14">
            <h2 className="text-3xl font-bold text-[#10b981] mb-3 flex items-center gap-4">
              <span className="text-4xl">⚙️</span> Restorative Recommendation Guide
            </h2>
            <p className="text-gray-400 text-sm mb-6 uppercase tracking-widest">Tool 4</p>
            <p className="mb-8 text-gray-300 text-lg">
              Recommends the most appropriate post-endodontic restoration based on remaining tooth
              structure, ferrule availability, and tooth position. Prioritizes coronal seal, cuspal
              protection, and minimal tooth removal.
            </p>

            <div className="space-y-6">

              {/* How inputs drive outputs */}
              <div className="space-y-4">
                {[
                  {
                    step: "01",
                    title: "Remaining Coronal Structure",
                    desc: "Select the percentage of remaining coronal tooth structure. This is the primary driver of restoration type — higher remaining structure allows for more conservative options.",
                  },
                  {
                    step: "02",
                    title: "Ferrule Wall Assessment",
                    desc: "Indicate which walls (mesial, distal, buccal, lingual) have ≥2 mm of sound dentine above the finish line. A full 4-wall ferrule significantly improves crown longevity and reduces fracture risk.",
                  },
                  {
                    step: "03",
                    title: "Tooth Position & Type",
                    desc: "Specify whether the tooth is anterior or posterior. Posteriors under heavy occlusal load require cuspal coverage. Anteriors with adequate structure may be managed with direct composite or a veneer.",
                  },
                  {
                    step: "04",
                    title: "Post Requirement Assessment",
                    desc: "The tool evaluates whether a fiber post is indicated to retain the core. Posts are recommended only when remaining coronal structure is insufficient to retain a core build-up without additional support.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-5 rounded-2xl p-6 bg-white/5 border border-white/10">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm text-[#10b981]">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-base mb-1">{item.title}</h4>
                      <p className="text-gray-300 text-base leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Output options */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="font-semibold text-xl mb-5 text-[#10b981]">Possible Restoration Outputs</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                  {[
                    { label: "Direct Composite", note: "High remaining structure, anterior, no cuspal loss" },
                    { label: "Onlay / Partial Crown", note: "Moderate structure, cuspal coverage needed, conservative" },
                    { label: "Full Crown", note: "Significant structure loss or posterior with ferrule" },
                    { label: "Endocrown", note: "Severely broken-down posterior, no post space available" },
                    { label: "Fiber Post + Crown", note: "Inadequate core retention without post support" },
                    { label: "Extraction Advised", note: "Insufficient structure for any predictable restoration" },
                  ].map((opt) => (
                    <div key={opt.label} className="flex flex-col gap-1 p-4 rounded-xl bg-white/5 border border-white/10">
                      <span className="font-semibold text-[#10b981] text-sm">{opt.label}</span>
                      <span className="text-gray-400 text-sm">{opt.note}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ── Important Note ── */}
          <div className="bg-[#450a0a] text-[#fda4af] p-10 rounded-2xl border border-red-500/30">
            <p className="text-lg leading-relaxed">
              <strong className="text-white">Important Note:</strong><br />
              These tools are clinical decision support aids grounded in peer-reviewed literature.
              They do <strong>not</strong> replace your clinical judgment, radiographic evaluation,
              or patient discussion. Always apply your professional experience when making final
              treatment decisions.
            </p>
          </div>

          {/* Back button */}
          <div className="text-center pt-4 pb-8">
            <Link
              href="/home"
              className="inline-block bg-[#10b981] hover:bg-white text-black px-12 py-5 rounded-2xl text-xl font-semibold transition"
            >
              ← Back to Home
            </Link>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
          <Link href="/about" className="hover:text-white transition">About</Link>
          <Link href="/references" className="hover:text-white transition">References</Link>
          <Link href="/how-to-use" className="hover:text-white transition">How to Use</Link>
          <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
          <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
        </div>
        <div className="mt-6 text-xs">
          Need help? Contact us at{" "}
          <a href="mailto:support@endoprognosis.org" className="text-[#10b981] hover:underline">
            support@endoprognosis.org
          </a>
        </div>
        <p className="mt-6 text-xs">© 2026 Endoprognosis • All Rights Reserved</p>
      </div>
    </>
  );
}