'use client';

import { motion } from 'framer-motion';
import type { Post } from '@/types/pulse';

interface DiscoveryCardProps {
  post: Post;
  index?: number;
  onOpen?: (post: Post) => void;
}

const spring = { type: 'spring', stiffness: 220, damping: 24, mass: 0.8 } as const;

export function DiscoveryCard({ post, index = 0, onOpen }: DiscoveryCardProps) {
  const media = post.media[0];
  const author = post.author;

  return (
    <motion.article
      layoutId={`post-${post.id}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.985 }}
      className="group cursor-pointer"
      onClick={() => onOpen?.(post)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#111114]">
        <motion.div whileHover={{ scale: 1.025 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="aspect-[16/10] overflow-hidden">
          {media?.type === 'video' ? (
            <video src={media.url} poster={media.thumbnail_url ?? undefined} muted playsInline loop autoPlay className="h-full w-full object-cover" />
          ) : (
            <img src={media?.url} alt={media?.alt ?? post.title} className="h-full w-full object-cover" />
          )}
        </motion.div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080A]/55 via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
          <p className="max-w-3xl text-balance text-xl font-semibold leading-[1.08] tracking-[-0.035em] text-[#F5F5F5] sm:text-2xl md:text-3xl">
            {post.title}
          </p>
          {post.context && <p className="mt-3 text-xs tracking-wide text-[#A1A1AA]">{post.context}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-1 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          {author?.avatar_url ? <img src={author.avatar_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" /> : <div className="h-7 w-7 shrink-0 rounded-full bg-[#111114]" />}
          <span className="truncate text-sm font-medium text-[#D4D4D8]">{author?.display_name ?? 'PULSE'}</span>
        </div>
        <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#71717A]">Discover {String(index + 1).padStart(2, '0')}</span>
      </div>
    </motion.article>
  );
}
