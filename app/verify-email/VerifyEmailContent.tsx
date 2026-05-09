"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode, getAuth, reload, getIdToken } from "firebase/auth";
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
        setMessage("Invalid verification link.");
        return;
      }

      try {
        const auth = getAuth();
        
        // 1. Apply the verification code
        await applyActionCode(auth, oobCode);
        
        // 2. If user is signed in, force refresh
        if (user) {
          await reload(user);
          await getIdToken(user, true);
        } else {
          // Sometimes we need to sign in first to refresh
          console.log("No current user - verification applied but may need login");
        }

        setStatus("success");
        setMessage("Your email has been successfully verified! 🎉");

        // Auto redirect
        setTimeout(() => router.replace("/login"), 2500);

      } catch (err: any) {
        console.error("Verification Error:", err);
        setStatus("error");
        
        if (err.code === "auth/expired-action-code") {
          setMessage("This verification link has expired. Please register again or request a new link.");
        } else {
          setMessage("Verification failed. Please try clicking the link again or contact support.");
        }
      }
    };

    verifyEmail();
  }, [oobCode, user, router]);

  return (
    <div className="min-h-screen bg-[#0a1428] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <Image
          src="https://iili.io/B6RcxlS.png"
          alt="Logo"
          width={220}
          height={80}
          className="mx-auto mb-10"
          priority
        />

        {status === "loading" && <div className="text-6xl mb-8">🔄</div>}
        {status === "success" && <div className="text-7xl mb-8">✅</div>}
        {status === "error" && <div className="text-6xl mb-8">⚠️</div>}

        <h2 className={`text-3xl font-bold mb-4 ${
          status === "success" ? "text-[#10b981]" : status === "error" ? "text-red-400" : "text-white"
        }`}>
          {status === "success" ? "Email Verified Successfully!" : 
           status === "error" ? "Verification Failed" : "Verifying..."}
        </h2>

        <p className="text-gray-300 mb-8 text-lg">{message}</p>

        {status !== "loading" && (
          <Link
            href="/login"
            className="inline-block bg-[#10b981] hover:bg-[#0ea76e] text-black font-semibold px-12 py-4 rounded-2xl text-lg transition"
          >
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}