'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { ArrowUpRight, ImagePlus, Video, X } from 'lucide-react';

export default function CreatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [hook, setHook] = useState('');
  const [context, setContext] = useState('');
  const [published, setPublished] = useState(false);

  function chooseMedia(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (!next || (!next.type.startsWith('image/') && !next.type.startsWith('video/'))) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setPublished(false);
  }

  function clearMedia() { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(''); }
  function submit(event: FormEvent) { event.preventDefault(); if (!hook.trim()) return; setPublished(true); }

  return <main className="mx-auto w-full max-w-4xl px-5 pb-24 pt-12 md:px-8 md:pt-16">
    <header className="mb-12 max-w-xl"><p className="text-xs uppercase tracking-[0.2em] text-zinc-600">CREATE DISCOVERY</p><h1 className="mt-3 text-3xl font-medium tracking-tight text-zinc-100">Share something worth noticing.</h1><p className="mt-3 text-sm leading-6 text-zinc-500">No performance required. Add the find, give it context, and let the discovery speak for itself.</p></header>
    <form onSubmit={submit} className="space-y-10">
      <section><label className="mb-3 block text-xs uppercase tracking-[0.16em] text-zinc-600">Media</label>{preview ? <div className="relative overflow-hidden rounded-2xl bg-[#111114]"><button type="button" onClick={clearMedia} className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-zinc-300" aria-label="Remove media"><X size={16} /></button>{file?.type.startsWith('video/') ? <video src={preview} controls className="max-h-[32rem] w-full object-contain" /> : <img src={preview} alt="Preview" className="max-h-[32rem] w-full object-contain" />}</div> : <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl bg-[#111114] transition-colors hover:bg-[#151518]"><div className="mb-4 flex gap-3 text-zinc-500"><ImagePlus size={22} /><Video size={22} /></div><span className="text-sm text-zinc-300">Add an image or video</span><span className="mt-2 text-xs text-zinc-600">A real moment, place, object, or phenomenon.</span><input type="file" accept="image/*,video/*" onChange={chooseMedia} className="sr-only" /></label>}</section>
      <section className="space-y-8"><div><label htmlFor="hook" className="mb-3 block text-xs uppercase tracking-[0.16em] text-zinc-600">Hook</label><input id="hook" value={hook} onChange={(e) => setHook(e.target.value)} maxLength={140} placeholder="What made you stop and look?" className="w-full border-0 border-b border-white/[0.08] bg-transparent px-0 py-4 text-xl text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-white/[0.2]" /></div><div><label htmlFor="context" className="mb-3 block text-xs uppercase tracking-[0.16em] text-zinc-600">Context</label><textarea id="context" value={context} onChange={(e) => setContext(e.target.value)} maxLength={1000} rows={5} placeholder="Where is it? What is happening? Why is it interesting?" className="w-full resize-none rounded-2xl bg-[#111114] px-5 py-4 text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-700 focus:ring-1 focus:ring-white/[0.08]" /></div></section>
      <footer className="flex items-center justify-between pt-2"><span className="text-xs text-zinc-600">{published ? 'Discovery ready to connect to publishing.' : 'You can change anything before sharing.'}</span><button type="submit" disabled={!hook.trim()} className="flex items-center gap-2 text-sm font-medium text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-700">Share discovery <ArrowUpRight size={16} /></button></footer>
    </form>
  </main>;
}
