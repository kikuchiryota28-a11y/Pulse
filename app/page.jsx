'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Bell, ArrowRight, Users, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { actorId, contentFromMove, contentPreview, formatRelative, mediaFromContent, participantCount, seedFromPulse } from '../lib/pulse-social';
import '../src/pulse-ui-v1.css';

const tabs=['FOR YOU','STILL MOVING','MOVING NOW'];
function statusOf(p){ if(p.status==='active') return p.updated_at&&Date.now()-new Date(p.updated_at).getTime()<15*60*1000?'SOMEONE IS MOVING':'MOVING'; return 'REVEALED'; }
function PulseCard({pulse,moves}){ const seed=seedFromPulse(pulse); const current=moves?.at(-1); const state=current?.state_after?.summary||seed?.text||'A new Pulse is waiting for a move.'; const status=statusOf(pulse); return <Link className="pulse-card-link" href={`/pulse/${pulse.id}`}><article className="precision-card pad">
  <div className="pulse-card-top"><span className={`pulse-move-chip ${status!=='REVEALED'?'live':''}`}>{status}</span><span className="precision-label">{formatRelative(pulse.updated_at)}</span></div>
  <h2 className="pulse-card-title-xl">{pulse.title}</h2>
  <div className="pulse-card-state"><div className="precision-label">CURRENT STATE</div><p>{state}</p></div>
  <div className="pulse-card-join"><span className="pulse-card-join-copy">{pulse.intent||'Your action changes what comes next.'}</span><span className="precision-button">MOVE <ArrowRight size={14}/></span></div>
</article></Link> }

export default function Home(){ const [pulses,setPulses]=useState([]); const [moves,setMoves]=useState({}); const [tab,setTab]=useState('FOR YOU'); const [loading,setLoading]=useState(true); const [actor,setActor]=useState(''); const [query,setQuery]=useState('');
 useEffect(()=>{setActor(actorId()); const load=async()=>{setLoading(true);const {data:p}=await supabase.from('pulses').select('*').order('updated_at',{ascending:false}).limit(24);setPulses(p||[]);const ids=(p||[]).map(x=>x.id);if(ids.length){const{data:m}=await supabase.from('pulse_moves').select('*').in('pulse_id',ids).order('created_at',{ascending:true});const grouped={};(m||[]).forEach(x=>(grouped[x.pulse_id]??=[]).push(x));setMoves(grouped)}setLoading(false)};load();return()=>{}},[]);
 const filtered=useMemo(()=>{let a=pulses;if(query.trim()){const q=query.toLowerCase();a=a.filter(p=>`${p.title} ${p.intent||''}`.toLowerCase().includes(q))}if(tab==='MOVING NOW')a=a.filter(p=>p.status==='active'&&Date.now()-new Date(p.updated_at).getTime()<15*60*1000);if(tab==='STILL MOVING')a=a.filter(p=>p.status==='active');return a},[pulses,query,tab]);
 return <main className="pulse-page"><header className="pulse-page-header"><div><div className="pulse-page-kicker">PULSE / LIVE WORLD</div><h1 className="pulse-page-title">Things are<br/>changing.</h1><p className="pulse-page-subtitle">Find a Pulse that is moving right now. Understand the current state. Make the next move.</p></div><div><Link href="/create" className="precision-button"><Plus size={15}/> CREATE</Link></div></header>
 <div className="pulse-segment" role="group" aria-label="Pulse filters">{tabs.map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</div>
 <div style={{display:'flex',gap:8,marginBottom:18}}><div style={{position:'relative',flex:1}}><Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--pulse-muted)'}}/><input aria-label="Search Pulses" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search what is moving…" style={{width:'100%',height:44,padding:'0 14px 0 36px',border:'1px solid var(--pulse-line)',borderRadius:16,background:'rgba(255,255,255,.55)',outline:'none'}}/></div><Link href="/activity" className="precision-button secondary" aria-label="Activity"><Bell size={15}/></Link></div>
 {loading?<div className="pulse-grid pulse-grid-2"><div className="precision-card pad" style={{height:260}}/><div className="precision-card pad" style={{height:260}}/></div>:filtered.length===0?<div className="precision-card pad" style={{padding:'70px 25px',textAlign:'center'}}><div className="precision-label">NOTHING IS MOVING HERE YET.</div><h2 className="precision-state">Find a Pulse and make one.</h2></div>:<div className="pulse-grid pulse-grid-3">{filtered.map(p=><PulseCard key={p.id} pulse={p} moves={moves[p.id]||[]}/>)}</div>}
 </main> }
