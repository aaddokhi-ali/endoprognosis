// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1.0,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a1428" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1428" },
  ],
};

// ── Replace with your actual Measurement ID from Google Analytics
// Analytics → Admin → Data Streams → your web stream → Measurement ID
const GA_ID = "G-TH0V411V1M";

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
      <head>
        {/* ── Google Analytics — only injected when GA_ID is set ── */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body 
        className="bg-[#0a1428] text-white antialiased overflow-x-hidden"
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