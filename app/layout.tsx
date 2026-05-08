// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { TraumaProvider } from "./context/TraumaContext";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter" 
});

const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Endoprognosis - Smart Endodontic Tools",
  description: "Endodontic Prognosis Predictor & Crack Tooth Classifier",
  icons: {
    icon: "/images/logo.png",
  },
};

// ==================== NEW MOBILE OPTIMIZATION ====================
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1.0,
  userScalable: true,        // Allow slight zoom if needed
  viewportFit: "cover",
  themeColor: "#0a1428",     // Matches your dark background
};
// ============================================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <body 
        className="bg-[#0a1428] text-white antialiased"
        suppressHydrationWarning
      >
        <AuthProvider>
          <TraumaProvider>
            {children}
          </TraumaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}