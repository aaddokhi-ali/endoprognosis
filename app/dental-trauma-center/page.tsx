// app/dental-trauma-center/page.tsx
"use client";
import Navigation from "../components/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTrauma } from "../context/TraumaContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DentalTraumaCenter() {
  const { user } = useAuth();
  const router = useRouter();
  const { setPatientInfo: setContextPatientInfo } = useTrauma();

  const [patientInfo, setPatientInfo] = useState({
    patientName: "",
    age: "",
    gender: "",
    tooth: "",
    phoneNumber: "",
    traumaDate: "",
    chiefComplaint: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Validate form whenever patientInfo changes
  useEffect(() => {
    const errors: Record<string, string> = {};

    if (!patientInfo.patientName.trim()) errors.patientName = "Patient name is required";
    if (!patientInfo.phoneNumber.trim()) errors.phoneNumber = "Phone number is required";
    if (!patientInfo.tooth) errors.tooth = "Tooth number is required";
    if (!patientInfo.traumaDate) errors.traumaDate = "Date of trauma is required";

    setFormErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [patientInfo]);

  // Sync local state to Trauma Context whenever it changes
  useEffect(() => {
    setContextPatientInfo(patientInfo);
  }, [patientInfo, setContextPatientInfo]);

  const handlePatientChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPatientInfo((prev) => ({ ...prev, [name]: value }));
  };

  // Full FDI tooth numbering (11-48)
  const fdiTeeth = [
    "11","12","13","14","15","16","17","18",
    "21","22","23","24","25","26","27","28",
    "31","32","33","34","35","36","37","38",
    "41","42","43","44","45","46","47","48"
  ];

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#0a1428] text-white">
        {/* Hero Header */}
        <div 
          className="relative h-[460px] bg-cover bg-center"
          style={{ backgroundImage: "url('https://iili.io/BLMUZYv.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-[#0a1428]" />
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-6xl md:text-7xl font-serif tracking-wider font-bold mb-4 bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent">
              Dental Trauma Center
            </h1>
            <p className="text-2xl text-blue-200 max-w-2xl mx-auto mt-2">
              Evidence-Based Guides for Traumatic Dental Injuries
            </p>
            <p className="mt-3 text-blue-400 text-lg">
              IADT 2020 • AAE Guidelines
            </p>
          </div>
        </div>

        {/* Patient Identification */}
        <div className="max-w-7xl mx-auto px-6 py-12 border-b border-white/10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <h2 className="text-3xl font-semibold">Patient Identification</h2>
            <p className="text-gray-400 mt-2 md:mt-0">
              Case ID: <span className="font-mono text-rose-400">{patientInfo.phoneNumber || "Not set yet"}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Patient Name */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">Patient Name <span className="text-red-400">*</span></label>
              <input 
                type="text" 
                name="patientName"
                value={patientInfo.patientName}
                onChange={handlePatientChange}
                className={`w-full bg-white/10 border ${formErrors.patientName ? 'border-red-500' : 'border-white/30 focus:border-blue-500'} rounded-2xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none transition-colors`}
                placeholder="Full Name"
              />
              {formErrors.patientName && <p className="text-red-400 text-sm mt-1">{formErrors.patientName}</p>}
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">Age (years)</label>
              <input 
                type="number" 
                name="age"
                value={patientInfo.age}
                onChange={handlePatientChange}
                min="1"
                max="120"
                className="w-full bg-white/10 border border-white/30 focus:border-blue-500 rounded-2xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none transition-colors"
                placeholder="25"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">Gender</label>
              <select 
                name="gender"
                value={patientInfo.gender}
                onChange={handlePatientChange}
                className="w-full bg-white/10 border border-white/30 focus:border-blue-500 rounded-2xl px-5 py-4 text-white focus:outline-none transition-colors"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Tooth (Full FDI) */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">Tooth (FDI) <span className="text-red-400">*</span></label>
              <select 
                name="tooth"
                value={patientInfo.tooth}
                onChange={handlePatientChange}
                className={`w-full bg-white/10 border ${formErrors.tooth ? 'border-red-500' : 'border-white/30 focus:border-blue-500'} rounded-2xl px-5 py-4 text-white focus:outline-none transition-colors`}
              >
                <option value="">Select Tooth</option>
                {fdiTeeth.map(t => (
                  <option key={t} value={t} className="bg-[#1f2937] text-white">{t}</option>
                ))}
              </select>
              {formErrors.tooth && <p className="text-red-400 text-sm mt-1">{formErrors.tooth}</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">Phone Number <span className="text-red-400">*</span></label>
              <input 
                type="tel" 
                name="phoneNumber"
                value={patientInfo.phoneNumber}
                onChange={handlePatientChange}
                className={`w-full bg-white/10 border ${formErrors.phoneNumber ? 'border-red-500' : 'border-white/30 focus:border-blue-500'} rounded-2xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none transition-colors`}
                placeholder="+966 5X XXX XXXX"
              />
              {formErrors.phoneNumber && <p className="text-red-400 text-sm mt-1">{formErrors.phoneNumber}</p>}
            </div>

            {/* Date of Trauma */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">Date & Time of Trauma <span className="text-red-400">*</span></label>
              <input 
                type="datetime-local" 
                name="traumaDate"
                value={patientInfo.traumaDate}
                onChange={handlePatientChange}
                className={`w-full bg-white/10 border ${formErrors.traumaDate ? 'border-red-500' : 'border-white/30 focus:border-blue-500'} rounded-2xl px-5 py-4 text-white focus:outline-none transition-colors`}
              />
              {formErrors.traumaDate && <p className="text-red-400 text-sm mt-1">{formErrors.traumaDate}</p>}
            </div>

            {/* Chief Complaint */}
            <div className="lg:col-span-3">
              <label className="block text-sm mb-2 text-gray-300">Chief Complaint / History of Trauma</label>
              <textarea 
                name="chiefComplaint"
                value={patientInfo.chiefComplaint}
                onChange={handlePatientChange}
                rows={3}
                className="w-full bg-white/10 border border-white/30 focus:border-blue-500 rounded-2xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none transition-colors resize-y"
                placeholder="e.g. Fell from bicycle 2 hours ago, tooth completely out..."
              />
            </div>
          </div>
        </div>

        {/* Trauma Categories */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col items-center mb-12">
            <h2 className="text-4xl font-serif text-center">Trauma Categories</h2>
            <p className="text-gray-400 mt-3 text-center max-w-md">
              {isFormValid 
                ? "Patient information is complete. Choose a category to begin documentation." 
                : "Please complete the required patient identification fields above"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Avulsion */}
            <Link
              href={`/dental-trauma-center/avulsion?phone=${encodeURIComponent(patientInfo.phoneNumber)}`}
              className={`group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-rose-500 hover:bg-white/10 transition-all duration-300 ${!isFormValid && 'opacity-50 pointer-events-none'}`}
              onClick={(e) => !isFormValid && e.preventDefault()}
            >
              <div className="h-2 bg-gradient-to-r from-rose-400 to-pink-500" />
              <div className="p-8">
                <h3 className="text-2xl font-semibold mb-3">Avulsion</h3>
                <p className="text-gray-400">Complete Tooth Displacement</p>
                <div className="mt-8 text-rose-400 font-medium flex items-center gap-2">
                  Open Guide <span className="text-xl">→</span>
                </div>
              </div>
            </Link>

            {/* Crown Fractures */}
            <Link
              href={`/dental-trauma-center/crown-fracture?phone=${encodeURIComponent(patientInfo.phoneNumber)}`}
              className={`group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-emerald-500 hover:bg-white/10 transition-all duration-300 ${!isFormValid && 'opacity-50 pointer-events-none'}`}
              onClick={(e) => !isFormValid && e.preventDefault()}
            >
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="p-8">
                <h3 className="text-2xl font-semibold mb-3">Crown Fractures</h3>
                <p className="text-gray-400">Uncomplicated & Complicated (with pulp exposure)</p>
                <div className="mt-8 text-emerald-400 font-medium flex items-center gap-2">
                  Open Guide <span className="text-xl">→</span>
                </div>
              </div>
            </Link>

            {/* Luxation Injuries */}
            <Link
              href={`/dental-trauma-center/luxation?phone=${encodeURIComponent(patientInfo.phoneNumber)}`}
              className={`group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-indigo-500 hover:bg-white/10 transition-all duration-300 ${!isFormValid && 'opacity-50 pointer-events-none'}`}
              onClick={(e) => !isFormValid && e.preventDefault()}
            >
              <div className="h-2 bg-gradient-to-r from-indigo-400 to-violet-500" />
              <div className="p-8">
                <h3 className="text-2xl font-semibold mb-3">Luxation Injuries</h3>
                <p className="text-gray-400">Concussion • Subluxation • Extrusive • Lateral • Intrusive</p>
                <div className="mt-8 text-indigo-400 font-medium flex items-center gap-2">
                  Open Diagnostic Guide <span className="text-xl">→</span>
                </div>
              </div>
            </Link>

            {/* Advanced Fractures */}
            <Link
              href={`/dental-trauma-center/crown-root-fracture?phone=${encodeURIComponent(patientInfo.phoneNumber)}`}
              className={`group bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-amber-500 hover:bg-white/10 transition-all duration-300 ${!isFormValid && 'opacity-50 pointer-events-none'}`}
              onClick={(e) => !isFormValid && e.preventDefault()}
            >
              <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
              <div className="p-8">
                <h3 className="text-2xl font-semibold mb-3">Advanced Fractures</h3>
                <p className="text-gray-400">Crown-Root • Root • Alveolar Process</p>
                <div className="mt-8 text-amber-400 font-medium flex items-center gap-2">
                  Open Guide <span className="text-xl">→</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-16 text-center text-gray-500 text-sm">
            Select any category above to open the full interactive clinical guide.<br />
            All content follows IADT 2020 and AAE guidelines.
          </div>
        </div>
      </div>
    </>
  );
}