'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, Check, ImagePlus, MapPin, Sparkles } from 'lucide-react';

export default function CreatePage() {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [context, setContext] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [published, setPublished] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !story.trim()) return;
    setPublished(true);
  }

  return <main className="w-full pb-16">
    <header className="border-b border-white/[.06] pb-10 lg:pb-14">
      <div className="flex items-center gap-2 text-[11px] font-medium text-white/30"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />PULSE // CREATE</div>
      <div className="mt-7 max-w-3xl">
        <p className="text-sm font-medium text-white/30">Share something only you noticed.</p>
        <h1 className="mt-3 text-[clamp(3rem,7vw,6rem)] font-bold leading-[.9] tracking-[-.065em] text-white">Put your find<br /><span className="text-white/25">into the feed.</span></h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/40 sm:text-lg">PULSE works because discoveries have people behind them. Tell us what you found, why it caught you, and give everyone a reason to look closer.</p>
      </div>
    </header>

    <form onSubmit={submit} className="mx-auto mt-8 max-w-3xl space-y-4">
      <section className="rounded-[28px] border border-white/[.06] bg-[#111114] p-6 sm:p-8">
        <div className="text-[10px] font-medium uppercase tracking-[.18em] text-white/25">01 · THE FIND</div>
        <label htmlFor="title" className="mt-6 block text-xl font-semibold text-white">What did you find?</label>
        <input id="title" value={title} onChange={(event) => { setTitle(event.target.value); setPublished(false); }} maxLength={120} autoFocus placeholder="A tiny bookstore hidden above a normal-looking door..." className="mt-4 w-full bg-transparent text-xl text-white outline-none placeholder:text-white/15 sm:text-2xl" />
        <div className="mt-3 text-right text-[10px] text-white/20">{title.length}/120</div>
      </section>

      <section className="rounded-[28px] border border-white/[.06] bg-[#111114] p-6 sm:p-8">
        <div className="text-[10px] font-medium uppercase tracking-[.18em] text-white/25">02 · YOUR CONTEXT</div>
        <label htmlFor="story" className="mt-6 block text-xl font-semibold text-white">Why did it stick with you?</label>
        <textarea id="story" value={story} onChange={(event) => { setStory(event.target.value); setPublished(false); }} rows={6} maxLength={700} placeholder="I only noticed it because it started raining..." className="mt-4 w-full resize-none bg-transparent text-base leading-7 text-white/70 outline-none placeholder:text-white/15" />
        <div className="mt-3 text-right text-[10px] text-white/20">{story.length}/700</div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-[28px] border border-white/[.06] bg-[#111114] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.18em] text-white/25"><MapPin size={13} />03 · WHERE</div>
          <input id="context" value={context} onChange={(event) => setContext(event.target.value)} placeholder="Tokyo · Koenji" className="mt-6 w-full bg-transparent text-base text-white outline-none placeholder:text-white/15" />
        </section>
        <section className="rounded-[28px] border border-white/[.06] bg-[#111114] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.18em] text-white/25"><ImagePlus size={13} />04 · PHOTO</div>
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Optional image URL" className="mt-6 w-full bg-transparent text-base text-white outline-none placeholder:text-white/15" />
        </section>
      </div>

      <footer className="flex flex-col gap-4 border-t border-white/[.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-5 text-white/25">Your name and profile are attached automatically. People should know who they are discovering through.</p>
        <button type="submit" disabled={!title.trim() || !story.trim()} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/25">{published ? <Check size={16} /> : <Sparkles size={16} />}{published ? 'Discovery staged' : 'Share discovery'}<ArrowRight size={15} /></button>
      </footer>
      {published && <div className="rounded-2xl bg-emerald-400/[.08] p-4 text-sm text-emerald-300">Your discovery is ready for the community. The next step is seeing how people react, save it, and continue the conversation.</div>}
    </form>
  </main>;
}
