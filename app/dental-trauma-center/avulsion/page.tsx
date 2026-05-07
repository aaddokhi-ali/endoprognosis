// app/dental-trauma-center/avulsion/page.tsx
import { Suspense } from 'react';
import AvulsionClient from './AvulsionClient';

export default function AvulsionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1428] flex items-center justify-center text-white">
        <div className="text-xl">Loading avulsion protocol...</div>
      </div>
    }>
      <AvulsionClient />
    </Suspense>
  );
}