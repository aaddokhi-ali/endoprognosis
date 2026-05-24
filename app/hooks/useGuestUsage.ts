"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "guestUsesLeft";
const MAX_USES    = 3;

export interface GuestUsageResult {
  allowed:    boolean;
  usesLeft:   number;
  loading:    boolean;
  checkUsage: () => Promise<boolean>; // call on form submit — returns true if allowed
}

export function useGuestUsage(): GuestUsageResult {
  const [usesLeft, setUsesLeft] = useState<number>(MAX_USES);
  const [loading,  setLoading]  = useState(false);

  // Hydrate from localStorage on mount (for badge display)
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached !== null) setUsesLeft(parseInt(cached));
  }, []);

  const checkUsage = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/guest-usage", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.allowed) {
        const left = Math.max(0, data.usesLeft ?? MAX_USES - 1);
        setUsesLeft(left);
        localStorage.setItem(STORAGE_KEY, String(left));
        return true;
      } else {
        setUsesLeft(0);
        localStorage.setItem(STORAGE_KEY, "0");
        return false;
      }
    } catch (err) {
      // Network error — fail open, don't block the user
      console.error("Guest usage check failed:", err);
      return true;
    } finally {
      setLoading(false);
    }
  };

  return {
    allowed:  usesLeft > 0,
    usesLeft,
    loading,
    checkUsage,
  };
}