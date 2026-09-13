'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Footprints, GitBranch, Radio } from 'lucide-react';
import type { Post } from '@/types/pulse';
import { AsyncMedia } from '@/components/ui/AsyncMedia';

export function ActionCard({ post, index = 0, onOpen }: { post: Post; index?: number; onOpen?: (post: Post) => void }) {
  const media = post.media[0];
  const author = post.author;
  const handoff = post.handoff_from;
  const pulseNumber = String(post.pulse_number ?? index + 1).padStart(2, '0');

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group overflow-hidden rounded-[28px] border border-white/[.07] bg-[#0a0a0a] shadow-[0_24px_80px_rgba(0,0,0,.24)]"
    >
      <div className="grid lg:grid-cols-[1.02fr_.98fr]">
        <button type="button" onClick={() => onOpen?.(post)} className="relative min-h-[320px] overflow-hidden bg-[#08080a] text-left lg:min-h-[470px]">
          {media?.url ? (
            <div className="h-full transition-transform duration-700 group-hover:scale-[1.025]">
              <AsyncMedia src={media.url} alt={media.alt ?? post.title} width={media.width} height={media.height} />
            </div>
          ) : <div className="h-full min-h-[320px] bg-[#0d0d10]" />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-black/10" />
          <div className="absolute left-5 top-5 flex items-center gap-2">
            <span className="rounded-full bg-black/65 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.2em] text-[#00FF87] backdrop-blur-md">
              ACTIVE PULSE // {pulseNumber}
            </span>
            <span className="hidden font-mono text-[9px] tracking-[.16em] text-white/35 sm:block">{post.pulse_status === 'completed' ? 'COMPLETED' : 'LIVE'}</span>
          </div>
          <div className="absolute bottom-6 left-5 right-5 flex items-end justify-between gap-5">
            <div>
              <div className="mb-2 font-mono text-[9px] tracking-[.18em] text-white/35">{post.context ?? 'REAL-WORLD SIGNAL'}</div>
              <div className="font-mono text-[9px] tracking-[.16em] text-white/45">{post.handoff_count ?? 0} PEOPLE CHANGED THIS</div>
            </div>
            <span className="rounded-full border border-white/15 bg-black/35 p-3 text-white/80 backdrop-blur-md transition group-hover:border-[#00FF87]/50 group-hover:text-[#00FF87]">
              <ArrowUpRight size={17} />
            </span>
          </div>
        </button>

        <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div>
            <div className="flex items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[.18em]">
              <span className="inline-flex items-center gap-2 text-[#00FF87]"><Radio size={11} /> LIVE QUESTION</span>
              <span className="text-white/25">{post.handoff_count ?? 0} PEOPLE CHANGED THIS</span>
            </div>

            <h2 className="mt-7 max-w-xl text-[clamp(1.9rem,3vw,3.25rem)] font-semibold leading-[.98] tracking-[-.045em] text-white">
              {post.title}
            </h2>

            <div className="mt-8 border-l border-[#00FF87]/40 pl-5">
              <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[#00FF87]"><Footprints size={12} /> YOUR NEXT MOVE</div>
              <p className="mt-3 text-sm leading-7 text-white/60">{post.action ?? post.description}</p>
            </div>

            <div className="mt-7 flex items-center gap-3 border-t border-white/[.06] pt-6">
              {handoff?.avatar_url ? <img src={handoff.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-white/[.07]" />}
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[.18em] text-white/25">HANDOFF</p>
                <p className="mt-1 text-sm text-white/65">@{handoff?.username ?? author?.username ?? 'pulse'} <span className="px-1 text-white/20">→</span> <span className="text-[#00FF87]">NEXT ACTION</span></p>
              </div>
              <GitBranch size={15} className="ml-auto text-white/20" />
            </div>
          </div>

          <div className="mt-10 grid gap-2 sm:grid-cols-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.975 }}
              onClick={() => onOpen?.(post)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#00FF87] px-5 py-4 text-xs font-bold uppercase tracking-[.15em] text-black transition hover:bg-[#45ffa6]"
            >
              <Footprints size={14} /> TAKE ACTION
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.975 }}
              onClick={() => onOpen?.(post)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/[.09] bg-white/[.02] px-5 py-4 text-xs font-bold uppercase tracking-[.15em] text-white/75 transition hover:bg-white/[.06] hover:text-white"
            >
              JOIN THIS PULSE <ArrowUpRight size={14} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
