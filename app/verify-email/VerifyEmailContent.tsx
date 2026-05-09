"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode, getAuth } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import Image from "next/image";
import Link from "next/link";

export default function VerifyEmailContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!oobCode) {
        setStatus("error");
        setMessage("Invalid or expired verification link.");
        return;
      }

      try {
        const auth = getAuth();
        await applyActionCode(auth, oobCode);

        if (user) await user.reload();

        setStatus("success");
        setMessage("Your email has been successfully verified!");

        setTimeout(() => router.replace("/login"), 2200);
      } catch (err: any) {
        console.error("Verification error:", err);
        setStatus("error");
        setMessage(
          err.code === "auth/expired-action-code"
            ? "This verification link has expired. Please request a new one."
            : "Verification failed. Please try again."
        );
      }
    };

    verifyEmail();
  }, [oobCode, user, router]);

  return (
    <div className="min-h-screen bg-[#0a1428] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <Image
          src="https://iili.io/B6RcxlS.png"
          alt="Endoprognosis Logo"
          width={220}
          height={80}
          className="mx-auto mb-10"
          priority
        />

        {status === "loading" && <div className="text-6xl mb-8">🔄</div>}
        {status === "success" && <div className="text-7xl mb-8">✅</div>}
        {status === "error" && <div className="text-6xl mb-8">⚠️</div>}

        <h2 className={`text-3xl font-bold mb-4 ${
          status === "success" ? "text-[#10b981]" : 
          status === "error" ? "text-red-400" : "text-white"
        }`}>
          {status === "success" ? "Email Verified Successfully!" : 
           status === "error" ? "Verification Failed" : "Verifying Email..."}
        </h2>

        <p className="text-gray-300 mb-8 text-lg leading-relaxed">{message}</p>

        {status === "success" && (
          <Link
            href="/login"
            className="inline-block bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold px-12 py-4 rounded-2xl text-lg transition"
          >
            Continue to Login
          </Link>
        )}

        {status === "error" && (
          <Link
            href="/login"
            className="inline-block bg-white/10 hover:bg-white/20 px-10 py-4 rounded-2xl text-white font-medium"
          >
            Back to Login
          </Link>
        )}
      </div>
    </div>
  );
}