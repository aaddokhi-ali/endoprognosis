// app/references/page.tsx
"use client";
import { useState } from "react";
import Navigation from "../components/navigation";
import Image from "next/image";
import Link from "next/link";

const tools = [
  {
    id: 1,
    name: "Endodontic Prognosis Predictor",
    subtitle: "Evidence base for outcome prediction & survival analysis",
    icon: "🦷",
    references: [
      {
        text: "Patel S, et al. The Dental Practicality Index — to treat or not to treat.",
        journal: "Br Dent J.",
        year: "2024.",
      },
      {
        text: "Tifooni A, et al. Validation of the effectiveness of the Dental Practicality Index in predicting the outcome of root canal retreatments.",
        journal: "Int Endod J.",
        year: "2019.",
      },
      {
        text: "Al-Nuaimi N, et al. A prospective study on the effect of coronal tooth structure loss on the 4-year clinical survival of root canal retreated teeth.",
        journal: "Int Endod J.",
        year: "2020.",
      },
      {
        text: "Ng YL, Mann V, Gulabivala K. A prospective study of the factors affecting outcomes of nonsurgical root canal treatment: part 1: periapical health.",
        journal: "Int Endod J.",
        year: "2011 Jul;44(7):583–609.",
      },
      {
        text: "Ng YL, Mann V, Gulabivala K. A prospective study of the factors affecting outcomes of non-surgical root canal treatment: part 2: tooth survival.",
        journal: "Int Endod J.",
        year: "2011 Jul;44(7):610–25.",
      },
      {
        text: "Friedman S, Abitbol S, Lawrence HP. Treatment outcome in endodontics: the Toronto Study. Phase 1: initial treatment.",
        journal: "J Endod.",
        year: "2003 Dec;29(12):787–93.",
      },
      {
        text: "Farzaneh M, Abitbol S, Lawrence HP, Friedman S; Toronto Study. Treatment outcome in endodontics — the Toronto Study. Phase II: initial treatment.",
        journal: "J Endod.",
        year: "2004 May;30(5):302–9.",
      },
      {
        text: "Farzaneh M, Abitbol S, Friedman S. Treatment outcome in endodontics: the Toronto study. Phases I and II: Orthograde retreatment.",
        journal: "J Endod.",
        year: "2004 Sep;30(9):627–33.",
      },
      {
        text: "Marquis VL, Dao T, Farzaneh M, Abitbol S, Friedman S. Treatment outcome in endodontics: the Toronto Study. Phase III: initial treatment.",
        journal: "J Endod.",
        year: "2006 Apr;32(4):299–306.",
      },
      {
        text: "American Association of Endodontists. Endodontic Diagnosis. Colleagues for Excellence.",
        journal: "AAE.",
        year: "Fall 2013.",
      },
      {
        text: "Fuss Z, Trope M. Root perforations: classification and treatment choices based on prognostic factors.",
        journal: "Endod Dent Traumatol.",
        year: "1996.",
      },
      {
        text: "Spili P, et al. The impact of instrument fracture on outcome of endodontic treatment.",
        journal: "J Endod.",
        year: "2005.",
      },
      {
        text: "Ng YL, Mann V, Rahbaran S, Lewsey J, Gulabivala K. Outcome of primary root canal treatment: systematic review — part 1. Effects of study characteristics on probability of success.",
        journal: "Int Endod J.",
        year: "2007 Dec;40(12):921–39.",
      },
      {
        text: "Khalighinejad N, Aminoshariae A, Kulild JC, Wang J, Mickel A. The Influence of Periodontal Status on Endodontically Treated Teeth: 9-year Survival Analysis.",
        journal: "J Endod.",
        year: "2017 Nov;43(11):1781–1785.",
      },
      {
        text: "Lertpimonchai A, et al. The association between oral hygiene and periodontitis: a systematic review and meta-analysis.",
        journal: "Int Dent J.",
        year: "2017.",
      },
      {
        text: "Gutmann JL. Differentiating pulpal–periodontal disease processes from endodontic–periodontic relationships.",
        journal: "Int J Endod Rehabil.",
        year: "2016;2:1–11.",
      },
      {
        text: "Rotstein I. Interaction between endodontics and periodontics.",
        journal: "Periodontol 2000.",
        year: "2017 Jun;74(1):11–39.",
      },
    ],
  },
  {
    id: 2,
    name: "Cracked Tooth Classifier",
    subtitle: "Evidence base for fracture diagnosis & outcome prediction",
    icon: "🔬",
    references: [
      {
        text: "Krell KV, Caplan DJ. 12-month Success of Cracked Teeth Treated with Orthograde Root Canal Treatment.",
        journal: "J Endod.",
        year: "2018 Apr;44(4):543–548.",
      },
      {
        text: "Krell KV, Rivera EM. A six year evaluation of cracked teeth diagnosed with reversible pulpitis: treatment and prognosis.",
        journal: "J Endod.",
        year: "2007 Dec;33(12):1405–7.",
      },
      {
        text: "Olivieri JG, et al. Outcome and Survival of Endodontically Treated Cracked Posterior Permanent Teeth: A Systematic Review and Meta-analysis.",
        journal: "J Endod.",
        year: "2020 Apr;46(4):455–463.",
      },
      {
        text: "Lynch CD, McConnell RJ. The cracked tooth syndrome.",
        journal: "J Can Dent Assoc.",
        year: "2002 Sep;68(8):470–5.",
      },
      {
        text: "Bakland LK. Crown-Originating Dental Fractures. In: Rotstein I, Ingle JI (Eds.), Ingle's Endodontics (7th ed., Vol. 1, Chapter 13, pp. 391–404).",
        journal: "PMPH USA.",
        year: "2019.",
      },
    ],
  },
  {
    id: 3,
    name: "Dental Trauma Center",
    subtitle: "Evidence base for traumatic dental injury management",
    icon: "🚨",
    references: [
      {
        text: "Andreasen JO, Andreasen FM, Andersson L. Textbook and color atlas of traumatic injuries to the teeth. 4th ed.",
        journal: "Oxford: Blackwell Munksgaard.",
        year: "2007.",
      },
      {
        text: "Bourguignon C, Cohenca N, Lauridsen E, Flores MT, O'Connell A, Day P, et al. International Association of Dental Traumatology guidelines for the management of traumatic dental injuries: 1. Fractures and luxations.",
        journal: "Dent Traumatol.",
        year: "2020;36(4):314–330. doi:10.1111/edt.12578",
      },
      {
        text: "American Association of Endodontists. Recommended guidelines for the treatment of traumatic dental injuries.",
        journal: "AAE.",
        year: "Chicago: 2019.",
      },
    ],
  },
  {
    id: 4,
    name: "Restorative Recommendation Guide",
    subtitle: "Evidence base for post-endodontic restoration decisions",
    icon: "⚙️",
    references: [
      {
        text: "Schwartz RS, Robbins JW. Post placement and restoration of endodontically treated teeth: a literature review.",
        journal: "J Endod.",
        year: "2004 May;30(5):289–301.",
      },
      {
        text: "Juloski J, Radovic I, Goracci C, Vulicevic ZR, Ferrari M. Ferrule effect: a literature review.",
        journal: "J Endod.",
        year: "2012 Jan;38(1):11–9.",
      },
      {
        text: "Abu-Awwad M, et al. Direct restorations versus full crowns in endodontically treated molar teeth: A three-year randomized clinical trial.",
        journal: "J Dent.",
        year: "2025 May;156:105699.",
      },
      {
        text: "Wang B, Fan J, Wang L, et al. Onlays/partial crowns versus full crowns in restoring posterior teeth: a systematic review and meta-analysis.",
        journal: "Head Face Med.",
        year: "2022 Nov 21;18(1):36.",
      },
      {
        text: "Ferrari M, Cagidiaco MC, Goracci C, et al. Long-term retrospective study of the clinical performance of fiber posts.",
        journal: "Am J Dent.",
        year: "2007 Oct;20(5):287–91.",
      },
      {
        text: "Al-Dabbagh RA. Survival and success of endocrowns: A systematic review and meta-analysis.",
        journal: "J Prosthet Dent.",
        year: "2021 Mar;125(3):415.e1–415.e9.",
      },
    ],
  },
];

export default function ReferencesPage() {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">

        {/* Hero */}
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
            <h1 className="text-5xl md:text-6xl font-serif tracking-wider mb-4">References</h1>
            <p className="text-xl text-gray-300">Scientific foundation of Endoprognosis tools</p>
          </div>
        </div>

        {/* Accordion */}
        <div className="max-w-4xl mx-auto px-6 py-16 space-y-4">

          {/* Intro */}
          <p className="text-gray-400 text-center mb-10 text-base">
            Select a tool below to view the peer-reviewed evidence that underpins its clinical logic.
          </p>

          {tools.map((tool) => {
            const isOpen = openId === tool.id;
            return (
              <div
                key={tool.id}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden
                  ${isOpen
                    ? "border-[#10b981] bg-white/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                    : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8"
                  }`}
              >
                {/* Header */}
                <button
                  onClick={() => toggle(tool.id)}
                  className="w-full flex items-center gap-5 px-8 py-6 text-left group"
                >
                  {/* Icon badge */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors duration-300
                    ${isOpen ? "bg-[#10b981]/20" : "bg-white/8 group-hover:bg-white/12"}`}>
                    {tool.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h2 className={`text-lg md:text-xl font-bold tracking-wide transition-colors duration-200
                      ${isOpen ? "text-[#10b981]" : "text-white group-hover:text-[#10b981]"}`}>
                      {tool.name}
                    </h2>
                    <p className="text-gray-400 text-sm mt-0.5">{tool.subtitle}</p>
                  </div>

                  {/* Count badge + chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors duration-200
                      ${isOpen ? "bg-[#10b981]/20 text-[#10b981]" : "bg-white/10 text-gray-400"}`}>
                      {tool.references.length} refs
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#10b981]" : "text-gray-500"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Collapsible body */}
                <div className={`transition-all duration-500 ease-in-out ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
                  <div className="px-8 pb-8">
                    <div className="border-t border-white/10 pt-6 space-y-5">
                      {tool.references.map((ref, idx) => (
                        <div key={idx} className="flex gap-4 items-start group/ref">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[10px] font-bold text-[#10b981] mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-gray-300 text-[15px] leading-relaxed">
                            {ref.text}{" "}
                            <span className="font-semibold text-white">{ref.journal}</span>{" "}
                            <span className="text-gray-400">{ref.year}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Back button */}
        <div className="text-center pb-16">
          <Link
            href="/home"
            className="inline-block bg-[#10b981] hover:bg-white text-black px-12 py-5 rounded-2xl text-xl font-semibold transition"
          >
            ← Back to Home
          </Link>
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