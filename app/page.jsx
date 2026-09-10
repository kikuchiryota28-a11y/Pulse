'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Plus, Bell, ArrowUpRight, Users, Layers3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { contentFromMove, contentPreview, formatRelative, mediaFromContent, participantCount, seedFromPulse, actorId } from '../lib/pulse-social';
import '../src/pulse-design-system.css';

const tabs = ['FOR YOU', 'MOVING NOW', 'NEW'];

function statusOf(p) {
  if (p.status !== 'active') return 'REVEALED';
  return p.updated_at && Date.now() - new Date(p.updated_at).getTime() < 15 * 60 * 1000 ? 'LIVE' : 'MOVING';
}

function initials(id = '') {
  const clean = String(id).replace(/^a_/, '').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  return clean || 'P';
}

function AvatarStack({ pulse, moves }) {
  const ids = [pulse?.creator_id, ...(moves || []).map((m) => m.actor_id)].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4);
  return (
    <div className="pulse-avatar-stack" aria-label={`${participantCount(moves)} participants`}>
      {ids.map((id, i) => <span className={`pulse-avatar avatar-${i}`} key={id}>{initials(id)}</span>)}
      <span className="pulse-joined">{participantCount(moves)} joined</span>
    </div>
  );
}

function PulseCard({ pulse, moves, isSelf }) {
  const current = moves?.at(-1);
  const latestContent = contentFromMove(current);
  const seed = seedFromPulse(pulse);
  const media = mediaFromContent(latestContent) || seed?.dataUrl || null;
  const state = current?.state_after?.summary || latestContent?.summary || latestContent?.text || latestContent?.choice || seed?.text || '';
  const status = statusOf(pulse);
  const depth = moves.length;

  return (
    <motion.div
      className="pulse-card-shell"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .42, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <Link className="pulse-card-link" href={`/pulse/${pulse.id}`}>
        <article className="pulse-home-card">
          {media ? <div className="pulse-card-visual"><img src={media} alt="" loading="lazy" /></div> : <div className="pulse-card-visual pulse-card-visual-placeholder" aria-hidden="true" />}
          <div className="pulse-card-noise" aria-hidden="true" />
          <div className="pulse-card-overlay">
            <div className="pulse-card-top">
              <span className={`pulse-move-chip ${status !== 'REVEALED' ? 'live' : ''}`}>{status}</span>
              <span className="pulse-card-time">{formatRelative(pulse.updated_at)}</span>
            </div>
            <div className="pulse-card-kicker">{isSelf ? 'YOUR PULSE' : 'PULSE'}</div>
            <h2 className="pulse-card-title-xl">{pulse.title}</h2>
            {state && <p className="pulse-card-hook">{contentPreview({ text: state }, 92)}</p>}
            <div className="pulse-card-footer-row">
              <AvatarStack pulse={pulse} moves={moves} />
              <span className="pulse-depth"><Layers3 size={13} /> {depth} {depth === 1 ? 'step' : 'steps'}</span>
            </div>
            <div className="pulse-card-action-row">
              {isSelf ? (
                <span className="pulse-card-self-actions"><span>VIEW CHAIN</span><ArrowUpRight size={15} /></span>
              ) : status === 'REVEALED' ? (
                <span className="pulse-card-self-actions"><span>SEE RESULT</span><ArrowUpRight size={15} /></span>
              ) : (
                <span className="pulse-card-join-button"><span>JOIN PULSE</span><ArrowUpRight size={15} /></span>
              )}
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const [pulses, setPulses] = useState([]);
  const [moves, setMoves] = useState({});
  const [tab, setTab] = useState('FOR YOU');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('');

  useEffect(() => {
    setActor(actorId());
    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase.from('pulses').select('*').order('updated_at', { ascending: false }).limit(36);
      setPulses(p || []);
      const ids = (p || []).map((x) => x.id);
      if (ids.length) {
        const { data: m } = await supabase.from('pulse_moves').select('*').in('pulse_id', ids).order('created_at', { ascending: true });
        const grouped = {};
        (m || []).forEach((x) => (grouped[x.pulse_id] ??= []).push(x));
        setMoves(grouped);
      } else setMoves({});
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...pulses];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => `${p.title} ${p.intent || ''} ${(seedFromPulse(p).text || '')}`.toLowerCase().includes(q));
    }
    if (tab === 'MOVING NOW') list = list.filter((p) => p.status === 'active' && Date.now() - new Date(p.updated_at).getTime() < 30 * 60 * 1000);
    if (tab === 'NEW') list = list.sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at));
    return list;
  }, [pulses, query, tab]);

  return (
    <main className="pulse-page pulse-home-v2">
      <header className="pulse-page-header">
        <div>
          <div className="pulse-page-kicker">PULSE</div>
          <h1 className="pulse-page-title">See something.<br />Change what happens.</h1>
        </div>
        <Link href="/create" className="precision-button"><Plus size={15} /> CREATE</Link>
      </header>

      <div className="pulse-segment" role="group" aria-label="Pulse filters">
        {tabs.map((t) => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <div className="pulse-home-toolbar">
        <div className="pulse-home-search"><Search size={15} /><input aria-label="Search Pulses" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Pulses" /></div>
        <Link href="/activity" className="precision-icon" aria-label="Activity"><Bell size={17} /></Link>
      </div>

      <section className="pulse-feed-intro">
        <span>{loading ? 'TUNING THE FEED' : `${filtered.length} PULSES`}</span>
        <span>FIND ONE THAT MAKES YOU WANT TO MOVE</span>
      </section>

      {loading ? (
        <div className="pulse-grid pulse-grid-3"><div className="pulse-skeleton" /><div className="pulse-skeleton" /><div className="pulse-skeleton" /></div>
      ) : filtered.length === 0 ? (
        <div className="pulse-empty-state precision-card pad">Nothing here yet. Try a different signal.</div>
      ) : (
        <div className="pulse-grid pulse-grid-3">
          {filtered.map((pulse) => <PulseCard key={pulse.id} pulse={pulse} moves={moves[pulse.id] || []} isSelf={Boolean(actor && pulse.creator_id === actor)} />)}
        </div>
      )}
    </main>
  );
}
