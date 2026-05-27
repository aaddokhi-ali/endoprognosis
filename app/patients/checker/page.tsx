// app/patients/checker/page.tsx  ← DENTAL SYMPTOM CHECKER
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { app } from "../../firebaseConfig";

// ── FIRESTORE ──
const db = getFirestore(app);

// ── TYPES ──
type Lang = "en" | "ar";
type Visible = "caries" | "fracture" | "swelling" | "nothing";
type ImpressionType = "emergency" | "urgent" | "routine" | "info";

interface ImpressionCard {
  type: ImpressionType;
  badge: string;
  title: string;
  body: string;
}

// ── FDI QUADRANTS ──
const QUADRANTS: Record<string, number[]> = {
  q1: [18, 17, 16, 15, 14, 13, 12, 11],
  q2: [21, 22, 23, 24, 25, 26, 27, 28],
  q3: [31, 32, 33, 34, 35, 36, 37, 38],
  q4: [48, 47, 46, 45, 44, 43, 42, 41],
};

type ToothShape = "incisor" | "canine" | "premolar" | "molar" | "molar3";

function getToothShape(fdi: number): ToothShape {
  const n = fdi % 10;
  if (n === 8) return "molar3";
  if (n === 7 || n === 6) return "molar";
  if (n === 5 || n === 4) return "premolar";
  if (n === 3) return "canine";
  return "incisor";
}

// ── TOOTH SVG COMPONENT ──
function ToothSVG({
  fdi,
  isUpper,
  selected,
  onClick,
}: {
  fdi: number;
  isUpper: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const shape = getToothShape(fdi);
  const fill = selected ? "#3a2800" : "#1a2a3a";
  const rootFill = selected ? "#2a1e00" : "#152030";
  const stroke = selected ? "#f5d76e" : "#2e4060";
  const numColor = selected ? "#f5d76e" : "#8a9ab8";
  const isDashed = shape === "molar3";

  type ShapeConfig = {
    w: number; h: number;
    cx: number; cy: number;
    cw: number; ch: number; crx: number;
    rootPath: string;
    numX: number; numY: number;
  };

  const shapes: Record<ToothShape, ShapeConfig> = {
    incisor: {
      w: 32, h: 48, cx: 8, cy: isUpper ? 24 : 8, cw: 16, ch: 16, crx: 2,
      rootPath: isUpper ? "M8 24 Q16 8 24 24" : "M8 32 Q16 44 24 32",
      numX: 16, numY: isUpper ? 20 : 34,
    },
    canine: {
      w: 32, h: 48, cx: 7, cy: isUpper ? 22 : 10, cw: 18, ch: 18, crx: 2,
      rootPath: isUpper ? "M7 22 Q16 6 25 22" : "M7 28 Q16 46 25 28",
      numX: 16, numY: isUpper ? 18 : 34,
    },
    premolar: {
      w: 32, h: 48, cx: 5, cy: isUpper ? 20 : 10, cw: 22, ch: 20, crx: 3,
      rootPath: isUpper ? "M5 20 Q10 10 16 8 Q22 10 27 20" : "M5 28 Q10 38 16 40 Q22 38 27 28",
      numX: 16, numY: isUpper ? 16 : 35,
    },
    molar: {
      w: 36, h: 48, cx: 3, cy: isUpper ? 18 : 10, cw: 30, ch: 22, crx: 4,
      rootPath: isUpper ? "M3 18 Q6 8 10 6 Q18 4 26 6 Q30 8 33 18" : "M3 30 Q6 40 10 42 Q18 44 26 42 Q30 40 33 30",
      numX: 18, numY: isUpper ? 14 : 36,
    },
    molar3: {
      w: 34, h: 48, cx: 4, cy: isUpper ? 19 : 10, cw: 26, ch: 20, crx: 4,
      rootPath: isUpper ? "M4 19 Q8 10 17 9 Q26 10 30 19" : "M4 30 Q8 38 17 40 Q26 38 30 30",
      numX: 17, numY: isUpper ? 15 : 36,
    },
  };

  const s = shapes[shape];

  return (
    <button
      onClick={onClick}
      title={`FDI ${fdi}`}
      className="border-none bg-transparent cursor-pointer p-0 flex-shrink-0 hover:scale-110 transition-transform duration-150"
      style={{ width: s.w, height: s.h }}
    >
      <svg viewBox={`0 0 ${s.w} ${s.h}`} fill="none" width={s.w} height={s.h}>
        <rect
          x={s.cx} y={s.cy} width={s.cw} height={s.ch} rx={s.crx}
          fill={fill} stroke={stroke} strokeWidth={0.8}
          strokeDasharray={isDashed ? "2 1" : undefined}
        />
        <path
          d={s.rootPath} fill={rootFill} stroke={stroke} strokeWidth={0.8}
          strokeDasharray={isDashed ? "2 1" : undefined}
        />
        <text x={s.numX} y={s.numY} textAnchor="middle" fontSize={8} fill={numColor} fontFamily="DM Sans, sans-serif">
          {fdi}
        </text>
      </svg>
    </button>
  );
}

// ── OPTION BUTTON ──
function OptBtn({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 cursor-pointer
        ${selected
          ? "bg-[#f5d76e] border-[#f5d76e] text-[#050d1f] font-semibold"
          : "bg-[#0a1428] border-[#1e2e4a] text-gray-300 hover:border-[#f5d76e] hover:text-[#f5d76e]"
        }`}
    >
      {label}
    </button>
  );
}

// ── CHECK ITEM ──
function CheckItem({
  label, checked, onClick,
}: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 mb-2
        ${checked
          ? "border-[#f5d76e] bg-[#1a2540] text-[#f5d76e]"
          : "border-[#1e2e4a] text-gray-300 hover:border-[#f5d76e] hover:bg-[#1a2540] hover:text-[#f5d76e]"
        }`}
    >
      <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all
        ${checked ? "bg-[#f5d76e] border-[#f5d76e]" : "border-[#2e4060]"}`}>
        {checked && (
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path d="M1 4L4.5 7.5L11 1" stroke="#050d1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ── RESULT CARD ──
function ResultCard({ card }: { card: ImpressionCard }) {
  const styles: Record<ImpressionType, { bg: string; border: string; badgeBg: string; badgeText: string; titleColor: string }> = {
    emergency: { bg: "bg-[#1a0808]", border: "border-[#5a1818]", badgeBg: "bg-red-600", badgeText: "text-white",       titleColor: "text-red-400"    },
    urgent:    { bg: "bg-[#1a1008]", border: "border-[#5a3a08]", badgeBg: "bg-amber-500", badgeText: "text-[#050d1f]", titleColor: "text-amber-400"  },
    routine:   { bg: "bg-[#081a10]", border: "border-[#185a2a]", badgeBg: "bg-emerald-600", badgeText: "text-[#050d1f]",titleColor: "text-emerald-400"},
    info:      { bg: "bg-[#081418]", border: "border-[#0e3a42]", badgeBg: "bg-teal-600",   badgeText: "text-[#050d1f]",titleColor: "text-teal-400"   },
  };
  const st = styles[card.type];
  return (
    <div className={`${st.bg} border ${st.border} rounded-2xl p-5 mb-3`}>
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3 ${st.badgeBg} ${st.badgeText}`}>
        {card.badge}
      </span>
      <h3 className={`font-semibold text-base mb-2 ${st.titleColor}`} style={{ fontFamily: "Playfair Display, serif" }}>
        {card.title}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed">{card.body}</p>
    </div>
  );
}

// ── PROGRESS BAR ──
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-1 h-1 rounded-full transition-all duration-500"
          style={{
            background: i < step ? "#f5d76e" : i === step ? "rgba(245,215,110,0.3)" : "rgba(255,255,255,0.08)",
          }}
        />
      ))}
    </div>
  );
}

// ── SECTION LABEL ──
function SectionLabel({ step, total, en, ar, lang }: { step: number; total: number; en: string; ar: string; lang: Lang }) {
  return (
    <p className="text-[10px] font-semibold tracking-[2px] uppercase text-[#f5d76e] mb-2">
      {lang === "ar" ? `الخطوة ${step} من ${total}` : `Step ${step} of ${total}`}
    </p>
  );
}

// ── MAIN PAGE ──
export default function PatientsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [hasPain, setHasPain] = useState<string | null>(null);
  const [painType, setPainType] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [sleep, setSleep] = useState<string | null>(null);
  const [visible, setVisible] = useState<Visible[]>([]);
  const [acidicTaste, setAcidicTaste] = useState<string | null>(null);
  const [brush, setBrush] = useState<string | null>(null);
  const [floss, setFloss] = useState<string | null>(null);
  const [scaling, setScaling] = useState<string | null>(null);
  const [toothState, setToothState] = useState<string | null>(null);
  const [findDentist, setFindDentist] = useState<string | null>(null);
  const [ptName, setPtName] = useState("");
  const [ptAge, setPtAge] = useState("");
  const [ptGender, setPtGender] = useState<string | null>(null);
  const [ptPhone, setPtPhone] = useState("");
  const [ptCity, setPtCity] = useState("");

  const t = (en: string, ar: string) => lang === "ar" ? ar : en;

  const isRtl = lang === "ar";

  // ── SCROLL TO TOP on step change ──
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  // ── TOGGLE VISIBLE ──
  function toggleVisible(key: Visible) {
    if (key === "nothing") {
      setVisible((prev) => prev.includes("nothing") ? [] : ["nothing"]);
      return;
    }
    setVisible((prev) => {
      const without = prev.filter((v) => v !== "nothing");
      return without.includes(key) ? without.filter((v) => v !== key) : [...without, key];
    });
  }

  // ── IMPRESSION ENGINE ──
  function buildImpressions(): ImpressionCard[] {
    const cards: ImpressionCard[] = [];
    const hasSevere = duration === "hours" || duration === "medication" || sleep === "yes" || visible.includes("swelling");
    const hasModerate = painType === "spontaneous" || duration === "minutes";
    const hasMild = hasPain === "yes" && painType === "stimulus" && duration === "seconds";
    const hasCaries = visible.includes("caries");
    const hasFracture = visible.includes("fracture");
    const hasAcidic = acidicTaste === "yes";

    if (hasPain === "yes") {
      if (hasSevere) {
        cards.push({
          type: "emergency",
          badge: t("🚨 Emergency Visit", "🚨 زيارة طارئة"),
          title: t("Severe pulpal inflammation suspected", "يشتبه في التهاب لبّ السن الحاد"),
          body: t(
            "Your symptoms — pain that disturbs sleep, lasts hours, or is accompanied by swelling — suggest advanced pulpal involvement or a dental abscess. Seek urgent dental attention within 24 hours.",
            "أعراضك تشير إلى التهاب حاد في لبّ السن أو خراج سني. يتطلب هذا عناية طارئة في غضون ٢٤ ساعة."
          ),
        });
      } else if (hasModerate) {
        cards.push({
          type: "urgent",
          badge: t("⚠️ Urgent Visit Advised", "⚠️ زيارة عاجلة مُستحسنة"),
          title: t("Moderate pulpal inflammation likely", "التهاب لبّ السن المعتدل محتمل"),
          body: t(
            "Spontaneous pain or pain lasting several minutes often signals irreversible pulpal involvement. Schedule a dental visit within the next few days.",
            "الألم التلقائي أو الذي يستمر لدقائق يشير إلى أن العصب داخل السن قد يكون تأثره لا رجعة فيه. يُنصح بحجز موعد خلال أيام قليلة."
          ),
        });
      } else if (hasMild) {
        cards.push({
          type: "routine",
          badge: t("📅 Routine Visit", "📅 زيارة اعتيادية"),
          title: t("Mild pulpal or dentinal sensitivity", "حساسية لبّية أو عاجية خفيفة"),
          body: t(
            "Brief pain triggered by hot, cold, or sweet stimuli is often early-stage pulpal irritation or dentinal hypersensitivity. A routine visit is recommended.",
            "الألم القصير عند التعرض للمحفزات غالباً ناتج عن حساسية العاج أو تهيّج مبكر. يُنصح بزيارة روتينية."
          ),
        });
      }
    }

    if (hasCaries && hasPain !== "yes") {
      cards.push({
        type: "routine",
        badge: t("📅 Routine Visit", "📅 زيارة اعتيادية"),
        title: t("Possible tooth decay detected", "تسوس سني محتمل"),
        body: t(
          "You've noticed a dark spot or cavity. Early decay can be treated with a simple filling — don't wait.",
          "لاحظت بقعة داكنة أو تجويفاً. يمكن علاج التسوس المبكر بحشوة بسيطة. لا تتأخر."
        ),
      });
    }

    if (hasFracture) {
      cards.push({
        type: "urgent",
        badge: t("⚠️ Prompt Visit Needed", "⚠️ زيارة سريعة ضرورية"),
        title: t("Fractured tooth or broken restoration", "كسر في السن أو الحشوة"),
        body: t(
          "A broken tooth or restoration exposes inner layers and can worsen rapidly. Seek dental care promptly.",
          "كسر السن أو الحشوة يكشف الطبقات الداخلية ويمكن أن يتفاقم بسرعة. يُنصح بزيارة طبيب الأسنان بأسرع وقت."
        ),
      });
    }

    if (hasAcidic) {
      cards.push({
        type: "urgent",
        badge: t("⚠️ Note", "⚠️ ملاحظة"),
        title: t("Acidic taste may indicate infection", "الطعم الحامض قد يشير إلى التهاب"),
        body: t(
          "An acidic or foul taste — especially near a specific tooth — can indicate a draining abscess or gum disease. Seek evaluation soon.",
          "الطعم الحامض أو الكريه قد يكون علامة على خراج صارف أو أمراض اللثة. يُرجى التقييم الطبي قريباً."
        ),
      });
    }

    if (cards.length === 0) {
      cards.push({
        type: "info",
        badge: t("ℹ️ General Advice", "ℹ️ نصيحة عامة"),
        title: t("No acute symptoms detected", "لا توجد أعراض حادة"),
        body: t(
          "No urgent red flags at this time. We still recommend a routine dental check-up every 6 months.",
          "لا توجد علامات تحذيرية عاجلة. نوصي بإجراء فحص دوري كل ٦ أشهر للحفاظ على صحة فمك."
        ),
      });
    }

    return cards;
  }

  // ── PRIMARY IMPRESSION for Firestore ──
  function getPrimaryImpression(): ImpressionType {
    return buildImpressions()[0]?.type ?? "info";
  }

  // ── POOR OH ──
  const poorOH = brush === "0" || brush === "1" || floss === "no" || scaling === "never" || scaling === "old";

  // ── SUBMIT TO FIRESTORE ──
  async function submitPatient() {
    if (!ptName.trim() || !ptPhone.trim()) {
      alert(t("Please enter at least your name and phone number.", "يرجى إدخال الاسم ورقم الهاتف على الأقل."));
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "patients"), {
        name: ptName.trim(),
        age: ptAge ? Number(ptAge) : null,
        gender: ptGender,
        phone: ptPhone.trim(),
        city: ptCity.trim(),
        tooth: selectedTooth,
        hasPain,
        painType,
        duration,
        sleep,
        visible,
        acidicTaste,
        brush,
        floss,
        scaling,
        toothState,
        impression: getPrimaryImpression(),
        status: "new",
        lang,
        timestamp: serverTimestamp(),
      });
      setSubmitted(true);
      setStep(5);
    } catch (err) {
      console.error("Firestore error:", err);
      alert(t("Submission failed. Please try again.", "فشل الإرسال. يرجى المحاولة مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  }

  // ── RESET ──
  function resetAll() {
    setStep(1); setSelectedTooth(null); setHasPain(null); setPainType(null);
    setDuration(null); setSleep(null); setVisible([]); setAcidicTaste(null);
    setBrush(null); setFloss(null); setScaling(null); setToothState(null);
    setFindDentist(null); setPtName(""); setPtAge(""); setPtGender(null);
    setPtPhone(""); setPtCity(""); setSubmitted(false);
  }

  // ── INPUT STYLE ──
  const inputCls = "w-full px-4 py-3 rounded-xl border border-[#1e2e4a] bg-[#0a1428] text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-[#f5d76e] transition-colors";

  // ── TOOTH LABEL ──
  function toothLabel(fdi: number) {
    const arch = fdi < 30 ? t("Upper", "العلوي") : t("Lower", "السفلي");
    const side = (fdi >= 10 && fdi < 20) || (fdi >= 40 && fdi < 50)
      ? t("Right", "الأيمن") : t("Left", "الأيسر");
    return `FDI ${fdi} — ${arch} ${side}`;
  }

  return (
    <div className="min-h-screen bg-[#050d1f] text-white overflow-hidden relative flex flex-col" dir={isRtl ? "rtl" : "ltr"}>

      {/* ── BACKGROUND ── */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://iili.io/C9c9AXV.jpg')",
          filter: "brightness(0.5) contrast(1.2)",
        }}
      />
      <div className="absolute inset-0 bg-black/75 z-10" />

      {/* ── HEADER ── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <button
          onClick={() => router.push("/patients")}
          className="flex items-center gap-2 text-gray-400 hover:text-[#f5d76e] transition-colors text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d={isRtl ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("Back to Home", "العودة للرئيسية")}
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="17" fill="#0d1a30" stroke="#f5d76e" strokeWidth="1" />
            <path d="M11 14 C11 10, 14 8, 18 8 C22 8, 25 10, 25 14 C25 20, 21 26, 18 28 C15 26, 11 20, 11 14Z" fill="#f5d76e" opacity="0.2" />
            <path d="M13 15 C13 12, 15 10, 18 10 C21 10, 23 12, 23 15 C23 20, 20 25, 18 27 C16 25, 13 20, 13 15Z" stroke="#f5d76e" strokeWidth="1.2" fill="none" />
            <circle cx="18" cy="18" r="2" fill="#f5d76e" opacity="0.6" />
          </svg>
          <span className="font-bold text-[#f5d76e] tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>
            EndoPrognosis
          </span>
        </div>

        {/* Lang toggle */}
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="flex items-center gap-1 bg-[#0a1428] border border-[#1e2e4a] rounded-full px-3 py-1.5 text-xs font-medium hover:border-[#f5d76e] transition-colors"
        >
          <span className={lang === "en" ? "text-[#f5d76e]" : "text-gray-500"}>EN</span>
          <span className="text-gray-600 mx-0.5">·</span>
          <span className={lang === "ar" ? "text-[#f5d76e]" : "text-gray-500"}>ع</span>
        </button>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-20 flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">

          {/* ── PAGE TITLE ── */}
          {step < 5 && (
            <div className="text-center mb-8">
              <p className="text-xs tracking-[4px] text-gray-400 uppercase mb-2">
                {t("Patient Assessment", "تقييم المريض")}
              </p>
              <h1
                className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#f5d76e] via-[#f0c14d] to-[#d4af37] bg-clip-text text-transparent"
                style={{ fontFamily: "Playfair Display, serif" }}
              >
                {t("Dental Symptom Checker", "فاحص أعراض الأسنان")}
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                {t("صفحة المراجع", "Patient Portal")}
              </p>
            </div>
          )}

          {/* ── CARD WRAPPER ── */}
          {step < 5 && (
            <div className="bg-[#0d1a30]/90 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-2xl shadow-black/50">
              <ProgressBar step={step} />

              {/* ════════════════════════════════
                  STEP 1 — CHIEF COMPLAINT
              ════════════════════════════════ */}
              {step === 1 && (
                <div>
                  <SectionLabel step={1} total={4} en="Step 1 of 4" ar="الخطوة ١ من ٤" lang={lang} />
                  <h2 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                    {t("What's bothering you?", "ما الذي يزعجك؟")}
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    {t("Tap the affected tooth, then answer a few quick questions.", "انقر على السن المصاب، ثم أجب على بعض الأسئلة السريعة.")}
                  </p>

                  {/* FDI TOOTH CHART */}
                  <div className="mb-6 select-none">
                    <p className="text-center text-xs text-gray-500 mb-3">
                      {t("Tap to select the affected tooth", "انقر لاختيار السن المصاب")}
                    </p>

                    {/* Upper jaw */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-px bg-[#1e2e4a]" />
                      <span className="text-[10px] text-gray-600 font-medium tracking-wider">{t("UPPER JAW", "الفك العلوي")}</span>
                      <div className="flex-1 h-px bg-[#1e2e4a]" />
                    </div>
                    <div className="flex justify-between px-1 mb-1">
                      <span className="text-[10px] text-gray-600">{t("Right", "يمين")}</span>
                      <span className="text-[10px] text-gray-600">{t("Left", "يسار")}</span>
                    </div>
                    <div className="flex justify-center items-end gap-px">
                      <div className="flex gap-px">
                        {QUADRANTS.q1.map((fdi) => (
                          <ToothSVG key={fdi} fdi={fdi} isUpper={true} selected={selectedTooth === fdi} onClick={() => setSelectedTooth(fdi)} />
                        ))}
                      </div>
                      <div className="w-0.5 h-12 bg-[#1e2e4a] mx-1 self-center" />
                      <div className="flex gap-px">
                        {QUADRANTS.q2.map((fdi) => (
                          <ToothSVG key={fdi} fdi={fdi} isUpper={true} selected={selectedTooth === fdi} onClick={() => setSelectedTooth(fdi)} />
                        ))}
                      </div>
                    </div>

                    {/* Occlusal line */}
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 h-px bg-[#1e2e4a]" />
                      <span className="text-[10px] text-gray-600 tracking-wider">{t("OCCLUSAL LINE", "خط الإطباق")}</span>
                      <div className="flex-1 h-px bg-[#1e2e4a]" />
                    </div>

                    {/* Lower jaw */}
                    <div className="flex justify-center items-start gap-px">
                      <div className="flex gap-px">
                        {QUADRANTS.q4.map((fdi) => (
                          <ToothSVG key={fdi} fdi={fdi} isUpper={false} selected={selectedTooth === fdi} onClick={() => setSelectedTooth(fdi)} />
                        ))}
                      </div>
                      <div className="w-0.5 h-12 bg-[#1e2e4a] mx-1 self-center" />
                      <div className="flex gap-px">
                        {QUADRANTS.q3.map((fdi) => (
                          <ToothSVG key={fdi} fdi={fdi} isUpper={false} selected={selectedTooth === fdi} onClick={() => setSelectedTooth(fdi)} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-px bg-[#1e2e4a]" />
                      <span className="text-[10px] text-gray-600 font-medium tracking-wider">{t("LOWER JAW", "الفك السفلي")}</span>
                      <div className="flex-1 h-px bg-[#1e2e4a]" />
                    </div>

                    {/* Selected pill */}
                    {selectedTooth && (
                      <div className="text-center mt-3">
                        <span className="inline-flex items-center gap-2 bg-[#1a2540] border border-[#f5d76e] text-[#f5d76e] text-xs font-medium px-3 py-1.5 rounded-full">
                          🦷 {toothLabel(selectedTooth)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pain? */}
                  <div className="mb-5">
                    <p className="text-sm font-medium text-gray-200 mb-3">{t("Do you experience pain in this tooth?", "هل تشعر بألم في هذا السن؟")}</p>
                    <div className="flex flex-wrap gap-2">
                      <OptBtn label={t("Yes, I have pain", "نعم، أشعر بألم")} selected={hasPain === "yes"} onClick={() => setHasPain("yes")} />
                      <OptBtn label={t("No pain", "لا يوجد ألم")} selected={hasPain === "no"} onClick={() => { setHasPain("no"); setPainType(null); setDuration(null); setSleep(null); }} />
                    </div>
                  </div>

                  {/* Pain trigger */}
                  {hasPain === "yes" && (
                    <div className="mb-5">
                      <p className="text-sm font-medium text-gray-200 mb-3">{t("What triggers the pain?", "ما الذي يثير الألم؟")}</p>
                      <div className="flex flex-wrap gap-2">
                        <OptBtn label={t("With stimulus (hot/cold/sweet/biting)", "مع محفز (حار/بارد/حلو/عض)")} selected={painType === "stimulus"} onClick={() => setPainType("stimulus")} />
                        <OptBtn label={t("Spontaneous (comes on its own)", "تلقائي (يأتي من تلقاء نفسه)")} selected={painType === "spontaneous"} onClick={() => setPainType("spontaneous")} />
                      </div>
                    </div>
                  )}

                  {/* Duration */}
                  {hasPain === "yes" && (
                    <div className="mb-5">
                      <p className="text-sm font-medium text-gray-200 mb-3">{t("How long does the pain last?", "كم يستمر الألم؟")}</p>
                      <div className="flex flex-wrap gap-2">
                        <OptBtn label={t("Seconds", "ثوانٍ")} selected={duration === "seconds"} onClick={() => setDuration("seconds")} />
                        <OptBtn label={t("Minutes", "دقائق")} selected={duration === "minutes"} onClick={() => setDuration("minutes")} />
                        <OptBtn label={t("Hours", "ساعات")} selected={duration === "hours"} onClick={() => setDuration("hours")} />
                        <OptBtn label={t("Requires medication", "يحتاج مسكنات")} selected={duration === "medication"} onClick={() => setDuration("medication")} />
                      </div>
                    </div>
                  )}

                  {/* Sleep */}
                  {hasPain === "yes" && (
                    <div className="mb-5">
                      <p className="text-sm font-medium text-gray-200 mb-3">{t("Does the pain disturb your sleep?", "هل يزعج الألم نومك ليلاً؟")}</p>
                      <div className="flex flex-wrap gap-2">
                        <OptBtn label={t("Yes, wakes me up", "نعم، يوقظني")} selected={sleep === "yes"} onClick={() => setSleep("yes")} />
                        <OptBtn label={t("No", "لا")} selected={sleep === "no"} onClick={() => setSleep("no")} />
                      </div>
                    </div>
                  )}

                  {/* Visible */}
                  <div className="mb-5">
                    <p className="text-sm font-medium text-gray-200 mb-1">{t("What do you notice at the problem area?", "ماذا تلاحظ في منطقة المشكلة؟")}</p>
                    <p className="text-xs text-gray-600 mb-3">{t("Select all that apply", "اختر كل ما ينطبق")}</p>
                    <CheckItem label={t("Visible cavity or dark spot (possible decay)", "تجويف مرئي أو بقعة داكنة (تسوس محتمل)")} checked={visible.includes("caries")} onClick={() => toggleVisible("caries")} />
                    <CheckItem label={t("Cracked or broken tooth/filling", "كسر أو تشقق في السن أو الحشوة")} checked={visible.includes("fracture")} onClick={() => toggleVisible("fracture")} />
                    <CheckItem label={t("Swelling or gum bump near the tooth", "تورم أو نتوء في اللثة بجانب السن")} checked={visible.includes("swelling")} onClick={() => toggleVisible("swelling")} />
                    <CheckItem label={t("Nothing visible", "لا يوجد شيء مرئي")} checked={visible.includes("nothing")} onClick={() => toggleVisible("nothing")} />
                  </div>

                  {/* Acidic taste */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-200 mb-3">{t("Do you notice an acidic or bad taste in your mouth?", "هل تشعر بطعم حامض أو كريه في فمك؟")}</p>
                    <div className="flex flex-wrap gap-2">
                      <OptBtn label={t("Yes", "نعم")} selected={acidicTaste === "yes"} onClick={() => setAcidicTaste("yes")} />
                      <OptBtn label={t("No", "لا")} selected={acidicTaste === "no"} onClick={() => setAcidicTaste("no")} />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button onClick={() => setStep(2)} className="bg-[#f5d76e] hover:bg-[#ffe180] text-[#050d1f] font-semibold px-8 py-3 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-[#f5d76e]/20 text-sm">
                      {t("Continue →", "متابعة ←")}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════
                  STEP 2 — DENTAL HISTORY
              ════════════════════════════════ */}
              {step === 2 && (
                <div>
                  <SectionLabel step={2} total={4} en="Step 2 of 4" ar="الخطوة ٢ من ٤" lang={lang} />
                  <h2 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                    {t("Your dental habits", "عاداتك الصحية")}
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    {t("This helps us understand the bigger picture of your oral health.", "هذا يساعدنا على فهم صورة صحتك الفموية الشاملة.")}
                  </p>

                  {/* Brushing */}
                  <div className="mb-5">
                    <p className="text-sm font-medium text-gray-200 mb-3">{t("How many times do you brush your teeth per day?", "كم مرة تنظف أسنانك يومياً؟")}</p>
                    <div className="flex flex-wrap gap-2">
                      <OptBtn label={t("None", "لا أنظف")} selected={brush === "0"} onClick={() => setBrush("0")} />
                      <OptBtn label={t("Once", "مرة واحدة")} selected={brush === "1"} onClick={() => setBrush("1")} />
                      <OptBtn label={t("Twice", "مرتان")} selected={brush === "2"} onClick={() => setBrush("2")} />
                      <OptBtn label={t("Three times or more", "ثلاث مرات أو أكثر")} selected={brush === "3"} onClick={() => setBrush("3")} />
                    </div>
                  </div>

                  {/* Flossing */}
                  <div className="mb-5">
                    <p className="text-sm font-medium text-gray-200 mb-3">{t("Do you use dental floss at least once a day?", "هل تستخدم خيط الأسنان مرة واحدة على الأقل يومياً؟")}</p>
                    <div className="flex flex-wrap gap-2">
                      <OptBtn label={t("Yes, daily", "نعم، يومياً")} selected={floss === "yes"} onClick={() => setFloss("yes")} />
                      <OptBtn label={t("Sometimes", "أحياناً")} selected={floss === "sometimes"} onClick={() => setFloss("sometimes")} />
                      <OptBtn label={t("Rarely or never", "نادراً أو لا")} selected={floss === "no"} onClick={() => setFloss("no")} />
                    </div>
                  </div>

                  {/* Scaling */}
                  <div className="mb-5">
                    <p className="text-sm font-medium text-gray-200 mb-3">{t("When was your last dental cleaning (scaling)?", "متى كانت آخر زيارة لتنظيف الأسنان (الجير)؟")}</p>
                    <div className="flex flex-wrap gap-2">
                      <OptBtn label={t("Less than 6 months ago", "أقل من ٦ أشهر")} selected={scaling === "recent"} onClick={() => setScaling("recent")} />
                      <OptBtn label={t("More than 6 months ago", "أكثر من ٦ أشهر")} selected={scaling === "old"} onClick={() => setScaling("old")} />
                      <OptBtn label={t("Never / don't remember", "لا أتذكر / أبداً")} selected={scaling === "never"} onClick={() => setScaling("never")} />
                    </div>
                  </div>

                  {/* Tooth state */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-200 mb-3">{t("What is the current state of the problem tooth?", "ما هو الوضع الحالي للسن المعنية؟")}</p>
                    <div className="flex flex-wrap gap-2">
                      <OptBtn label={t("Appears healthy", "تبدو سليمة")} selected={toothState === "sound"} onClick={() => setToothState("sound")} />
                      <OptBtn label={t("Has a filling", "بها حشوة")} selected={toothState === "restored"} onClick={() => setToothState("restored")} />
                      <OptBtn label={t("Broken / chipped restoration", "حشوة مكسورة")} selected={toothState === "broken"} onClick={() => setToothState("broken")} />
                      <OptBtn label={t("Root canal treated", "سن معالج بعصب")} selected={toothState === "rct"} onClick={() => setToothState("rct")} />
                      <OptBtn label={t("Has a crown", "بها تاج")} selected={toothState === "crown"} onClick={() => setToothState("crown")} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-300 text-sm transition-colors px-4 py-2 rounded-full border border-[#1e2e4a] hover:border-gray-600">
                      {t("← Back", "رجوع →")}
                    </button>
                    <button onClick={() => setStep(3)} className="bg-[#f5d76e] hover:bg-[#ffe180] text-[#050d1f] font-semibold px-8 py-3 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-[#f5d76e]/20 text-sm">
                      {t("Continue →", "متابعة ←")}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════
                  STEP 3 — IMPRESSION
              ════════════════════════════════ */}
              {step === 3 && (
                <div>
                  <SectionLabel step={3} total={4} en="Step 3 of 4" ar="الخطوة ٣ من ٤" lang={lang} />
                  <h2 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                    {t("Your clinical impression", "التقييم السريري")}
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    {t("Based on your answers — this is not a diagnosis. Please see a dentist for proper evaluation.", "بناءً على إجاباتك — هذا ليس تشخيصاً. يرجى زيارة طبيب الأسنان للتقييم الصحيح.")}
                  </p>

                  {/* Impression cards */}
                  {buildImpressions().map((card, i) => <ResultCard key={i} card={card} />)}

                  {/* OH tip */}
                  {poorOH && (
                    <div className="mt-4 bg-[#0a1428] border border-[#1e3050] rounded-2xl p-5">
                      <p className="text-teal-400 text-sm font-medium flex items-center gap-2 mb-3">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2Zm0 4v4m0-5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                        {t("A note on your oral hygiene", "ملاحظة حول نظافتك الفموية")}
                      </p>
                      <ul className="space-y-2 text-xs text-gray-400 leading-relaxed">
                        {[
                          t("Brush at least twice daily — morning and before bed — with fluoride toothpaste.", "نظّف أسنانك مرتين يومياً على الأقل — صباحاً وقبل النوم — بمعجون يحتوي على الفلورايد."),
                          t("Flossing removes plaque between teeth where your brush cannot reach.", "خيط الأسنان يزيل البلاك بين الأسنان حيث لا تصل الفرشاة."),
                          t("Professional cleaning (scaling) every 6 months prevents gum disease and tooth loss.", "التنظيف الاحترافي كل ٦ أشهر يمنع أمراض اللثة وفقدان الأسنان."),
                          t("Good oral hygiene is directly linked to heart health, diabetes control, and overall wellbeing.", "النظافة الفموية الجيدة مرتبطة مباشرة بصحة القلب والسيطرة على السكري والصحة العامة."),
                        ].map((tip, i) => (
                          <li key={i} className={`flex gap-2 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
                            <span className="text-[#f5d76e] mt-0.5 flex-shrink-0">{isRtl ? "←" : "→"}</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-white/10 my-6" />

                  {/* Find dentist */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-200 mb-3">
                      {t("Would you like help finding a trusted dentist near you?", "هل تريد مساعدة في إيجاد طبيب أسنان موثوق بالقرب منك؟")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <OptBtn label={t("Yes, please!", "نعم، من فضلك!")} selected={findDentist === "yes"} onClick={() => setFindDentist("yes")} />
                      <OptBtn label={t("No, thank you", "لا، شكراً")} selected={findDentist === "no"} onClick={() => setFindDentist("no")} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-300 text-sm transition-colors px-4 py-2 rounded-full border border-[#1e2e4a] hover:border-gray-600">
                      {t("← Back", "رجوع →")}
                    </button>
                    <button
                      onClick={() => { findDentist === "yes" ? setStep(4) : setStep(5); }}
                      disabled={!findDentist}
                      className="bg-[#f5d76e] hover:bg-[#ffe180] text-[#050d1f] font-semibold px-8 py-3 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-[#f5d76e]/20 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {t("Continue →", "متابعة ←")}
                    </button>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════
                  STEP 4 — PATIENT INFO
              ════════════════════════════════ */}
              {step === 4 && (
                <div>
                  <SectionLabel step={4} total={4} en="Step 4 of 4" ar="الخطوة ٤ من ٤" lang={lang} />
                  <h2 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                    {t("A little about you", "بعض المعلومات عنك")}
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">
                    {t("We'll use this to match you with a trusted dentist in your area.", "سنستخدم هذه المعلومات لإيجاد طبيب أسنان موثوق في منطقتك.")}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t("Full name *", "الاسم الكامل *")}</label>
                      <input className={inputCls} type="text" value={ptName} onChange={(e) => setPtName(e.target.value)} placeholder={t("Your name", "اسمك الكريم")} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t("Age", "العمر")}</label>
                      <input className={inputCls} type="number" min={5} max={110} value={ptAge} onChange={(e) => setPtAge(e.target.value)} placeholder={t("Years", "سنة")} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t("Gender", "الجنس")}</label>
                    <div className="flex gap-2">
                      <OptBtn label={t("Male", "ذكر")} selected={ptGender === "male"} onClick={() => setPtGender("male")} />
                      <OptBtn label={t("Female", "أنثى")} selected={ptGender === "female"} onClick={() => setPtGender("female")} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t("Phone number *", "رقم الهاتف *")}</label>
                    <input className={inputCls} type="tel" value={ptPhone} onChange={(e) => setPtPhone(e.target.value)} placeholder="+966 5X XXX XXXX" />
                  </div>

                  <div className="mb-6">
                    <label className="text-xs text-gray-500 font-medium mb-1.5 block">{t("City / Region", "المدينة / المنطقة")}</label>
                    <input className={inputCls} type="text" value={ptCity} onChange={(e) => setPtCity(e.target.value)} placeholder={t("e.g. Dammam, Riyadh...", "مثال: الدمام، الرياض...")} />
                  </div>

                  <div className="flex justify-between items-center">
                    <button onClick={() => setStep(3)} className="text-gray-500 hover:text-gray-300 text-sm transition-colors px-4 py-2 rounded-full border border-[#1e2e4a] hover:border-gray-600">
                      {t("← Back", "رجوع →")}
                    </button>
                    <button
                      onClick={submitPatient}
                      disabled={submitting}
                      className="bg-[#f5d76e] hover:bg-[#ffe180] text-[#050d1f] font-semibold px-8 py-3 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-[#f5d76e]/20 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting
                        ? t("Submitting...", "جارٍ الإرسال...")
                        : t("Submit & Find Dentist →", "إرسال وإيجاد طبيب ←")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

         {/* ════════════════════════════════
    STEP 5 — SUCCESS
════════════════════════════════ */}
{step === 5 && (
  <div className="text-center py-12">
    <div className="w-20 h-20 rounded-full bg-[#081a10] border-2 border-emerald-500 flex items-center justify-center mx-auto mb-6">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M8 18L15 25L28 11" stroke="#4ab87a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <h2
      className="text-3xl font-bold bg-gradient-to-r from-[#f5d76e] via-[#f0c14d] to-[#d4af37] bg-clip-text text-transparent mb-3"
      style={{ fontFamily: "Playfair Display, serif" }}
    >
      {t("You're all set!", "تم بنجاح!")}
    </h2>
    <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">
      {submitted
        ? t("Your information has been received. A trusted dentist in your area will reach out to you shortly.", "تم استلام معلوماتك. سيتواصل معك طبيب أسنان موثوق في منطقتك قريباً.")
        : t("Thank you for completing the assessment. We hope this was helpful.", "شكراً لإتمام التقييم. نأمل أن يكون ذلك مفيداً لك.")}
    </p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onClick={resetAll}
        className="bg-[#f5d76e] hover:bg-[#ffe180] text-[#050d1f] font-semibold px-8 py-3 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-[#f5d76e]/20 text-sm"
      >
        {t("Start a new assessment", "بدء تقييم جديد")}
      </button>
      <button
        onClick={() => router.push("/")}
        className="text-gray-400 hover:text-gray-200 border border-[#1e2e4a] hover:border-gray-600 px-8 py-3 rounded-full text-sm transition-all"
      >
        {t("Back to Home", "العودة للرئيسية")}
      </button>
    </div>
  </div>
)}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-20 py-8 border-t border-gray-800 bg-black/60 text-center">
        <p className="text-gray-400 text-sm">
          endoprognosis project 2026. Copyrights reserved
        </p>
      </footer>
    </div>
  );
}