'use client';

import { useState } from 'react';
import { Activity, ArrowDown, Sparkles } from 'lucide-react';
import { mockPulseData } from '@/data/mockPulseData';
import { ActionCard } from '@/components/discover/ActionCard';
import DetailModal from '@/components/discover/DetailModal';
import type { Post } from '@/types/pulse';

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Post | null>(null);
  return <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8 md:px-8 md:pt-12">
    <header className="mb-12 border-b border-white/[.07] pb-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-[.2em] text-zinc-500"><span className="text-zinc-200">PULSE / DISCOVER</span><span>Reality, slightly changed</span><span className="inline-flex items-center gap-1 text-zinc-400"><Activity size={12}/> {mockPulseData.length} active signals</span></div>
      <div className="mt-7 grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end"><div><h1 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-medium leading-[.92] tracking-[-.055em] text-zinc-50">Find a question.<br/><span className="text-zinc-500">Change something.</span></h1></div><div className="max-w-md lg:pb-2"><p className="text-sm leading-7 text-zinc-300">PULSE turns small questions into real-world actions. Follow a signal, do the next thing, then leave the next clue for someone else.</p><div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-zinc-500"><Sparkles size={13}/> The Handoff is the point.</div></div></div>
    </header>
    <section aria-label="Active Pulses" className="space-y-8">{mockPulseData.map((post, index) => <ActionCard key={post.id} post={post} index={index} onOpen={setSelected}/>)}</section>
    <div className="mt-14 flex justify-center text-zinc-600"><ArrowDown size={18}/></div>
    <DetailModal post={selected} onClose={() => setSelected(null)} />
  </main>;
}
