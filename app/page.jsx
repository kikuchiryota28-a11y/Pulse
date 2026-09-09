'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Bell, ArrowRight, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { actorId, contentFromMove, contentPreview, formatRelative, mediaFromContent, participantCount, seedFromPulse } from '../lib/pulse-social';
import '../src/pulse-ui-v1.css';

const tabs=['FOR YOU','STILL MOVING','MOVING NOW'];
function statusOf(p){ if(p.status==='active') return p.updated_at&&Date.now()-new Date(p.updated_at).getTime()<15*60*1000?'LIVE':'MOVING'; return 'REVEALED'; }

function PulseCard({pulse,moves}){
  const seed=seedFromPulse(pulse); const current=moves?.at(-1); const latestContent=contentFromMove(current);
  const state=current?.state_after?.summary||latestContent?.summary||latestContent?.text||latestContent?.choice||seed?.text||'';
  const media=mediaFromContent(latestContent)||seed?.dataUrl||null; const status=statusOf(pulse); const people=participantCount(moves);
  return <Link className="pulse-card-link" href={`/pulse/${pulse.id}`}>
    <article className="precision-card pad pulse-home-card">
      {media ? <div className="pulse-card-visual"><img src={media} alt="" loading="lazy"/></div> : <div className="pulse-card-visual pulse-card-visual-placeholder" aria-hidden="true"/>}
      <div className="pulse-card-overlay">
        <div className="pulse-card-top"><span className={`pulse-move-chip ${status!=='REVEALED'?'live':''}`}>{status}</span><span className="pulse-card-time">{formatRelative(pulse.updated_at)}</span></div>
        <h2 className="pulse-card-title-xl">{pulse.title}</h2>
        {state&&<div className="pulse-card-state"><div className="precision-label">NOW</div><p>{state}</p></div>}
        <div className="pulse-card-join"><span className="pulse-card-join-copy"><Users size={11}/> {people} moved</span><span className="precision-button pulse-card-move-button">MOVE <ArrowRight size={14}/></span></div>
      </div>
    </article>
  </Link>
}

export default function Home(){ const [pulses,setPulses]=useState([]); const [moves,setMoves]=useState({}); const [tab,setTab]=useState('FOR YOU'); const [loading,setLoading]=useState(true); const [query,setQuery]=useState('');
 useEffect(()=>{const load=async()=>{setLoading(true);const {data:p}=await supabase.from('pulses').select('*').order('updated_at',{ascending:false}).limit(24);setPulses(p||[]);const ids=(p||[]).map(x=>x.id);if(ids.length){const{data:m}=await supabase.from('pulse_moves').select('*').in('pulse_id',ids).order('created_at',{ascending:true});const grouped={};(m||[]).forEach(x=>(grouped[x.pulse_id]??=[]).push(x));setMoves(grouped)}setLoading(false)};load()},[]);
 const filtered=useMemo(()=>{let a=pulses;if(query.trim()){const q=query.toLowerCase();a=a.filter(p=>`${p.title} ${p.intent||''} ${(seedFromPulse(p).text||'')}`.toLowerCase().includes(q))}if(tab==='MOVING NOW')a=a.filter(p=>p.status==='active'&&Date.now()-new Date(p.updated_at).getTime()<15*60*1000);if(tab==='STILL MOVING')a=a.filter(p=>p.status==='active');return a},[pulses,query,tab]);
 return <main className="pulse-page">
   <header className="pulse-page-header"><div><div className="pulse-page-kicker">PULSE</div><h1 className="pulse-page-title">What do you want to change?</h1></div><div><Link href="/create" className="precision-button"><Plus size={15}/> CREATE</Link></div></header>
   <div className="pulse-segment" role="group" aria-label="Pulse filters">{tabs.map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</div>
   <div className="pulse-home-toolbar"><div className="pulse-home-search"><Search size={15}/><input aria-label="Search Pulses" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"/></div><Link href="/activity" className="precision-button secondary" aria-label="Activity"><Bell size={15}/></Link></div>
   {loading?<div className="pulse-grid pulse-grid-2"><div className="precision-card pad pulse-skeleton"/><div className="precision-card pad pulse-skeleton"/></div>:filtered.length===0?<div className="precision-card pad pulse-empty-state">No Pulses here yet.</div>:<div className="pulse-grid pulse-grid-3">{filtered.map(p=><PulseCard key={p.id} pulse={p} moves={moves[p.id]||[]}/>)}</div>}
 </main> }
