// app/restorative/page.tsx
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

// ── TYPES ──
type WallState = "intact" | "moderate" | "severe";
type WallKey = "mesial" | "distal" | "buccal" | "lingual";

interface FerruleData {
  wallsWithFerrule: number;
  penalty: number;
  label: string;
}

interface RestorativeData {
  toothNumber: string;
  remainingPercent: number;
  walls: Record<WallKey, WallState>;
  occlusal: string;
  ferrule: FerruleData;
  oralHygiene: string;
  perio: string;
  fullResult?: any;
}

// ── RECOMMENDATION ENGINE ──
// All logic derived from:
//   Schwartz & Robbins 2004 · Juloski et al. 2012 · Abu-Awwad et al. 2025
//   Wang et al. 2022 · Ferrari et al. 2007 · Al-Dabbagh 2021 · Ng et al. 2007

interface RecommendationResult {
  primary: string;
  rationale: string;
  ferruleNote: string;
  postNote: string;
  escalationNote: string;
  urgencyLevel: "green" | "amber" | "red";
  deferRestoration: boolean;
  contextualWarnings: string[];
  clinicianSteps: string[];
}

function buildRecommendation(
  toothType: "anterior" | "premolar" | "molar",
  percent: number,
  ferrule: FerruleData,
  walls: Record<WallKey, WallState>,
  oralHygiene: string,
  perio: string,
  fullResult: any
): RecommendationResult {

  // Count walls: only "intact" or "moderate" contribute to ferrule
  const intactWalls   = Object.values(walls).filter(v => v === "intact").length;
  const moderateWalls = Object.values(walls).filter(v => v === "moderate").length;
  const severeWalls   = Object.values(walls).filter(v => v === "severe").length;
  const usableWalls   = intactWalls + moderateWalls; // walls that can contribute ferrule

  // Bruxism / parafunction proxy — prosthodontic context or heavy occlusal loading
  // (Abu-Awwad 2025: HR 12.8 for failure with parafunction)
  const prosthoContext = parseInt(fullResult?.formData?.prostho || "0");
  const hasBruxismRisk = prosthoContext >= 1;

  // Perio / OH status
  const ohScore    = parseInt(oralHygiene || "0");
  const perioScore = parseInt(perio       || "0");
  const hasPerioRisk  = perioScore >= 3;
  const hasPoorOH     = ohScore >= 1;

  // Ferrule adequacy (Juloski 2012: ≥1.5–2 mm on all walls = adequate)
  const ferruleAdequate     = ferrule.wallsWithFerrule >= 4;
  const ferruleCompromised  = ferrule.wallsWithFerrule === 3;
  const ferruleInsufficient = ferrule.wallsWithFerrule <= 2;

  // ── Deferred restoration flag
  // Ng 2007 + clinical consensus: definitive restoration should wait for
  // periodontal stability. Active disease = deferral recommendation.
  const deferRestoration = hasPerioRisk || (hasPoorOH && perioScore >= 1);

  // ── Build contextual warnings
  const contextualWarnings: string[] = [];

  if (deferRestoration) {
    contextualWarnings.push(
      `Active periodontal disease or poor oral hygiene detected. Definitive restoration should be deferred until periodontal stability is achieved and maintained for ≥3 months.`
    );
  }
  if (hasBruxismRisk) {
    contextualWarnings.push(
      `Prosthodontic complexity noted. Abu-Awwad 2025 found parafunctional habits carry a 12.8× increased failure risk — full-coverage crown is preferred over conservative options in this patient, and an occlusal splint should be considered post-restoration.`
    );
  }
  if (ferruleInsufficient && percent < 50) {
    contextualWarnings.push(
      `Ferrule is absent or present on ≤2 walls. Juloski 2012: if no ferrule can be achieved by any means, "available evidence suggests poor clinical outcome is very likely." Discuss orthodontic extrusion, surgical crown lengthening, or extraction + implant with the patient.`
    );
  }

  // ── PRIMARY RECOMMENDATION ──────────────────────────────────────────────

  let primary          = "";
  let rationale        = "";
  let ferruleNote      = "";
  let postNote         = "";
  let escalationNote   = "";
  let urgencyLevel: RecommendationResult["urgencyLevel"] = "green";
  let clinicianSteps: string[] = [];

  // ════════════════ ANTERIOR ════════════════
  if (toothType === "anterior") {

    if (percent >= 75) {
      // intact anterior → bonded composite, no post needed
      primary    = "Bonded composite restoration (access cavity)";
      rationale  = "Intact coronal structure provides adequate resistance to lateral forces. A post adds no benefit and increases fracture risk (Schwartz & Robbins 2004).";
      postNote   = "No post required.";
      ferruleNote = "Ferrule not critical at this structure level.";
      urgencyLevel = "green";
      clinicianSteps = [
        "Restore access cavity with bonded composite resin.",
        "Ensure good marginal adaptation and occlusal contacts.",
        "No crown preparation needed unless esthetic indication exists.",
      ];

    } else if (percent >= 50) {
      // Structure adequate for crown prep but thin — post needed for core retention
      // post needed when remaining coronal structure is insufficient after crown prep
      primary   = "Fiber post + composite core → Full-coverage ceramic crown";
      rationale = "Remaining structure is too thin after crown preparation to resist lateral and shearing forces without core support. A fiber post retains the core; a ceramic crown restores function and esthetics (Schwartz & Robbins 2004, Ferrari et al. 2007).";
      postNote  = "Fiber post indicated — use smallest diameter that provides adequate retention. Parallel fiber post preferred over tapered (Schwartz 2004).";
      urgencyLevel = "amber";

      if (ferruleAdequate) {
        ferruleNote = "Adequate ferrule (all 4 walls). Proceed with crown preparation ensuring 1.5–2 mm vertical dentin above finish line (Juloski 2012).";
      } else if (ferruleCompromised) {
        ferruleNote = "Ferrule compromised on 1 wall. Consider orthodontic extrusion to gain 1.5–2 mm ferrule height before crown preparation (Juloski 2012: extrusion preferred over crown lengthening).";
        urgencyLevel = "amber";
      } else {
        ferruleNote = "Ferrule insufficient (≤2 walls). Orthodontic extrusion or surgical crown lengthening required before definitive restoration. Without ferrule, catastrophic root fracture risk is high (Juloski 2012).";
        urgencyLevel = "red";
        escalationNote = "Consult periodontist / orthodontist before proceeding. If neither method is feasible, discuss extraction + implant.";
      }
      clinicianSteps = [
        "Assess ferrule height on all 4 walls before preparation.",
        ferruleAdequate
          ? "Proceed with fiber post placement in the largest straight canal."
          : "Achieve ≥1.5 mm ferrule via extrusion or crown lengthening before post placement.",
        "Bond fiber post with dual-cure resin cement (4th-generation adhesive preferred — Schwartz 2004).",
        "Build composite core ensuring adequate bulk for crown preparation.",
        "Prepare for full-coverage ceramic crown with deep chamfer finish line.",
      ];

    } else if (percent >= 25) {
      primary   = "Fiber post + composite core → Full-coverage ceramic crown (ferrule mandatory)";
      rationale = "Severe structure loss — ferrule achievement is the critical decision point. Ferrari et al. 2007: all debonding failures in a 985-post study occurred in teeth with <2 mm coronal dentin and <2 residual walls.";
      postNote  = "Fiber post required. Achieves more favorable failure mode vs metal post (restorable vs catastrophic fracture — Ferrari 2007).";
      urgencyLevel = "amber";

      if (ferruleInsufficient) {
        ferruleNote = "Insufficient ferrule — orthodontic extrusion or crown lengthening mandatory before restoration. Juloski 2012: even 1 mm of ferrule significantly increases fracture resistance.";
        urgencyLevel = "red";
        escalationNote = "Do NOT proceed with definitive restoration without addressing ferrule. If extrusion/lengthening not feasible: extraction + implant is the evidence-supported alternative.";
      } else {
        ferruleNote = ferruleAdequate
          ? "Adequate ferrule present. Proceed with 1.5–2 mm circumferential preparation (Juloski 2012)."
          : "Partial ferrule — achieve full circumferential ≥1.5 mm where possible. An incomplete ferrule is better than none (Juloski 2012).";
      }
      clinicianSteps = [
        "Evaluate all 4 walls for ferrule height before any preparation.",
        "If ferrule <1.5 mm: refer for orthodontic extrusion (4–6 weeks minimum).",
        "Place fiber post (quartz or glass fiber, parallel-sided preferred) with dual-cure adhesive.",
        "Build up composite core flush to prepared finish line.",
        "Full-coverage ceramic crown with margin placed to capture maximum ferrule.",
      ];

    } else {
      // <25% — minimal/no structure
      primary      = "Fiber post + composite core + crown — or extraction with implant";
      rationale    = "Minimal remaining coronal structure. Juloski 2012: if no ferrule can be provided by any method, poor clinical outcome is very likely. Extraction and implant-supported crown should be presented as a primary option.";
      postNote     = "Fiber post required, but prognosis is guarded regardless of post system.";
      ferruleNote  = "Ferrule almost certainly not achievable without extrusion or crown lengthening.";
      urgencyLevel = "red";
      escalationNote = "Present extraction + implant-supported crown as primary option. If patient elects tooth retention: orthodontic extrusion or surgical crown lengthening is mandatory before restoration — otherwise treatment failure is very likely (Juloski 2012).";
      clinicianSteps = [
        "Discuss prognosis honestly with patient — present implant option.",
        "If retention elected: refer for orthodontic extrusion to gain ≥1.5 mm ferrule height.",
        "Do not place definitive restoration without confirmed ferrule.",
      ];
    }

  // ════════════════ PREMOLAR ════════════════
  } else if (toothType === "premolar") {

    if (percent >= 75 && usableWalls >= 3 && !hasBruxismRisk) {
      // Wang 2022: onlays statistically equivalent to full crowns at 1 yr and 3 yr
      // Abu-Awwad 2025 data supports conservative approach with ≥3 intact walls
      primary   = "Ceramic onlay (IPS e.max preferred) — no post required";
      rationale = "High remaining structure with ≥3 usable walls. Wang et al. 2022 meta-analysis: onlays/partial crowns statistically equivalent to full crowns at 1 year (OR 0.55) and 3 years (OR 0.65). IPS e.max preferred over zirconia for more favorable fracture modes.";
      postNote  = "No post required — pulp chamber and remaining walls provide adequate core retention (Schwartz 2004).";
      ferruleNote = ferruleAdequate
        ? "Adequate structure — ferrule preparation not required for onlay."
        : "Minor ferrule compromise — still suitable for onlay if ≥3 walls usable.";
      urgencyLevel = "green";
      clinicianSteps = [
        "Prepare cavity for adhesive ceramic onlay — cuspal coverage of weakened cusps.",
        "Use IPS e.max press or CAD-CAM block (Wang 2022: best fracture mode profile).",
        "Bond with dual-cure resin cement using 4th-gen adhesive.",
        "No post space preparation — preserves radicular dentin strength.",
      ];

    } else if (percent >= 50 && usableWalls >= 2) {
      // Cusp loss present or parafunctional risk — cuspal coverage essential
      // Cuspal coverage = 6× survival advantage
      primary   = hasBruxismRisk
        ? "Full-coverage ceramic crown (preferred in bruxers/parafunction risk)"
        : "Ceramic onlay with full cuspal coverage OR full-coverage ceramic crown";
      rationale = hasBruxismRisk
        ? "Parafunctional habit risk detected. Abu-Awwad 2025: parafunction carries HR 12.8 for restoration failure. Full crown provides superior load distribution vs onlay in high-load cases."
        : "Moderate structure loss with cusp involvement. Schwartz & Robbins 2004: endodontically treated teeth with cuspal coverage are 6× more likely to survive. Onlay acceptable if cuspal coverage incorporated.";
      postNote  = "Post not required in most cases — pulp chamber provides core retention for premolars (Schwartz 2004). Add fiber post only if core buildup inadequate.";
      urgencyLevel = hasBruxismRisk ? "amber" : "green";
      ferruleNote = ferruleAdequate
        ? "Adequate ferrule — proceed with preparation ensuring ≥1.5 mm at all margins."
        : ferruleCompromised
          ? "Ferrule compromised on 1 wall — acceptable for full crown. Aim for ≥1.5 mm on remaining walls."
          : "Insufficient ferrule — if proceeding with crown, consider extrusion or lengthening to achieve ≥1.5 mm on ≥2 walls (Juloski 2012: incomplete ferrule better than none).";
      clinicianSteps = [
        hasBruxismRisk ? "Full-coverage crown mandatory — discuss occlusal splint post-restoration." : "Assess whether onlay with cuspal coverage achieves adequate protection.",
        "If crown elected: ensure ferrule ≥1.5 mm circumferential.",
        "Place fiber post only if inadequate natural retention for core.",
        "Bond with dual-cure resin cement.",
      ];

    } else if (percent >= 25) {
      // Ferrari 2007 premolar data: quartz-FRC post + crown 96.2% survival at 3 yr
      primary   = "Fiber post + composite core → Full-coverage ceramic crown";
      rationale = "Severe structure loss requiring core support. Ferrari et al. 2007 (3-year follow-up): quartz-fiber post + crown achieved 96.2% survival in premolars, vs 88.5% with cast post + crown. Fiber posts produce more favorable (restorable) failure modes.";
      postNote  = "Fiber post required (quartz or glass fiber preferred — Ferrari 2007). Place in largest available canal. Parallel-sided post preferred (Schwartz 2004).";
      urgencyLevel = ferruleInsufficient ? "red" : "amber";
      ferruleNote = ferruleAdequate
        ? "Adequate ferrule — proceed. Ensure 1.5–2 mm vertical dentin above finish line on all walls (Juloski 2012)."
        : ferruleCompromised
          ? "Ferrule compromised on 1 wall. Achieve ≥1.5 mm where possible — incomplete ferrule still reduces failure risk (Juloski 2012)."
          : "Insufficient ferrule (≤2 walls). Crown lengthening or orthodontic extrusion required before definitive crown. Juloski 2012: preservation of ≥1 coronal wall significantly reduces failure risk.";
      escalationNote = ferruleInsufficient
        ? "Refer for orthodontic extrusion or periodontal crown lengthening before crown preparation."
        : "";
      clinicianSteps = [
        "Evaluate ferrule on all 4 walls — address deficit before preparation.",
        "Place fiber post with dual-cure resin cement (4th-gen adhesive: better radicular dentin bond — Schwartz 2004).",
        "Build composite core; allow full set before crown prep.",
        "Full-coverage crown with ≥1.5 mm ferrule captured at all margins.",
        hasBruxismRisk ? "Add occlusal splint to treatment plan — bruxism HR 12.8 for failure (Abu-Awwad 2025)." : "Check occlusal contacts carefully in lateral excursions.",
      ];

    } else {
      // <25% — endocrown or post + crown
      // Al-Dabbagh 2021: endocrown 5-yr survival 91.4% vs 98.3% conventional (not significant p>0.05)
      primary   = "Endocrown (CAD-CAM feldspathic or IPS e.max) — or fiber post + crown with crown lengthening";
      rationale = "Minimal remaining coronal structure. Al-Dabbagh 2021: endocrown 5-year survival 91.4% vs 98.3% conventional crown (difference not statistically significant, p>0.05). Endocrown avoids post space preparation, preserving radicular dentin integrity. Conventional crown + post is also viable but requires ferrule.";
      postNote  = "Endocrown: no post required (pulp chamber depth provides retention). If conventional crown elected: fiber post mandatory with extrusion/lengthening to achieve ferrule.";
      ferruleNote = "Endocrown uses pulp chamber depth for retention — ferrule less critical than with post+crown systems. However, pulp chamber depth ≥3 mm required for adequate endocrown retention (Al-Dabbagh 2021).";
      urgencyLevel = "amber";
      escalationNote = "If pulp chamber is shallow (<3 mm), endocrown retention is compromised — refer for orthodontic extrusion and proceed with post + crown instead.";
      clinicianSteps = [
        "Measure pulp chamber depth — minimum 3 mm required for endocrown.",
        "If adequate: prepare for CAD-CAM endocrown (IPS e.max press or feldspathic — Al-Dabbagh 2021).",
        "Bond with dual-cure resin cement using 4th-gen adhesive.",
        "If chamber shallow: orthodontic extrusion → fiber post + core + full crown.",
        hasBruxismRisk ? "Occlusal splint mandatory post-restoration." : "Verify occlusal scheme avoids heavy lateral forces.",
      ];
    }

  // ════════════════ MOLAR ════════════════
  } else {

    if (percent >= 75 && usableWalls >= 3 && !hasBruxismRisk) {
      // Abu-Awwad 2025 RCT: direct composite viable with ≥3 intact walls, 3-yr survival 76.7% vs 93.3% (p=0.061)
      primary   = "Direct composite restoration OR ceramic onlay/partial crown";
      rationale = "Abu-Awwad et al. 2025 (first RCT in ETT molars with minimal loss): direct composite and crowns showed statistically similar 3-year survival (76.7% vs 93.3%, p=0.061) when ≥3 axial walls are intact. Direct composite is appropriate for lower-load cases or when endodontic monitoring is needed. Ceramic onlay provides greater long-term durability.";
      postNote  = "No post required — molar pulp chamber provides adequate core retention (Schwartz 2004).";
      ferruleNote = "Ferrule not critical at this structure level. Focus on coronal seal and cuspal coverage.";
      urgencyLevel = "green";
      clinicianSteps = [
        "If choosing direct composite: use bulk-fill base + microhybrid occlusal layer.",
        "If choosing onlay: IPS e.max CAD-CAM preferred (Wang 2022: best fracture mode in posteriors).",
        "Ensure access cavity is sealed before definitive restoration.",
        "Monitor carefully — Abu-Awwad 2025: direct restorations deteriorate in marginal integrity over time; convert to crown if marginal breakdown detected.",
      ];

    } else if (percent >= 75 && (usableWalls < 3 || hasBruxismRisk)) {
      // Adequate remaining percent but compromised walls or parafunction
      primary   = "Full-coverage ceramic or metal-ceramic crown";
      rationale = hasBruxismRisk
        ? "Despite adequate remaining structure, parafunctional habit risk requires full cuspal coverage. Abu-Awwad 2025: bruxism HR 12.8 for failure — crowns provide superior load distribution."
        : "Fewer than 3 usable walls despite adequate remaining percentage — direct composite lacks support. Full crown restores structural integrity.";
      postNote  = "Post not required — pulp chamber provides adequate retention.";
      urgencyLevel = "amber";
      ferruleNote = ferruleAdequate
        ? "Good ferrule — standard crown preparation with ≥1.5 mm margin."
        : "Partial ferrule — ensure maximum circumferential capture at crown margin.";
      clinicianSteps = [
        "Full-coverage metal-ceramic or all-ceramic crown.",
        hasBruxismRisk ? "Occlusal splint post-restoration — Abu-Awwad 2025 bruxism finding." : "Verify occlusal scheme.",
        "No post required; retain as much pulp chamber structure as possible for core.",
      ];

    } else if (percent >= 50) {
      // Cuspal coverage essential — full crown
      // ETT with cuspal coverage 6× more likely to survive
      primary   = "Full-coverage metal-ceramic or all-ceramic crown";
      rationale = "Moderate structure loss with cusp involvement. Schwartz & Robbins 2004: endodontically treated posterior teeth with cuspal coverage are 6× more likely to survive than those with intracoronal restorations. Post rarely needed in molars (Schwartz 2004).";
      postNote  = "Post generally not required — molar pulp chamber provides sufficient core retention. Place fiber post in palatal (maxillary) or distal (mandibular) canal only if core retention is inadequate.";
      urgencyLevel = "amber";
      ferruleNote = ferruleAdequate
        ? "Adequate ferrule on all walls — standard crown preparation ensuring ≥1.5 mm supragingival dentin."
        : ferruleCompromised
          ? "Ferrule compromised on 1 wall — aim for ≥1.5 mm on remaining 3 walls (Juloski 2012: incomplete ferrule better than none)."
          : "Insufficient ferrule — consider crown lengthening of compromised wall(s). Juloski 2012: achieving ferrule on ≥2 walls significantly improves fracture resistance.";
      escalationNote = ferruleInsufficient
        ? "Crown lengthening of deficient wall(s) recommended before definitive crown."
        : "";
      clinicianSteps = [
        "Confirm pulp chamber can be used for core retention — clean and dry.",
        ferruleInsufficient ? "Crown lengthening of deficient walls before preparation." : "Proceed with crown preparation ensuring ≥1.5 mm ferrule at all margins.",
        "If post needed: single fiber post in palatal (upper) or distal (lower) canal only (Schwartz 2004).",
        "Metal-ceramic crown for high-load posterior cases; all-ceramic acceptable with confirmed adequate occlusal clearance.",
        hasBruxismRisk ? "Occlusal splint mandatory — parafunction significantly increases failure risk." : "Check lateral excursion contacts carefully.",
      ];

    } else if (percent >= 25) {
      // Severe loss — post + crown with ferrule assessment
      primary   = "Fiber post (single, largest canal) + composite core → Full-coverage crown";
      rationale = "Severe coronal structure loss. Schwartz 2004: single fiber post in largest straight canal (palatal maxillary, distal mandibular). Juloski 2012: preservation of any coronal wall reduces failure risk — maximize ferrule capture at all crown margins.";
      postNote  = "Single fiber post only — in palatal canal (maxillary molar) or distal canal (mandibular molar). Schwartz 2004: rarely more than 1 post needed in a molar.";
      urgencyLevel = ferruleInsufficient ? "red" : "amber";
      ferruleNote = ferruleAdequate
        ? "Adequate ferrule — capture ≥1.5 mm on all walls during crown prep (Juloski 2012)."
        : ferruleCompromised
          ? "Ferrule on 3 walls — acceptable; aim for ≥1.5 mm where present. The one deficient wall should be addressed if surgically feasible."
          : "Ferrule on ≤2 walls — crown lengthening or orthodontic forced eruption needed. Juloski 2012: incomplete ferrule still better than none.";
      escalationNote = ferruleInsufficient
        ? "Periodontal crown lengthening or forced eruption indicated before definitive crown. If neither feasible: discuss extraction + implant."
        : "";
      clinicianSteps = [
        "Assess all 4 walls for ferrule height before preparation.",
        ferruleInsufficient ? "Refer for crown lengthening / forced eruption before crown." : "Proceed with post placement.",
        "Place single fiber post: palatal canal (maxillary) or distal canal (mandibular) — largest and straightest (Schwartz 2004).",
        "Dual-cure resin cement + 4th-generation adhesive (better radicular bond — Schwartz 2004).",
        "Composite core; full-coverage crown capturing maximum circumferential ferrule.",
        hasBruxismRisk ? "Occlusal splint post-restoration — bruxism HR 12.8 (Abu-Awwad 2025)." : "Verify occlusal contacts.",
      ];

    } else {
      // <25% — endocrown or post + crown
      primary   = "Endocrown (strongly recommended) — or fiber post + crown with crown lengthening";
      rationale = "Minimal remaining coronal structure. Al-Dabbagh 2021 systematic review: endocrown 5-year survival 91.4% vs 98.3% conventional crown (not statistically significant, p>0.05). Endocrown avoids post space preparation, preserving radicular dentin. Especially suitable when pulp chamber is deep and margins are equigingival.";
      postNote  = "Endocrown: no post (pulp chamber depth provides retention, avoids root weakening). If conventional crown chosen: fiber post mandatory — requires ferrule via crown lengthening/extrusion.";
      ferruleNote = "Endocrown retention relies on pulp chamber depth (minimum 3 mm) and adhesive bond — ferrule less critical. Verify chamber depth before committing to endocrown (Al-Dabbagh 2021).";
      urgencyLevel = "amber";
      escalationNote = "If pulp chamber depth <3 mm: endocrown retention insufficient — proceed with forced eruption + fiber post + crown instead.";
      clinicianSteps = [
        "Measure pulp chamber depth: ≥3 mm required for endocrown (Al-Dabbagh 2021).",
        "If adequate: prepare for CAD-CAM endocrown (feldspathic CEREC or IPS e.max — best clinical evidence).",
        "Bond with dual-cure resin cement + 4th-gen adhesive.",
        "If chamber shallow: forced eruption → single fiber post + core + full crown.",
        hasBruxismRisk ? "Occlusal splint mandatory. Bruxism is the primary failure predictor (Abu-Awwad 2025)." : "Protect with night guard if any occlusal wear signs present.",
      ];
    }
  }

  return {
    primary,
    rationale,
    ferruleNote,
    postNote,
    escalationNote,
    urgencyLevel,
    deferRestoration,
    contextualWarnings,
    clinicianSteps,
  };
}

// ── URGENCY COLOR HELPERS ──
function urgencyBorder(level: string) {
  if (level === "green") return "border-emerald-500/40";
  if (level === "amber") return "border-amber-500/40";
  return "border-red-500/40";
}
function urgencyBg(level: string) {
  if (level === "green") return "bg-emerald-500/8";
  if (level === "amber") return "bg-amber-500/8";
  return "bg-red-500/8";
}
function urgencyText(level: string) {
  if (level === "green") return "text-emerald-400";
  if (level === "amber") return "text-amber-400";
  return "text-red-400";
}
function urgencyLabel(level: string) {
  if (level === "green") return "Favourable";
  if (level === "amber") return "Moderate complexity";
  return "High complexity — review prerequisites";
}

// ══════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════
export default function RestorativeRecommendation() {
  const [data, setData]       = useState<RestorativeData | null>(null);
  const [result, setResult]   = useState<RecommendationResult | null>(null);
  const [toothType, setToothType] = useState<"anterior" | "premolar" | "molar">("molar");
  const [isClient, setIsClient]   = useState(false);

  const { user } = useAuth();
  const router   = useRouter();

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const savedData = localStorage.getItem("restorativeData");
    if (!savedData) { setData(null); return; }

    const parsedData: RestorativeData = JSON.parse(savedData);
    setData(parsedData);

    // Determine tooth type
    const toothNum = parseInt(parsedData.toothNumber || "0");
    const molars   = [16,17,18,26,27,28,36,37,38,46,47,48];
    const premolars = [14,15,24,25,34,35,44,45];
    let type: "anterior" | "premolar" | "molar" = "anterior";
    if (molars.includes(toothNum))    type = "molar";
    else if (premolars.includes(toothNum)) type = "premolar";
    setToothType(type);

    // Build recommendation
    const rec = buildRecommendation(
      type,
      parsedData.remainingPercent || 100,
      parsedData.ferrule || { wallsWithFerrule: 4, penalty: 0, label: "Adequate ferrule on all walls" },
      parsedData.walls || { mesial: "intact", distal: "intact", buccal: "intact", lingual: "intact" },
      parsedData.oralHygiene || "0",
      parsedData.perio || "0",
      parsedData.fullResult
    );
    setResult(rec);
  }, []);

  // ── Loading state ──
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#10b981]/30 border-t-[#10b981] animate-spin" />
      </div>
    );
  }

  // ── No data ──
  if (!data || !result) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">
        <div className="absolute inset-0 z-0">
          <Image src="https://iili.io/B6uUNfI.jpg" alt="Background" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
        </div>
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 text-center max-w-md w-full">
            <h1 className="text-3xl font-bold text-red-400 mb-4">No Data Found</h1>
            <p className="text-gray-300 mb-8">Please go back to the Predictor and calculate the case first.</p>
            <Link href="/predictor" className="block bg-[#10b981] hover:bg-[#0ea76e] text-black font-bold py-4 rounded-2xl transition">
              ← Back to Predictor
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const toothLabel = toothType.charAt(0).toUpperCase() + toothType.slice(1);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="https://iili.io/B6uUNfI.jpg" alt="Background" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 min-h-screen px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── HEADER ── */}
          <div className="text-center mb-2">
            <div className="flex justify-center mb-5">
              <Image src="https://iili.io/B6RcxlS.png" alt="Endoprognosis Logo" width={180} height={64} className="h-12 w-auto" priority />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
              Restorative Recommendation
            </h1>
            <p className="text-gray-400">
              Tooth <span className="text-[#10b981] font-semibold">#{data.toothNumber}</span>
              {" · "}<span className="text-gray-300">{toothLabel}</span>
              {" · "}<span className="text-[#10b981] font-semibold">{data.remainingPercent}% remaining structure</span>
            </p>
          </div>

          {/* ── DEFERRAL WARNING (most urgent — shown first) ── */}
          {result.deferRestoration && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/35 rounded-2xl px-5 py-4">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-red-400 flex-shrink-0 mt-0.5">
                <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <div>
                <p className="text-sm font-bold text-red-400 mb-1">Defer Definitive Restoration</p>
                <p className="text-sm text-red-300 leading-relaxed">
                  Active periodontal disease or poor oral hygiene detected. Definitive restoration should be deferred
                  until periodontal stability is achieved and maintained for ≥3 months (Ng et al. 2007).
                  Oral hygiene and periodontal condition must be corrected first.
                </p>
              </div>
            </div>
          )}

          {/* ── CONTEXTUAL WARNINGS ── */}
          {result.contextualWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/30 rounded-2xl px-5 py-4">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <p className="text-sm text-amber-300 leading-relaxed">{w}</p>
            </div>
          ))}

          {/* ── PRIMARY RECOMMENDATION CARD ── */}
          <div className={`rounded-3xl p-6 sm:p-8 border-2 ${urgencyBorder(result.urgencyLevel)} ${urgencyBg(result.urgencyLevel)}`}>
            <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
              <div>
                <p className="text-[10px] text-gray-500 tracking-[2px] uppercase mb-2">Recommended Restoration</p>
                <h2 className={`text-xl sm:text-2xl font-bold leading-snug ${urgencyText(result.urgencyLevel)}`}>
                  {result.primary}
                </h2>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${urgencyBg(result.urgencyLevel)} ${urgencyText(result.urgencyLevel)} ${urgencyBorder(result.urgencyLevel)}`}>
                {urgencyLabel(result.urgencyLevel)}
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{result.rationale}</p>
          </div>

          {/* ── ESCALATION NOTE ── */}
          {result.escalationNote && (
            <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/30 rounded-2xl px-5 py-4">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-400 flex-shrink-0 mt-0.5">
                <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <p className="text-sm text-red-300 leading-relaxed">{result.escalationNote}</p>
            </div>
          )}

          {/* ── DETAILS GRID: Ferrule + Post ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Ferrule */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Ferrule Assessment</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  data.ferrule?.wallsWithFerrule >= 4
                    ? "bg-emerald-500/15 text-emerald-400"
                    : data.ferrule?.wallsWithFerrule >= 3
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-red-500/15 text-red-400"
                }`}>
                  {data.ferrule?.wallsWithFerrule ?? 4} / 4 walls
                </span>
              </div>
              <p className={`text-xs font-semibold mb-2 ${
                data.ferrule?.wallsWithFerrule >= 4 ? "text-emerald-400"
                : data.ferrule?.wallsWithFerrule >= 3 ? "text-amber-400"
                : "text-red-400"
              }`}>
                {data.ferrule?.label || "—"}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">{result.ferruleNote}</p>
            </div>

            {/* Post */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Post Recommendation</p>
              <p className="text-xs text-gray-300 leading-relaxed">{result.postNote}</p>
            </div>
          </div>

          {/* ── WALL STATUS ── */}
          {data.walls && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Coronal Wall Status · {data.remainingPercent}% remaining
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(data.walls) as [string, WallState][]).map(([wall, state]) => (
                  <div key={wall} className={`rounded-xl p-3 text-center border ${
                    state === "intact"   ? "bg-emerald-500/10 border-emerald-500/25" :
                    state === "moderate" ? "bg-amber-500/10 border-amber-500/25" :
                                          "bg-red-500/10 border-red-500/25"
                  }`}>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 capitalize">{wall}</p>
                    <p className={`text-xs font-bold capitalize ${
                      state === "intact" ? "text-emerald-400" : state === "moderate" ? "text-amber-400" : "text-red-400"
                    }`}>{state}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CLINICIAN STEP-BY-STEP ── */}
          <div className="bg-[#0d1a30] border border-[#10b981]/25 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-[#10b981]" />
              <p className="text-sm font-semibold text-white">Clinical Steps</p>
            </div>
            <ol className="space-y-2">
              {result.clinicianSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#10b981]/20 text-[#10b981] text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* ── UNIVERSAL PRINCIPLES ── */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Universal Principles</p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-400">
              <div className="flex items-start gap-2">
                <span className="text-[#10b981] mt-0.5">·</span>
                <span>Coronal seal must be achieved immediately after RCT (Schwartz 2004)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10b981] mt-0.5">·</span>
                <span>Cuspal coverage for all posterior ETT (6× survival advantage — Schwartz 2004)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10b981] mt-0.5">·</span>
                <span>Ferrule ≥1.5–2 mm doubles fracture resistance (Juloski 2012)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10b981] mt-0.5">·</span>
                <span>Fiber posts preferred — restorable failure mode vs catastrophic (Ferrari 2007)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10b981] mt-0.5">·</span>
                <span>Minimize radicular dentin removal — post space only when needed (Schwartz 2004)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10b981] mt-0.5">·</span>
                <span>Quality of coronal restoration independently predicts periapical health (Ng 2007)</span>
              </div>
            </div>
          </div>

          {/* ── DISCLAIMER ── */}
          <p className="text-center text-xs text-gray-600 leading-relaxed">
            ⚠️ This recommendation is for clinical decision support only. Always apply your professional judgment,
            assess the individual patient's occlusion, parafunctional habits, esthetic demands, and systemic health.
          </p>

          {/* ── ACTION BUTTONS ── */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link href="/predictor/result"
              className="flex-1 flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/15 text-white font-semibold py-4 rounded-2xl text-sm transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Result
            </Link>
            <Link href="/home"
              className="flex-1 flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#0ea76e] text-black font-bold py-4 rounded-2xl text-sm transition-all">
              Go to Home
            </Link>
          </div>

        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="relative z-50 border-t border-white/10 bg-black/60 backdrop-blur-md py-6 text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
          {["About","References","How to Use","Contact Us","Privacy Policy","Terms of Service"].map((l) => (
            <Link key={l} href={`/${l.toLowerCase().replace(/ /g,"-")}`} className="hover:text-gray-300 transition">{l}</Link>
          ))}
        </div>
        <p>Need help? <a href="mailto:support@endoprognosis.org" className="text-[#10b981] hover:underline">support@endoprognosis.org</a></p>
        <p className="mt-3">© 2026 Endoprognosis · All Rights Reserved</p>
      </div>
    </div>
  );
}