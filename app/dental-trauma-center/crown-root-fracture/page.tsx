// app/dental-trauma-center/crown-root-fracture/page.tsx
import { Suspense } from 'react';
import AdvancedFractures from './CrownRootFractureClient';

export default function CrownRootFracturePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center text-white">
        <div className="text-xl">Loading advanced fractures protocol...</div>
      </div>
    }>
      <AdvancedFractures />
    </Suspense>
  );
}