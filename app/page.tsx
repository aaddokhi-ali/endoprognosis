// app/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.push("/home");     // Go to the new beautiful Home page
    } else {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Loading screen while checking auth
  return (
    <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-lg">Loading Endoprognosis...</p>
      </div>
    </div>
  );
}