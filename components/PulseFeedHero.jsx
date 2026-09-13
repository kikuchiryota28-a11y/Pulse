'use client';

import Link from 'next/link';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

const participants = [
  { id: 1, image: 'https://i.pravatar.cc/80?img=12' },
  { id: 2, image: 'https://i.pravatar.cc/80?img=32' },
  { id: 3, image: 'https://i.pravatar.cc/80?img=47' },
  { id: 4, image: 'https://i.pravatar.cc/80?img=56' },
];

const PROMPT_TEXT_PATTERNS = [
  '役割と使命',
  'あなたは、私の人生',
  'You are an expert Frontend Developer',
  'You are an expert',
];

function cleanDisplayTitle(value) {
  const title = String(value || '').trim();
  if (!title || PROMPT_TEXT_PATTERNS.some((pattern) => title.includes(pattern))) return 'EXPLORE NEW IDEAS';
  return title;
}

export default function PulseFeedHero({ pulse, participantCount = 18 }) {
  const title = cleanDisplayTitle(pulse?.title) || 'EXPLORE NEW IDEAS';
  const updatedAt = pulse?.updated_at || pulse?.created_at;
  const age = updatedAt ? formatAge(updatedAt) : '12m ago';
  const category = pulse?.category || 'OUTSIDE';
  const { scrollY } = useScroll();
  const rawHeroY = useTransform(scrollY, [0, 900], [0, -180]);
  const rawTitleY = useTransform(scrollY, [0, 900], [0, 95]);
  const rawTitleScale = useTransform(scrollY, [0, 900], [1, .84]);
  const rawTitleTracking = useTransform(scrollY, [0, 900], ['-0.065em', '-0.025em']);
  const rawVisualRotate = useTransform(scrollY, [0, 900], [0, 5]);
  const rawOpacity = useTransform(scrollY, [0, 700], [1, .22]);
  const heroY = useSpring(rawHeroY, { stiffness: 90, damping: 24 });
  const titleY = useSpring(rawTitleY, { stiffness: 90, damping: 24 });
  const titleScale = useSpring(rawTitleScale, { stiffness: 90, damping: 24 });

  return (
    <section className="relative flex min-h-[118svh] w-full overflow-hidden" aria-label="Pulse introduction">
      <motion.div aria-hidden="true" className="pointer-events-none absolute left-[18%] top-[22%] h-[42vw] w-[42vw] max-h-[620px] max-w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D1E7DD]/60 blur-[100px]" style={{ y: heroY }} />
      <motion.div aria-hidden="true" className="pointer-events-none absolute bottom-[-12%] right-[-6%] h-[38vw] w-[38vw] rounded-full bg-[#E2E8F0]/80 blur-[120px]" style={{ y: useTransform(scrollY, [0, 900], [0, -110]), x: useTransform(scrollY, [0, 900], [0, -40]) }} />

      <motion.div className="absolute inset-x-0 top-0 flex items-start justify-between" style={{ y: heroY, opacity: rawOpacity }}>
        <div className="text-xs leading-relaxed text-[#71717A]">
          <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B9D4C6]" />LIVE · {age}</div>
          <div className="mt-2 text-[#9B9BA3]">CAT // {category}</div>
        </div>
        <div className="text-right text-xs leading-relaxed text-[#71717A]"><div>01 / 07</div><div className="mt-2 text-[#9B9BA3]">PULSE / ACTIVE</div></div>
      </motion.div>

      <motion.div className="relative z-10 flex w-full items-center justify-center px-3 py-28 sm:px-8" style={{ y: heroY }}>
        <div className="relative w-full max-w-[1180px]">
          <motion.div aria-hidden="true" className="pointer-events-none absolute -left-[3vw] -top-[13vh] select-none font-sans text-[clamp(7rem,25vw,25rem)] font-black leading-[.78] tracking-[-.085em] text-[#111113]/[.055]" style={{ y: heroY, scale: titleScale, opacity: rawOpacity, rotate: rawVisualRotate }}>PULSE</motion.div>
          <motion.div className="relative z-20 max-w-[1100px] pl-[4vw]" style={{ y: titleY }}>
            <p className="mb-7 text-[10px] font-semibold tracking-[0.24em] text-[#71717A]">A QUESTION FOR THE WORLD</p>
            <motion.h1 style={{ scale: titleScale, letterSpacing: rawTitleTracking }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-[1050px] whitespace-pre-line font-sans text-[clamp(3.6rem,8.4vw,9.5rem)] font-black leading-[.88] text-[#111113]">
              {title}
            </motion.h1>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45, duration: .8 }} className="mt-10 max-w-xl text-[13px] leading-7 text-[#71717A]">
              <span className="text-[#A3A3AA]">01</span> No destination.<br />
              <span className="text-[#A3A3AA]">02</span> No map.<br />
              <span className="text-[#A3A3AA]">03</span> Just take the next unfamiliar turn.
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="absolute bottom-8 left-0 flex items-center gap-4 sm:bottom-12" style={{ y: useTransform(scrollY, [0, 900], [0, -70]), opacity: rawOpacity }}>
        <div className="flex items-center">{participants.map((p, index) => <div key={p.id} className="relative h-8 w-8 overflow-hidden rounded-full border border-white/80 bg-[#E8ECEB]" style={{ marginLeft: index === 0 ? 0 : '-8px', zIndex: participants.length - index }}><img src={p.image} alt="" className="h-full w-full object-cover" /></div>)}</div>
        <div className="text-[10px] tracking-wide text-[#71717A]"><span className="font-semibold text-[#111113]">{participantCount}</span> people changed this</div>
      </motion.div>

      <motion.div className="absolute bottom-8 right-0 sm:bottom-12" style={{ y: useTransform(scrollY, [0, 900], [0, -95]) }}>
        <Link href={pulse?.id ? `/pulse/${pulse.id}` : '/create'}>
          <motion.div initial="rest" whileHover="hover" whileTap="tap" variants={{ rest: { x: 0 }, hover: { x: 8 }, tap: { scale: .97 } }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="group flex items-center gap-5 rounded-full border border-black/5 bg-white/70 py-3 pl-5 pr-1 text-sm font-semibold tracking-[.08em] text-[#111113] shadow-[0_18px_45px_rgba(17,17,19,.08)] backdrop-blur-2xl">
            <span>JOIN PULSE</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111113] text-white transition-transform duration-300 group-hover:rotate-[-8deg]">→</span>
          </motion.div>
        </Link>
      </motion.div>
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
