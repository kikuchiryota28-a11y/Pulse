'use client';

import { useState } from 'react';
import { Bookmark, Heart, Lightbulb, MessageCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Post, ReactionType } from '@/types/pulse';
import { AsyncMedia } from '@/components/ui/AsyncMedia';

interface DiscoveryCardProps { post: Post; index?: number; onOpen?: (post: Post) => void; }
const spring = { type: 'spring', stiffness: 220, damping: 24, mass: 0.8 } as const;
const reactions: Array<{ type: ReactionType; label: string; icon: typeof Heart }> = [
  { type: 'loved', label: 'Love', icon: Heart },
  { type: 'mind_blown', label: 'Whoa', icon: Sparkles },
  { type: 'explore', label: 'Explore', icon: Lightbulb },
  { type: 'learned', label: 'Learned', icon: Sparkles },
];

export function DiscoveryCard({ post, index = 0, onOpen }: DiscoveryCardProps) {
  const media = post.media[0];
  const author = post.author;
  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const [saved, setSaved] = useState(false);
  const [counts, setCounts] = useState(post.reaction_counts ?? {});

  function chooseReaction(type: ReactionType) {
    setReaction((current) => {
      if (current === type) {
        setCounts((value) => ({ ...value, [type]: Math.max(0, (value[type] ?? 0) - 1) }));
        return null;
      }
      setCounts((value) => ({
        ...value,
        ...(current ? { [current]: Math.max(0, (value[current] ?? 0) - 1) } : {}),
        [type]: (value[type] ?? 0) + 1,
      }));
      return type;
    });
  }

  return (
    <motion.article layoutId={`post-${post.id}`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: index * 0.06 }} className="overflow-hidden rounded-[24px] border border-white/[.06] bg-[#111114]">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <Link href={author ? `/u/${author.username}` : '#'} onClick={(event) => event.stopPropagation()} className="flex min-w-0 items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          {author?.avatar_url ? <img src={author.avatar_url} alt="" loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10" /> : <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{author?.display_name ?? 'PULSE member'}</span>
            <span className="block truncate text-xs text-white/35">@{author?.username ?? 'member'}{author?.bio ? ` · ${author.bio}` : ''}</span>
          </span>
        </Link>
        <span className="shrink-0 text-[11px] text-white/25">shared a find</span>
      </div>

      <button type="button" onClick={() => onOpen?.(post)} className="block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30">
        <motion.div whileHover={{ scale: 1.012 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative overflow-hidden bg-[#0d0d10]">
          {media?.type === 'video' ? <div className="relative aspect-[16/10] overflow-hidden"><video src={media.url} poster={media.thumbnail_url ?? undefined} muted playsInline loop autoPlay preload="metadata" className="absolute inset-0 h-full w-full object-cover" /></div> : media?.url ? <AsyncMedia src={media.url} alt={media.alt ?? post.title} width={media.width} height={media.height} /> : <div className="aspect-[16/10]" />}
        </motion.div>
      </button>

      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <button type="button" onClick={() => onOpen?.(post)} className="block text-left focus:outline-none">
          <h2 className="text-[21px] font-semibold leading-[1.15] tracking-[-0.025em] text-white sm:text-2xl">{post.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/45">{post.description}</p>
        </button>
        {post.context && <p className="mt-3 text-xs text-white/25">{post.context}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[.06] pt-4">
          {reactions.map(({ type, label, icon: Icon }) => {
            const active = reaction === type;
            return <button key={type} type="button" onClick={() => chooseReaction(type)} aria-label={`${label} reaction`} aria-pressed={active} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition ${active ? 'bg-white text-black' : 'bg-white/[.04] text-white/45 hover:bg-white/[.08] hover:text-white'}`}><Icon size={13} fill={active && type === 'loved' ? 'currentColor' : 'none'} />{label}<span className="opacity-60">{counts[type] ?? 0}</span></button>;
          })}
          <button type="button" onClick={() => setSaved((value) => !value)} aria-label={saved ? 'Remove from 知の棚' : 'Save to 知の棚'} aria-pressed={saved} className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition ${saved ? 'bg-white text-black' : 'bg-white/[.04] text-white/45 hover:bg-white/[.08] hover:text-white'}`}><Bookmark size={13} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : '知の棚へ'}</button>
          <button type="button" onClick={() => onOpen?.(post)} aria-label="Open discussion" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[.04] text-white/40 transition hover:bg-white/[.08] hover:text-white"><MessageCircle size={15} /></button>
        </div>
      </div>
    </motion.article>
  );
}
