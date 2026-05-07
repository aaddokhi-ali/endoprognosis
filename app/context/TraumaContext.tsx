"use client";
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

type PatientInfo = {
  patientName: string;
  age: string;
  gender: string;
  tooth: string;
  phoneNumber: string;
  traumaDate: string;
  chiefComplaint: string;
};

type TraumaCase = {
  id: string;
  date: string;
  type: string;
  patientInfo: PatientInfo;
  formData: any;
  resultHTML: string;
};

type TraumaContextType = {
  patientInfo: PatientInfo;
  setPatientInfo: (info: Partial<PatientInfo>) => void;
  savedCases: TraumaCase[];
  saveCase: (type: string, formData: any, resultHTML: string) => void;
  deleteCase: (id: string) => void;
  loadCaseByPhone: (phone: string) => void;
  clearCurrentPatient: () => void;
};

const TraumaContext = createContext<TraumaContextType | undefined>(undefined);

export function TraumaProvider({ children }: { children: ReactNode }) {
  const [patientInfo, setPatientInfoState] = useState<PatientInfo>({
    patientName: "",
    age: "",
    gender: "",
    tooth: "",
    phoneNumber: "",
    traumaDate: "",
    chiefComplaint: "",
  });

  const [savedCases, setSavedCases] = useState<TraumaCase[]>([]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("traumaCases");
    if (saved) setSavedCases(JSON.parse(saved));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("traumaCases", JSON.stringify(savedCases));
  }, [savedCases]);

  const setPatientInfo = useCallback((info: Partial<PatientInfo>) => {
    setPatientInfoState(prev => ({ ...prev, ...info }));
  }, []);

  const loadCaseByPhone = useCallback((phone: string) => {
    const foundCase = savedCases.find(c => c.patientInfo.phoneNumber === phone);
    if (foundCase) {
      setPatientInfoState(foundCase.patientInfo);
    } else {
      setPatientInfo({ phoneNumber: phone });
    }
  }, [savedCases, setPatientInfo]);

  const clearCurrentPatient = useCallback(() => {
    setPatientInfoState({
      patientName: "",
      age: "",
      gender: "",
      tooth: "",
      phoneNumber: "",
      traumaDate: "",
      chiefComplaint: "",
    });
  }, []);

  const saveCase = (type: string, formData: any, resultHTML: string) => {
    const newCase: TraumaCase = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      type,
      patientInfo: { ...patientInfo },
      formData,
      resultHTML,
    };

    setSavedCases(prev => [newCase, ...prev]);
    alert("✅ Case Saved Successfully!");
  };

  const deleteCase = (id: string) => {
    setSavedCases(prev => prev.filter(c => c.id !== id));
  };

  return (
    <TraumaContext.Provider 
      value={{ 
        patientInfo, 
        setPatientInfo, 
        savedCases, 
        saveCase, 
        deleteCase,
        loadCaseByPhone,
        clearCurrentPatient
      }}
    >
      {children}
    </TraumaContext.Provider>
  );
}

export const useTrauma = () => {
  const context = useContext(TraumaContext);
  if (!context) throw new Error("useTrauma must be used within TraumaProvider");
  return context;
};