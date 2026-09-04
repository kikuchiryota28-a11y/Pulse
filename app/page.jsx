'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, Check, Clock3, Compass, History, ImagePlus, Plus, RotateCcw, Share2, Sparkles, Target, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ACTIONS, MAX_STEPS, START_TASK, generateNextTask, latestPayload, parsePayload, serializeStep, starterPayload } from '../lib/pulse-v2';

const HISTORY_KEY = 'pulse:v5:history';
const SESSION_KEY = 'pulse:v5:sessions';
const DEVICE_KEY = 'pulse:v5:device';

const readJSON = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
};
const stepsOf = r => Array.isArray(r?.steps) ? r.steps : [];
const payloadsOf = r => stepsOf(r).map(s => parsePayload(s?.output)).filter(Boolean);
const imageOf = p => p?.artifact?.dataUrl || p?.result?.dataUrl || p?.state?.artifact?.dataUrl || null;
const textOf = p => p?.artifact?.text || p?.result?.text || p?.result?.summary || p?.result?.note || p?.result?.evidence || p?.state?.summary || '';
const deviceId = () => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
  return id;
};
const saveHistory = entry => {
  const next = [entry, ...readJSON(HISTORY_KEY, []).filter(x => x.id !== entry.id)].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
};
const saveSession = (id, value) => {
  const next = readJSON(SESSION_KEY, {}); next[id] = value; localStorage.setItem(SESSION_KEY, JSON.stringify(next));
};

async function imageFileToDataUrl(file, maxSide = 1000, quality = .68) {
  if (!file?.type?.startsWith('image/')) throw Error('Choose an image.');
  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d'); ctx.drawImage(source, 0, 0, canvas.width, canvas.height); source.close();
  return canvas.toDataURL('image/jpeg', quality);
}

const actionWords = {
  [ACTIONS.OBSERVE]: 'OBSERVE', [ACTIONS.CHOOSE]: 'CHOOSE', [ACTIONS.FIND]: 'FIND', [ACTIONS.CONNECT]: 'CONNECT',
  [ACTIONS.INTERPRET]: 'INTERPRET', [ACTIONS.COMPARE]: 'COMPARE', [ACTIONS.PREDICT]: 'PREDICT', [ACTIONS.CHALLENGE]: 'CHALLENGE', [ACTIONS.TRANSFORM]: 'TRANSFORM'
};

function Photo({ src, className = '', alt = 'Pulse' }) {
  return src ? <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} /> : <div className={`grid h-full w-full place-items-center bg-[#e7e0d4] text-[#85867a] ${className}`}><ImagePlus size={28} /></div>;
}
function Button({ children, onClick, disabled = false, secondary = false, icon: Icon = ArrowRight, className = '' }) {
  return <button disabled={disabled} onClick={onClick} className={`inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full px-6 text-sm font-semibold transition active:scale-[.98] disabled:opacity-35 ${secondary ? 'border border-[#24251f]/12 bg-white/55 text-[#24251f] hover:bg-white' : 'bg-[#24251f] text-[#f8f3e9] hover:-translate-y-0.5'} ${className}`}>{children}<Icon size={17}/></button>;
}
function Back({ onClick }) { return <button onClick={onClick} className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/10 bg-white/50"><ArrowLeft size={18}/></button>; }
function BottomNav({ screen, go }) {
  return <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#24251f]/8 bg-[#f7f2e8]/94 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
    <div className="mx-auto flex max-w-xl items-center justify-between">
      <NavItem label="Pulses" active={screen === 'home'} onClick={() => go('home')} icon={Compass}/>
      <button onClick={() => go('create')} aria-label="Create" className="grid h-12 w-12 place-items-center rounded-full bg-[#24251f] text-[#f7f2e8] shadow-lg"><Plus size={21}/></button>
      <NavItem label="Activity" active={screen === 'history'} onClick={() => go('history')} icon={History}/>
      <NavItem label="You" active={screen === 'you'} onClick={() => go('you')} icon={Users}/>
    </div>
  </nav>;
}
function NavItem({ label, active, onClick, icon: Icon }) { return <button onClick={onClick} className={`flex min-w-14 flex-col items-center gap-1 text-[10px] font-semibold tracking-wide ${active ? 'text-[#24251f]' : 'text-[#85867a]'}`}><Icon size={18}/><span>{label}</span></button>; }
function Progress({ count }) { return <div className="flex items-center gap-1.5">{Array.from({ length: MAX_STEPS + 1 }).map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= count ? 'bg-[#24251f]' : 'bg-[#24251f]/10'}`} />)}</div>; }
function StateCard({ payload, label = 'CURRENT STATE', compact = false }) {
  const img = imageOf(payload); const txt = textOf(payload);
  return <div className={`overflow-hidden rounded-[30px] border border-[#24251f]/8 bg-white/60 ${compact ? '' : 'shadow-[0_16px_60px_rgba(36,37,31,.06)]'}`}>
    {img && <div className={`${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'} overflow-hidden`}><Photo src={img}/></div>}
    <div className="p-5"><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">{label}</p>{txt && <p className="mt-2 text-base leading-6 text-[#24251f]">{txt}</p>}</div>
  </div>;
}
function TraceCard({ payload, index, highlight = false }) {
  if (!payload) return null;
  const img = imageOf(payload); const summary = textOf(payload) || 'A move changed the state.';
  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={`relative overflow-hidden rounded-[26px] border ${highlight ? 'border-[#24251f] bg-[#24251f] text-[#f8f3e9]' : 'border-[#24251f]/8 bg-white/60'}`}>
    {img && <div className="aspect-[16/10] overflow-hidden"><Photo src={img}/></div>}
    <div className="p-4"><div className="flex items-center justify-between"><span className={`text-[10px] font-bold tracking-[.18em] ${highlight ? 'text-white/55' : 'text-[#85867a]'}`}>MOVE {index}</span>{highlight && <span className="text-[10px] font-bold tracking-[.16em]">YOU WERE HERE</span>}</div><p className="mt-2 text-sm leading-5">{summary}</p></div>
  </motion.div>;
}

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null); const [role, setRole] = useState(''); const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [history, setHistory] = useState([]);
  const [seedMode, setSeedMode] = useState('photo'); const [seedPhoto, setSeedPhoto] = useState(''); const [seedText, setSeedText] = useState('');
  const [photo, setPhoto] = useState(''); const [marker, setMarker] = useState(null); const [text, setText] = useState('');
  const [secondPhoto, setSecondPhoto] = useState(''); const [claim, setClaim] = useState(''); const [evidence, setEvidence] = useState('');
  const [showChain, setShowChain] = useState(false); const [toast, setToast] = useState('');
  const seedInput = useRef(null); const photoInput = useRef(null); const secondInput = useRef(null);

  const payload = useMemo(() => latestPayload(relay), [relay]);
  const task = useMemo(() => payload?.task || START_TASK, [payload]);
  const moves = useMemo(() => payloadsOf(relay), [relay]);
  const count = relay?.step_count ?? stepsOf(relay).length;
  const currentState = payload?.state || { step: count, summary: textOf(payload) || 'The chain is waiting.' };
  const currentArtifact = imageOf(payload);

  useEffect(() => setHistory(readJSON(HISTORY_KEY, [])), []);
  useEffect(() => {
    if (!relay?.id) return;
    const channel = supabase.channel(`pulse-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, ({ new: next }) => {
      setRelay(next); setHistory(saveHistory({ id: next.id, role, status: next.status, stepCount: next.step_count ?? stepsOf(next).length, updatedAt: Date.now() }));
      if (next.status === 'complete') setScreen('result');
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id, role]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  const clearMoveInputs = () => { setPhoto(''); setMarker(null); setText(''); setSecondPhoto(''); setClaim(''); setEvidence(''); setError(''); };
  const reset = () => { setScreen('home'); setRelay(null); setRole(''); setToken(''); clearMoveInputs(); setSeedPhoto(''); setSeedText(''); setShowChain(false); };
  const go = next => { setError(''); if (['home','create','history','you'].includes(next)) { setRelay(null); setRole(''); setToken(''); } setScreen(next); };
  const pickImage = async (event, setter) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { setBusy(true); setError(''); setter(await imageFileToDataUrl(file)); } catch (e) { setError(e?.message || 'Could not read the image.'); } finally { setBusy(false); } };

  async function createPulse() {
    const clean = seedText.trim().replace(/\s+/g, ' ');
    if (seedMode === 'photo' && !seedPhoto) { setError('Leave a starting point first.'); return; }
    if (seedMode === 'text' && !clean) { setError('Write a starting point first.'); return; }
    if (clean.length > 240) { setError('Keep the starting point under 240 characters.'); return; }
    setBusy(true); setError('');
    try {
      const artifact = seedMode === 'photo' ? { type: 'photo', dataUrl: seedPhoto } : null;
      const { data, error: rpcError } = await supabase.rpc('create_relay', { p_seed: JSON.stringify(starterPayload({ artifact, text: clean, creatorId: deviceId() })) });
      if (rpcError) throw rpcError; if (!data?.id) throw Error('Could not create the Pulse.');
      setRelay(data); setRole('creator'); setToken(''); setScreen('created');
      saveSession(data.id, { role: 'creator', token: '' }); setHistory(saveHistory({ id: data.id, role: 'creator', status: data.status, stepCount: data.step_count ?? 0, updatedAt: Date.now() }));
    } catch (e) { setError(e?.message || 'Could not create the Pulse.'); } finally { setBusy(false); }
  }

  async function claimPulse() {
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_relay', { p_exclude_creator_id: deviceId() });
      if (rpcError) throw rpcError; if (!data?.relay) { setError('Nothing is waiting right now.'); return; }
      setRelay(data.relay); setRole('stranger'); setToken(data.token); clearMoveInputs(); setScreen('trace');
      saveSession(data.relay.id, { role: 'stranger', token: data.token }); setHistory(saveHistory({ id: data.relay.id, role: 'stranger', status: data.relay.status, stepCount: data.relay.step_count ?? 0, updatedAt: Date.now() }));
    } catch (e) { setError(e?.message || 'Could not find a Pulse.'); } finally { setBusy(false); }
  }

  async function submitMove() {
    if (!relay || !token || busy) return;
    const action = task.actionType; let result = {}; let artifact = payload?.artifact || null;
    if (task.inputType === 'tap') {
      if (!marker) { setError('Choose one place.'); return; }
      result = { marker, summary: 'One part of the state was chosen.' }; artifact = { ...(artifact || {}), marker };
    } else if (task.inputType === 'text') {
      const clean = text.trim().replace(/\s+/g, ' '); if (!clean) { setError('Make your move first.'); return; }
      if (clean.length > (task.maxLength || 160)) { setError(`Keep it under ${task.maxLength || 160} characters.`); return; }
      result = { text: clean, summary: clean }; artifact = { type: 'text', text: clean };
    } else if (task.inputType === 'compare') {
      const note = text.trim().replace(/\s+/g, ' '); if (!secondPhoto || !note) { setError('Add the second scene and one sentence.'); return; }
      if (note.length > 160) { setError('Keep the comparison under 160 characters.'); return; }
      result = { dataUrl: secondPhoto, note, summary: note }; artifact = { type: 'compare', previousDataUrl: currentArtifact, dataUrl: secondPhoto, note };
    } else if (task.inputType === 'challenge') {
      const c = claim.trim().replace(/\s+/g, ' '); const e = evidence.trim().replace(/\s+/g, ' ');
      if (!c || !secondPhoto || !e) { setError('Add the claim, evidence, and photo.'); return; }
      if (c.length > 160 || e.length > 160) { setError('Keep each sentence under 160 characters.'); return; }
      result = { claim: c, dataUrl: secondPhoto, evidence: e, summary: e }; artifact = { type: 'challenge', dataUrl: secondPhoto, claim: c, evidence: e };
    } else {
      if (!photo) { setError('Add something for the next person.'); return; }
      result = { dataUrl: photo, summary: 'A new scene was added.' }; artifact = { type: 'photo', dataUrl: photo };
    }
    const step = count + 1;
    const previous = { ...payload, action, result, artifact, task };
    const actionHistory = [...moves.map(x => x.action).filter(Boolean), action];
    const nextTask = step >= MAX_STEPS ? null : generateNextTask({ previous, history: actionHistory, seed: relay.id, step: step + 1, state: { ...currentState, artifact } });
    const output = serializeStep({ artifact, action, result, step, task, nextTask, state: { ...currentState, artifact } });
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output });
      if (rpcError) throw rpcError;
      setRelay(data); setToken(''); saveSession(relay.id, { role, token: '' }); setHistory(saveHistory({ id: data.id, role, status: data.status, stepCount: data.step_count ?? stepsOf(data).length, updatedAt: Date.now() })); clearMoveInputs();
      setScreen(data.status === 'complete' ? 'result' : 'waiting');
    } catch (e) { setError(e?.message || 'Could not pass the Pulse on.'); } finally { setBusy(false); }
  }

  async function resume(entry) {
    setBusy(true); setError('');
    try {
      const { data, error: fetchError } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle();
      if (fetchError || !data) throw fetchError || Error('That Pulse is no longer available.');
      const session = readJSON(SESSION_KEY, {})[entry.id] || {};
      setRelay(data); setRole(entry.role || session.role || 'creator'); setToken(session.token || '');
      setScreen(data.status === 'complete' ? 'result' : session.token ? 'trace' : 'created');
    } catch (e) { setError(e?.message || 'Could not open that Pulse.'); } finally { setBusy(false); }
  }

  const inputUI = () => {
    if (task.inputType === 'tap') return <div className="space-y-3"><div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[#e7e0d4]" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setMarker({ x: ((e.clientX-r.left)/r.width)*100, y: ((e.clientY-r.top)/r.height)*100 }); }}><Photo src={currentArtifact}/>{marker && <motion.div initial={{ scale: .3 }} animate={{ scale: 1 }} className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/20 shadow-[0_0_0_5px_rgba(0,0,0,.24)]" style={{ left: `${marker.x}%`, top: `${marker.y}%` }}/>}</div><p className="text-xs text-[#85867a]">Choose the part you want the chain to keep.</p></div>;
    if (task.inputType === 'text') return <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={5} maxLength={task.maxLength || 160} placeholder="Make your move…" className="w-full resize-none rounded-[24px] border border-[#24251f]/10 bg-white/70 p-5 text-base outline-none focus:border-[#24251f]/30"/>;
    if (task.inputType === 'compare') return <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div className="aspect-square overflow-hidden rounded-[22px]"><Photo src={currentArtifact}/></div><button onClick={() => secondInput.current?.click()} className="relative aspect-square overflow-hidden rounded-[22px] border border-dashed border-[#24251f]/20 bg-white/50">{secondPhoto ? <Photo src={secondPhoto}/> : <div className="grid h-full place-items-center text-[#85867a]"><Camera/><span className="absolute bottom-3 text-[11px] font-semibold">Add scene</span></div>}</button></div><textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={160} placeholder="What changed between them?" className="w-full resize-none rounded-[22px] border border-[#24251f]/10 bg-white/70 p-4 text-sm outline-none"/></div>;
    if (task.inputType === 'challenge') return <div className="space-y-3"><input value={claim} onChange={e => setClaim(e.target.value)} maxLength={160} placeholder="Your claim…" className="w-full rounded-[20px] border border-[#24251f]/10 bg-white/70 p-4 text-sm outline-none"/><button onClick={() => secondInput.current?.click()} className="relative aspect-[16/10] w-full overflow-hidden rounded-[24px] border border-dashed border-[#24251f]/20 bg-white/50">{secondPhoto ? <Photo src={secondPhoto}/> : <div className="grid h-full place-items-center text-[#85867a]"><Camera size={25}/><span className="text-xs font-semibold">Add evidence</span></div>}</button><textarea value={evidence} onChange={e => setEvidence(e.target.value)} rows={3} maxLength={160} placeholder="Why does this evidence matter?" className="w-full resize-none rounded-[20px] border border-[#24251f]/10 bg-white/70 p-4 text-sm outline-none"/></div>;
    return <button onClick={() => photoInput.current?.click()} className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-dashed border-[#24251f]/20 bg-white/50">{photo ? <Photo src={photo}/> : <div className="grid h-full place-items-center gap-2 text-[#85867a]"><Camera size={28}/><span className="text-sm font-semibold">Add what you found</span></div>}</button>;
  };

  const pageClass = 'mx-auto min-h-screen w-full max-w-xl px-5 pb-32 pt-6';
  const hiddenInputs = <><input ref={seedInput} type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, setSeedPhoto)}/><input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, setPhoto)}/><input ref={secondInput} type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, setSecondPhoto)}/></>;

  if (screen === 'home') return <main className={pageClass}>{hiddenInputs}<header className="flex items-center justify-between"><div><p className="text-[10px] font-bold tracking-[.28em] text-[#85867a]">A HUMAN RELAY</p><h1 className="mt-1 text-3xl font-black tracking-[-.04em]">PULSE</h1></div><button onClick={() => go('you')} className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/10 bg-white/55"><Users size={18}/></button></header>
    <section className="pt-10"><p className="text-[11px] font-bold tracking-[.2em] text-[#85867a]">FOR YOU</p><div className="mt-4 overflow-hidden rounded-[32px] bg-[#24251f] p-6 text-[#f8f3e9] shadow-[0_24px_70px_rgba(36,37,31,.15)]"><div className="flex items-center justify-between text-[10px] font-bold tracking-[.18em] text-white/50"><span>THE NEXT MOVE IS YOURS</span><Sparkles size={16}/></div><h2 className="mt-16 max-w-[310px] text-3xl font-bold leading-[1.05] tracking-[-.04em]">Someone changed it.<br/>You decide what happens next.</h2><Button onClick={claimPulse} disabled={busy} className="mt-8 bg-[#f8f3e9] text-[#24251f]">Enter a Pulse</Button></div></section>
    <section className="mt-10"><div className="flex items-end justify-between"><div><p className="text-[11px] font-bold tracking-[.2em] text-[#85867a]">STILL MOVING</p><h2 className="mt-1 text-xl font-bold">Find your next move.</h2></div><span className="text-xs text-[#85867a]">Live</span></div><button onClick={claimPulse} className="mt-4 w-full rounded-[26px] border border-[#24251f]/8 bg-white/55 p-5 text-left"><div className="flex items-center gap-3"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#24251f]"/><span className="text-sm font-semibold">Pulses are moving now</span></div><p className="mt-2 text-sm leading-5 text-[#85867a]">Every one has a state waiting for another human.</p><div className="mt-4 flex items-center gap-1"><span className="h-1 flex-1 rounded bg-[#24251f]"/><span className="h-1 flex-1 rounded bg-[#24251f]"/><span className="h-1 flex-1 rounded bg-[#24251f]/10"/><span className="h-1 flex-1 rounded bg-[#24251f]/10"/><span className="h-1 flex-1 rounded bg-[#24251f]/10"/></div></button></section>
    <section className="mt-10 grid grid-cols-2 gap-3"><button onClick={() => go('create')} className="rounded-[24px] bg-white/65 p-5 text-left"><Plus size={19}/><p className="mt-8 text-sm font-bold">Start one</p><p className="mt-1 text-xs text-[#85867a]">Leave a seed.</p></button><button onClick={() => go('history')} className="rounded-[24px] bg-white/65 p-5 text-left"><History size={19}/><p className="mt-8 text-sm font-bold">Your traces</p><p className="mt-1 text-xs text-[#85867a]">See what you changed.</p></button></section>
    {error && <p className="mt-5 rounded-2xl bg-[#24251f]/6 p-3 text-center text-xs text-[#6c6d64]">{error}</p>}<BottomNav screen={screen} go={go}/></main>;

  if (screen === 'create') return <main className={pageClass}>{hiddenInputs}<div className="flex items-center gap-3"><Back onClick={() => go('home')}/><div><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">CREATE</p><h1 className="text-xl font-bold">Start a Pulse</h1></div></div><div className="mt-10"><h2 className="text-4xl font-bold leading-none tracking-[-.05em]">Give people<br/>something to change.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-[#85867a]">Don't make the ending. Leave a starting point.</p><div className="mt-8 flex gap-2"><button onClick={() => setSeedMode('photo')} className={`rounded-full px-4 py-2 text-xs font-bold ${seedMode === 'photo' ? 'bg-[#24251f] text-white' : 'bg-white/60'}`}>PHOTO</button><button onClick={() => setSeedMode('text')} className={`rounded-full px-4 py-2 text-xs font-bold ${seedMode === 'text' ? 'bg-[#24251f] text-white' : 'bg-white/60'}`}>WORDS</button></div>{seedMode === 'photo' ? <button onClick={() => seedInput.current?.click()} className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-[30px] bg-[#e7e0d4]">{seedPhoto ? <Photo src={seedPhoto}/> : <div className="grid h-full place-items-center gap-2 text-[#85867a]"><Camera size={30}/><span className="text-sm font-semibold">Capture the beginning</span></div>}</button> : <textarea value={seedText} onChange={e => setSeedText(e.target.value)} rows={7} maxLength={240} placeholder="A place. A question. A strange detail. Anything that can be changed by another person." className="mt-4 w-full resize-none rounded-[30px] border border-[#24251f]/10 bg-white/65 p-6 text-base leading-6 outline-none"/>}<div className="mt-5 rounded-[24px] bg-white/55 p-5"><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">WHAT HAPPENS NEXT</p><p className="mt-2 text-sm leading-6">Someone else sees your starting point, makes one move, and passes the changed state forward.</p></div><Button onClick={createPulse} disabled={busy} className="mt-5 w-full">Launch Pulse</Button>{error && <p className="mt-4 text-center text-xs text-[#6c6d64]">{error}</p>}</div><BottomNav screen={screen} go={go}/></main>;

  if (screen === 'created') return <main className={pageClass}>{hiddenInputs}<div className="flex items-center gap-3"><Back onClick={() => go('home')}/><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">YOUR PULSE</p></div><div className="mt-14"><div className="grid h-16 w-16 place-items-center rounded-full bg-[#24251f] text-[#f8f3e9]"><Check size={30}/></div><h1 className="mt-7 text-5xl font-bold leading-[.95] tracking-[-.06em]">You started<br/>something.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-[#85867a]">Your seed is waiting for another human to change it.</p><div className="mt-10 rounded-[28px] bg-white/60 p-5"><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">THE CHAIN</p><div className="mt-5 flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#24251f] text-xs text-white">YOU</span>{Array.from({length:4}).map((_,i)=><span key={i} className="h-px flex-1 bg-[#24251f]/15"/>)}<span className="text-xs text-[#85867a]">REVEAL</span></div></div><Button onClick={() => setScreen('waiting')} className="mt-5 w-full">Watch it move</Button></div></main>;

  if (screen === 'trace') return <main className={pageClass}>{hiddenInputs}<div className="flex items-center justify-between"><Back onClick={() => go('home')}/><span className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">BEFORE YOU</span><span className="text-xs font-bold">{count + 1} / {MAX_STEPS + 1}</span></div><div className="mt-8"><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">THE MOVE BEFORE YOU</p><h1 className="mt-2 text-4xl font-bold leading-none tracking-[-.05em]">Someone left<br/>this behind.</h1><div className="mt-7">{count === 0 ? <StateCard payload={parsePayload(relay?.seed)} label="THE SEED"/> : <TraceCard payload={moves.at(-1)} index={count} />}</div><div className="mt-7 rounded-[24px] border border-[#24251f]/8 bg-white/55 p-5"><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">YOUR MOVE</p><p className="mt-2 text-lg font-semibold leading-6">{task.prompt}</p><p className="mt-3 text-xs leading-5 text-[#85867a]">{task.hint}</p></div><Button onClick={() => setScreen('move')} className="mt-5 w-full">Make my move</Button></div></main>;

  if (screen === 'move') return <main className={pageClass}>{hiddenInputs}<div className="flex items-center justify-between"><Back onClick={() => setScreen('trace')}/><span className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">MOVE {count + 1}</span><span className="text-xs font-bold">{count + 1}/{MAX_STEPS}</span></div><div className="mt-7"><Progress count={count}/><div className="mt-9"><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">{actionWords[task.actionType] || 'MOVE'}</p><h1 className="mt-2 text-4xl font-bold leading-[.98] tracking-[-.05em]">{task.title}</h1><p className="mt-4 text-base leading-6 text-[#5e5f57]">{task.prompt}</p><div className="mt-7">{inputUI()}</div><Button onClick={submitMove} disabled={busy} className="mt-5 w-full">{busy ? 'Passing it on…' : 'Pass it on'}</Button>{error && <p className="mt-4 text-center text-xs text-[#6c6d64]">{error}</p>}</div></div></main>;

  if (screen === 'waiting') return <main className={pageClass}>{hiddenInputs}<div className="flex items-center justify-between"><Back onClick={() => go('home')}/><span className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">PULSE IS MOVING</span><span className="text-xs font-bold">{count}/{MAX_STEPS}</span></div><div className="flex min-h-[72vh] flex-col justify-center"><div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#24251f]"/><h1 className="mt-7 text-5xl font-bold leading-[.93] tracking-[-.06em]">Your move<br/>is out there.</h1><p className="mt-5 max-w-sm text-base leading-6 text-[#85867a]">Someone else gets what you left behind. Come back when the chain reaches the reveal.</p><div className="mt-9"><Progress count={count}/><p className="mt-3 text-xs text-[#85867a]">{count} of {MAX_STEPS} moves complete</p></div><Button onClick={() => claimPulse()} className="mt-8 w-full" secondary icon={Compass}>Find another Pulse</Button><button onClick={() => setShowChain(v => !v)} className="mt-4 text-xs font-bold underline underline-offset-4">{showChain ? 'Hide chain' : 'See what you left'}</button>{showChain && <div className="mt-5 space-y-3">{moves.map((p,i)=><TraceCard key={i} payload={p} index={i+1} highlight={role !== 'creator' && i === moves.length - 1}/>)}</div>}</div></main>;

  if (screen === 'result') return <main className={`${pageClass} bg-[#24251f] text-[#f8f3e9]`}><div className="flex items-center justify-between"><button onClick={() => go('home')} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5"><ArrowLeft size={18}/></button><span className="text-[10px] font-bold tracking-[.22em] text-white/50">THE REVEAL</span><button onClick={() => setToast('Reveal link ready to share.')} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5"><Share2 size={17}/></button></div><div className="mt-12"><p className="text-[11px] font-bold tracking-[.22em] text-white/45">LOOK WHAT HAPPENED</p><h1 className="mt-3 text-5xl font-bold leading-[.9] tracking-[-.06em]">Nobody knew<br/>where this would end.</h1><div className="mt-10 space-y-3">{moves.map((p,i)=><TraceCard key={i} payload={p} index={i+1} highlight={role !== 'creator' && i === moves.length - 1}/>)}</div>{payload && <div className="mt-3 overflow-hidden rounded-[30px] bg-[#f8f3e9] text-[#24251f]"><div className="aspect-[4/3] overflow-hidden"><Photo src={imageOf(payload)}/></div><div className="p-6"><p className="text-[10px] font-bold tracking-[.22em] text-[#85867a]">FINAL STATE</p><p className="mt-2 text-2xl font-bold leading-7">{textOf(payload) || 'The chain reached its final state.'}</p></div></div>}<div className="mt-7 rounded-[28px] border border-white/10 p-6"><p className="text-[10px] font-bold tracking-[.22em] text-white/45">YOUR TRACE</p><p className="mt-2 text-xl font-semibold">{role === 'creator' ? 'You started this.' : 'YOU WERE HERE.'}</p><p className="mt-2 text-sm leading-5 text-white/55">One small action became part of the final result.</p></div><Button onClick={() => go('home')} className="mt-5 w-full bg-[#f8f3e9] text-[#24251f]">Find another Pulse</Button></div>{toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-5 py-3 text-xs font-bold text-[#24251f] shadow-xl">{toast}</div>}</main>;

  if (screen === 'history') return <main className={pageClass}>{hiddenInputs}<div className="flex items-center gap-3"><Back onClick={() => go('home')}/><div><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">ACTIVITY</p><h1 className="text-xl font-bold">Your traces</h1></div></div><div className="mt-9">{history.length === 0 ? <div className="rounded-[28px] bg-white/55 p-7"><p className="text-2xl font-bold">Nothing here yet.</p><p className="mt-2 text-sm leading-6 text-[#85867a]">Your first move will leave a trace.</p><Button onClick={claimPulse} className="mt-6">Find a Pulse</Button></div> : <div className="space-y-3">{history.map((entry,i)=><button key={`${entry.id}-${i}`} onClick={() => resume(entry)} className="w-full rounded-[24px] border border-[#24251f]/8 bg-white/55 p-5 text-left"><div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.18em] text-[#85867a]">{entry.role === 'creator' ? 'STARTED' : 'JOINED'}</span><span className="text-xs text-[#85867a]">{entry.stepCount}/{MAX_STEPS}</span></div><p className="mt-2 text-sm font-semibold">{entry.status === 'complete' ? 'Reveal ready' : 'Still moving'}</p></button>)}</div>}</div><BottomNav screen={screen} go={go}/></main>;

  if (screen === 'you') return <main className={pageClass}>{hiddenInputs}<div className="flex items-center justify-between"><Back onClick={() => go('home')}/><button onClick={() => setToast('Profile settings coming later.')} className="text-xs font-bold">Settings</button></div><div className="mt-12"><div className="grid h-20 w-20 place-items-center rounded-full bg-[#24251f] text-[#f8f3e9]"><Users size={28}/></div><h1 className="mt-5 text-4xl font-bold tracking-[-.05em]">You</h1><div className="mt-8 grid grid-cols-3 gap-2"><div className="rounded-[22px] bg-white/55 p-4"><p className="text-2xl font-bold">{history.filter(x=>x.role==='creator').length}</p><p className="mt-1 text-[10px] font-bold tracking-[.15em] text-[#85867a]">STARTED</p></div><div className="rounded-[22px] bg-white/55 p-4"><p className="text-2xl font-bold">{history.filter(x=>x.role!=='creator').length}</p><p className="mt-1 text-[10px] font-bold tracking-[.15em] text-[#85867a]">JOINED</p></div><div className="rounded-[22px] bg-white/55 p-4"><p className="text-2xl font-bold">{history.filter(x=>x.status==='complete').length}</p><p className="mt-1 text-[10px] font-bold tracking-[.15em] text-[#85867a]">REVEALS</p></div></div><div className="mt-8 rounded-[28px] bg-white/55 p-6"><p className="text-[10px] font-bold tracking-[.2em] text-[#85867a]">YOUR TRACE</p><p className="mt-2 text-lg font-semibold">Every Pulse keeps a little piece of what you did.</p></div></div><BottomNav screen={screen} go={go}/></main>;

  return null;
}
