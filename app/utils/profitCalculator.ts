// app/utils/profitCalculator.ts

export interface ProcedurePrice {
  revenue: number;
  cost: number;
}

export interface ProfitCalculationResult {
  actualProcedure: string;
  procedureName: string;
  revenue: number;
  cost: number;
  profit: number;
  feeMultiplier: number;        // 1 or 0.5
  profitStatus: "full" | "in-progress";
  isAutoDetected: boolean;
  requiresManualSelection: boolean;   // New: for impractical / unclear cases
}

/**
 * Maps treatment recommendation text to profit tracker procedure key
 */
export function mapTreatmentToProcedure(treatmentRec: string = ""): string | null {
  if (!treatmentRec) return null;

  const text = treatmentRec.toLowerCase();

  if (text.includes("vital pulp") || text.includes("vpt")) {
    return "vpt";
  }
  if (text.includes("apico") || text.includes("microsurgery") || text.includes("apicoectomy")) {
    return "apico";
  }
  if (text.includes("retreatment") || text.includes("rcret") || text.includes("re-treat")) {
    if (text.includes("anterior")) return "retreat-anterior";
    if (text.includes("premolar")) return "retreat-premolar";
    return "retreat-molar";
  }
  if (text.includes("root canal") || text.includes("rct") || text.includes("endodontic treatment")) {
    if (text.includes("anterior")) return "rct-anterior";
    if (text.includes("premolar")) return "rct-premolar";
    return "rct-molar";
  }

  return null;
}

/**
 * Detects if a case is impractical / no clear treatment recommendation
 */
export function isImpracticalCase(treatmentRec: string = "", isPractical: boolean = true): boolean {
  if (isPractical === false) return true;
  
  const text = treatmentRec.toLowerCase().trim();
  return (
    !text ||
    text.includes("no treatment") ||
    text.includes("impractical") ||
    text.includes("extraction") ||
    text.includes("not recommended")
  );
}

/**
 * Main profit calculation function
 */
export function calculateProfitForCase(
  treatmentRec: string,
  toothType: string = "",
  actualProcedureOverride: string | null = null,
  status: "Done" | "In-Progress" | string,
  profitSettings: any,
  isPractical: boolean = true   // New parameter
): ProfitCalculationResult | null {
  
  const requiresManualSelection = isImpracticalCase(treatmentRec, isPractical);

  let actualProcedure = actualProcedureOverride;
  let isAutoDetected = !actualProcedureOverride && !requiresManualSelection;

  // Auto-mapping only if practical and no override
  if (!actualProcedure && !requiresManualSelection) {
    actualProcedure = mapTreatmentToProcedure(treatmentRec);
  }

  // If still no procedure and it's not impractical → try fallback
  if (!actualProcedure && !requiresManualSelection) {
    actualProcedure = mapTreatmentToProcedure(treatmentRec);
  }

  if (!actualProcedure || !profitSettings?.procedures?.[actualProcedure]) {
    return {
      actualProcedure: actualProcedure || "",
      procedureName: "Manual Selection Required",
      revenue: 0,
      cost: 0,
      profit: 0,
      feeMultiplier: status === "Done" ? 1 : 0.5,
      profitStatus: status === "Done" ? "full" : "in-progress",
      isAutoDetected: false,
      requiresManualSelection: true
    };
  }

  const proc = profitSettings.procedures[actualProcedure];
  const multiplier = status === "Done" ? 1 : 0.5;

  const revenue = Math.round(proc.revenue * multiplier);
  const cost = Math.round(proc.cost * multiplier);
  const profit = revenue - cost;

  const procedureName = getProcedureDisplayName(actualProcedure);

  return {
    actualProcedure,
    procedureName,
    revenue,
    cost,
    profit,
    feeMultiplier: multiplier,
    profitStatus: status === "Done" ? "full" : "in-progress",
    isAutoDetected,
    requiresManualSelection
  };
}

/**
 * Get display name for procedure key
 */
export function getProcedureDisplayName(key: string): string {
  const names: Record<string, string> = {
    "rct-anterior": "Root Canal Treatment – Anterior",
    "rct-premolar": "Root Canal Treatment – Premolar",
    "rct-molar": "Root Canal Treatment – Molar",
    "retreat-anterior": "Root Canal Retreatment – Anterior",
    "retreat-premolar": "Root Canal Retreatment – Premolar",
    "retreat-molar": "Root Canal Retreatment – Molar",
    "vpt": "Vital Pulp Therapy",
    "apico": "Endodontic Microsurgery (Apicoectomy)",
  };
  return names[key] || key;
}