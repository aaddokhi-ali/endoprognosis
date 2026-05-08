// app/restorative/page.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function RestorativeRecommendation() {
  const [isDark, setIsDark] = useState(true);
  const [data, setData] = useState<any>(null);
  const [toothType, setToothType] = useState("");
  const [rec, setRec] = useState("");
  const [clinicianHTML, setClinicianHTML] = useState("");
  const [warningHTML, setWarningHTML] = useState("");
  const [isClient, setIsClient] = useState(false);   // ← Only this line was added

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);   // ← Only this line was added
  }, []);

  useEffect(() => {
    const savedData = localStorage.getItem("restorativeData");
    if (!savedData) {
      setData(null);
      return;
    }

    const parsedData = JSON.parse(savedData);
    setData(parsedData);

    const toothNum = parseInt(parsedData.toothNumber || "0");
    let type = "molar";
    const molars = [16,17,18,26,27,28,36,37,38,46,47,48];
    const premolars = [14,15,24,25,34,35,44,45];

    if (premolars.includes(toothNum)) type = "premolar";
    else if (!molars.includes(toothNum)) type = "anterior";

    setToothType(type);

    const percent = parsedData.remainingPercent || 100;

    let recommendation = "";
    let clinicianNote = "";

    if (type === "molar") {
      if (percent >= 70) recommendation = "Onlay (strongly preferred) or Partial-Coverage Crown";
      else if (percent >= 50) recommendation = "Onlay (preferred) or ¾ Crown";
      else if (percent >= 30) recommendation = "Full Crown (no post in most cases)";
      else recommendation = "Endocrown (strongly recommended) OR Fiber Post + Core + Crown";
    } else if (type === "premolar") {
      if (percent >= 70) recommendation = "Onlay or Partial-Coverage Crown";
      else if (percent >= 50) recommendation = "Onlay or Partial-Coverage Crown";
      else if (percent >= 30) recommendation = "Full Crown ± Fiber Post";
      else recommendation = "Fiber Post + Core + Crown OR Endocrown (with caution)";
    } else {
      if (percent >= 70) recommendation = "Direct Composite or Conservative Bonded Restoration";
      else if (percent >= 50) recommendation = "Partial-Coverage Crown or Veneer";
      else if (percent >= 30) recommendation = "Full Crown ± Fiber Post";
      else recommendation = "Fiber Post + Core + Crown";
    }

    clinicianNote = `
      <div style="background:#1e2937; padding:25px; border-radius:12px; border:2px solid #10b981; margin:30px 0;">
        <h3 style="color:#10b981; margin-bottom:15px;">Clinician Recommendations – ${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
        <ul style="line-height:1.8; color:#cbd5e1;">
          <li>Ensure 1.5–2 mm ferrule where possible.</li>
          <li>Prioritize coronal seal and cuspal coverage (for posteriors).</li>
          <li>Use fiber post only when core retention cannot be achieved otherwise.</li>
          <li>Final decision must consider occlusion, parafunction, and esthetics.</li>
        </ul>
      </div>`;

    let warning = "";
    if (parsedData.oralHygiene === "1" || parsedData.oralHygiene === "2" || parsedData.perio !== "0") {
      warning = `
        <div style="background:#450a0a; color:#fda4af; padding:20px; border-radius:12px; margin:25px 0; font-weight:600;">
          ⚠️ Warning: This patient has ${parsedData.oralHygiene === "1" ? "Fair" : "Poor"} oral hygiene and/or periodontal issues.<br><br>
          Oral hygiene and periodontal condition must be corrected and maintained for long-term success.
        </div>`;
    }

    setRec(recommendation);
    setClinicianHTML(clinicianNote);
    setWarningHTML(warning);
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  // Show loading state until client is ready (prevents flash)
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="text-white text-xl">Loading restorative recommendation...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://iili.io/B6uUNfI.jpg"
            alt="Endoprognosis Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 text-center">
              <h1 className="text-4xl font-bold mb-8 text-red-400">No Data Found</h1>
              <p className="text-xl mb-10 text-gray-300">Please go back to the Predictor and calculate the case first.</p>
              <Link 
                href="/predictor" 
                className="block bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold py-4 rounded-2xl text-lg transition"
              >
                ← Back to Predictor
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://iili.io/B6uUNfI.jpg"
          alt="Endoprognosis Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl">
            
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6">
                <Image
                  src="https://iili.io/B6RcxlS.png"
                  alt="Endoprognosis Logo"
                  width={220}
                  height={80}
                  className="h-16 w-auto drop-shadow-lg"
                  priority
                />
              </div>
              <h1 className="text-5xl font-serif tracking-wider text-white mb-3">
                Restorative Treatment Recommendation
              </h1>
              <p className="text-2xl text-gray-300">
                Tooth #{data.toothNumber} — {toothType.charAt(0).toUpperCase() + toothType.slice(1)}
              </p>
            </div>

            {warningHTML && (
              <div 
                className="mb-8" 
                dangerouslySetInnerHTML={{ __html: warningHTML }} 
              />
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 mb-10">
              <h2 className="text-3xl font-bold text-[#10b981] mb-6 text-center">Recommended Final Restoration</h2>
              <p className="text-4xl font-semibold text-white text-center leading-tight">
                {rec}
              </p>
            </div>

            <div 
              className="mb-10" 
              dangerouslySetInnerHTML={{ __html: clinicianHTML }} 
            />

            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center mb-12">
              <p className="text-gray-300 text-lg leading-relaxed">
                Final decision must consider occlusion, parafunction, esthetic demands, and your clinical judgment.<br />
                Always prioritize: <strong>coronal seal • cuspal coverage • ferrule • minimal tooth removal</strong>.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/predictor/result" 
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-5 rounded-2xl text-lg transition text-center"
              >
                ← Back to Result
              </Link>

              <Link 
                href="/home" 
                className="flex-1 bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold py-5 rounded-2xl text-lg transition text-center"
              >
                Go to Home
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
    </div>
  );
}