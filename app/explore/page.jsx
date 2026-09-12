'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, Sparkles, Flame, Clock3, Ghost } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { formatRelative, seedFromPulse, participantCount } from '../../lib/pulse-social';
import '../../src/pulse-design-system.css';
import '../../src/pulse-step3.css';

const FILTERS = [
  { id: 'TRENDING', label: 'TRENDING', icon: Flame },
  { id: 'QUICK', label: 'QUICK', icon: Clock3 },
  { id: 'WEIRD', label: 'WEIRD', icon: Ghost },
  { id: 'ALL', label: 'ALL', icon: Sparkles },
];

function ExploreCard({ pulse }) {
  const seed = seedFromPulse(pulse);
  const preview = seed?.dataUrl || null;
  const live = pulse.status === 'active';
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} transition={{ duration: .35 }}>
    <Link className="pulse-card-link" href={`/pulse/${pulse.id}`}>
      <article className="explore-card">
        <div className={`explore-card-media ${preview ? '' : 'empty'}`}>
          {preview && <img src={preview} alt="" loading="lazy" />}
        </div>
        <div className="explore-card-shade" aria-hidden="true" />
        <div className="explore-card-content">
          <div className="explore-card-top">
            <span className={live ? 'explore-status-pill live' : 'explore-status-pill'}>
              {live && <span className="explore-live-dot-wrap relative flex h-2 w-2" aria-hidden="true"><span className="explore-live-dot animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF87] opacity-60" /><span className="explore-live-dot-core relative inline-flex h-2 w-2 rounded-full bg-[#00FF87]" /></span>}
              {live ? 'LIVE' : 'RESULT'}
            </span>
            <small>{formatRelative(pulse.updated_at)}</small>
          </div>
          <h2>{pulse.title}</h2>
          <p>{pulse.intent || seed?.text || 'See where someone else takes this.'}</p>
          <div className="explore-card-bottom"><span>{participantCount(pulse._moves || [])} joined</span><span className="explore-card-go">OPEN <ArrowUpRight size={14} /></span></div>
        </div>
      </article>
    </Link>
  </motion.div>;
}

export default function Explore() {
  const [pulses, setPulses] = useState([]); const [query, setQuery] = useState(''); const [filter, setFilter] = useState('TRENDING'); const [loading, setLoading] = useState(true);
  useEffect(() => { const load = async () => { setLoading(true); const { data: p } = await supabase.from('pulses').select('*').order('updated_at', { ascending: false }).limit(80); const ids = (p || []).map((x) => x.id); let grouped = {}; if (ids.length) { const { data: m } = await supabase.from('pulse_moves').select('*').in('pulse_id', ids); (m || []).forEach((x) => (grouped[x.pulse_id] ??= []).push(x)); } setPulses((p || []).map((x) => ({ ...x, _moves: grouped[x.id] || [] }))); setLoading(false); }; load(); }, []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pulses.filter((p) => !q || `${p.title} ${p.intent || ''} ${seedFromPulse(p).text || ''}`.toLowerCase().includes(q));
    if (filter === 'TRENDING') list.sort((a, b) => ((b._moves?.length || 0) * 5 + Number(b.updated_at ? new Date(b.updated_at).getTime() : 0) / 1e9) - ((a._moves?.length || 0) * 5 + Number(a.updated_at ? new Date(a.updated_at).getTime() : 0) / 1e9));
    if (filter === 'QUICK') list = list.filter((p) => !p.intent || p.intent.length < 105);
    if (filter === 'WEIRD') list = list.filter((p) => /(weird|strange|odd|unexpected|mystery|unknown|不思議|変|謎)/i.test(`${p.title} ${p.intent || ''}`));
    return list;
  }, [pulses, query, filter]);
  return <main className="pulse-page explore-v2">
    <header className="pulse-page-header"><div><div className="pulse-page-kicker">DISCOVER</div><h1 className="pulse-page-title">Find a Pulse<br />that pulls you in.</h1></div></header>
    <div className="explore-search"><Search size={16} /><input aria-label="Search Pulses" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ideas, places, weird things…" /></div>
    <div className="explore-filter-row">{FILTERS.map(({ id, label, icon: Icon }) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)} aria-pressed={filter === id}><Icon size={13} />{label}</button>)}</div>
    <div className="explore-meta"><span>{loading ? 'LOADING' : `${filtered.length} FOUND`}</span><span>OPEN ONE. SEE WHAT HAPPENS.</span></div>
    {loading ? <div className="explore-grid"><div className="pulse-skeleton" /><div className="pulse-skeleton" /><div className="pulse-skeleton" /></div> : filtered.length === 0 ? <div className="pulse-empty-state precision-card pad">No match yet. Try a stranger idea.</div> : <div className="explore-grid">{filtered.map((p) => <ExploreCard key={p.id} pulse={p} />)}</div>}
  </main>;
}
