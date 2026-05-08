// app/dental-trauma-center/crown-fracture/page.tsx
import { Suspense } from 'react';
import CrownFractureClient from './CrownFractureClient';

export default function CrownFracturePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center text-white">
        <div className="text-xl">Loading crown fracture protocol...</div>
      </div>
    }>
      <CrownFractureClient />
    </Suspense>
  );
}