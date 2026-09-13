'use client';

import { useMemo, useState } from 'react';
import { Activity, ArrowDown, Radio, Sparkles } from 'lucide-react';
import { mockPulseData } from '@/data/mockPulseData';
import { ActionCard } from '@/components/discover/ActionCard';
import DetailModal from '@/components/discover/DetailModal';
import type { Post } from '@/types/pulse';

const filters = ['ALL', 'CITY', 'PEOPLE', 'ROUTINE'];

function getCategory(post: Post) {
  const text = `${post.title} ${post.description} ${post.context ?? ''}`.toLowerCase();
  if (text.includes('stranger') || text.includes('people') || text.includes('question')) return 'PEOPLE';
  if (text.includes('route') || text.includes('ordinary') || text.includes('routine')) return 'ROUTINE';
  if (text.includes('town') || text.includes('city') || text.includes('place')) return 'CITY';
  return 'CITY';
}

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Post | null>(null);
  const [filter, setFilter] = useState('ALL');
  const visible = useMemo(() => mockPulseData.filter((post) => filter === 'ALL' || getCategory(post) === filter), [filter]);

  return <main className="w-full pb-8">
    <header className="mb-12 border-b border-white/[.07] pb-12 lg:mb-16 lg:pb-16">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-[.22em] text-white/30">
        <span className="inline-flex items-center gap-2 text-[#00FF87]"><span className="h-1.5 w-1.5 rounded-full bg-[#00FF87] shadow-[0_0_12px_#00FF87]" />SYS.RDY // LIVE SIGNAL</span>
        <span className="h-px w-10 bg-white/10" />
        <span>{mockPulseData.length} ACTIVE PULSES</span>
        <span className="inline-flex items-center gap-1"><Activity size={11} /> NETWORK ONLINE</span>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.18fr_.82fr] lg:items-end">
        <div>
          <h1 className="max-w-5xl text-[clamp(4rem,9vw,8.5rem)] font-black leading-[.8] tracking-[-.075em] text-white">
            Find a question.<br />
            <span className="text-white/20">Change something.</span>
          </h1>
        </div>
        <div className="max-w-xl lg:pb-2">
          <p className="text-base leading-8 text-white/45 sm:text-lg">PULSE turns small questions into real-world actions. Follow a signal, do the next thing, then leave the next clue for someone else.</p>
          <div className="mt-6 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.2em] text-white/30"><Sparkles size={13} className="text-[#00FF87]" /> THE HANDOFF IS THE POINT.</div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-2">
        {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 font-mono text-[9px] tracking-[.18em] transition ${filter === item ? 'bg-[#00FF87] text-black' : 'border border-white/[.07] bg-white/[.02] text-white/35 hover:bg-white/[.05] hover:text-white'}`}>{item}</button>)}
        <span className="ml-auto hidden items-center gap-2 font-mono text-[9px] tracking-[.18em] text-white/20 md:flex"><Radio size={12} /> REAL-WORLD SIGNALS</span>
      </div>
    </header>

    <section aria-label="Active Pulses" className="space-y-6">{visible.map((post, index) => <ActionCard key={post.id} post={post} index={index} onOpen={setSelected} />)}</section>
    <div className="mt-14 flex justify-center text-white/15"><ArrowDown size={18} /></div>
    <DetailModal post={selected} onClose={() => setSelected(null)} />
  </main>;
}
