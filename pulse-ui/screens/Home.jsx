'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Search, Plus, Bell } from 'lucide-react';

const tabs = ['FOR YOU', 'LIVE', 'NEW'];

function PulseImage({ src, label }) {
  return src ? <img src={src} alt="" loading="lazy" /> : <div className="neo-image-fallback" aria-label={label} />;
}

export function PulseCard({ pulse, moves = [], isSelf = false, featured = false, helpers = {} }) {
  const { seedFromPulse, contentFromMove, mediaFromContent, contentPreview, formatRelative, participantCount } = helpers;
  const current = moves.at(-1);
  const seed = seedFromPulse?.(pulse) || {};
  const content = contentFromMove?.(current) || {};
  const media = mediaFromContent?.(content) || seed?.dataUrl || null;
  const state = current?.state_after?.summary || content?.summary || content?.text || content?.choice || seed?.text || '';
  const status = pulse.status !== 'active' ? 'ENDED' : 'OPEN';
  const count = participantCount?.(moves) || 0;

  return (
    <motion.article className={`neo-pulse ${featured ? 'neo-pulse-featured' : ''}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: featured ? -3 : -5 }}>
      <Link href={`/pulse/${pulse.id}`} className="neo-pulse-link">
        <div className="neo-pulse-media"><PulseImage src={media} label={pulse.title} /><div className="neo-pulse-shade" /></div>
        <div className="neo-pulse-content">
          <div className="neo-pulse-meta"><span className={status === 'LIVE' ? 'is-live' : ''}><i />{status}</span><time>{formatRelative?.(pulse.updated_at || pulse.created_at)}</time></div>
          <div className="neo-pulse-type">{isSelf ? 'YOUR PULSE' : 'PULSE'}</div>
          <h2>{pulse.title}</h2>
          {state && <p>{contentPreview?.({ text: state }, featured ? 150 : 92)}</p>}
          <div className="neo-pulse-bottom"><div className="neo-people"><span className="neo-avatar">P</span><span>{count} {count === 1 ? 'person' : 'people'} changed this</span></div><span className="neo-open">{isSelf ? 'OPEN CHAIN' : status === 'ENDED' ? 'SEE RESULT' : 'JOIN'} <ArrowUpRight size={15} /></span></div>
        </div>
      </Link>
    </motion.article>
  );
}

export default function HomeUI({ pulses = [], moves = {}, actor = '', helpers = {} }) {
  const [tab, setTab] = useState('FOR YOU');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    let list = [...pulses];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.title} ${p.intent || ''}`.toLowerCase().includes(q));
    if (tab === 'LIVE') list = list.filter((p) => p.status === 'active');
    if (tab === 'NEW') list.sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at));
    return list;
  }, [pulses, query, tab]);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <main className="pulse-neo-home">
      <header className="neo-header">
        <Link href="/" className="neo-brand" aria-label="Pulse home"><span className="neo-brand-mark">p</span><span>PULSE</span></Link>
        <div className="neo-header-right"><label className="neo-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search Pulses" /></label><Link href="/activity" className="neo-icon" aria-label="Activity"><Bell size={18} /></Link><Link href="/create" className="neo-create" aria-label="Create"><Plus size={17} /></Link></div>
      </header>
      {featured ? <><section className="neo-feature-row"><div className="neo-filter-wrap">{tabs.map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>)}</div><PulseCard pulse={featured} moves={moves[featured.id] || []} isSelf={featured.creator_id === actor} featured helpers={helpers} /></section><section className="neo-discover"><div className="neo-list">{rest.map((pulse) => <PulseCard key={pulse.id} pulse={pulse} moves={moves[pulse.id] || []} isSelf={pulse.creator_id === actor} helpers={helpers} />)}</div></section></> : <section className="neo-empty"><strong>Nothing here yet.</strong></section>}
    </main>
  );
}
