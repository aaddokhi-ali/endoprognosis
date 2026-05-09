"use client";
import { Suspense } from "react";
import VerifyEmailContent from "./VerifyEmailContent";

// Main page wrapper with Suspense (required by Next.js)
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0a1428] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-6xl mb-8">🔄</div>
        <h2 className="text-3xl font-bold text-white">Verifying your email...</h2>
      </div>
    </div>
  );
}