// app/references/page.tsx
"use client";
import Navigation from "../components/navigation";
import Image from "next/image";
import Link from "next/link";

export default function ReferencesPage() {
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
            <h1 className="text-5xl md:text-6xl font-serif tracking-wider mb-4">References</h1>
            <p className="text-xl text-gray-300">Scientific foundation of Endoprognosis tools</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 md:p-16">

            <div className="space-y-16 text-[17.5px] leading-relaxed">

              {/* Section 1 */}
              <div>
                <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                  <span>1.</span> Logic of Prognosis Model
                </h2>
                <ul className="space-y-8">
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Patel S, et al. The Dental Practicality Index - to treat or not to treat. <strong>Br Dent J.</strong> 2024.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Tifooni A, et al. Validation of the effectiveness of the Dental Practicality Index in predicting the outcome of root canal retreatments. <strong>Int Endod J.</strong> 2019.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Al-Nuaimi N, et al. A prospective study on the effect of coronal tooth structure loss on the 4-year clinical survival of root canal retreated teeth. <strong>Int Endod J.</strong> 2020.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Ng YL, Mann V, Gulabivala K. A prospective study of the factors affecting outcomes of nonsurgical root canal treatment: part 1: periapical health. <strong>Int Endod J.</strong> 2011 Jul;44(7):583-609.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Ng YL, Mann V, Gulabivala K. A prospective study of the factors affecting outcomes of non-surgical root canal treatment: part 2: tooth survival. <strong>Int Endod J.</strong> 2011 Jul;44(7):610-25.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Friedman S, Abitbol S, Lawrence HP. Treatment outcome in endodontics: the Toronto Study. Phase 1: initial treatment. <strong>J Endod.</strong> 2003 Dec;29(12):787-93.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Farzaneh M, Abitbol S, Lawrence HP, Friedman S; Toronto Study. Treatment outcome in endodontics-the Toronto Study. Phase II: initial treatment. <strong>J Endod.</strong> 2004 May;30(5):302-9.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Farzaneh M, Abitbol S, Friedman S. Treatment outcome in endodontics: the Toronto study. Phases I and II: Orthograde retreatment. <strong>J Endod.</strong> 2004 Sep;30(9):627-33.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Marquis VL, Dao T, Farzaneh M, Abitbol S, Friedman S. Treatment outcome in endodontics: the Toronto Study. Phase III: initial treatment. <strong>J Endod.</strong> 2006 Apr;32(4):299-306.</span>
                  </li>
                </ul>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                  <span>2.</span> Endodontic Diagnosis & Treatment
                </h2>
                <ul className="space-y-8">
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>American Association of Endodontists. Endodontic Diagnosis. Colleagues for Excellence. Fall 2013.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Fuss Z, Trope M. Root perforations: classification and treatment choices based on prognostic factors. <strong>Endod Dent Traumatol.</strong> 1996.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Spili P, et al. The impact of instrument fracture on outcome of endodontic treatment. <strong>J Endod.</strong> 2005.</span>
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div>
                <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                  <span>3.</span> Restorative Treatment Options (After Root Canal Treatment)
                </h2>
                <ul className="space-y-8">
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Schwartz RS, Robbins JW. Post placement and restoration of endodontically treated teeth: a literature review. <strong>J Endod.</strong> 2004 May;30(5):289-301.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Juloski J, Radovic I, Goracci C, Vulicevic ZR, Ferrari M. Ferrule effect: a literature review. <strong>J Endod.</strong> 2012 Jan;38(1):11-9.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Abu-Awwad M, Halasa R, Haikal L, El-Ma'aita A, Hammad M, Petridis H. Direct restorations versus full crowns in endodontically treated molar teeth: A three-year randomized clinical trial. <strong>J Dent.</strong> 2025 May;156:105699.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Wang B, Fan J, Wang L, Xu B, Wang L, Chai L. Onlays/partial crowns versus full crowns in restoring posterior teeth: a systematic review and meta-analysis. <strong>Head Face Med.</strong> 2022 Nov 21;18(1):36.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Ferrari M, Cagidiaco MC, Goracci C, Vichi A, Mason PN, Radovic I, Tay F. Long-term retrospective study of the clinical performance of fiber posts. <strong>Am J Dent.</strong> 2007 Oct;20(5):287-91.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Al-Dabbagh RA. Survival and success of endocrowns: A systematic review and meta-analysis. <strong>J Prosthet Dent.</strong> 2021 Mar;125(3):415.e1-415.e9.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Ng YL, Mann V, Rahbaran S, Lewsey J, Gulabivala K. Outcome of primary root canal treatment: systematic review of the literature - part 1. Effects of study characteristics on probability of success. <strong>Int Endod J.</strong> 2007 Dec;40(12):921-39.</span>
                  </li>
                </ul>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                  <span>4.</span> Oral Hygiene & Periodontal Influence
                </h2>
                <ul className="space-y-8">
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Lertpimonchai A, et al. The association between oral hygiene and periodontitis: a systematic review and meta-analysis. <strong>Int Dent J.</strong> 2017.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Gutmann JL. Differentiating pulpal–periodontal disease processes from endodontic–periodontic relationships. <strong>Int J Endod Rehabil.</strong> 2016;2:1–11.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Khalighinejad N, Aminoshariae A, Kulild JC, Wang J, Mickel A. The Influence of Periodontal Status on Endodontically Treated Teeth: 9-year Survival Analysis. <strong>J Endod.</strong> 2017 Nov;43(11):1781-1785.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Rotstein I. Interaction between endodontics and periodontics. <strong>Periodontol 2000.</strong> 2017 Jun;74(1):11-39.</span>
                  </li>
                </ul>
              </div>

              {/* Section 5 */}
              <div>
                <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                  <span>5.</span> Tooth Fracture
                </h2>
                <ul className="space-y-8">
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Krell KV, Caplan DJ. 12-month Success of Cracked Teeth Treated with Orthograde Root Canal Treatment. <strong>J Endod.</strong> 2018 Apr;44(4):543-548.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Krell KV, Rivera EM. A six year evaluation of cracked teeth diagnosed with reversible pulpitis: treatment and prognosis. <strong>J Endod.</strong> 2007 Dec;33(12):1405-7.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Olivieri JG, Elmsmari F, Miró Q, Ruiz XF, Krell KV, García-Font M, Durán-Sindreu F. Outcome and Survival of Endodontically Treated Cracked Posterior Permanent Teeth: A Systematic Review and Meta-analysis. <strong>J Endod.</strong> 2020 Apr;46(4):455-463.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Lynch CD, McConnell RJ. The cracked tooth syndrome. <strong>J Can Dent Assoc.</strong> 2002 Sep;68(8):470-5.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Bakland, L. K. (2019). Crown-Originating Dental Fractures. In I. Rotstein & J. I. Ingle (Eds.), Ingle's Endodontics (7th ed., Vol. 1, Chapter 13, pp. 391–404). PMPH USA.</span>
                  </li>
                </ul>
              </div>

              {/* Section 6: Dental Trauma Center */}
              <div>
                <h2 className="text-3xl font-bold text-[#10b981] mb-8 flex items-center gap-4">
                  <span>6.</span> Dental Trauma Center
                </h2>
                <ul className="space-y-8">
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Andreasen JO, Andreasen FM, Andersson L. Textbook and color atlas of traumatic injuries to the teeth. 4th ed. Oxford: Blackwell Munksgaard; 2007.</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>Bourguignon C, Cohenca N, Lauridsen E, Flores MT, O'Connell A, Day P, et al. International Association of Dental Traumatology guidelines for the management of traumatic dental injuries: 1. Fractures and luxations. Dent Traumatol. 2020;36(4):314–330. doi:10.1111/edt.12578</span>
                  </li>
                  <li className="flex gap-5">
                    <span className="text-[#10b981] text-2xl mt-1">•</span>
                    <span>American Association of Endodontists. Recommended guidelines of the American Association of Endodontists for the treatment of traumatic dental injuries. Chicago: American Association of Endodontists; 2019. Available from: https://www.aae.org/specialty/wp-content/uploads/sites/2/2019/02/19_TraumaGuidelines.pdf</span>
                  </li>
                </ul>
              </div>

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

      {/* Bottom Navigation */}
      <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
          <Link href="/about" className="hover:text-white transition">About</Link>
          <Link href="/references" className="hover:text-white transition">References</Link>
          <Link href="/how-to-use" className="hover:text-white transition">How to Use</Link>
          <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
          <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
        </div>

        {/* Support Email */}
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