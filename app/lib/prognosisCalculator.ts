// app/lib/prognosisCalculator.ts

export type FormData = {
  age: string;
  toothType: string;
  paiScore: number;
  perioStatus: string;
  restorationQuality: string;
  hasCrack: string;
  diabetesOrSmoking: string;
  proximalContacts: number;
};

export function calculatePrognosis(data: any) {
  let score = 94;

  if (data.age === ">70") score -= 9;
  else if (data.age === "51-70") score -= 5;

  if (data.toothType === "Molar") score -= 7;

  score -= (data.paiScore - 1) * 6;

  if (data.perioStatus === "Severe") score -= 15;
  else if (data.perioStatus === "Moderate") score -= 8;
  else if (data.perioStatus === "Mild") score -= 4;

  if (data.restorationQuality === "None/Temporary") score -= 12;
  else if (data.restorationQuality === "Fair") score -= 6;

  if (data.hasCrack === "Confirmed") score -= 18;
  else if (data.hasCrack === "Suspected") score -= 9;

  if (data.diabetesOrSmoking === "Both") score -= 10;
  else if (data.diabetesOrSmoking === "One") score -= 5;

  if (data.proximalContacts === 0) score -= 8;
  else if (data.proximalContacts === 1) score -= 4;

  const finalScore = Math.max(48, Math.min(98, Math.round(score)));

  let riskLevel = "Low Risk";
  let color = "text-green-600";
  if (finalScore < 70) {
    riskLevel = "High Risk";
    color = "text-red-600";
  } else if (finalScore < 85) {
    riskLevel = "Moderate Risk";
    color = "text-orange-600";
  }

  return {
    survivalPercentage: finalScore,
    riskLevel,
    color,
    explanation: `Based on the entered clinical parameters, this tooth has an estimated ${finalScore}% chance of survival at 4 years.`,
    recommendations: getRecommendations(data, finalScore),
  };
}

function getRecommendations(data: any, score: number) {
  const recs: string[] = [];
  if (data.hasCrack !== "No") recs.push("Careful evaluation of crack is needed. Crown is often required.");
  if (data.perioStatus !== "Healthy") recs.push("Periodontal treatment should be done.");
  if (data.restorationQuality === "None/Temporary") recs.push("Place a good permanent restoration or crown.");
  if (score < 75) recs.push("Consider discussing other options like implant with the patient.");
  return recs;
}