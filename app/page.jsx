'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight, Circle, Copy, History, LoaderCircle, Minus, Palette, Plus, Radio, RotateCcw, Send, Shapes, Sparkles, Type, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const MAX_STEPS = 3;
const PULSES_KEY = 'pulse:v7:pulses';
const SESSIONS_KEY = 'pulse:v7:sessions';
const SHAPES = ['circle', 'square', 'triangle', 'organic'];
const ACTIONS = {
  text: [['STRANGER', 'Make it stranger'], ['SOFTER', 'Make it softer'], ['BIGGER', 'Make it bigger']],
  form: [['ROTATE', 'Rotate it'], ['RESHAPE', 'Reshape it'], ['CHARGE', 'Charge it']],
  color: [['WARM', 'Shift warmer'], ['COOL', 'Shift cooler'], ['LOUD', 'Amplify it']],
};
const STARTERS = ['A door that opens somewhere impossible.', 'A signal from a city nobody can find.', 'A tiny object that should not exist.'];

const fast = { type: 'spring', stiffness: 420, damping: 30, mass: 0.62 };
const expressive = { type: 'spring', stiffness: 180, damping: 22, mass: 0.9 };

function readJSON(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function sessions() { if (typeof window === 'undefined') return {}; return readJSON(localStorage.getItem(SESSIONS_KEY) || '{}', {}); }
function history() { if (typeof window === 'undefined') return []; return readJSON(localStorage.getItem(PULSES_KEY) || '[]', []); }
function payloadOf(relay) {
  const steps = Array.isArray(relay?.steps) ? relay.steps : [];
  for (let i = steps.length - 1; i >= 0; i -= 1) { const p = readJSON(steps[i]?.output, null); if (p?.type) return p; }
  const seed = readJSON(relay?.seed, null);
  return seed?.type ? seed : { type: 'text', text: relay?.seed || '' };
}
function saveSession(id, data) { const map = sessions(); map[id] = data; localStorage.setItem(SESSIONS_KEY, JSON.stringify(map)); }
function savePulse(entry) { const next = [entry, ...history().filter((x) => x.id !== entry.id)].slice(0, 24); localStorage.setItem(PULSES_KEY, JSON.stringify(next)); return next; }
function hue(h, d) { return (Number(h || 0) + d + 360) % 360; }
function mutate(a, action, step) {
  const next = { ...a };
  if (a.type === 'form') {
    if (action === 'ROTATE') next.rotation = (Number(a.rotation || 0) + 32) % 360;
    if (action === 'RESHAPE') next.shape = SHAPES[(SHAPES.indexOf(a.shape) + 1) % SHAPES.length];
    if (action === 'CHARGE') { next.hue = hue(a.hue, step % 2 ? 26 : -26); next.glow = Math.min(1, Number(a.glow || .2) + .18); }
    next.size = Math.min(1.2, Number(a.size || 1) + .04);
  }
  if (a.type === 'color') {
    if (action === 'WARM') next.hue = hue(a.hue, 22);
    if (action === 'COOL') next.hue = hue(a.hue, -22);
    if (action === 'LOUD') { next.sat = Math.min(100, Number(a.sat || 84) + 10); next.light = Math.min(72, Number(a.light || 58) + 5); }
  }
  return next;
}
function seedPayload(kind, text, shape, colorHue) {
  if (kind === 'form') return JSON.stringify({ v: 3, type: 'form', shape, hue: colorHue, size: 1, rotation: 0, glow: .2 });
  if (kind === 'color') return JSON.stringify({ v: 3, type: 'color', hue: colorHue, sat: 84, light: 58 });
  return text.trim();
}

function Artifact({ payload, size = 'hero', interactive = false }) {
  const large = size === 'hero';
  if (payload.type === 'text') return <motion.div layout transition={expressive} className={`${large ? 'max-w-2xl px-8 py-7 text-3xl' : 'max-w-xl px-6 py-5 text-lg'} rounded-[28px] border border-white/10 bg-white/[0.045] text-white shadow-[0_24px_80px_rgba(0,0,0,.22)]`} animate={interactive ? { y: [0, -3, 0] } : undefined} transition={interactive ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : expressive}><p className="break-words leading-[1.12] tracking-[-0.035em]">{payload.text}</p></motion.div>;
  const hueValue = Number(payload.hue || 190);
  const shapeClass = payload.shape === 'circle' ? 'rounded-full' : payload.shape === 'square' ? 'rounded-[28%]' : payload.shape === 'organic' ? 'rounded-[54%_46%_62%_38%]' : '';
  const dimensions = large ? 'h-64 w-64 sm:h-72 sm:w-72' : 'h-32 w-32';
  return <motion.div layout transition={expressive} className="relative flex items-center justify-center" style={{ perspective: 800 }}>
    <motion.div layout className={`${dimensions} ${shapeClass} relative`} style={{ background: `hsl(${hueValue} 90% 62%)`, clipPath: payload.shape === 'triangle' ? 'polygon(50% 0%,100% 100%,0% 100%)' : undefined, boxShadow: `0 0 ${large ? 72 : 38}px hsla(${hueValue},90%,62%,${Number(payload.glow || .18)})` }} animate={interactive ? { y: [0, -7, 0], rotate: [Number(payload.rotation || 0) - 2, Number(payload.rotation || 0) + 3, Number(payload.rotation || 0) - 2], scale: [1, 1.018, 1] } : { rotate: Number(payload.rotation || 0), scale: Number(payload.size || 1) }} transition={interactive ? { duration: 5.4, repeat: Infinity, ease: 'easeInOut' } : expressive} />
    {large && <motion.div className="pointer-events-none absolute inset-[-34px] rounded-full border border-white/[0.07]" animate={{ scale: [0.96, 1.03, 0.96], opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }} />}
  </motion.div>;
}

function IconButton({ label, children, onClick, active = false }) {
  return <motion.button type="button" aria-label={label} onClick={onClick} whileHover={{ y: -1 }} whileTap={{ scale: .94 }} transition={fast} className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF3F] ${active ? 'border-[#D7FF3F]/45 bg-[#D7FF3F]/10 text-[#D7FF3F]' : 'border-white/10 bg-white/[0.035] text-white/65 hover:border-white/20 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.1]'}`}>{children}</motion.button>;
}
function ActionButton({ children, onClick, disabled = false, primary = false }) {
  return <motion.button type="button" disabled={disabled} onClick={onClick} whileHover={disabled ? undefined : { y: -2 }} whileTap={disabled ? undefined : { scale: .965 }} transition={fast} className={`group inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border px-5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF3F] disabled:cursor-not-allowed disabled:opacity-40 ${primary ? 'border-[#D7FF3F]/40 bg-[#D7FF3F] text-[#090A0F] hover:bg-[#e1ff63] active:bg-[#c9f03b]' : 'border-white/10 bg-white/[0.045] text-white hover:border-white/20 hover:bg-white/[0.07] active:bg-white/[0.1]'}`}>{children}</motion.button>;
}

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [kind, setKind] = useState('form');
  const [seed, setSeed] = useState('');
  const [shape, setShape] = useState('circle');
  const [colorHue, setColorHue] = useState(190);
  const [mode, setMode] = useState('');
  const [myPulses, setMyPulses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const steps = Array.isArray(relay?.steps) ? relay.steps : [];
  const count = relay?.step_count ?? steps.length;
  const complete = relay?.status === 'complete' || count >= MAX_STEPS;
  const artifact = payloadOf(relay);
  const creationPreview = useMemo(() => kind === 'text' ? { type: 'text', text: seed || STARTERS[0] } : kind === 'color' ? { type: 'color', hue: colorHue, sat: 84, light: 58 } : { type: 'form', shape, hue: colorHue, size: 1, rotation: 0, glow: .2 }, [kind, seed, shape, colorHue]);

  useEffect(() => { setMyPulses(history()); const latest = Object.keys(sessions()).at(-1); if (!latest) return; let alive = true; (async () => { const { data } = await supabase.from('relays').select('*').eq('id', latest).maybeSingle(); if (!alive || !data) return; const s = sessions()[latest] || {}; setRelay(data); setRole(s.role || 'creator'); setToken(s.token || ''); setScreen(data.status === 'complete' ? 'result' : s.token ? 'turn' : 'waiting'); })(); return () => { alive = false; }; }, []);

  useEffect(() => {
    if (!relay?.id) return;
    const channel = supabase.channel(`pulse-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, (payload) => { setRelay(payload.new); if (payload.new.status === 'complete') setScreen('result'); else if (payload.new.step_count > count) setScreen('waiting'); setNotice(payload.new.status === 'active' ? 'STRANGER JOINED' : payload.new.status === 'complete' ? 'PULSE COMPLETE' : 'PULSE MOVED'); window.setTimeout(() => setNotice(''), 1700); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id, count]);

  const createPulse = async () => {
    setBusy(true); setError('');
    if (kind === 'text' && seed.trim().length < 4) { setBusy(false); setError('Give the Pulse a starting idea.'); return; }
    const { data, error: dbError } = await supabase.rpc('create_relay', { p_seed: seedPayload(kind, seed, shape, colorHue) });
    setBusy(false); if (dbError) { setError(dbError.message); return; }
    setRelay(data); setRole('creator'); setToken(''); saveSession(data.id, { role: 'creator', token: '' }); setMyPulses(savePulse({ id: data.id, role: 'creator', seed: data.seed, status: data.status, updatedAt: Date.now() })); setNotice('PULSE CREATED'); setScreen('waiting');
  };
  const joinPulse = async () => {
    setBusy(true); setError(''); const { data, error: dbError } = await supabase.rpc('claim_relay'); setBusy(false);
    if (dbError) { setError(dbError.message); return; } if (!data) { setError('No Pulse is waiting right now.'); return; }
    setRelay(data.relay); setRole('stranger'); setToken(data.token); saveSession(data.relay.id, { role: 'stranger', token: data.token }); setMyPulses(savePulse({ id: data.relay.id, role: 'stranger', seed: data.relay.seed, status: data.relay.status, updatedAt: Date.now() })); setNotice('STRANGER JOINED'); setScreen('turn');
  };
  const submitMove = async () => {
    if (!relay || !token || !mode) return; setBusy(true); setError('');
    let output = artifact.type === 'text' ? JSON.stringify({ type: 'text', text: `${artifact.text} → ${mode.toLowerCase()}.` }) : JSON.stringify(mutate(artifact, mode, count));
    const { data, error: dbError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output }); setBusy(false);
    if (dbError) { setError(dbError.message); return; }
    setRelay(data); saveSession(relay.id, { role, token: '' }); setToken(''); setMode(''); setMyPulses(savePulse({ id: data.id, role, seed: data.seed, status: data.status, updatedAt: Date.now() })); setNotice(data.status === 'complete' ? 'PULSE COMPLETE' : 'MOVE PASSED'); setScreen(data.status === 'complete' ? 'result' : 'waiting');
  };
  const resume = async (entry) => { setBusy(true); setError(''); const { data } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle(); setBusy(false); if (!data) { setError('That Pulse is no longer available.'); return; } const s = sessions()[entry.id] || {}; setRelay(data); setRole(entry.role); setToken(s.token || ''); setScreen(data.status === 'complete' ? 'result' : s.token ? 'turn' : 'waiting'); };
  const copyId = async () => { if (!relay?.id) return; await navigator.clipboard.writeText(relay.id); setCopied(true); window.setTimeout(() => setCopied(false), 1000); };

  const nav = <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7"><button type="button" onClick={() => setScreen('home')} className="group flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF3F]"><span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.035] transition group-hover:border-white/20"><Radio size={16} strokeWidth={1.8}/></span><span className="text-sm font-bold tracking-[0.18em]">PULSE</span></button><div className="flex items-center gap-2"><span className="hidden text-xs font-medium text-white/45 sm:block">LIVE RELAY</span><span className="h-2 w-2 rounded-full bg-[#D7FF3F] shadow-[0_0_12px_rgba(215,255,63,.35)]"/></div></header>;

  return <main className="relative h-dvh overflow-hidden bg-[#090A0F] text-white">
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
    {nav}
    <AnimatePresence mode="wait">
      {screen === 'home' && <motion.section key="home" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-14}} transition={expressive} className="relative z-10 flex h-dvh items-center justify-center px-5 pt-20">
        <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="order-2 lg:order-1"><p className="mb-5 text-xs font-semibold tracking-[.24em] text-[#D7FF3F]">HUMAN RELAY / 001</p><h1 className="max-w-xl text-5xl font-black leading-[.9] tracking-[-.065em] sm:text-7xl">Pass something on.</h1><p className="mt-7 max-w-md text-base leading-7 text-white/55">Start a Pulse. A stranger changes it. You never know what it becomes.</p><div className="mt-9 flex flex-wrap gap-3"><ActionButton primary onClick={() => setScreen('create')}><Plus size={17}/> Start a Pulse</ActionButton><ActionButton onClick={joinPulse} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={17}/> : <ArrowUpRight size={17}/>} Find a stranger</ActionButton></div><div className="mt-7 flex gap-6 text-xs text-white/35"><span>01 / 03 steps</span><span>NO FOLLOWERS</span><span>NO FEED</span></div></div>
          <div className="order-1 flex min-h-[360px] items-center justify-center lg:order-2"><Artifact payload={creationPreview} interactive size="hero"/></div>
        </div>
      </motion.section>}

      {screen === 'create' && <motion.section key="create" initial={{opacity:0,scale:.985}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={expressive} className="relative z-10 flex h-dvh items-center justify-center px-5 pt-20"><div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr_.95fr]"><div><p className="text-xs font-semibold tracking-[.24em] text-[#D7FF3F]">CREATE / YOUR FIRST MOVE</p><h2 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-6xl">Give it a pulse.</h2><div className="mt-8 flex gap-2"><ActionButton onClick={() => setKind('form')} primary={kind==='form'}><Shapes size={16}/> Form</ActionButton><ActionButton onClick={() => setKind('color')} primary={kind==='color'}><Palette size={16}/> Color</ActionButton><ActionButton onClick={() => setKind('text')} primary={kind==='text'}><Type size={16}/> Text</ActionButton></div>{kind==='text' ? <div className="mt-6"><textarea value={seed} onChange={(e)=>setSeed(e.target.value)} placeholder={STARTERS[0]} className="h-36 w-full resize-none rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-lg text-white outline-none transition placeholder:text-white/20 focus:border-[#D7FF3F]/45 focus:bg-white/[0.06]"/><div className="mt-3 flex gap-2">{STARTERS.map((x)=><button key={x} type="button" onClick={()=>setSeed(x)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/45 transition hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF3F]">Use idea</button>)}</div></div> : <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{kind==='form'?'Shape':'Hue'}</span><span className="font-mono text-xs text-white/40">{kind==='form'?shape.toUpperCase():`${colorHue}°`}</span></div>{kind==='form' ? <div className="mt-5 grid grid-cols-4 gap-2">{SHAPES.map(s=><button key={s} type="button" onClick={()=>setShape(s)} className={`h-16 rounded-2xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF3F] ${shape===s?'border-[#D7FF3F]/45 bg-[#D7FF3F]/10':'border-white/10 bg-white/[0.025] hover:border-white/20'}`}><span className={`mx-auto block h-7 w-7 ${s==='circle'?'rounded-full':s==='square'?'rounded-lg':s==='organic'?'rounded-[55%_45%_60%_40%]':''}`} style={{background:s==='triangle'?'white':'#F4F1EA',clipPath:s==='triangle'?'polygon(50% 0%,100% 100%,0% 100%)':undefined}}/></button>)}</div> : <input aria-label="Hue" type="range" min="0" max="359" value={colorHue} onChange={(e)=>setColorHue(Number(e.target.value))} className="mt-6 w-full accent-[#D7FF3F]"/>}</div>}<div className="mt-6 flex items-center gap-3"><ActionButton primary onClick={createPulse} disabled={busy}>{busy?<LoaderCircle className="animate-spin" size={17}/>:<Send size={17}/>} Create Pulse</ActionButton><ActionButton onClick={()=>setScreen('home')}>Cancel</ActionButton></div>{error&&<p className="mt-4 text-sm text-red-300">{error}</p>}</div><div className="flex items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.025] p-10"><Artifact payload={creationPreview} interactive size="hero"/></div></div></motion.section>}

      {(screen === 'waiting' || screen === 'turn') && <motion.section key="relay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={expressive} className="relative z-10 flex h-dvh items-center justify-center px-5 pt-20"><div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]"><div className="flex min-h-[360px] items-center justify-center"><Artifact payload={artifact} interactive size="hero"/></div><div><div className="flex items-center gap-3"><span className="font-mono text-xs text-white/35">RELAY {String(count).padStart(2,'0')} / {MAX_STEPS}</span><span className="h-px flex-1 bg-white/10"/></div><AnimatePresence mode="wait"><motion.div key={screen} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={fast}>{screen==='waiting' ? <><p className="mt-7 text-xs font-semibold tracking-[.22em] text-[#D7FF3F]">{complete?'COMPLETE':'WAITING FOR A STRANGER'}</p><h2 className="mt-4 text-4xl font-black tracking-[-.055em]">{complete?'Look what happened.':'It is out there.'}</h2><p className="mt-5 max-w-md leading-7 text-white/50">{complete?'Your Pulse survived three strangers.':'The next person will receive this exact state and change one thing.'}</p><div className="mt-8 flex gap-3"><ActionButton onClick={copyId}>{copied?<><Sparkles size={16}/>Copied</>:<><Copy size={16}/>Copy Pulse ID</>}</ActionButton><ActionButton onClick={()=>setScreen('home')}>Back home</ActionButton></div></> : <><p className="mt-7 text-xs font-semibold tracking-[.22em] text-[#D7FF3F]">A STRANGER LEFT THIS FOR YOU</p><h2 className="mt-4 text-4xl font-black tracking-[-.055em]">Change one thing.</h2><p className="mt-5 leading-7 text-white/50">No correct answer. Your move becomes the next person&apos;s starting point.</p><div className="mt-7 grid gap-2 sm:grid-cols-3">{ACTIONS[artifact.type].map(([value,label])=><button key={value} type="button" onClick={()=>setMode(value)} className={`rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF3F] ${mode===value?'border-[#D7FF3F]/45 bg-[#D7FF3F]/10':'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]'}`}><span className="font-mono text-xs text-white/35">{value}</span><span className="mt-2 block text-sm font-semibold">{label}</span></button>)}</div><div className="mt-5"><ActionButton primary disabled={!mode||busy} onClick={submitMove}>{busy?<LoaderCircle className="animate-spin" size={17}/>:<ChevronRight size={17}/>} Pass it on</ActionButton></div></>}</motion.div></AnimatePresence></div></div></motion.section>}

      {screen === 'result' && <motion.section key="result" initial={{opacity:0,scale:.98}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={expressive} className="relative z-10 flex h-dvh items-center justify-center px-5 pt-20"><div className="w-full max-w-4xl text-center"><p className="text-xs font-semibold tracking-[.24em] text-[#D7FF3F]">PULSE COMPLETE / {count} MOVES</p><div className="mt-10 flex justify-center"><Artifact payload={artifact} interactive size="hero"/></div><h2 className="mt-10 text-5xl font-black tracking-[-.065em]">Look what happened.</h2><p className="mx-auto mt-5 max-w-lg leading-7 text-white/50">Three strangers touched the same thing. None of them knew where it started.</p><div className="mt-8 flex justify-center gap-3"><ActionButton primary onClick={()=>{setRelay(null);setScreen('create')}}><RotateCcw size={16}/> Start another</ActionButton><ActionButton onClick={()=>setScreen('home')}>Home</ActionButton></div></div></motion.section>}

      {screen === 'history' && <motion.section key="history" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={expressive} className="relative z-10 flex h-dvh items-center justify-center px-5 pt-20"><div className="w-full max-w-5xl"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold tracking-[.24em] text-[#D7FF3F]">YOUR PULSES</p><h2 className="mt-3 text-5xl font-black tracking-[-.06em]">The things you sent out.</h2></div><IconButton label="Close history" onClick={()=>setScreen('home')}><X size={18}/></IconButton></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{myPulses.length?myPulses.slice(0,6).map((p)=><button key={p.id} type="button" onClick={()=>resume(p)} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7FF3F]"><div className="flex items-center justify-between"><span className="font-mono text-xs text-white/35">{p.role?.toUpperCase()||'PULSE'}</span><ArrowUpRight size={15} className="text-white/25 transition group-hover:text-white"/></div><p className="mt-8 line-clamp-2 text-lg font-semibold tracking-[-.02em]">{readJSON(p.seed,null)?.type?`Visual ${readJSON(p.seed,null).type}`:p.seed}</p><p className="mt-8 font-mono text-xs text-white/30">{p.status?.toUpperCase()||'UNKNOWN'}</p></button>):<div className="col-span-full rounded-3xl border border-dashed border-white/10 p-12 text-center text-white/35">No Pulses yet. Start the first one.</div>}</div></div></motion.section>}
    </AnimatePresence>

    <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 sm:bottom-7 sm:left-8"><IconButton label="Open pulse history" active={screen==='history'} onClick={()=>{setMyPulses(history());setScreen('history')}}><History size={17}/></IconButton></div>
    <AnimatePresence>{notice&&<motion.div initial={{opacity:0,y:10,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8}} transition={fast} className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#D7FF3F]/25 bg-[#12141C]/90 px-5 py-3 text-xs font-bold tracking-[.16em] text-[#D7FF3F] shadow-[0_0_24px_rgba(215,255,63,.12)] backdrop-blur-md">{notice}</motion.div>}</AnimatePresence>
  </main>;
}
