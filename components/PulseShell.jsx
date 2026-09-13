'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const tabs = [
  { label: 'DISCOVER', href: '/' },
  { label: 'EXPLORE', href: '/explore' },
  { label: 'CREATE', href: '/create' },
  { label: 'YOU', href: '/you' },
];

const spring = { type: 'spring', stiffness: 300, damping: 25 };

function getActiveTab(pathname) {
  if (pathname.startsWith('/explore')) return 'EXPLORE';
  if (pathname.startsWith('/create')) return 'CREATE';
  if (pathname.startsWith('/you')) return 'YOU';
  return 'DISCOVER';
}

function Equalizer() {
  return <span className="pulse-eq" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span>;
}

export default function PulseShell({ children, activeTab }) {
  const pathname = usePathname();
  const currentTab = activeTab ?? getActiveTab(pathname);

  return <div className="pulse-shell pulse-ultra-shell relative min-h-screen overflow-x-hidden bg-[#030303] text-[#FAFAFA] selection:bg-[#00FF87]/20 selection:text-white">
    <div aria-hidden="true" className="pulse-ultra-ambient">
      <div className="pulse-ultra-orb pulse-ultra-orb-a" />
      <div className="pulse-ultra-orb pulse-ultra-orb-b" />
      <div className="pulse-ultra-orb pulse-ultra-orb-c" />
    </div>

    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-white/[0.05] bg-[#030303]/78 backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Pulse home">
          <span className="inline-block h-2 w-2 rounded-full bg-[#00FF87] shadow-[0_0_10px_#00FF87] animate-pulse" />
          <span className="font-black tracking-[0.24em] text-white">PULSE</span>
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase sm:block">SYS.RDY</span>
        </Link>
        <div className="flex items-center gap-4">
          <Equalizer />
          <nav className="flex items-center gap-5 font-mono text-[10px] tracking-[0.2em]" aria-label="System actions">
            <Link href="/activity" className="hidden text-zinc-500 transition-colors hover:text-white sm:block">ACTIVITY</Link>
            <Link href="/account" className="text-zinc-400 transition-colors hover:text-white">ACCOUNT</Link>
            <Link href="/create" className="text-[#00FF87] transition-colors hover:text-white">+ START</Link>
          </nav>
        </div>
      </div>
    </header>

    <main className="relative z-10 min-h-screen px-5 pb-32 pt-24 md:px-8"><div className="mx-auto max-w-[1600px]">{children}</div></main>

    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 h-14 px-3 bg-[#0A0A0C]/80 backdrop-blur-3xl border border-white/10 rounded-full flex items-center justify-between gap-1 z-40 shadow-2xl" aria-label="Primary navigation">
      {tabs.map(({ label, href }) => {
        const isActive = label === currentTab;
        return <Link key={label} href={href} aria-current={isActive ? 'page' : undefined} className={`relative flex h-10 items-center justify-center rounded-full px-4 font-mono text-[10px] tracking-widest transition-colors ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
          {isActive && <motion.span layoutId="active-pill" className="absolute inset-0 -z-10 rounded-full bg-white/[0.10] border border-white/[0.10]" transition={spring} />}
          <span className="relative z-10">{label}</span>
        </Link>;
      })}
    </nav>
  </div>;
}
