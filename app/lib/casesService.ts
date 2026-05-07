// app/lib/casesService.ts
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  doc,
  deleteDoc,
  setDoc,
  getDoc 
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export type ProcedureCategory = 
  | "No treatment" 
  | "RCT" 
  | "RCreT" 
  | "Apico" 
  | "VPT";

export interface LightSavedCase {
  id?: string;
  userId: string;
  caseName: string;
  phoneNumber: string;
  toothNumber: string;
  procedureCategory: ProcedureCategory;
  survivalPercentage: number;
  isPractical: boolean;
  totalDPI: number;
  pulpalDiagnosis: string;
  periapicalDiagnosis: string;
  remainingPercent: number;
  followUpDate?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FullCaseDetails {
  formData: any;
  parts: any;
  ferruleWalls: any;
  treatmentRec?: string;
  explanationNote?: string;
  introParagraph?: string;
  casePresText?: string;
  toothType?: string;
}

export function detectProcedureCategory(
  pulpal: string,
  treatmentRec: string,
  isRestorable: boolean
): ProcedureCategory {
  if (!isRestorable) return "No treatment";

  const recLower = treatmentRec.toLowerCase();
  const pulpalLower = pulpal.toLowerCase();

  if (recLower.includes("retreatment") || pulpalLower.includes("previously root canal treated")) {
    return "RCreT";
  }
  if (recLower.includes("vital pulp") || pulpalLower.includes("reversible pulpitis")) {
    return "VPT";
  }
  if (recLower.includes("microsurgical") || recLower.includes("apico")) {
    return "Apico";
  }
  if (recLower.includes("root canal treatment") || 
      pulpalLower.includes("irreversible pulpitis") || 
      pulpalLower.includes("pulp necrosis")) {
    return "RCT";
  }

  return "No treatment";
}

export const casesService = {
  /**
   * Saves lightweight case (fast) + heavy details in subcollection
   */
  async saveCase(
    lightData: {
      userId: string;
      caseName: string;
      phoneNumber: string;
      toothNumber: string;
      procedureCategory: ProcedureCategory;
      survivalPercentage: number;
      isPractical: boolean;
      totalDPI: number;
      pulpalDiagnosis: string;
      periapicalDiagnosis: string;
      remainingPercent: number;
      followUpDate?: Timestamp | null;
    },
    fullDetails: {
      formData: any;
      parts: any;
      ferruleWalls: any;
      treatmentRec?: string;
      explanationNote?: string;
      introParagraph?: string;
      casePresText?: string;
      toothType?: string;
    }
  ) {
    const now = Timestamp.now();

    const lightCase: LightSavedCase = {
      userId: lightData.userId,
      caseName: lightData.caseName,
      phoneNumber: lightData.phoneNumber,
      toothNumber: lightData.toothNumber,
      procedureCategory: lightData.procedureCategory,
      survivalPercentage: lightData.survivalPercentage,
      isPractical: lightData.isPractical,
      totalDPI: lightData.totalDPI,
      pulpalDiagnosis: lightData.pulpalDiagnosis,
      periapicalDiagnosis: lightData.periapicalDiagnosis,
      remainingPercent: lightData.remainingPercent,
      followUpDate: lightData.followUpDate || null,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Save the lightweight case (this is the fast part)
    const docRef = await addDoc(
      collection(db, `users/${lightData.userId}/cases`), 
      lightCase
    );

    // 2. Save heavy details in subcollection
    await setDoc(
      doc(db, `users/${lightData.userId}/cases/${docRef.id}/details`, 'full'),
      {
        ...fullDetails,
        updatedAt: now,
      }
    );

    return { 
      id: docRef.id, 
      ...lightCase 
    };
  },

  async getUserCases(userId: string): Promise<LightSavedCase[]> {
    const q = query(
      collection(db, `users/${userId}/cases`),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as LightSavedCase[];
  },

  async getCaseDetails(userId: string, caseId: string): Promise<FullCaseDetails | null> {
    try {
      const snap = await getDoc(
        doc(db, `users/${userId}/cases/${caseId}/details`, 'full')
      );
      return snap.exists() ? (snap.data() as FullCaseDetails) : null;
    } catch (error) {
      console.error("Error fetching case details:", error);
      return null;
    }
  },

  async deleteCase(userId: string, caseId: string) {
    try {
      await deleteDoc(doc(db, `users/${userId}/cases`, caseId));
      await deleteDoc(doc(db, `users/${userId}/cases/${caseId}/details`, 'full'));
    } catch (error) {
      console.error("Error deleting case:", error);
      throw error;
    }
  }
};