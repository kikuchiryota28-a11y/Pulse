'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bell, Zap, Users, GitBranch, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { actorId, formatRelative } from '../../lib/pulse-social';
import '../../src/pulse-design-system.css';

const iconFor = (type = '') => type.includes('like') ? Heart : type.includes('join') || type.includes('move') ? Zap : type.includes('follow') ? Users : GitBranch;

export default function ActivityPage() {
  const [events, setEvents] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { const actor = actorId(); let channel; const load = async () => { setLoading(true); const { data } = await supabase.from('pulse_events').select('*').order('created_at', { ascending: false }).limit(60); setEvents((data || []).filter((e) => !e.actor_id || e.actor_id === actor)); setLoading(false); }; load(); channel = supabase.channel('pulse-activity-fluid').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulse_events' }, load).subscribe(); return () => channel && supabase.removeChannel(channel); }, []);
  return <main className="pulse-page activity-v2">
    <header className="pulse-page-header"><div><div className="pulse-page-kicker">ACTIVITY</div><h1 className="pulse-page-title">Something happened<br />after you left.</h1><p className="pulse-page-subtitle">This is the part of Pulse that belongs to consequence: what changed after your contribution.</p></div></header>
    <div className="activity-inbox-head"><span>{loading ? 'CHECKING' : `${events.length} UPDATES`}</span><span>YOUR WORLD, UPDATED</span></div>
    {loading ? <div className="activity-list"><div className="activity-skeleton" /><div className="activity-skeleton" /></div> : events.length === 0 ? <div className="activity-empty"><Bell size={20} /><strong>Nothing has reached you yet.</strong><p>Join a Pulse, then come back here to see what happened after your turn.</p><Link className="precision-button" href="/">FIND A PULSE <ArrowUpRight size={14} /></Link></div> : <div className="activity-list">{events.map((event, i) => { const Icon = iconFor(event.event_type || event.type); return <motion.div key={event.id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .025 }}><Link className="activity-row" href={event.pulse_id ? `/pulse/${event.pulse_id}` : '/'}><div className="activity-icon"><Icon size={16} /></div><div className="activity-copy"><strong>{String(event.event_type || 'PULSE UPDATED').replaceAll('_', ' ')}</strong><p>{event.message || event.type || 'A Pulse changed.'}</p></div><time>{formatRelative(event.created_at)}</time><ArrowUpRight size={15} /></Link></motion.div>; })}</div>}
  </main>;
}
