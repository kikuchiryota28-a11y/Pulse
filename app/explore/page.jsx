'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpRight, Sparkles, Flame, Clock3, Ghost, X, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatRelative, seedFromPulse, participantCount } from '../../lib/pulse-social';
import '../../src/pulse-design-system.css';
import '../../src/pulse-step3.css';
import '../../src/pulse-step4.css';

const FILTERS = [
  { id: 'TRENDING', label: 'TRENDING', icon: Flame },
  { id: 'QUICK', label: 'QUICK', icon: Clock3 },
  { id: 'WEIRD', label: 'WEIRD', icon: Ghost },
  { id: 'ALL', label: 'ALL', icon: Sparkles },
];

function ExploreCard({ pulse, onSelect, onOpen }) {
  const seed = seedFromPulse(pulse);
  const preview = seed?.dataUrl || null;
  const live = pulse.status === 'active';
  const moves = pulse._moves || [];

  return (
    <motion.div
      className="explore-card-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35 }}
    >
      <button
        type="button"
        className="explore-card-button"
        aria-label={`Open details for ${pulse.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(pulse);
        }}
      >
        <article className="explore-card">
          <div className={`explore-card-media ${preview ? '' : 'empty'}`}>
            {preview && <img src={preview} alt="" loading="lazy" />}
          </div>
          <div className="explore-card-shade" aria-hidden="true" />
          <div className="explore-card-content">
            <div className="explore-card-top">
              <span className={live ? 'explore-status-pill live' : 'explore-status-pill'}>
                {live && (
                  <span className="explore-live-dot-wrap relative flex h-2 w-2" aria-hidden="true">
                    <span className="explore-live-dot animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF87] opacity-60" />
                    <span className="explore-live-dot-core relative inline-flex h-2 w-2 rounded-full bg-[#00FF87]" />
                  </span>
                )}
                {live ? 'LIVE' : 'RESULT'}
              </span>
              <small>{formatRelative(pulse.updated_at)}</small>
            </div>
            <h2>{pulse.title}</h2>
            <p>{pulse.intent || seed?.text || 'See where someone else takes this.'}</p>
            <div className="explore-card-bottom">
              <span>{participantCount(moves)} joined</span>
              <button
                type="button"
                className="explore-card-go"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpen(pulse);
                }}
              >
                OPEN <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </article>
      </button>
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
      <motion.div
        className="fixed inset-0 z-[90] pulse-detail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      >
        <div className="flex min-h-full items-end justify-center">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={pulse.title}
            className="pulse-detail-drawer w-full p-6 sm:p-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="mx-auto w-full max-w-5xl">
              <div className="pulse-detail-handle" aria-hidden="true" />

              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="pulse-industrial-meta mb-3 text-[10px] text-zinc-600">PULSE DETAIL / {String(pulse.id).slice(0, 8)}</div>
                  <h2 className="max-w-3xl text-3xl font-black tracking-[-0.055em] text-white sm:text-5xl">{pulse.title}</h2>
                </div>
                <button
                  type="button"
                  className="pulse-detail-close shrink-0"
                  aria-label="Close details"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 pulse-industrial-meta text-[9px] text-zinc-500">
                <span className={`pulse-industrial-chip ${live ? 'active' : ''}`}>
                  {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00FF87]" />}
                  {live ? 'LIVE' : 'RESULT'}
                </span>
                <span className="pulse-industrial-chip">UPDATED {formatRelative(pulse.updated_at)}</span>
              </div>

              {preview && (
                <div className="pulse-detail-media mt-6">
                  <img src={preview} alt="" />
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="pulse-detail-stat">
                  <span className="pulse-industrial-meta text-[9px] text-zinc-600">PARTICIPANTS</span>
                  <strong>{count}</strong>
                </div>
                <div className="pulse-detail-stat">
                  <span className="pulse-industrial-meta text-[9px] text-zinc-600">STATUS</span>
                  <strong>{live ? 'ACTIVE' : 'DONE'}</strong>
                </div>
                <div className="pulse-detail-stat">
                  <span className="pulse-industrial-meta text-[9px] text-zinc-600">REVISION</span>
                  <strong>{pulse.revision ?? 0}</strong>
                </div>
              </div>

              <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
                <div className="pulse-industrial-meta text-[9px] text-zinc-600">INTENT</div>
                <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-300">{pulse.intent || seed?.text || 'See where someone else takes this.'}</p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="pulse-industrial-button px-5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                >
                  CLOSE
                </button>
                <button
                  type="button"
                  className="pulse-industrial-button primary inline-flex items-center justify-center gap-2 px-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenPulse(pulse);
                  }}
                >
                  OPEN PULSE <ArrowRight size={15} />
                </button>
              </div>
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase.from('pulses').select('*').order('updated_at', { ascending: false }).limit(80);
      const ids = (p || []).map((x) => x.id);
      let grouped = {};
      if (ids.length) {
        const { data: m } = await supabase.from('pulse_moves').select('*').in('pulse_id', ids);
        (m || []).forEach((x) => (grouped[x.pulse_id] ??= []).push(x));
      }
      setPulses((p || []).map((x) => ({ ...x, _moves: grouped[x.id] || [] })));
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedCard) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') setSelectedCard(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedCard]);

  useEffect(() => {
    if (selectedCard) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedCard]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pulses.filter((p) => !q || `${p.title} ${p.intent || ''} ${seedFromPulse(p).text || ''}`.toLowerCase().includes(q));
    if (filter === 'TRENDING') list.sort((a, b) => ((b._moves?.length || 0) * 5 + Number(b.updated_at ? new Date(b.updated_at).getTime() : 0) / 1e9) - ((a._moves?.length || 0) * 5 + Number(a.updated_at ? new Date(a.updated_at).getTime() : 0) / 1e9));
    if (filter === 'QUICK') list = list.filter((p) => !p.intent || p.intent.length < 105);
    if (filter === 'WEIRD') list = list.filter((p) => /(weird|strange|odd|unexpected|mystery|unknown|不思議|変|謎)/i.test(`${p.title} ${p.intent || ''}`));
    return list;
  }, [pulses, query, filter]);

  const openPulse = (pulse) => {
    if (!pulse?.id) return;
    setSelectedCard(null);
    router.push(`/pulse/${pulse.id}`);
  };

  return (
    <>
      <main className="pulse-page explore-v2">
        <header className="pulse-page-header"><div><div className="pulse-page-kicker">DISCOVER</div><h1 className="pulse-page-title">Find a Pulse<br />that pulls you in.</h1></div></header>
        <div className="explore-search"><Search size={16} /><input aria-label="Search Pulses" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ideas, places, weird things…" /></div>
        <div className="explore-filter-row">{FILTERS.map(({ id, label, icon: Icon }) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)} aria-pressed={filter === id}><Icon size={13} />{label}</button>)}</div>
        <div className="explore-meta"><span>{loading ? 'LOADING' : `${filtered.length} FOUND`}</span><span>OPEN ONE. SEE WHAT HAPPENS.</span></div>
        {loading ? <div className="explore-grid"><div className="pulse-skeleton" /><div className="pulse-skeleton" /><div className="pulse-skeleton" /></div> : filtered.length === 0 ? <div className="pulse-empty-state precision-card pad">No match yet. Try a stranger idea.</div> : <div className="explore-grid">{filtered.map((p) => <ExploreCard key={p.id} pulse={p} onSelect={setSelectedCard} onOpen={setSelectedCard} />)}</div>}
      </main>
      <DetailDrawer pulse={selectedCard} onClose={() => setSelectedCard(null)} onOpenPulse={openPulse} />
    </>
  );
}
