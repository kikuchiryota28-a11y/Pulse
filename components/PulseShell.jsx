'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "DISCOVER", href: "/" },
  { label: "EXPLORE", href: "/explore" },
  { label: "CREATE", href: "/create" },
  { label: "YOU", href: "/you" },
];

function getActiveTab(pathname) {
  if (pathname.startsWith("/explore")) return "EXPLORE";
  if (pathname.startsWith("/create")) return "CREATE";
  if (pathname.startsWith("/you")) return "YOU";
  return "DISCOVER";
}

export default function PulseShell({ children, activeTab }) {
  const pathname = usePathname();
  const currentTab = activeTab ?? getActiveTab(pathname);

  return (
    <div className="pulse-shell relative min-h-screen overflow-x-hidden bg-[#08080A] text-white selection:bg-[#55FF9A]/20 selection:text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="pulse-aurora pulse-aurora-a absolute -left-[18vw] -top-[20vh] h-[65vh] w-[65vw] rounded-full bg-[radial-gradient(circle,rgba(48,255,142,0.14)_0%,rgba(48,255,142,0.045)_38%,transparent_70%)] blur-[140px]" />
        <div className="pulse-aurora pulse-aurora-b absolute -right-[15vw] top-[25vh] h-[70vh] w-[60vw] rounded-full bg-[radial-gradient(circle,rgba(112,76,255,0.11)_0%,rgba(112,76,255,0.035)_40%,transparent_72%)] blur-[150px]" />
        <div className="absolute left-1/2 top-1/2 h-[45vh] w-[45vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.025),transparent_70%)] blur-[100px]" />
      </div>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] opacity-[0.035] mix-blend-screen" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E\")" }} />

      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/[0.06] bg-[#08080A]/65 backdrop-blur-2xl">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Pulse home">
            <span className="relative flex h-2 w-2 items-center justify-center"><span className="absolute h-2 w-2 animate-ping rounded-full bg-[#55FF9A] shadow-[0_0_12px_rgba(85,255,154,0.9)]" /><span className="relative h-1.5 w-1.5 rounded-full bg-[#55FF9A]" /></span>
            <span className="font-sans text-[15px] font-black tracking-[0.24em]">PULSE</span>
            <span className="hidden font-mono text-[10px] tracking-[0.12em] text-white/35 sm:block">// SYSTEM_ACTIVE</span>
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[10px] tracking-[0.08em]" aria-label="System actions">
            <button type="button" className="hidden text-white/45 transition-colors hover:text-white md:block">[S] SEARCH</button>
            <Link href="/activity" className="hidden text-white/45 transition-colors hover:text-white sm:block">[A] ACTIVITY</Link>
            <Link href="/create" className="text-[#55FF9A] transition-colors hover:text-[#8affb7]">+ START</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 min-h-screen px-5 pb-32 pt-24 md:px-8"><div className="mx-auto max-w-[1600px]">{children}</div></main>

      <nav className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/[0.09] bg-[#111114]/75 px-2 py-2 backdrop-blur-2xl" aria-label="Primary navigation">
        {tabs.map(({ label, href }) => {
          const isActive = label === currentTab;
          return <Link key={label} href={href} aria-current={isActive ? "page" : undefined} className={`group relative flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[9px] tracking-[0.08em] transition-all duration-300 ${isActive ? "text-white" : "text-white/35 hover:text-white/75"}`}>{isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#55FF9A] shadow-[0_0_10px_rgba(85,255,154,0.85)]" />}<span>{label}</span></Link>;
        })}
      </nav>
    </div>
  );
}
