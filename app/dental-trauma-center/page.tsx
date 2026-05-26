// app/dental-trauma-center/page.tsx
"use client";
import Navigation from "../components/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTrauma } from "../context/TraumaContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function DentalTraumaCenter() {
  const { user, loading: authLoading } = useAuth();
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

  const [formErrors, setFormErrors]   = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [elapsed, setElapsed]         = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Auth guard — wait for Firebase to resolve before redirecting ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push("/login");
  }, [user, authLoading, router]);

  // ── Validation ──
  useEffect(() => {
    const errors: Record<string, string> = {};

    if (!patientInfo.patientName.trim())
      errors.patientName = "Patient name is required";
    if (!patientInfo.phoneNumber.trim())
      errors.phoneNumber = "Phone number is required";
    if (!patientInfo.tooth)
      errors.tooth = "Tooth number is required";
    if (!patientInfo.age.trim())
      errors.age = "Age is required — affects antibiotic selection and prognosis";
    if (!patientInfo.traumaDate)
      errors.traumaDate = "Date & time of trauma is required";
    else if (new Date(patientInfo.traumaDate) > new Date())
      errors.traumaDate = "Trauma date cannot be in the future";

    setFormErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [patientInfo]);

  // ── Context sync ──
  useEffect(() => {
    setContextPatientInfo(patientInfo);
  }, [patientInfo, setContextPatientInfo]);

  // ── Live elapsed-time counter ──
  // Ticks every 30 s after traumaDate is set — critical for PDL viability
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!patientInfo.traumaDate || formErrors.traumaDate) {
      setElapsed(null);
      return;
    }

    const compute = () => {
      const diff = Date.now() - new Date(patientInfo.traumaDate).getTime();
      if (diff < 0) { setElapsed(null); return; }
      const totalMins = Math.floor(diff / 60000);
      const hrs  = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setElapsed(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
    };

    compute();
    timerRef.current = setInterval(compute, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [patientInfo.traumaDate, formErrors.traumaDate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPatientInfo(prev => ({ ...prev, [name]: value }));
  };

  const fdiTeeth = [
    "11","12","13","14","15","16","17","18",
    "21","22","23","24","25","26","27","28",
    "31","32","33","34","35","36","37","38",
    "41","42","43","44","45","46","47","48",
  ];

  // ── PDL viability color from elapsed time ──
  const elapsedMins = patientInfo.traumaDate && !formErrors.traumaDate
    ? Math.floor((Date.now() - new Date(patientInfo.traumaDate).getTime()) / 60000)
    : null;
  const pdlColor = elapsedMins === null ? null
    : elapsedMins <= 15  ? "text-emerald-400"
    : elapsedMins <= 60  ? "text-amber-400"
    : "text-red-400";
  const pdlLabel = elapsedMins === null ? null
    : elapsedMins <= 15  ? "PDL most likely viable"
    : elapsedMins <= 60  ? "PDL may be compromised"
    : "PDL non-viable — delayed replantation protocol";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06080f] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // ── Trauma category cards ──
  const categories = [
    {
      id: "avulsion",
      href: "/dental-trauma-center/avulsion",
      label: "Avulsion",
      sub: "Complete tooth displacement",
      urgency: "MOST URGENT",
      urgencyColor: "text-rose-300",
      urgencyBg: "bg-rose-500/10 border-rose-500/30",
      accent: "from-rose-500 to-pink-600",
      border: "hover:border-rose-500/60",
      glow: "hover:shadow-rose-500/10",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
          <path d="M12 2C8 2 5 5 5 9c0 2.5 1 4.5 2.5 6L12 22l4.5-7C18 13.5 19 11.5 19 9c0-4-3-7-7-7z"/>
          <path d="M12 9v4M12 17h.01"/>
        </svg>
      ),
      detail: "Replantation within 15 min = best prognosis",
    },
    {
      id: "crown-fracture",
      href: "/dental-trauma-center/crown-fracture",
      label: "Crown Fractures",
      sub: "Uncomplicated & complicated",
      urgency: "TIME-SENSITIVE",
      urgencyColor: "text-emerald-300",
      urgencyBg: "bg-emerald-500/10 border-emerald-500/30",
      accent: "from-emerald-500 to-teal-500",
      border: "hover:border-emerald-500/60",
      glow: "hover:shadow-emerald-500/10",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
          <path d="M5 3h14l-2 7H7L5 3z"/><path d="M7 10l-2 11h14l-2-11"/><path d="M12 3v18"/>
        </svg>
      ),
      detail: "Pulp exposure = complicated fracture",
    },
    {
      id: "luxation",
      href: "/dental-trauma-center/luxation",
      label: "Luxation Injuries",
      sub: "Concussion · Subluxation · Extrusive · Lateral · Intrusive",
      urgency: "ASSESS SEVERITY",
      urgencyColor: "text-indigo-300",
      urgencyBg: "bg-indigo-500/10 border-indigo-500/30",
      accent: "from-indigo-500 to-violet-500",
      border: "hover:border-indigo-500/60",
      glow: "hover:shadow-indigo-500/10",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      ),
      detail: "Intrusion = worst prognosis of luxations",
    },
    {
      id: "crown-root-fracture",
      href: "/dental-trauma-center/crown-root-fracture",
      label: "Advanced Fractures",
      sub: "Crown-Root · Root · Alveolar process",
      urgency: "COMPLEX",
      urgencyColor: "text-amber-300",
      urgencyBg: "bg-amber-500/10 border-amber-500/30",
      accent: "from-amber-500 to-orange-500",
      border: "hover:border-amber-500/60",
      glow: "hover:shadow-amber-500/10",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
          <path d="M6 3l4 8-4 10M18 3l-4 8 4 10M6 11h12"/>
        </svg>
      ),
      detail: "Fragment removal essential before evaluation",
    },
  ];

  const inputBase = "w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none transition-all text-sm";
  const inputNormal = `${inputBase} border-white/10 focus:border-blue-500/60 focus:bg-white/8`;
  const inputError  = `${inputBase} border-red-500/50 focus:border-red-400`;

  return (
    <>
      <Navigation />

      <div className="min-h-screen bg-[#06080f] text-white">

        {/* ── HERO ── */}
        <div
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a0f1e 0%, #06080f 40%, #0d1020 100%)",
            minHeight: "340px",
          }}
        >
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(96,165,250,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Radial glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, #3b82f6 0%, transparent 70%)" }} />

          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="https://iili.io/BLMUZYv.jpg"
              alt=""
              className="w-full h-full object-cover opacity-10"
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-3 py-1 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[11px] text-blue-300 font-medium tracking-widest uppercase">IADT 2020 · AAE Guidelines</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Dental Trauma Center
                </h1>
                <p className="text-lg text-blue-200/70 max-w-xl">
                  Evidence-based emergency protocols for traumatic dental injuries.
                  Complete patient identification below to unlock the clinical guides.
                </p>
              </div>

              {/* Live elapsed counter */}
              {elapsed && (
                <div className={`flex-shrink-0 bg-black/40 border rounded-2xl px-6 py-4 text-center ${
                  elapsedMins !== null && elapsedMins > 60
                    ? "border-red-500/40"
                    : elapsedMins !== null && elapsedMins > 15
                      ? "border-amber-500/40"
                      : "border-emerald-500/40"
                }`}>
                  <p className="text-[10px] uppercase tracking-[3px] text-gray-500 mb-1">Time since trauma</p>
                  <p className={`text-4xl font-bold font-mono ${pdlColor}`}>{elapsed}</p>
                  {pdlLabel && (
                    <p className={`text-[11px] mt-1.5 font-medium ${pdlColor}`}>{pdlLabel}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── PATIENT IDENTIFICATION ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="3" stroke="#60a5fa" strokeWidth="1.4"/>
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Patient Identification</h2>
              <p className="text-xs text-gray-500 mt-0.5">All required fields must be completed before accessing clinical guides</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Case ID</p>
              <p className="font-mono text-sm text-blue-400">{patientInfo.phoneNumber || "—"}</p>
            </div>
          </div>

          {/* Form grid */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 sm:p-8">

            {/* Required fields label */}
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Required fields
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">

              {/* Patient name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Patient Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="patientName"
                  value={patientInfo.patientName}
                  onChange={handleChange}
                  className={formErrors.patientName ? inputError : inputNormal}
                  placeholder="Full name"
                />
                {formErrors.patientName && (
                  <p className="text-rose-400 text-[11px] mt-1">{formErrors.patientName}</p>
                )}
              </div>

              {/* Age — required, affects antibiotic + prognosis */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Age (years) <span className="text-rose-400">*</span>
                  <span className="ml-1 text-[10px] text-blue-400/70">affects antibiotic selection</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={patientInfo.age}
                  onChange={handleChange}
                  min="1"
                  max="120"
                  className={formErrors.age ? inputError : inputNormal}
                  placeholder="e.g. 24"
                />
                {formErrors.age && (
                  <p className="text-rose-400 text-[11px] mt-1">{formErrors.age}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Gender</label>
                <select
                  name="gender"
                  value={patientInfo.gender}
                  onChange={handleChange}
                  className={`${inputNormal} bg-[#06080f] appearance-none`}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Tooth */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Tooth (FDI) <span className="text-rose-400">*</span>
                </label>
                <select
                  name="tooth"
                  value={patientInfo.tooth}
                  onChange={handleChange}
                  className={`${formErrors.tooth ? inputError : inputNormal} bg-[#06080f] appearance-none`}
                >
                  <option value="">Select tooth</option>
                  {fdiTeeth.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {formErrors.tooth && (
                  <p className="text-rose-400 text-[11px] mt-1">{formErrors.tooth}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={patientInfo.phoneNumber}
                  onChange={handleChange}
                  className={formErrors.phoneNumber ? inputError : inputNormal}
                  placeholder="+966 5X XXX XXXX"
                />
                {formErrors.phoneNumber && (
                  <p className="text-rose-400 text-[11px] mt-1">{formErrors.phoneNumber}</p>
                )}
              </div>

              {/* Trauma date — critical for elapsed time */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Date & Time of Trauma <span className="text-rose-400">*</span>
                  <span className="ml-1 text-[10px] text-rose-400/70">drives PDL viability</span>
                </label>
                <input
                  type="datetime-local"
                  name="traumaDate"
                  value={patientInfo.traumaDate}
                  onChange={handleChange}
                  max={new Date().toISOString().slice(0, 16)}
                  className={formErrors.traumaDate ? inputError : inputNormal}
                />
                {formErrors.traumaDate && (
                  <p className="text-rose-400 text-[11px] mt-1">{formErrors.traumaDate}</p>
                )}
              </div>
            </div>

            {/* Chief complaint — full width */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Chief Complaint / History of Trauma</label>
              <textarea
                name="chiefComplaint"
                value={patientInfo.chiefComplaint}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                className={`${inputNormal} resize-y`}
                placeholder="e.g. Fell from bicycle 2 hours ago, upper front tooth completely displaced..."
              />
              <p className="text-[10px] text-gray-700 mt-1 text-right">
                {patientInfo.chiefComplaint.length}/500
              </p>
            </div>

            {/* Form status */}
            {isFormValid && (
              <div className="mt-5 flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8l4 4 8-8" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-xs text-emerald-400 font-medium">Patient identification complete — select a trauma category below</p>
              </div>
            )}
          </div>
        </div>

        {/* ── TRAUMA CATEGORIES ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-1">Trauma Categories</h2>
            <p className="text-sm text-gray-500">
              {isFormValid
                ? "Select a category to open the full evidence-based clinical guide"
                : "Complete required patient fields above to unlock"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`${cat.href}?phone=${encodeURIComponent(patientInfo.phoneNumber)}`}
                onClick={e => !isFormValid && e.preventDefault()}
                className={`group relative bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden transition-all duration-300 ${
                  isFormValid
                    ? `cursor-pointer ${cat.border} hover:bg-white/[0.06] hover:shadow-xl ${cat.glow}`
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                {/* Top accent bar */}
                <div className={`h-[3px] bg-gradient-to-r ${cat.accent}`} />

                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                      {cat.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${cat.urgencyBg} ${cat.urgencyColor}`}>
                      {cat.urgency}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1.5">{cat.label}</h3>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">{cat.sub}</p>

                  {/* Key detail line */}
                  <div className="flex items-center gap-2 text-[11px] text-gray-600">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    {cat.detail}
                  </div>

                  {/* Open guide arrow */}
                  <div className={`mt-5 flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                    isFormValid ? `${cat.urgencyColor} group-hover:gap-3` : "text-gray-600"
                  }`}>
                    Open clinical guide
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-gray-700">
            All protocols follow IADT 2020 guidelines · Fouad et al., Dental Traumatology 2020;36:331–342
          </p>
        </div>
      </div>
    </>
  );
}