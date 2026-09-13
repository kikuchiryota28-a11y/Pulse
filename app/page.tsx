'use client';

import { useMemo, useState } from 'react';
import { Compass, Plus, Users } from 'lucide-react';
import { mockPulseData } from '@/data/mockPulseData';
import { DiscoveryCard } from '@/components/discover/DiscoveryCard';
import DetailModal from '@/components/discover/DetailModal';
import type { Post } from '@/types/pulse';

const filters = ['ALL', 'CITY', 'PEOPLE', 'ROUTINE'];

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Post | null>(null);
  const [filter, setFilter] = useState('ALL');
  const visible = useMemo(() => mockPulseData.filter((post) => filter === 'ALL' || post.category === filter), [filter]);

  return <main className="w-full pb-16">
    <header className="mb-8 border-b border-white/[.06] pb-8 lg:mb-10 lg:pb-10">
      <div className="flex items-center gap-2 text-[11px] font-medium text-white/30"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />PULSE COMMUNITY <span className="text-white/15">·</span> {mockPulseData.length} people sharing</div>
      <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[clamp(2.8rem,7vw,5.8rem)] font-bold leading-[.9] tracking-[-.065em] text-white">What did you find?</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/40 sm:text-lg">People share the small things they notice. You react, save the ones you want to remember, and follow the trail to the next discovery.</p>
        </div>
        <a href="/create" className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"><Plus size={16} /> Share a discovery</a>
      </div>
      <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs transition ${filter === item ? 'bg-white text-black' : 'bg-white/[.04] text-white/35 hover:bg-white/[.08] hover:text-white'}`}>{item === 'ALL' ? 'For you' : item}</button>)}
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-white/20 md:flex"><Users size={13} /> people, not publishers</span>
      </div>
    </header>

    {visible.length > 0 ? <section aria-label="Community discoveries" className="mx-auto grid max-w-4xl gap-5">{visible.map((post, index) => <DiscoveryCard key={post.id} post={post} index={index} onOpen={setSelected} />)}</section> : <section className="mx-auto flex max-w-xl flex-col items-center rounded-[28px] border border-dashed border-white/10 bg-white/[.02] px-6 py-20 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[.06] text-white/60"><Compass size={20} /></div><h2 className="mt-5 text-xl font-semibold text-white">Nothing here yet.</h2><p className="mt-2 text-sm leading-6 text-white/35">Be the first person to share something you found, noticed, or want someone else to explore.</p><a href="/create" className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90">Share your first discovery</a></section>}
    <DetailModal post={selected} onClose={() => setSelected(null)} />
  </main>;
}
