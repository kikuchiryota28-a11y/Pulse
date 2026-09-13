'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { DiscoveryCard } from '@/components/discover/DiscoveryCard';
import type { Collection, Post, Profile } from '@/types/pulse';

type ProfileViewProps = { profile: Profile; posts: Post[]; collections: Collection[] };

export default function ProfileView({ profile, posts, collections }: ProfileViewProps) {
  const [tab, setTab] = useState<'discoveries' | 'collections'>('discoveries');
  const visiblePosts = useMemo(() => posts.filter((post) => post.author_id === profile.id), [posts, profile.id]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-12 md:px-8 md:pt-16">
      <header className="flex flex-col gap-7 border-b border-white/[0.06] pb-10 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#111114]">
            {profile.avatar_url ? <Image src={profile.avatar_url} alt="" fill sizes="64px" className="object-cover" /> : null}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">@{profile.username}</p>
            <h1 className="mt-1 text-2xl font-medium tracking-tight text-zinc-100">{profile.display_name}</h1>
            {profile.bio ? <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">{profile.bio}</p> : null}
          </div>
        </div>
        <p className="max-w-xs text-xs leading-5 text-zinc-600">A small window into what they notice, save, and want to discover next.</p>
      </header>

      <nav className="flex gap-7 py-6" aria-label="Profile sections">
        {(['discoveries', 'collections'] as const).map((value) => (
          <button key={value} onClick={() => setTab(value)} className={`text-sm transition-colors ${tab === value ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-300'}`}>
            {value === 'discoveries' ? 'Discoveries' : 'Collections'}
          </button>
        ))}
      </nav>

      {tab === 'discoveries' ? (
        visiblePosts.length ? <div className="grid gap-8 md:grid-cols-2">{visiblePosts.map((post) => <DiscoveryCard key={post.id} post={post} />)}</div> : <EmptyState text="No discoveries yet." />
      ) : (
        collections.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{collections.map((collection) => <CollectionTile key={collection.id} collection={collection} />)}</div> : <EmptyState text="No collections yet." />
      )}
    </main>
  );
}

function CollectionTile({ collection }: { collection: Collection }) {
  return <article className="group rounded-2xl bg-[#111114] p-6 transition-transform duration-300 hover:-translate-y-1">
    <div className="flex min-h-36 flex-col justify-between"><span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">CURATED SHELF</span><div><h2 className="text-lg font-medium text-zinc-100">{collection.name}</h2>{collection.description ? <p className="mt-2 text-sm leading-5 text-zinc-500">{collection.description}</p> : null}</div></div>
  </article>;
}

function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl bg-[#111114] px-6 py-16 text-center text-sm text-zinc-500">{text}</div>; }
