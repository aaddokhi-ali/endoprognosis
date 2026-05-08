// app/dental-trauma-center/luxation/page.tsx
import { Suspense } from 'react';
import LuxationInjuriesClient from './LuxationInjuriesClient';

export default function LuxationInjuriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center text-white">
        <div className="text-xl">Loading luxation injuries protocol...</div>
      </div>
    }>
      <LuxationInjuriesClient />
    </Suspense>
  );
}