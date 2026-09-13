'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, Check, Compass, Footprints, Sparkles } from 'lucide-react';

export default function CreatePage() {
  const [action, setAction] = useState('');
  const [clue, setClue] = useState('');
  const [location, setLocation] = useState('');
  const [published, setPublished] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!action.trim()) return;
    setPublished(true);
  }

  return <main className="w-full pb-8">
    <header className="border-b border-white/[.07] pb-12 lg:pb-16">
      <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.22em] text-[#00FF87]"><span>PULSE // CREATE</span><span className="text-white/20">SYS.RDY</span></div>
      <div className="mt-8 max-w-5xl">
        <p className="font-mono text-[9px] uppercase tracking-[.22em] text-white/25">A PULSE BEGINS WITH AN ACTION</p>
        <h1 className="mt-5 text-[clamp(4rem,9vw,8.5rem)] font-black leading-[.8] tracking-[-.075em] text-white">What do you want<br /><span className="text-white/20">the next person</span><br />to do?</h1>
        <p className="mt-8 max-w-2xl text-base leading-8 text-white/45 sm:text-lg">Not a post. Not a caption. Give someone a small reason to step outside their normal routine — then leave enough signal for the next handoff.</p>
      </div>
    </header>

    <form onSubmit={submit} className="mt-10 space-y-4">
      <section className="rounded-[28px] border border-white/[.07] bg-[#0a0a0a] p-6 sm:p-9">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[#00FF87]"><Footprints size={13} /> STEP 01 · THE ACTION</div>
        <label htmlFor="action" className="mt-7 block text-2xl font-semibold tracking-tight text-white">What should they actually do?</label>
        <textarea id="action" value={action} onChange={e => { setAction(e.target.value); setPublished(false); }} maxLength={280} rows={4} autoFocus placeholder="Take a different route home and photograph one unexpected detail..." className="mt-5 w-full resize-none bg-transparent text-xl leading-8 text-white outline-none placeholder:text-white/15" />
        <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[.16em] text-white/20"><span>Make it specific enough to try</span><span>{action.length}/280</span></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-white/[.07] bg-[#0a0a0a] p-6 sm:p-8">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[#00FF87]"><Compass size={13} /> STEP 02 · THE CLUE</div>
          <label htmlFor="clue" className="mt-6 block text-lg font-semibold text-white">What should the next person know?</label>
          <textarea id="clue" value={clue} onChange={e => setClue(e.target.value)} rows={5} maxLength={500} placeholder="Give them enough context to begin. Keep the discovery alive." className="mt-4 w-full resize-none bg-transparent text-sm leading-7 text-white/65 outline-none placeholder:text-white/15" />
        </div>
        <div className="rounded-[28px] border border-white/[.07] bg-[#0a0a0a] p-6 sm:p-8">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[#00FF87]"><Sparkles size={13} /> STEP 03 · THE HANDOFF</div>
          <p className="mt-6 text-lg font-semibold text-white">Your Pulse becomes real when someone else continues it.</p>
          <div className="mt-5 rounded-2xl border border-[#00FF87]/15 bg-[#00FF87]/[.03] p-4 font-mono text-xs leading-6 text-[#00FF87]">YOU → NEXT PERSON → THEIR DISCOVERY → NEXT CLUE</div>
          <p className="mt-5 text-xs leading-6 text-white/25">The person who joins can respond with what they found and create the next action.</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/[.07] bg-[#0a0a0a] p-6 sm:p-8">
        <div className="font-mono text-[9px] uppercase tracking-[.2em] text-[#00FF87]">STEP 04 · CONTEXT</div>
        <label htmlFor="location" className="mt-6 block text-lg font-semibold text-white">Where does the signal begin?</label>
        <input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Optional — Tokyo, Shibuya" className="mt-4 w-full bg-transparent text-lg text-white outline-none placeholder:text-white/15" />
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-white/[.07] pt-6">
        <span className="font-mono text-[9px] uppercase tracking-[.16em] text-white/20">{published ? 'SIGNAL STAGED // READY FOR THE NEXT PERSON' : 'KEEP IT SMALL. MAKE IT POSSIBLE TODAY.'}</span>
        <button type="submit" disabled={!action.trim()} className="inline-flex items-center gap-2 rounded-full bg-[#00FF87] px-7 py-4 text-xs font-bold uppercase tracking-[.16em] text-black transition hover:bg-[#45ffa6] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/25">{published ? <Check size={15} /> : <Sparkles size={15} />}{published ? 'PULSE BUILT' : 'BUILD THE PULSE'}<ArrowRight size={15} /></button>
      </footer>
    </form>
  </main>;
}
