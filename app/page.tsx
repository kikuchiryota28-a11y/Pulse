'use client';

import { useState } from 'react';
import { mockPulseData } from '@/data/mockPulseData';
import { DiscoveryCard } from '@/components/discover/DiscoveryCard';
import DetailModal from '@/components/discover/DetailModal';
import type { Post } from '@/types/pulse';

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Post | null>(null);
  return <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
    <header className="mb-12 flex items-end justify-between gap-6"><div><p className="text-xs uppercase tracking-[0.22em] text-zinc-600">PULSE / DISCOVER</p><h1 className="mt-3 text-3xl font-medium tracking-tight text-zinc-100 md:text-4xl">Find something you didn’t know you wanted to see.</h1></div><span className="hidden text-xs text-zinc-600 md:block">{mockPulseData.length} discoveries</span></header>
    <section className="space-y-12" aria-label="Discoveries">{mockPulseData.map((post) => <button key={post.id} type="button" className="block w-full text-left" onClick={() => setSelected(post)}><DiscoveryCard post={post} /></button>)}</section>
    <DetailModal post={selected} onClose={() => setSelected(null)} />
  </main>;
}
