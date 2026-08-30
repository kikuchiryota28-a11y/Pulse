'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, CircleDot, Clock3, Copy, LoaderCircle, Palette, Radio, RotateCcw, Shapes, Sparkles, Type, Users, Waves } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MAX_STEPS = 3;
const PULSES_KEY = 'pulse:v5:pulses';
const ACTIVE_KEY = 'pulse:v5:active';
const SESSIONS_KEY = 'pulse:v5:sessions';
const STARTERS = ['A vending machine that only appears at midnight.','The sound of rain on a city nobody has visited.','A tiny door hidden somewhere in this room.'];
const FORM_SHAPES = ['circle','square','triangle','organic'];
const FORM_COLORS = [
  { name:'Electric blue', value:'#2764ff', h:220 },
  { name:'Violet', value:'#8b5cf6', h:262 },
  { name:'Cyan', value:'#18c8d8', h:185 },
  { name:'Coral', value:'#ff7a45', h:16 },
];
const TEXT_ACTIONS = [
  { title:'MAKE IT STRANGER', code:'STRANGER', copy:'Push the idea somewhere unexpected.' },
  { title:'MAKE IT SOFTER', code:'SOFTER', copy:'Give it a warmer, more human direction.' },
  { title:'MAKE IT BIGGER', code:'BIGGER', copy:'Scale the idea until it feels impossible.' },
];
const FORM_ACTIONS = [
  { title:'ROTATE IT', code:'ROTATE', copy:'Turn the form into a new direction.' },
  { title:'RESHAPE IT', code:'RESHAPE', copy:'Change the geometry without losing it.' },
  { title:'CHARGE IT', code:'CHARGE', copy:'Give the object a new energy.' },
];
const COLOR_ACTIONS = [
  { title:'SHIFT WARMER', code:'WARM', copy:'Move the color toward heat.' },
  { title:'SHIFT COOLER', code:'COOL', copy:'Pull the color toward ice and air.' },
  { title:'AMPLIFY IT', code:'LOUD', copy:'Make the color louder and brighter.' },
];

function readSteps(relay){return Array.isArray(relay?.steps)?relay.steps:[];}
function parsePayload(value){try{const x=JSON.parse(value);if(x&&typeof x==='object'&&x.type)return x;}catch{}return null;}
function currentPayload(relay){const steps=readSteps(relay); return (steps.length ? parsePayload(steps[steps.length-1].output) : null) || parsePayload(relay?.seed) || {type:'text',text:relay?.seed||''};}
function pulseType(relay){return currentPayload(relay).type||'text';}
function asLabel(type){return type==='form'?'FORM PULSE':type==='color'?'COLOR PULSE':'TEXT PULSE';}
function compact(obj){return JSON.stringify(obj);}
function adjustHue(h,delta){return (h+delta+360)%360;}
function applyAction(artifact, action, step){
  const a={...artifact};
  if(a.type==='form'){
    if(action==='ROTATE') a.rotation=(Number(a.rotation||0)+24)%360;
    if(action==='RESHAPE') a.shape=FORM_SHAPES[(FORM_SHAPES.indexOf(a.shape)+1)%FORM_SHAPES.length];
    if(action==='CHARGE'){a.hue=adjustHue(Number(a.hue||220),step%2?18:-18);a.glow=Math.min(1,Number(a.glow||0.25)+0.24);}
    if(step===1)a.size=Math.max(.86,Math.min(1.2,Number(a.size||1)+.06));
    if(step===2)a.rotation=(Number(a.rotation||0)+11)%360;
    return a;
  }
  if(a.type==='color'){
    if(action==='WARM')a.hue=adjustHue(Number(a.hue||220),20);
    if(action==='COOL')a.hue=adjustHue(Number(a.hue||220),-20);
    if(action==='LOUD'){a.sat=Math.min(100,Number(a.sat||82)+8);a.light=Math.min(74,Number(a.light||58)+5);}
    if(step===1)a.hue=adjustHue(Number(a.hue||220),7);
    if(step===2)a.sat=Math.min(100,Number(a.sat||82)+4);
    return a;
  }
  return a;
}
function encodeSeed(type,seed,formShape,formColor,formSize){
  if(type==='form') return compact({v:1,type:'form',shape:formShape,hue:formColor,size:formSize,rotation:0,glow:.26});
  if(type==='color') return compact({v:1,type:'color',hue:formColor,sat:82,light:58,angle:28});
  return seed.trim();
}
function readSession(){try{return JSON.parse(localStorage.getItem(ACTIVE_KEY)||'{}')}catch{return{}}}
function writeSession(patch){try{localStorage.setItem(ACTIVE_KEY,JSON.stringify({...readSession(),...patch}))}catch{}}
function clearActive(){try{localStorage.removeItem(ACTIVE_KEY)}catch{}}
function readSessions(){try{return JSON.parse(localStorage.getItem(SESSIONS_KEY)||'{}')}catch{return{}}}
function writeSessions(next){try{localStorage.setItem(SESSIONS_KEY,JSON.stringify(next))}catch{}}
function rememberPulseList(entry){try{const old=JSON.parse(localStorage.getItem(PULSES_KEY)||'[]');const next=[entry,...old.filter(p=>p.id!==entry.id)].slice(0,24);localStorage.setItem(PULSES_KEY,JSON.stringify(next));return next}catch{return[]}}
function visualStyle(a){const hue=Number(a.hue||220), sat=Number(a.sat||88), light=Number(a.light||58); return {background:`linear-gradient(135deg,hsl(${hue} ${sat}% ${Math.min(78,light+14)}%),hsl(${adjustHue(hue,42)} ${Math.max(60,sat-8)}% ${Math.max(38,light-12)}%))`,transform:`rotate(${Number(a.rotation||0)}deg) scale(${Number(a.size||1)})`,boxShadow:`0 ${a.glow?26:20}px ${a.glow?60:42}px hsla(${hue},85%,55%,${a.glow||.18})`};}

function Artifact({relay,large=false}){
  const a=currentPayload(relay); if(a.type==='form') return <div className={`relay-artifact ${large?'large':''}`}><div className={`artifact ${a.shape||'circle'}`} style={visualStyle(a)} /></div>;
  if(a.type==='color') return <div className={`relay-artifact ${large?'large':''}`}><div className="color-pulse" style={{background:`conic-gradient(from ${Number(a.angle||28)}deg,hsl(${a.hue} ${a.sat||82}% ${a.light||58}%),hsl(${adjustHue(a.hue,48)} 92% 66%),hsl(${adjustHue(a.hue,-34)} 90% 56%),hsl(${a.hue} ${a.sat||82}% ${a.light||58}%))`}}/></div>;
  return <div className="text-artifact"><span>01</span><p>{a.text||relay?.seed}</p></div>;
}

export default function Page(){
  const [screen,setScreen]=useState('home'); const [relay,setRelay]=useState(null); const [token,setToken]=useState('');
  const [seed,setSeed]=useState(''); const [seedType,setSeedType]=useState('text'); const [formShape,setFormShape]=useState('circle'); const [formColor,setFormColor]=useState(220); const [formSize,setFormSize]=useState(1);
  const [mode,setMode]=useState(''); const [detail,setDetail]=useState(''); const [role,setRole]=useState(''); const [liveEvent,setLiveEvent]=useState(''); const [copied,setCopied]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [myPulses,setMyPulses]=useState([]);
  const steps=readSteps(relay); const currentCount=relay?.step_count??steps.length; const isComplete=relay?.status==='complete'||currentCount>=MAX_STEPS; const type=pulseType(relay); const source=currentPayload(relay);
  const actions=type==='form'?FORM_ACTIONS:type==='color'?COLOR_ACTIONS:TEXT_ACTIONS;
  const instruction=useMemo(()=>{if(!relay)return'';if(type==='text'){if(currentCount===0)return'Choose one instinct. No essays. One move.';if(currentCount===1)return'Add one tiny detail that changes the direction.';return'Name what this has become. One short title.'}if(type==='form')return currentCount===0?'Give the form its first mutation.':currentCount===1?'Make the object drift further.':'Give the final form one last twist.';return currentCount===0?'Change the temperature of the color.':currentCount===1?'Push the color somewhere new.':'Make the final color unmistakable.'},[relay,currentCount,type]);

  useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem(PULSES_KEY)||'[]');if(Array.isArray(raw))setMyPulses(raw)}catch{} const saved=readSession(); if(!saved.relayId)return; let cancelled=false; (async()=>{const {data}=await supabase.from('relays').select('*').eq('id',saved.relayId).single();if(cancelled||!data){clearActive();return;}setRelay(data);setRole(saved.role||'creator');setToken(saved.token||'');setScreen(data.status==='complete'?'result':saved.role==='stranger'&&saved.token?'turn':'waiting')})(); return()=>{cancelled=true}},[]);
  useEffect(()=>{setMyPulses(prev=>{try{localStorage.setItem(PULSES_KEY,JSON.stringify(prev))}catch{}return prev})},[myPulses]);
  useEffect(()=>{if(!relay?.id)return;let alive=true;const refresh=async()=>{const {data}=await supabase.from('relays').select('*').eq('id',relay.id).single();if(!alive||!data)return;setRelay(data);setMyPulses(prev=>prev.map(p=>p.id===data.id?{...p,status:data.status,updatedAt:Date.now(),seed:data.seed}:p));if(data.status==='complete')setScreen('result')};refresh();const ch=supabase.channel(`relay:${relay.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'relays',filter:`id=eq.${relay.id}`},payload=>{const next=payload.new;if(!alive)return;setRelay(next);setMyPulses(prev=>prev.map(p=>p.id===next.id?{...p,status:next.status,updatedAt:Date.now(),seed:next.seed}:p));setLiveEvent(next.step_count>currentCount?'A STRANGER JUST MOVED THE PULSE':next.status==='active'?'STRANGER JOINED':'PULSE UPDATED');if(next.status==='complete')setScreen('result');window.setTimeout(()=>setLiveEvent(''),2200)}).subscribe();return()=>{alive=false;supabase.removeChannel(ch)}},[relay?.id]);

  const remember=(r,rrole,rtoken='')=>{if(!r?.id)return;const entry={id:r.id,role:rrole,seed:r.seed,status:r.status,updatedAt:Date.now()};setMyPulses(prev=>{const next=[entry,...prev.filter(p=>p.id!==r.id)].slice(0,24);rememberPulseList(entry);return next});const sessions=readSessions();sessions[r.id]={role:rrole,token:rtoken};writeSessions(sessions);writeSession({relayId:r.id,role:rrole,token:rtoken});}
  const createRelay=async()=>{setError('');if(seedType==='text'&&seed.trim().length<4)return setError('Give the Pulse something to start with.');setBusy(true);const payload=encodeSeed(seedType,seed,formShape,formColor,formSize);const {data, error:e}=await supabase.rpc('create_relay',{p_seed:payload});setBusy(false);if(e)return setError(e.message);setRelay(data);setRole('creator');setToken('');remember(data,'creator');setSeed('');setLiveEvent('PULSE CREATED');setScreen('waiting');}
  const joinPulse=async()=>{setError('');setBusy(true);const {data,error:e}=await supabase.rpc('claim_relay');setBusy(false);if(e)return setError(e.message);if(!data)return setError('No Pulse is waiting right now. Start one and leave it in the pool.');setRelay(data.relay);setToken(data.token);setRole('stranger');remember(data.relay,'stranger',data.token);setMode('');setDetail('');setLiveEvent('STRANGER JOINED');setScreen('turn');}
  const submitStep=async()=>{setError('');if(!relay||!token)return;let output='';
    if(type==='text'){if(currentCount===0&&!mode)return setError('Choose one instinct.');if(currentCount===1&&detail.trim().length<2)return setError('Add one small detail.');if(currentCount===2&&detail.trim().length<2)return setError('Give it a short title.');if(currentCount===0)output=`${source.text||relay.seed} → ${{STRANGER:'stranger',SOFTER:'softer',BIGGER:'bigger'}[mode]||'different'}.`;if(currentCount===1)output=`${source.text||source} → detail: ${detail.trim()}`;if(currentCount===2)output=`${detail.trim()} — born from ${source.text||source}`;}
    else {if(!mode)return setError('Choose one mutation.');const next=applyAction(source,mode,currentCount);output=compact(next);}
    setBusy(true);const {data,error:e}=await supabase.rpc('submit_relay_step',{p_relay_id:relay.id,p_token:token,p_output:output.slice(0,3900)});setBusy(false);if(e)return setError(e.message);setRelay(data);setToken('');setMode('');setDetail('');const sessions=readSessions();sessions[relay.id]={role,token:''};writeSessions(sessions);writeSession({relayId:relay.id,role,token:''});setScreen(data.status==='complete'?'result':'waiting');
  }
  const resumePulse=async(entry)=>{setBusy(true);const {data,error:e}=await supabase.from('relays').select('*').eq('id',entry.id).single();setBusy(false);if(e||!data)return setError('That Pulse is no longer available.');const sessions=readSessions();const saved=sessions[entry.id]||{};setRelay(data);setRole(entry.role);setToken(saved.token||'');setScreen(data.status==='complete'?'result':entry.role==='stranger'&&saved.token?'turn':'waiting');writeSession({relayId:entry.id,role:entry.role,token:saved.token||''});}
  const goHome=()=>setScreen('home'); const newPulse=()=>{clearActive();setRelay(null);setToken('');setRole('');setScreen('home');setLiveEvent('')};
  const copyId=async()=>{if(!relay?.id)return;await navigator.clipboard.writeText(relay.id);setCopied(true);setTimeout(()=>setCopied(false),1100)};

  return <main className="pulse-app"><div className="ambient ambient-a"/><div className="ambient ambient-b"/><div className="ambient ambient-c"/>
    <header className="pulse-nav"><button className="brand" onClick={goHome}>PULSE<span className="brand-dot">·</span></button><div className="nav-center"><span>HUMAN RELAY / 03</span><span className="live-dot"><Radio size={13}/> LIVE</span></div><div className="nav-actions"><button className="nav-reset" onClick={()=>setScreen('mine')}><Clock3 size={15}/> MY PULSES</button><button className="nav-reset" onClick={newPulse}><RotateCcw size={15}/> NEW</button></div></header>
    {liveEvent&&<div className="live-toast"><span className="toast-dot"/>{liveEvent}</div>}

    {screen==='home'&&<section className="screen home-screen"><div className="grid-label">01 — START</div><div className="home-grid"><div className="hero-lockup"><p className="kicker">A HUMAN RELAY</p><h1>Start<br/><em>something.</em></h1><p className="hero-sub">A small thing moves through strangers. Each person changes it once. The result belongs to everyone.</p><div className="hero-signal"><span className="signal-line"/><span>LIVE HUMAN SYSTEM</span><Waves size={14}/></div></div><div className="launch-panel glass-panel"><div className="panel-index">01 / CREATE</div><label>CHOOSE A MEDIUM</label><div className="mode-switch"><button className={seedType==='text'?'active':''} onClick={()=>setSeedType('text')}><Type size={14}/> TEXT</button><button className={seedType==='form'?'active':''} onClick={()=>setSeedType('form')}><Shapes size={14}/> FORM</button><button className={seedType==='color'?'active':''} onClick={()=>setSeedType('color')}><Palette size={14}/> COLOR</button></div>{seedType==='text'&&<textarea value={seed} onChange={e=>setSeed(e.target.value)} placeholder="Start with an idea…" maxLength={180}/>} {seedType==='form'&&<div className="visual-studio"><div className="visual-stage"><div className={`artifact ${formShape}`} style={visualStyle({type:'form',shape:formShape,hue:formColor,size:formSize,rotation:0,glow:.26})}/></div><div className="shape-grid">{FORM_SHAPES.map(s=><button key={s} className={formShape===s?'active':''} onClick={()=>setFormShape(s)} aria-label={s}>{s==='circle'?'●':s==='square'?'■':s==='triangle'?'▲':'✦'}</button>)}</div><div className="color-grid">{FORM_COLORS.map(c=><button key={c.name} className={formColor===c.h?'active':''} style={{background:c.value}} onClick={()=>setFormColor(c.h)} aria-label={c.name}/>)}</div><div className="control-row"><label>SIZE</label><input type="range" min=".88" max="1.16" step=".01" value={formSize} onChange={e=>setFormSize(Number(e.target.value))}/></div></div>}{seedType==='color'&&<div className="visual-studio"><div className="visual-stage"><div className="color-pulse" style={{background:`conic-gradient(from 28deg,hsl(${formColor} 82% 58%),hsl(${adjustHue(formColor,48)} 92% 66%),hsl(${adjustHue(formColor,-34)} 90% 56%),hsl(${formColor} 82% 58%))`}}/></div><div className="color-grid">{FORM_COLORS.map(c=><button key={c.name} className={formColor===c.h?'active':''} style={{background:c.value}} onClick={()=>setFormColor(c.h)} aria-label={c.name}/>)}</div></div>}<button className="black-button" onClick={createRelay} disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<Sparkles size={17}/>} START A PULSE <ArrowRight size={17}/></button><div className="starter-list">{seedType==='text'&&STARTERS.map(item=><button key={item} onClick={()=>setSeed(item)}>{item}</button>)}</div><div className="split-line"><span>OR</span></div><button className="outline-button" onClick={joinPulse} disabled={busy}><Users size={17}/> JOIN A STRANGER'S PULSE <ArrowRight size={17}/></button></div></div>{error&&<div className="error-bar">{error}</div>}<div className="home-foot"><span>TEXT</span><span>FORM</span><span>COLOR</span><span>JUST THE RELAY</span></div></section>}

    {screen==='mine'&&<section className="screen waiting-screen"><div className="grid-label">01 — YOUR PULSES</div><div className="mine-wrap glass-panel"><div className="result-top"><div><p className="kicker">LOCAL MEMORY</p><h2>Your<br/><em>pulses.</em></h2></div><div className="result-stamp"><span>{String(myPulses.length).padStart(2,'0')}</span><small>SAVED</small></div></div>{myPulses.length===0?<div className="empty-state"><p>No saved Pulses yet.</p><button className="black-button" onClick={goHome}><Sparkles size={17}/> START YOUR FIRST PULSE <ArrowRight size={17}/></button></div>:<div className="pulse-list">{myPulses.map(p=><button className="pulse-list-item" key={p.id} onClick={()=>resumePulse(p)}><span className={`status-mark ${p.status==='complete'?'complete':''}`}/><span className="pulse-list-copy"><small>{p.role==='creator'?'YOU STARTED':'YOU JOINED'} · {p.status?.toUpperCase()} · {asLabel(parsePayload(p.seed)?.type||'text')}</small><strong>{parsePayload(p.seed)?.type?asLabel(parsePayload(p.seed).type):p.seed}</strong></span><span className="pulse-list-id">{String(p.id).slice(0,8).toUpperCase()} <ArrowRight size={16}/></span></button>)}</div>}{error&&<div className="error-bar">{error}</div>}</div></section>}

    {screen==='waiting'&&relay&&!isComplete&&<section className="screen waiting-screen"><div className="grid-label">02 — THE PULSE IS MOVING</div><div className="waiting-grid"><div><p className="kicker"><span className="pulse-ring"/>{currentCount===0?'WAITING FOR A STRANGER':'A STRANGER JUST MOVED IT'}</p><h2>{role==='creator'?<>Someone else<br/><em>has your spark.</em></>:<>You just moved<br/><em>someone's spark.</em></>}</h2><p className="waiting-copy">{currentCount===0?'This Pulse stays discoverable even when you leave.':'Your move is now part of the relay. The next stranger can continue it.'}</p><Artifact relay/><div className="live-relay glass-panel"><div className="live-relay-head"><span>LIVE TRACE</span><span>{currentCount} / 3 MOVES</span></div><div className="relay-stream"><div className="stream-item seed-item"><span className="stream-dot"/><div><small>STARTER · {asLabel(parsePayload(relay.seed)?.type||'text')}</small><p>{parsePayload(relay.seed)?.type?'A visual seed entered the relay.':relay.seed}</p></div></div>{steps.map((step,index)=><div className="stream-item reveal-item" key={`${index}-${step.at}`}><span className="stream-dot"/><div><small>STRANGER {index+1}</small><p>{parsePayload(step.output)?asLabel(parsePayload(step.output).type)+' · mutation':step.output}</p></div></div>)}{currentCount<3&&<div className="stream-item ghost-item"><span className="stream-dot waiting-dot"/><div><small>NEXT STRANGER</small><p>Waiting for a human to continue this.</p></div></div>}</div></div><div className="relay-id-box"><span>PULSE ID</span><strong>{String(relay.id).slice(0,8).toUpperCase()}</strong><button onClick={copyId}>{copied?<Check size={15}/>:<Copy size={15}/>}</button></div></div><div className="waiting-orbit"><div className="orbit-sweep"/><div className="orbit-core"><span>{String(currentCount).padStart(2,'0')}</span><small>/ 03</small></div>{[0,1,2].map(i=><span key={i} className={`orbit-node node-${i} ${i<currentCount?'done':''}`}/>)}</div></div></section>}

    {screen==='turn'&&relay&&!isComplete&&<section className="screen turn-screen"><div className="grid-label">{String(currentCount+2).padStart(2,'0')} — YOUR TURN</div><div className="turn-layout"><aside className="source-column"><span className="kicker">THE RELAY SO FAR</span><div className="source-number">{String(currentCount+1).padStart(2,'0')}</div><Artifact relay/><div className="history-mini">{steps.map((s,i)=><div key={`${i}-${s.at}`}><small>STRANGER {i+1}</small><p>{parsePayload(s.output)?'A visual mutation':' '+s.output}</p></div>)}</div><div className="mini-status"><span>{currentCount}/03 MOVES</span><span>{asLabel(type)}</span></div></aside><div className="action-column"><span className="kicker">A TINY TASK</span><h2>{instruction}</h2><div className="choice-grid">{actions.map(item=><button key={item.code} className={`choice-card ${mode===item.code?'selected':''}`} onClick={()=>setMode(item.code)}><strong>{item.title}</strong><span>{item.copy}</span><i>{mode===item.code?'✓':'↗'}</i></button>)}</div>{type==='text'&&currentCount>0&&<div className="short-input"><input value={detail} onChange={e=>setDetail(e.target.value)} maxLength={currentCount===1?60:48} placeholder={currentCount===1?'Add one tiny detail…':'Give the final form a name…'} autoFocus/><span>{detail.length}/{currentCount===1?60:48}</span></div>}<button className="black-button large" onClick={submitStep} disabled={busy}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>} PASS IT ON</button>{error&&<div className="inline-error">{error}</div>}</div></div></section>}

    {screen==='result'&&relay&&<section className="screen result-screen"><div className="grid-label">04 — RESULT</div><div className="result-top"><div><p className="kicker">THE RELAY RETURNED</p><h2>Look what<br/><em>happened.</em></h2></div><div className="result-stamp"><span>03</span><small>HUMANS</small></div></div><Artifact relay large/><div className="timeline-final"><div className="final-seed"><span>00 · START · {asLabel(parsePayload(relay.seed)?.type||'text')}</span><p>{parsePayload(relay.seed)?'A visual idea entered the relay.':relay.seed}</p></div>{steps.map((step,index)=><div className="final-step" key={`${index}-${step.at}`}><span>{String(index+1).padStart(2,'0')} · STRANGER</span><p>{parsePayload(step.output)?'A visual mutation.':step.output}</p></div>)}</div><div className="result-actions"><button className="black-button" onClick={newPulse}><Sparkles size={17}/> START ANOTHER <ArrowRight size={17}/></button><button className="outline-button" onClick={copyId}>{copied?<Check size={17}/>:<Copy size={17}/>} COPY PULSE ID</button></div></section>}
    <footer className="pulse-footer"><span>01 / START</span><span>HUMAN RELAY</span><span>0.5</span></footer>
  </main>;
}
