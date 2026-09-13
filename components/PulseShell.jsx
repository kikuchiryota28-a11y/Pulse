'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Compass, Plus, Search, User } from 'lucide-react';

const tabs = [
  { label: 'DISCOVER', href: '/', icon: Compass },
  { label: 'EXPLORE', href: '/explore', icon: Search },
  { label: 'CREATE', href: '/create', icon: Plus },
  { label: 'YOU', href: '/you', icon: User },
];

const spring = { type: 'spring', stiffness: 300, damping: 25 };

function getActiveTab(pathname) {
  if (pathname.startsWith('/explore')) return 'EXPLORE';
  if (pathname.startsWith('/create')) return 'CREATE';
  if (pathname.startsWith('/you')) return 'YOU';
  return 'DISCOVER';
}

export default function PulseShell({ children, activeTab }) {
  const pathname = usePathname();
  const currentTab = activeTab ?? getActiveTab(pathname);
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 160], [0, -8]);
  const headerOpacity = useTransform(scrollY, [0, 160], [1, .9]);
  const navScale = useSpring(useTransform(scrollY, [0, 500], [1, .97]), { stiffness: 120, damping: 24 });

  return <div className="relative min-h-screen overflow-x-hidden bg-black text-white selection:bg-[#00FF87] selection:text-black">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute left-1/2 top-[-22rem] h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-[#00FF87]/[0.025] blur-[150px]" />
      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:48px_48px]" />
    </div>

    <motion.header style={{ y: headerY, opacity: headerOpacity }} className="fixed inset-x-0 top-0 z-40 h-16 border-b border-white/[0.05] bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Pulse home">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00FF87] text-black text-[10px] font-black">P</span>
          <span className="font-black tracking-[0.24em]">PULSE</span>
          <span className="hidden font-mono text-[9px] tracking-[0.2em] text-white/25 sm:block">SYS.RDY</span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-[9px] tracking-[0.18em]" aria-label="System actions">
          <Link href="/activity" className="hidden text-white/35 transition hover:text-white sm:block">ACTIVITY</Link>
          <Link href="/account" className="text-white/35 transition hover:text-white">ACCOUNT</Link>
          <Link href="/create" className="text-[#00FF87] transition hover:text-white">+ START</Link>
        </nav>
      </div>
    </motion.header>

    <main className="relative z-10 min-h-screen px-5 pb-32 pt-24 md:px-8"><div className="mx-auto max-w-[1600px]">{children}</div></main>

    <motion.nav style={{ scale: navScale }} className="fixed bottom-5 left-1/2 z-50 flex h-14 -translate-x-1/2 items-center gap-1 rounded-full border border-white/[0.08] bg-[#0a0a0a]/90 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl" aria-label="Primary navigation">
      {tabs.map(({ label, href, icon: Icon }) => {
        const isActive = label === currentTab;
        return <Link key={label} href={href} aria-current={isActive ? 'page' : undefined} className="relative flex h-11 items-center justify-center rounded-full px-3 sm:px-4">
          {isActive && <motion.span layoutId="active-pill" className="absolute inset-0 -z-10 rounded-full bg-[#00FF87]" transition={spring} />}
          <span className={`relative z-10 flex items-center gap-2 ${isActive ? 'text-black' : 'text-white/40'}`}>
            <Icon size={14} strokeWidth={isActive ? 2.5 : 1.7} />
            <span className="hidden font-mono text-[9px] tracking-[0.14em] sm:block">{label}</span>
          </span>
        </Link>;
      })}
    </motion.nav>
  </div>;
}
