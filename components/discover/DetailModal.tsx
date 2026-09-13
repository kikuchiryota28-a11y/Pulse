'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { Post } from '@/types/pulse';

type Props = { post: Post | null; onClose: () => void };

export default function DetailModal({ post, onClose }: Props) {
  return <AnimatePresence>{post && <motion.div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div role="dialog" aria-modal="true" aria-label={post.title} className="mx-auto flex h-full w-full max-w-6xl items-center justify-center p-4 md:p-8" initial={{ y: 24, scale: .985 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, scale: .985 }} transition={{ duration: .32, ease: [0.22,1,0.36,1] }} onClick={(event) => event.stopPropagation()}>
      <div className="grid max-h-full w-full overflow-auto rounded-3xl bg-[#111114] md:grid-cols-[1.4fr_.6fr]">
        <div className="bg-black">{post.media[0]?.type === 'video' ? <video src={post.media[0].url} controls className="max-h-[78vh] w-full object-contain" /> : post.media[0] ? <img src={post.media[0].url} alt={post.media[0].alt ?? post.title} className="max-h-[78vh] w-full object-contain" /> : null}</div>
        <div className="flex min-h-[360px] flex-col p-7 md:p-9"><button onClick={onClose} className="mb-10 self-end text-xs text-zinc-500 hover:text-zinc-200">CLOSE</button><p className="text-xs uppercase tracking-[.18em] text-zinc-600">DISCOVERY</p><h2 className="mt-3 text-2xl font-medium tracking-tight text-zinc-100">{post.title}</h2>{post.context && <p className="mt-4 text-sm text-zinc-500">{post.context}</p>}<p className="mt-7 text-sm leading-7 text-zinc-400">{post.description}</p><div className="mt-auto pt-10"><p className="text-xs uppercase tracking-[.16em] text-zinc-600">FOUND BY</p><p className="mt-2 text-sm text-zinc-200">{post.author?.display_name ?? 'Unknown explorer'}</p></div></div>
      </div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}
