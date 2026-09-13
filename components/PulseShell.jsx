'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

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

export default function PulseShell({ children, activeTab }) {
  const pathname = usePathname();
  const currentTab = activeTab ?? getActiveTab(pathname);
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 160], [0, -8]);
  const headerOpacity = useTransform(scrollY, [0, 160], [1, .9]);
  const navScale = useSpring(useTransform(scrollY, [0, 500], [1, .96]), { stiffness: 120, damping: 24 });

  return <div className="pulse-shell relative min-h-screen overflow-x-hidden selection:bg-[#D1E7DD] selection:text-[#111113]">
    <div aria-hidden="true" className="pulse-studio-ambient">
      <div className="pulse-studio-light pulse-studio-light-a" />
      <div className="pulse-studio-light pulse-studio-light-b" />
      <div className="pulse-studio-light pulse-studio-light-c" />
    </div>

    <motion.header style={{ y: headerY, opacity: headerOpacity }} className="pulse-studio-header fixed inset-x-0 top-0 z-40 h-16">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="pulse-studio-brand flex items-center gap-3" aria-label="Pulse home">
          <span className="pulse-studio-brand-dot inline-block h-2 w-2 rounded-full" />
          <span className="font-black tracking-[0.24em]">PULSE</span>
          <span className="pulse-studio-meta hidden text-[10px] tracking-[0.2em] uppercase sm:block">STUDIO / 01</span>
        </Link>
        <nav className="flex items-center gap-5 text-[10px] tracking-[0.18em]" aria-label="System actions">
          <Link href="/activity" className="pulse-studio-link hidden sm:block">ACTIVITY</Link>
          <Link href="/account" className="pulse-studio-link">ACCOUNT</Link>
          <Link href="/create" className="pulse-studio-link font-semibold">+ START</Link>
        </nav>
      </div>
    </motion.header>

    <main className="relative z-10 min-h-screen px-5 pb-32 pt-24 md:px-8"><div className="mx-auto max-w-[1600px]">{children}</div></main>

    <motion.nav style={{ scale: navScale }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex h-14 items-center justify-between gap-1 rounded-full border px-3" aria-label="Primary navigation">
      {tabs.map(({ label, href }) => {
        const isActive = label === currentTab;
        return <Link key={label} href={href} aria-current={isActive ? 'page' : undefined} className={`relative flex h-10 items-center justify-center rounded-full px-4 text-[10px] tracking-[0.14em] transition-colors ${isActive ? 'font-semibold' : ''}`}>
          {isActive && <motion.span layoutId="active-pill" className="absolute inset-0 -z-10 rounded-full" transition={spring} />}
          <span className="relative z-10">{label}</span>
        </Link>;
      })}
    </motion.nav>
  </div>;
}
