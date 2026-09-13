'use client';

import type { Collection, Post } from '@/types/pulse';
import { DiscoveryCard } from '@/components/discover/DiscoveryCard';

type Props = { collections: Collection[]; savedPosts: Post[] };

export default function CollectionShelf({ collections, savedPosts }: Props) {
  return <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-12 md:px-8 md:pt-16">
    <header className="mb-12 max-w-2xl"><p className="text-xs uppercase tracking-[0.2em] text-zinc-600">FUTURE DISCOVERY QUEUE</p><h1 className="mt-3 text-3xl font-medium tracking-tight text-zinc-100">Things worth coming back to.</h1><p className="mt-3 text-sm leading-6 text-zinc-500">Save discoveries before you lose the thread. Collections turn scattered curiosity into shelves you can return to.</p></header>
    {collections.length > 0 && <section className="mb-14"><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-medium text-zinc-300">Curiosity shelves</h2><span className="text-xs text-zinc-600">{collections.length}</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{collections.map((collection) => <article key={collection.id} className="min-h-40 rounded-2xl bg-[#111114] p-6 transition-transform duration-300 hover:-translate-y-1"><span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">SHELF</span><h3 className="mt-10 text-lg font-medium text-zinc-100">{collection.name}</h3>{collection.description && <p className="mt-2 text-sm text-zinc-500">{collection.description}</p>}</article>)}</div></section>}
    <section><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-medium text-zinc-300">Saved discoveries</h2><span className="text-xs text-zinc-600">{savedPosts.length}</span></div>{savedPosts.length ? <div className="grid gap-8 md:grid-cols-2">{savedPosts.map((post) => <DiscoveryCard key={post.id} post={post} />)}</div> : <div className="rounded-2xl bg-[#111114] px-6 py-16 text-center text-sm text-zinc-500">Your queue is empty. Save something that makes you curious.</div>}</section>
  </main>;
}
