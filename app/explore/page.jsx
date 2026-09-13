'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpRight, Sparkles, Flame, Clock3, Ghost, X, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatRelative, seedFromPulse, participantCount } from '../../lib/pulse-social';
import '../../src/pulse-design-system.css';
import '../../src/pulse-step3.css';
import '../../src/pulse-step4.css';
import '../../src/pulse-step5.css';

const FILTERS = [
  { id: 'TRENDING', label: 'TRENDING', icon: Flame },
  { id: 'QUICK', label: 'QUICK', icon: Clock3 },
  { id: 'WEIRD', label: 'WEIRD', icon: Ghost },
  { id: 'ALL', label: 'ALL', icon: Sparkles },
];

const SPRING = { type: 'spring', stiffness: 300, damping: 25 };
const BENTO_SPRING = { type: 'spring', stiffness: 200, damping: 20 };

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(Number(value) || 0);
  useEffect(() => {
    const target = Number(value) || 0;
    const startValue = display;
    const start = performance.now();
    const duration = 460;
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) setDisplay(target);
      else {
        const ceiling = Math.max(target, startValue + 8);
        setDisplay(Math.floor(Math.random() * (ceiling + 1)));
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="pulse-shuffle-number tabular-nums" aria-label={String(value)}>{display}</span>;
}

function ConceptHero({ count }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], [0, -150]);
  const scale = useTransform(scrollY, [0, 900], [1, 0.86]);
  const opacity = useTransform(scrollY, [0, 700], [1, 0.32]);
  const rotate = useTransform(scrollY, [0, 900], [0, -4]);
  const smoothY = useSpring(y, { stiffness: 90, damping: 22 });
  const smoothScale = useSpring(scale, { stiffness: 90, damping: 22 });
  return (
    <section className="pulse-concept-hero" aria-label="Pulse introduction">
      <motion.div className="pulse-concept-orb pulse-concept-orb-one" style={{ y: smoothY }} />
      <motion.div className="pulse-concept-orb pulse-concept-orb-two" style={{ y: smoothY }} />
      <motion.div className="pulse-concept-hero-word" style={{ y: smoothY, scale: smoothScale, opacity, rotate }}>EXPLORE</motion.div>
      <div className="pulse-concept-hero-copy">
        <div className="pulse-concept-eyebrow">PULSE / DISCOVER SYSTEM</div>
        <motion.h1 style={{ y: useTransform(scrollY, [0, 900], [0, 80]) }}>Find something<br /><em>worth following.</em></motion.h1>
        <div className="pulse-concept-hero-meta"><span>{count} SIGNALS</span><span>MOVE THROUGH THE UNKNOWN</span></div>
      </div>
      <motion.div className="pulse-concept-hero-mark" style={{ y: useTransform(scrollY, [0, 900], [0, 120]), rotate: useTransform(scrollY, [0, 900], [0, 12]) }}>
        <span>SCROLL</span><span className="pulse-concept-arrow">↓</span>
      </motion.div>
    </section>
  );
}

function ExploreCard({ pulse, index, onSelect, onOpen }) {
  const seed = seedFromPulse(pulse);
  const preview = seed?.dataUrl || null;
  const live = pulse.status === 'active';
  const moves = pulse._moves || [];
  const bentoClass = index % 7 === 0 ? 'bento-wide bento-tall' : index % 5 === 0 ? 'bento-wide' : index % 4 === 0 ? 'bento-tall' : '';
  return (
    <motion.div className={`explore-card-shell ${bentoClass}`} initial={{ opacity: 0, y: 28, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...BENTO_SPRING, delay: Math.min(index * .035, .28) }} whileHover={{ y: -8, scale: 1.012 }} whileTap={{ scale: .985 }}>
      <motion.article layoutId={`pulse-card-${pulse.id}`} className="explore-card-button h-full" role="button" tabIndex={0} aria-label={`Open details for ${pulse.title}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(pulse); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSelect(pulse); } }}>
        <div className="explore-card pulse-concept-card pulse-ultra-border h-full">
          <motion.div className={`explore-card-media ${preview ? '' : 'empty'}`} whileHover={{ scale: 1.055, rotate: index % 2 ? -1.2 : 1.2 }} transition={BENTO_SPRING}>{preview && <img src={preview} alt="" loading="lazy" />}</motion.div>
          <div className="explore-card-shade" aria-hidden="true" />
          <div className="pulse-card-index">0{(index % 9) + 1}</div>
          <div className="explore-card-content">
            <div className="explore-card-top"><span className={live ? 'explore-status-pill live' : 'explore-status-pill'}>{live && <span className="explore-live-dot-wrap relative flex h-2 w-2" aria-hidden="true"><span className="explore-live-dot animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF87] opacity-60" /><span className="explore-live-dot-core relative inline-flex h-2 w-2 rounded-full bg-[#00FF87]" /></span>}{live ? 'LIVE' : 'RESULT'}</span><small>{formatRelative(pulse.updated_at)}</small></div>
            <h2>{pulse.title}</h2>
            <p className="line-clamp-4 overflow-hidden">{pulse.intent || seed?.text || 'See where someone else takes this.'}</p>
            <div className="explore-card-bottom"><span><AnimatedNumber value={participantCount(moves)} /> joined</span><button type="button" className="explore-card-go" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(pulse); }}>OPEN <ArrowUpRight size={14} /></button></div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}

function DetailDrawer({ pulse, onClose, onOpenPulse }) {
  if (!pulse) return null;
  const seed = seedFromPulse(pulse);
  const preview = seed?.dataUrl || null;
  const live = pulse.status === 'active';
  const count = participantCount(pulse._moves || []);
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 pulse-detail-backdrop pulse-concept-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .3, ease: [0.16, 1, 0.3, 1] }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}>
        <div className="flex min-h-full items-end justify-center">
          <motion.section layoutId={`pulse-card-${pulse.id}`} role="dialog" aria-modal="true" aria-label={pulse.title} className="pulse-detail-drawer pulse-ultra-border pulse-concept-drawer w-full p-6 pb-12 sm:p-8 sm:pb-12" initial={{ y: '100%', scale: .94, borderRadius: '3rem' }} animate={{ y: 0, scale: 1, borderRadius: '2rem' }} exit={{ y: '100%', scale: .94 }} transition={SPRING} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <div className="mx-auto w-full max-w-5xl">
              <div className="pulse-detail-handle" aria-hidden="true" />
              <div className="flex items-start justify-between gap-5"><div><div className="pulse-industrial-meta mb-3 text-[10px] text-zinc-600">PULSE DETAIL / {String(pulse.id).slice(0, 8)}</div><h2 className="max-w-3xl text-3xl font-black tracking-[-0.055em] text-white sm:text-5xl">{pulse.title}</h2></div><motion.button type="button" whileHover={{ scale: 1.06 }} whileTap={{ scale: .92 }} transition={SPRING} className="pulse-detail-close shrink-0" aria-label="Close details" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}><X size={17} /></motion.button></div>
              <div className="pulse-marquee" aria-hidden="true"><div className="pulse-marquee-track"><span>SYS.RDY // LIVE SIGNAL // PULSE NETWORK // 00FF87 // SPATIAL UI // NEXT STATE //</span><span>SYS.RDY // LIVE SIGNAL // PULSE NETWORK // 00FF87 // SPATIAL UI // NEXT STATE //</span></div></div>
              <div className="mt-6 flex flex-wrap gap-2 pulse-industrial-meta text-[9px] text-zinc-500"><span className={`pulse-industrial-chip ${live ? 'active' : ''}`}>{live && <span className="inline-block w-2 h-2 rounded-full bg-[#00FF87] animate-pulse mr-2 shadow-[0_0_10px_#00FF87]" />}{live ? 'LIVE' : 'RESULT'}</span><span className="pulse-industrial-chip">UPDATED {formatRelative(pulse.updated_at)}</span></div>
              {preview && <motion.div layout className="pulse-detail-media relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 my-4" whileHover={{ scale: 1.008 }} transition={BENTO_SPRING}><img src={preview} alt="" className="w-full h-full object-cover" /></motion.div>}
              <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="pulse-detail-stat"><span className="pulse-industrial-meta text-[9px] text-zinc-600">PARTICIPANTS</span><strong><AnimatedNumber value={count} /></strong></div><div className="pulse-detail-stat"><span className="pulse-industrial-meta text-[9px] text-zinc-600">STATUS</span><strong>{live ? 'ACTIVE' : 'DONE'}</strong></div><div className="pulse-detail-stat"><span className="pulse-industrial-meta text-[9px] text-zinc-600">REVISION</span><strong><AnimatedNumber value={pulse.revision ?? 0} /></strong></div></div>
              <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="pulse-industrial-meta text-[9px] text-zinc-600">INTENT</div><p className="mt-3 max-w-3xl text-base leading-7 text-zinc-300">{pulse.intent || seed?.text || 'See where someone else takes this.'}</p></div>
              <div className="mt-7 flex flex-col gap-3"><motion.button type="button" whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: .98 }} transition={SPRING} className="pulse-detail-participate" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenPulse(pulse); }}>PARTICIPATE IN THIS PULSE <ArrowRight size={16} className="ml-2 inline" /></motion.button><motion.button type="button" whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} transition={SPRING} className="pulse-industrial-button w-full px-5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}>CLOSE</motion.button></div>
              <div className="h-8" aria-hidden="true" />
            </div>
          </motion.section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Explore() {
  const router = useRouter();
  const [pulses, setPulses] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('TRENDING');
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const { scrollYProgress } = useScroll();
  const pageGlow = useTransform(scrollYProgress, [0, .35, .7, 1], ['#F5F5F7', '#EEF3F0', '#F4F0F7', '#F5F5F7']);
  const glowColor = useSpring(pageGlow, { stiffness: 70, damping: 22 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase.from('pulses').select('*').order('updated_at', { ascending: false }).limit(80);
      const ids = (p || []).map((x) => x.id);
      let grouped = {};
      if (ids.length) { const { data: m } = await supabase.from('pulse_moves').select('*').in('pulse_id', ids); (m || []).forEach((x) => (grouped[x.pulse_id] ??= []).push(x)); }
      setPulses((p || []).map((x) => ({ ...x, _moves: grouped[x.id] || [] })));
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedCard) return undefined;
    const handleKey = (event) => { if (event.key === 'Escape') setSelectedCard(null); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedCard]);

  useEffect(() => { document.body.style.overflow = selectedCard ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [selectedCard]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pulses.filter((p) => !q || `${p.title} ${p.intent || ''} ${seedFromPulse(p).text || ''}`.toLowerCase().includes(q));
    if (filter === 'TRENDING') list.sort((a, b) => ((b._moves?.length || 0) * 5 + Number(b.updated_at ? new Date(b.updated_at).getTime() : 0) / 1e9) - ((a._moves?.length || 0) * 5 + Number(a.updated_at ? new Date(a.updated_at).getTime() : 0) / 1e9));
    if (filter === 'QUICK') list = list.filter((p) => !p.intent || p.intent.length < 105);
    if (filter === 'WEIRD') list = list.filter((p) => /(weird|strange|odd|unexpected|mystery|unknown|不思議|変|謎)/i.test(`${p.title} ${p.intent || ''}`));
    return list;
  }, [pulses, query, filter]);

  const openPulse = (pulse) => { if (!pulse?.id) return; setSelectedCard(null); router.push(`/pulse/${pulse.id}`); };

  return (
    <>
      <motion.main className="pulse-page explore-v2 pulse-concept-page" style={{ backgroundColor: glowColor }}>
        <ConceptHero count={loading ? '—' : filtered.length} />
        <section className="pulse-concept-content">
          <div className="pulse-concept-controls"><div className="explore-search"><Search size={16} /><input aria-label="Search Pulses" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ideas, places, weird things…" /></div><div className="explore-filter-row">{FILTERS.map(({ id, label, icon: Icon }) => <motion.button key={id} whileHover={{ y: -2, scale: 1.025 }} whileTap={{ scale: .95 }} transition={BENTO_SPRING} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)} aria-pressed={filter === id}><Icon size={13} />{label}</motion.button>)}</div></div>
          <div className="explore-meta"><span>{loading ? 'LOADING' : `${filtered.length} FOUND`}</span><span>OPEN ONE. SEE WHAT HAPPENS.</span></div>
          {loading ? <div className="explore-grid"><div className="pulse-skeleton" /><div className="pulse-skeleton" /><div className="pulse-skeleton" /></div> : filtered.length === 0 ? <div className="pulse-empty-state precision-card pad">No match yet. Try a stranger idea.</div> : <div className="explore-grid pulse-bento-grid">{filtered.map((p, index) => <ExploreCard key={p.id} pulse={p} index={index} onSelect={setSelectedCard} onOpen={setSelectedCard} />)}</div>}
        </section>
      </motion.main>
      <DetailDrawer pulse={selectedCard} onClose={() => setSelectedCard(null)} onOpenPulse={openPulse} />
    </>
  );
}
