'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, GitBranch, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { contentFromMove, contentPreview, formatRelative, participantCount, seedFromPulse } from '../../lib/pulse-social';
import '../../src/pulse-design-system.css';

export default function RevealPage() {
  const [pulses, setPulses] = useState([]); const [selected, setSelected] = useState(null); const [moves, setMoves] = useState([]);
  useEffect(() => { supabase.from('pulses').select('*').neq('status', 'active').order('updated_at', { ascending: false }).limit(40).then(({ data }) => { setPulses(data || []); if (data?.[0]) setSelected(data[0]); }); }, []);
  useEffect(() => { if (selected) supabase.from('pulse_moves').select('*').eq('pulse_id', selected.id).order('created_at', { ascending: true }).then(({ data }) => setMoves(data || [])); }, [selected]);
  const seed = selected ? seedFromPulse(selected) : null;
  const finalState = moves.at(-1)?.state_after?.summary || seed?.text || selected?.intent || 'Nothing changed.';
  const timeline = useMemo(() => [{ type: 'seed', label: 'START', text: seed?.text || 'A Pulse began here.' }, ...(moves || []).map((m, i) => ({ type: 'move', label: `STEP ${i + 1}`, text: contentPreview(contentFromMove(m), 240), actor: m.actor_id })),], [moves, seed]);
  return <main className="pulse-page reveal-v2"><header className="pulse-page-header"><div><div className="pulse-page-kicker"><GitBranch size={12}/> RESULT</div><h1 className="pulse-page-title">See what<br />it became.</h1><p className="pulse-page-subtitle">Follow the chain backwards—from the final state to the first decision that started it.</p></div></header>
    {pulses.length === 0 ? <div className="pulse-empty-state precision-card pad"><div className="precision-label">NOTHING REVEALED YET.</div><p className="precision-state">The interesting part is still moving.</p></div> : <div className="reveal-layout"><aside className="reveal-library"><div className="reveal-library-head"><span>RESULTS</span><span>{pulses.length}</span></div>{pulses.map((p) => <button key={p.id} className={`reveal-library-item ${selected?.id === p.id ? 'active' : ''}`} onClick={() => setSelected(p)}><div><strong>{p.title}</strong><small>{formatRelative(p.updated_at)}</small></div><ArrowUpRight size={14}/></button>)}</aside><section className="reveal-result"><div className="reveal-result-head"><div><span>THE RESULT</span><h2>{selected?.title || 'Reveal'}</h2></div><span>{participantCount(moves)} people</span></div><div className="reveal-final-card"><div className="precision-label">FINAL STATE</div><h3>{finalState}</h3><div><span>{moves.length} steps</span><Link className="precision-button" href={selected ? `/pulse/${selected.id}` : '/'}>OPEN PULSE <ArrowUpRight size={14}/></Link></div></div><div className="reveal-timeline-label"><span>THE CHAIN</span><span>START → RESULT</span></div><div className="reveal-timeline">{timeline.map((item, i) => <motion.div key={`${item.label}-${i}`} className="reveal-timeline-row" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><div className="reveal-index">{i === 0 ? '01' : String(i + 1).padStart(2, '0')}</div><div className="reveal-timeline-node"><span>{item.label}</span><strong>{item.text}</strong>{item.actor && <small>{item.actor === 'system' ? 'PULSE' : 'A PERSON'} · {formatRelative(moves[i - 1]?.created_at)}</small>}</div></motion.div>)}</div><div className="reveal-footer"><span>Every step leaves the next person a different Pulse.</span><Link href="/" className="pulse-text-link">FIND ANOTHER <ArrowRight size={14}/></Link><RotateCcw size={15}/></div></section></div>}
  </main>;
}
