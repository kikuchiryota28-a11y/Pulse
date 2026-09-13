'use client';

import { useEffect } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function GlobalErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the recovery path intentionally quiet; telemetry can be attached here later.
  }, []);

  return (
    <main className="min-h-screen bg-[#08080A] text-[#F5F5F5]">
      <EmptyState
        title="Something went quiet."
        description="The discovery could not be loaded. Nothing was lost."
        actionLabel="Try again →"
        actionHref="#"
      />
      <div className="fixed bottom-8 left-0 right-0 flex justify-center">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-white/10 bg-[#111114]/80 px-5 py-2.5 text-sm text-[#D4D4D8] backdrop-blur-xl transition hover:bg-white/10"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
