'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Search, Plus, Bell, Users, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { contentFromMove, contentPreview, formatRelative, mediaFromContent, participantCount, seedFromPulse, actorId } from '../lib/pulse-social';
import '../src/pulse-design-system.css';
import '../src/pulse-home-neo.css';

const tabs = ['FOR YOU', 'LIVE', 'NEW'];

function statusOf(pulse) {
  if (pulse.status !== 'active') return 'ENDED';
  const age = Date.now() - new Date(pulse.updated_at || pulse.created_at).getTime();
  return age < 20 * 60 * 1000 ? 'LIVE' : 'OPEN';
}

function initials(id = '') {
  const value = String(id).replace(/^a_/, '').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  return value || 'P';
}

function PulseImage({ src, label }) {
  if (src) return <img src={src} alt="" loading="lazy" />;
  return <div className="neo-image-fallback" aria-label={label} />;
}

function PulseCard({ pulse, moves, isSelf, featured = false }) {
  const current = moves.at(-1);
  const seed = seedFromPulse(pulse);
  const content = contentFromMove(current);
  const media = mediaFromContent(content) || seed?.dataUrl || null;
  const state = current?.state_after?.summary || content?.summary || content?.text || content?.choice || seed?.text || '';
  const status = statusOf(pulse);
  const count = participantCount(moves);

  return (
    <motion.article className={`neo-pulse ${featured ? 'neo-pulse-featured' : ''}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: featured ? -3 : -5 }}>
      <Link href={`/pulse/${pulse.id}`} className="neo-pulse-link">
        <div className="neo-pulse-media"><PulseImage src={media} label={pulse.title} /><div className="neo-pulse-shade" /></div>
        <div className="neo-pulse-content">
          <div className="neo-pulse-meta"><span className={status === 'LIVE' ? 'is-live' : ''}><i />{status}</span><time>{formatRelative(pulse.updated_at || pulse.created_at)}</time></div>
          <div className="neo-pulse-type">{isSelf ? 'YOUR PULSE' : 'PULSE'}</div>
          <h2>{pulse.title}</h2>
          {state && <p>{contentPreview({ text: state }, featured ? 150 : 92)}</p>}
          <div className="neo-pulse-bottom">
            <div className="neo-people"><span className="neo-avatar">{initials(pulse.creator_id)}</span><span>{count} {count === 1 ? 'person' : 'people'} changed this</span></div>
            <span className="neo-open">{isSelf ? 'OPEN CHAIN' : status === 'ENDED' ? 'SEE RESULT' : 'JOIN'} <ArrowUpRight size={15} /></span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export default function Home() {
  const [pulses, setPulses] = useState([]);
  const [moves, setMoves] = useState({});
  const [tab, setTab] = useState('FOR YOU');
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActor(actorId());
    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase.from('pulses').select('*').order('updated_at', { ascending: false }).limit(36);
      const list = p || [];
      setPulses(list);
      if (list.length) {
        const { data: m } = await supabase.from('pulse_moves').select('*').in('pulse_id', list.map((x) => x.id)).order('created_at', { ascending: true });
        const grouped = {};
        (m || []).forEach((move) => (grouped[move.pulse_id] ??= []).push(move));
        setMoves(grouped);
      } else setMoves({});
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...pulses];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.title} ${p.intent || ''} ${seedFromPulse(p).text || ''}`.toLowerCase().includes(q));
    if (tab === 'LIVE') list = list.filter((p) => p.status === 'active' && Date.now() - new Date(p.updated_at || p.created_at).getTime() < 30 * 60 * 1000);
    if (tab === 'NEW') list.sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at));
    return list;
  }, [pulses, query, tab]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <main className="pulse-neo-home">
      <header className="neo-header">
        <Link href="/" className="neo-brand" aria-label="Pulse home"><span className="neo-brand-mark">p</span><span>PULSE</span></Link>
        <div className="neo-header-right">
          <label className="neo-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find something interesting" aria-label="Search Pulses" /></label>
          <Link href="/activity" className="neo-icon" aria-label="Activity"><Bell size={18} /></Link>
          <Link href="/create" className="neo-create"><Plus size={17} /> CREATE</Link>
        </div>
      </header>

      <section className="neo-intro">
        <div>
          <div className="neo-eyebrow"><Sparkles size={13} /> SOMETHING IS HAPPENING</div>
          <h1>Don't just scroll.<br /><em>change something.</em></h1>
          <p>Every Pulse starts somewhere. Find one that makes you curious enough to step in.</p>
        </div>
        <div className="neo-filter-wrap">{tabs.map((tabName) => <button key={tabName} className={tab === tabName ? 'active' : ''} onClick={() => setTab(tabName)}>{tabName}</button>)}</div>
      </section>

      {loading ? <section className="neo-loading"><span /><span /><span /></section> : filtered.length === 0 ? <section className="neo-empty"><strong>Nothing is matching that.</strong><span>Try another search or come back when something starts moving.</span></section> : <>
        <section className="neo-feature-row">
          <div className="neo-section-label"><span>01</span><strong>ONE TO STEP INTO</strong><small>{filtered.length} open Pulses</small></div>
          <PulseCard pulse={featured} moves={moves[featured.id] || []} isSelf={featured.creator_id === actor} featured />
        </section>
        {rest.length > 0 && <section className="neo-discover">
          <div className="neo-section-label"><span>02</span><strong>KEEP LOOKING</strong><small>There is no correct order.</small></div>
          <div className="neo-list">{rest.map((pulse) => <PulseCard key={pulse.id} pulse={pulse} moves={moves[pulse.id] || []} isSelf={pulse.creator_id === actor} />)}</div>
        </section>}
      </>}

      <footer className="neo-footer"><span><Users size={14} /> Pulse is better when other people change it.</span><span>SEE → JOIN → CHANGE → SEE WHAT HAPPENS</span></footer>
    </main>
  );
}
