// app/components/LoadingScreen.tsx
import Image from "next/image";

export default function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a1428]">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://iili.io/B6uUNfI.jpg"
          alt="Endoprognosis Background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="https://iili.io/B6RcxlS.png"
              alt="Endoprognosis Logo"
              width={220}
              height={80}
              className="h-16 w-auto opacity-80"
            />
          </div>

          <div className="animate-spin w-16 h-16 border-4 border-[#10b981] border-t-transparent rounded-full mx-auto mb-6"></div>
          
          <p className="text-xl text-white font-medium">{message}</p>
          <p className="text-gray-400 mt-2">Please wait...</p>
        </div>
      </div>
    </div>
  );
}