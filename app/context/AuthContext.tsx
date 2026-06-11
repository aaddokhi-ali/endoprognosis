// app/context/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  sendEmailVerification,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";

import { auth } from "../firebaseConfig";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);   // true until FIRST auth event fires
  const [error, setError]     = useState<string | null>(null);

  // Set persistence once on mount
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
  }, []);

  // ── Single auth listener — no race condition ──
  // onAuthStateChanged is the canonical Firebase listener.
  // onIdTokenChanged was added redundantly and caused the null→user flash.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);   // always set loading=false regardless of user state
    });
    return () => unsubscribe();
  }, []);

  // ── Helpers ──
  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code || "";
    if (code.includes("email-already-in-use"))   return "This email is already registered. Please login instead.";
    if (code.includes("invalid-email"))          return "Please enter a valid email address.";
    if (code.includes("weak-password"))          return "Password should be at least 6 characters long.";
    if (code.includes("user-not-found") || code.includes("wrong-password")) return "Invalid email or password.";
    if (code.includes("too-many-requests"))      return "Too many failed attempts. Please try again later.";
    if (code.includes("network-request-failed")) return "Network error. Please check your internet connection.";
    return err?.message?.replace("Firebase: ", "") || "Something went wrong.";
  };

  const getActionCodeSettings = () => ({
    url: `${window.location.origin}/verify-email`,
    handleCodeInApp: true,
  });

  // ── register ──
  const register = async (email: string, password: string) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user, getActionCodeSettings());
      await signOut(auth);
    } catch (err: any) {
      const message = getFriendlyErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  };

  // ── login ──
  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser   = userCredential.user;

      // Reload once to get fresh emailVerified flag
      await loggedInUser.reload();

      // Brief retry loop — handles edge case where verification
      // was just completed and Firebase hasn't propagated yet
      let attempts = 0;
      while (!loggedInUser.emailVerified && attempts < 3) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 600));
        await loggedInUser.reload();
      }

      if (!loggedInUser.emailVerified) {
        await signOut(auth);
        throw new Error("Please verify your email first. Check your inbox and spam folder.");
      }

      localStorage.removeItem("isGuest");
      localStorage.removeItem("guestMode");

    } catch (err: any) {
      const message = getFriendlyErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  };

  // ── logout ──
  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  // ── sendVerificationEmail ──
  const sendVerificationEmail = async () => {
    if (!user)               throw new Error("No user is logged in");
    if (user.emailVerified)  throw new Error("Email is already verified");
    try {
      await sendEmailVerification(user, getActionCodeSettings());
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      throw err;
    }
  };

  // ── resetPassword ──
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      throw new Error(getFriendlyErrorMessage(err));
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      sendVerificationEmail,
      resetPassword,
      error,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};