'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, UserRound, Settings2, Zap, Layers3, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { actorId, contentFromMove, contentPreview, formatRelative, participantCount, seedFromPulse } from '../../lib/pulse-social';
import '../../src/pulse-design-system.css';

const TABS = ['PULSES', 'PARTICIPATED', 'LIKES'];

export default function YouPage() {
  const [actor, setActor] = useState(''); const [pulses, setPulses] = useState([]); const [moves, setMoves] = useState([]); const [likes, setLikes] = useState([]); const [tab, setTab] = useState('PULSES'); const [loading, setLoading] = useState(true);
  useEffect(() => { const a = actorId(); setActor(a); const load = async () => { setLoading(true); const [{ data: p }, { data: m }, { data: r }] = await Promise.all([supabase.from('pulses').select('*').eq('creator_id', a).order('created_at', { ascending: false }), supabase.from('pulse_moves').select('*').eq('actor_id', a).order('created_at', { ascending: false }), supabase.from('pulse_reactions').select('pulse_id,created_at').eq('actor_id', a).eq('reaction', 'like').order('created_at', { ascending: false })]); setPulses(p || []); setMoves(m || []); const likedIds = (r || []).map((x) => x.pulse_id); if (likedIds.length) { const { data: liked } = await supabase.from('pulses').select('*').in('id', likedIds); setLikes(liked || []); } else setLikes([]); setLoading(false); }; load(); }, []);
  const current = tab === 'PULSES' ? pulses : tab === 'PARTICIPATED' ? moves : likes;
  const displayName = (() => { try { return localStorage.getItem('pulse:profile:name') || 'You'; } catch { return 'You'; } })();
  const bio = (() => { try { return localStorage.getItem('pulse:profile:bio') || 'Leaving small changes behind.'; } catch { return 'Leaving small changes behind.'; } })();
  return <main className="pulse-page you-v2">
    <section className="you-hero"><div className="you-avatar"><UserRound size={26} /></div><div className="you-identity"><div className="pulse-page-kicker">YOUR PULSE</div><h1>{displayName}</h1><p>{bio}</p><span className="you-id">@{String(actor).replace(/^a_/, '').slice(0, 9)}</span></div><Link href="/account" className="precision-icon" aria-label="Profile settings"><Settings2 size={17} /></Link></section>
    <div className="you-stats"><div><strong>{pulses.length}</strong><span>CREATED</span></div><div><strong>{moves.length}</strong><span>PARTICIPATED</span></div><div><strong>{likes.length}</strong><span>LIKED</span></div></div>
    <div className="you-tabs">{TABS.map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {loading ? <div className="you-grid"><div className="pulse-skeleton" /><div className="pulse-skeleton" /></div> : current.length === 0 ? <div className="you-empty"><Layers3 size={20} /><strong>{tab === 'PULSES' ? 'Your first Pulse is waiting.' : tab === 'PARTICIPATED' ? 'You have not joined one yet.' : 'Your likes will live here.'}</strong><p>Go find something that makes you curious enough to act.</p><Link className="precision-button" href="/">FIND A PULSE <ArrowUpRight size={14} /></Link></div> : <div className={`you-grid ${tab === 'PARTICIPATED' ? 'move-grid' : ''}`}>{current.slice(0, 24).map((item, i) => { const pulse = tab === 'PARTICIPATED' ? null : item; return <motion.div key={item.id || `${item.pulse_id}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .025 }}>{tab === 'PARTICIPATED' ? <Link className="you-move-card" href={`/pulse/${item.pulse_id}`}><span><Zap size={14} /> {formatRelative(item.created_at)}</span><strong>{contentPreview(contentFromMove(item), 120)}</strong><small>{item.prompt || 'Your contribution became part of the chain.'}</small></Link> : <Link className="you-pulse-card" href={`/pulse/${pulse.id}`}><div className="you-pulse-top"><span>{pulse.status === 'active' ? 'LIVE' : 'RESULT'}</span><small>{formatRelative(pulse.updated_at)}</small></div><h2>{pulse.title}</h2><p>{pulse.intent || seedFromPulse(pulse).text || 'See what this became.'}</p><div><span><Layers3 size={13} /> {pulse.status === 'active' ? 'IN MOTION' : 'COMPLETED'}</span><ArrowUpRight size={15} /></div></Link>}</motion.div>; })}</div>}
  </main>;
}
