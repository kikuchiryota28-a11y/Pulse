'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const participants = [
  { id: 1, image: 'https://i.pravatar.cc/80?img=12' },
  { id: 2, image: 'https://i.pravatar.cc/80?img=32' },
  { id: 3, image: 'https://i.pravatar.cc/80?img=47' },
  { id: 4, image: 'https://i.pravatar.cc/80?img=56' },
];

export default function PulseFeedHero({ pulse, participantCount = 18 }) {
  const title = pulse?.title || 'WHAT IF...\n今日、知らない道を\n1本だけ歩いて帰ったら？';
  const updatedAt = pulse?.updated_at || pulse?.created_at;
  const age = updatedAt ? formatAge(updatedAt) : '12m ago';
  const category = pulse?.category || 'OUTSIDE';

  return (
    <section className="relative flex min-h-[calc(100svh-6rem)] w-full overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute left-[18%] top-[24%] h-[42vw] w-[42vw] max-h-[620px] max-w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(85,255,154,0.075),transparent_68%)] blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-15%] right-[-5%] h-[38vw] w-[38vw] rounded-full bg-[radial-gradient(circle,rgba(112,76,255,0.07),transparent_68%)] blur-[120px]" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between">
        <div className="font-mono text-xs leading-relaxed text-zinc-500">
          <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#55FF9A]" />LIVE · {age}</div>
          <div className="mt-2 text-zinc-600">CAT // {category}</div>
        </div>
        <div className="text-right font-mono text-xs leading-relaxed text-zinc-500"><div>01 / 07</div><div className="mt-2 text-zinc-600">PULSE_ACTIVE</div></div>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center px-3 py-28 sm:px-8">
        <div className="w-full max-w-[1100px]">
          <p className="mb-8 font-mono text-[10px] tracking-[0.24em] text-[#55FF9A]/70">A QUESTION FOR THE WORLD</p>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="max-w-[1050px] whitespace-pre-line font-sans text-[clamp(3rem,7.2vw,7.5rem)] font-black leading-[0.91] tracking-[-0.065em] text-white">
            {title}
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.8 }} className="mt-10 max-w-xl font-mono text-xs leading-7 text-zinc-500">
            <span className="text-zinc-700">//</span> No destination.<br />
            <span className="text-zinc-700">//</span> No map.<br />
            <span className="text-zinc-700">//</span> Just take the next unfamiliar turn.
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-5 left-0 flex items-center gap-4 sm:bottom-8">
        <div className="flex items-center">{participants.map((p, index) => <div key={p.id} className="relative h-7 w-7 overflow-hidden rounded-full border border-[#08080A] bg-zinc-800" style={{ marginLeft: index === 0 ? 0 : '-8px', zIndex: participants.length - index }}><img src={p.image} alt="" className="h-full w-full object-cover" /></div>)}</div>
        <div className="font-mono text-[10px] tracking-wide text-zinc-500"><span className="text-zinc-300">{participantCount}</span> people changed this</div>
      </div>

      <div className="absolute bottom-3 right-0 sm:bottom-6">
        <Link href={pulse?.id ? `/pulse/${pulse.id}` : '/create'}>
          <motion.div initial="rest" whileHover="hover" whileTap="tap" variants={{ rest: { x: 0 }, hover: { x: 8 }, tap: { scale: 0.97 } }} transition={{ type: 'spring', stiffness: 350, damping: 25 }} className="group relative flex items-center gap-5 py-4 pl-5 pr-1 font-mono text-sm font-semibold tracking-[0.08em] text-white">
            <span className="pointer-events-none absolute -inset-x-8 inset-y-0 -z-10 rounded-full bg-[radial-gradient(ellipse_at_right,rgba(85,255,154,0.18),transparent_65%)] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
            <span>JOIN PULSE</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#55FF9A] text-[#08080A] transition-all duration-300 group-hover:shadow-[0_0_35px_rgba(85,255,154,0.45)]">→</span>
          </motion.div>
        </Link>
      </div>
    </section>
  );
}

function formatAge(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
