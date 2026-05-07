// app/components/ProtectedRoute.tsx
"use client";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Check if user is in Guest Mode
  const isGuest = typeof window !== "undefined" && localStorage.getItem("isGuest") === "true";

  useEffect(() => {
    if (!loading) {
      // Allow both real users AND guests
      if (!user && !isGuest) {
        router.push("/login");
      }
    }
  }, [user, isGuest, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Checking access...</p>
        </div>
      </div>
    );
  }

  // Allow guests + logged-in users
  if (!user && !isGuest) return null;

  return <>{children}</>;
}