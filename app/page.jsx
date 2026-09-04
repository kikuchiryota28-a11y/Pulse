'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, Check, Clock3, GitCompare, History, ImagePlus, MessageCircleQuestion, Plus, RotateCcw, Target, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ACTIONS, MAX_STEPS, START_TASK, generateNextTask, latestPayload, parsePayload, serializeStep, starterPayload } from '../lib/pulse-v2';

const HISTORY_KEY = 'pulse:v3:pulses';
const SESSION_KEY = 'pulse:v3:sessions';
const DEVICE_KEY = 'pulse:v4:creator-id';

const safe = (v, fallback) => { try { return JSON.parse(v); } catch { return fallback; } };
const stepsOf = (r) => Array.isArray(r?.steps) ? r.steps : [];
const payloadsOf = (r) => stepsOf(r).map(s => parsePayload(s?.output)).filter(Boolean);
const currentPayload = (r) => latestPayload(r) || parsePayload(r?.seed) || null;
const imageOf = (p) => p?.artifact?.dataUrl || p?.result?.dataUrl || null;
const textOf = (p) => p?.artifact?.text || p?.result?.text || p?.result?.note || p?.result?.evidence || p?.result?.summary || '';
const readHistory = () => typeof window === 'undefined' ? [] : safe(localStorage.getItem(HISTORY_KEY) || '[]', []);
const readSessions = () => typeof window === 'undefined' ? {} : safe(localStorage.getItem(SESSION_KEY) || '{}', {});
const saveHistory = (e) => { const next = [e, ...readHistory().filter(x => x.id !== e.id)].slice(0, 30); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); };
const saveSession = (id, value) => { const next = readSessions(); next[id] = value; localStorage.setItem(SESSION_KEY, JSON.stringify(next)); };
const deviceId = () => { if (typeof window === 'undefined') return ''; let id = localStorage.getItem(DEVICE_KEY); if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); } return id; };

async function imageFileToDataUrl(file, maxSide = 900, quality = .62) {
  if (!file?.type?.startsWith('image/')) throw Error('Choose an image.');
  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.toDataURL('image/jpeg', quality);
}

function actionLabel(a) {
  return ({ [ACTIONS.CAPTURE]: 'CAPTURE', [ACTIONS.FIND]: 'FIND', [ACTIONS.CHOOSE]: 'CHOOSE', [ACTIONS.INTERPRET]: 'INTERPRET', [ACTIONS.COMPARE]: 'COMPARE', [ACTIONS.CHALLENGE]: 'CHALLENGE', [ACTIONS.PREDICT]: 'PREDICT' })[a] || 'MOVE';
}
function ActionIcon({ action, size = 16 }) {
  const Icon = action === ACTIONS.CHOOSE ? Target : action === ACTIONS.COMPARE ? GitCompare : action === ACTIONS.CHALLENGE ? MessageCircleQuestion : action === ACTIONS.CAPTURE || action === ACTIONS.FIND ? Camera : action === ACTIONS.PREDICT ? Clock3 : Zap;
  return <Icon size={size} strokeWidth={2.1} />;
}

function Photo({ src, className = '', alt = 'Pulse' }) {
  return src ? <img src={src} alt={alt} className={`block h-full w-full object-cover ${className}`} /> : <div className={`grid h-full w-full place-items-center bg-[#e9e2d4] text-[#7b7b6d] ${className}`}><ImagePlus size={24} /></div>;
}
function Button({ children, onClick, disabled, secondary = false, icon: Icon = ArrowRight }) {
  return <button disabled={disabled} onClick={onClick} className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-semibold transition-all active:scale-[.98] disabled:opacity-35 ${secondary ? 'border border-[#25261f]/12 bg-white/60 text-[#25261f] hover:bg-white' : 'bg-[#25261f] text-[#f6f1e7] hover:-translate-y-0.5'}`}>{children}<Icon size={17} /></button>;
}
function BottomNav({ screen, go }) {
  return <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#25261f]/8 bg-[#f6f1e7]/92 px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"><div className="mx-auto flex max-w-xl items-center justify-between"><NavItem label="Pulses" active={screen === 'home'} onClick={() => go('home')} icon={Zap} /><button onClick={() => go('create')} className="grid h-12 w-12 place-items-center rounded-full bg-[#25261f] text-[#f6f1e7] shadow-lg"><Plus size={21} /></button><NavItem label="Activity" active={screen === 'history'} onClick={() => go('history')} icon={History} /><NavItem label="You" active={false} onClick={() => go('history')} icon={Users} /></div></nav>;
}
function NavItem({ label, active, onClick, icon: Icon }) { return <button onClick={onClick} className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-semibold tracking-wide ${active ? 'text-[#25261f]' : 'text-[#8a8a7d]'}`}><Icon size={18} /><span>{label}</span></button>; }

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [creatorPhoto, setCreatorPhoto] = useState('');
  const [photo, setPhoto] = useState('');
  const [marker, setMarker] = useState(null);
  const [text, setText] = useState('');
  const [compareNote, setCompareNote] = useState('');
  const [claim, setClaim] = useState('');
  const [challengeEvidence, setChallengeEvidence] = useState('');
  const creatorInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const payload = useMemo(() => currentPayload(relay), [relay]);
  const task = useMemo(() => payload?.task || START_TASK, [payload]);
  const count = relay?.step_count ?? stepsOf(relay).length;
  const currentArtifact = imageOf(payload);
  const moves = useMemo(() => payloadsOf(relay), [relay]);

  useEffect(() => setHistory(readHistory()), []);
  useEffect(() => {
    if (!relay?.id) return;
    const channel = supabase.channel(`pulse-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, ({ new: next }) => {
      setRelay(next);
      if (next.status === 'complete') setScreen('result');
      saveHistory({ id: next.id, role, status: next.status, stepCount: next.step_count ?? stepsOf(next).length, updatedAt: Date.now() });
      setHistory(readHistory());
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id, role]);

  function reset() { setScreen('home'); setRelay(null); setRole(''); setToken(''); setCreatorPhoto(''); setPhoto(''); setMarker(null); setText(''); setCompareNote(''); setClaim(''); setChallengeEvidence(''); setError(''); }
  function go(next) { setError(''); if (next === 'home' || next === 'create' || next === 'history') { setScreen(next); if (next !== 'home') { setRelay(null); setRole(''); setToken(''); } } else setScreen(next); }
  async function pickImage(event, setter) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try { setBusy(true); setError(''); setter(await imageFileToDataUrl(file)); } catch (e) { setError(e?.message || 'Could not read the image.'); } finally { setBusy(false); }
  }
  async function createPulse() {
    if (!creatorPhoto) { setError('Start with a photo from your world.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('create_relay', { p_seed: JSON.stringify(starterPayload(creatorPhoto, deviceId())) });
      if (rpcError) throw rpcError; if (!data?.id) throw Error('Could not create the Pulse.');
      setRelay(data); setRole('creator'); setToken(''); setScreen('waiting');
      saveSession(data.id, { role: 'creator', token: '' }); saveHistory({ id: data.id, role: 'creator', status: data.status, stepCount: data.step_count ?? 0, updatedAt: Date.now() }); setHistory(readHistory());
    } catch (e) { setError(e?.message || 'Could not create the Pulse.'); } finally { setBusy(false); }
  }
  async function claimPulse() {
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_relay', { p_exclude_creator_id: deviceId() });
      if (rpcError) throw rpcError; if (!data?.relay) { setError('No Pulse is moving right now. Try again soon.'); return; }
      setRelay(data.relay); setRole('stranger'); setToken(data.token); setPhoto(''); setMarker(null); setText(''); setCompareNote(''); setClaim(''); setChallengeEvidence(''); setScreen('task');
      saveSession(data.relay.id, { role: 'stranger', token: data.token }); saveHistory({ id: data.relay.id, role: 'stranger', status: data.relay.status, stepCount: data.relay.step_count ?? 0, updatedAt: Date.now() }); setHistory(readHistory());
    } catch (e) { setError(e?.message || 'Could not find a Pulse.'); } finally { setBusy(false); }
  }
  async function submitStep() {
    if (!relay || !token || busy) return;
    const action = task?.actionType; const inputType = task?.inputType; let result = {}; let nextArtifact = payload?.artifact || null;
    if (inputType === 'tap') {
      if (!marker) { setError('Choose one place in the image.'); return; }
      result = { marker, summary: 'Selected one point.' }; nextArtifact = { ...nextArtifact, marker };
    } else if (inputType === 'text') {
      const clean = text.trim().replace(/\s+/g, ' '); if (!clean) { setError('Make your move first.'); return; }
      if (clean.length > (task.maxLength || 120)) { setError(`Keep it under ${task.maxLength || 120} characters.`); return; }
      result = { text: clean, summary: clean }; nextArtifact = { type: 'text', text: clean };
    } else if (inputType === 'compare') {
      const note = compareNote.trim().replace(/\s+/g, ' '); if (!photo) { setError('Add the second image.'); return; }
      if (!note || note.length > 120) { setError('Describe the difference in one sentence.'); return; }
      result = { dataUrl: photo, note, summary: note }; nextArtifact = { type: 'compare', previousDataUrl: currentArtifact || null, dataUrl: photo, note };
    } else if (inputType === 'challenge') {
      const cleanClaim = claim.trim().replace(/\s+/g, ' '); const evidence = challengeEvidence.trim().replace(/\s+/g, ' ');
      if (!cleanClaim || cleanClaim.length > 120) { setError('State the claim in one sentence.'); return; }
      if (!photo) { setError('Add one photo that challenges it.'); return; }
      if (!evidence || evidence.length > 120) { setError('Explain the challenge in one sentence.'); return; }
      result = { claim: cleanClaim, dataUrl: photo, evidence, summary: evidence }; nextArtifact = { type: 'challenge', dataUrl: photo, claim: cleanClaim, evidence };
    } else {
      if (!photo) { setError('Add one photo for your move.'); return; }
      result = { dataUrl: photo, summary: 'Left a new photo.' }; nextArtifact = { type: 'photo', dataUrl: photo };
    }
    const currentStep = count + 1; const previous = { ...payload, action, result, artifact: nextArtifact, task };
    const actionHistory = [...moves.map(item => item.action).filter(Boolean), action];
    const nextTask = currentStep >= MAX_STEPS ? null : generateNextTask({ previous, history: actionHistory, seed: relay.id, step: currentStep + 1 });
    const output = serializeStep({ artifact: nextArtifact, action, result, step: currentStep, task, nextTask });
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output });
      if (rpcError) throw rpcError;
      setRelay(data); setToken(''); saveSession(relay.id, { role, token: '' });
      saveHistory({ id: data.id, role, status: data.status, stepCount: data.step_count ?? stepsOf(data).length, updatedAt: Date.now() }); setHistory(readHistory());
      setPhoto(''); setMarker(null); setText(''); setCompareNote(''); setClaim(''); setChallengeEvidence('');
      setScreen(data.status === 'complete' || !nextTask ? 'result' : 'waiting');
    } catch (e) { setError(e?.message || 'Could not pass the Pulse on.'); } finally { setBusy(false); }
  }
  async function resume(entry) {
    setBusy(true); setError('');
    try {
      const { data, error: fetchError } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle();
      if (fetchError || !data) throw fetchError || Error('That Pulse is no longer available.');
      const session = readSessions()[entry.id] || {};
      setRelay(data); setRole(entry.role || session.role || 'creator'); setToken(session.token || ''); setScreen(data.status === 'complete' ? 'result' : session.token ? 'task' : 'waiting');
    } catch (e) { setError(e?.message || 'Could not open that Pulse.'); } finally { setBusy(false); }
  }

  const taskInput = () => {
    if (task.inputType === 'tap') return <div className="space-y-3"><div className="relative aspect-[4/3] overflow-hidden rounded-[30px] bg-[#e9e2d4]" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setMarker({ x: (e.clientX-r.left)/r.width*100, y: (e.clientY-r.top)/r.height*100 }); }}><Photo src={currentArtifact} />{marker && <motion.div initial={{scale:.4}} animate={{scale:1}} className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/10 shadow-[0_0_0_5px_rgba(0,0,0,.25)]" style={{left:`${marker.x}%`,top:`${marker.y}%`}} />}</div><p className="text-sm text-[#77786b]">Tap the part you want to carry forward.</p></div>;
    if (task.inputType === 'text') return <div className="rounded-[28px] border border-[#25261f]/10 bg-white/55 p-5"><textarea autoFocus value={text} onChange={e=>setText(e.target.value)} rows={4} maxLength={task.maxLength||120} placeholder={task.actionType===ACTIONS.PREDICT?'What do you think will happen?':'Make your move…'} className="w-full resize-none bg-transparent text-xl leading-8 outline-none placeholder:text-[#858579]/50" /><div className="mt-2 text-right text-xs text-[#858579]">{text.length}/{task.maxLength||120}</div></div>;
    if (task.inputType === 'compare') return <div className="space-y-3"><div className="grid grid-cols-2 gap-2"><div className="aspect-square overflow-hidden rounded-[24px]"><Photo src={currentArtifact}/></div><button onClick={()=>photoInputRef.current?.click()} className="aspect-square overflow-hidden rounded-[24px] border border-dashed border-[#25261f]/15 bg-white/45"><Photo src={photo}/></button></div><input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e=>pickImage(e,setPhoto)}/><textarea value={compareNote} onChange={e=>setCompareNote(e.target.value)} maxLength={120} rows={3} placeholder="What changed?" className="w-full rounded-[24px] border border-[#25261f]/10 bg-white/55 p-5 text-lg outline-none" /></div>;
    if (task.inputType === 'challenge') return <div className="space-y-3"><textarea value={claim} onChange={e=>setClaim(e.target.value)} maxLength={120} rows={2} placeholder="The claim…" className="w-full rounded-[24px] border border-[#25261f]/10 bg-white/55 p-5 text-lg outline-none" /><button onClick={()=>photoInputRef.current?.click()} className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-dashed border-[#25261f]/15 bg-white/45"><Photo src={photo}/></button><input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e=>pickImage(e,setPhoto)}/><textarea value={challengeEvidence} onChange={e=>setChallengeEvidence(e.target.value)} maxLength={120} rows={2} placeholder="Why does this challenge it?" className="w-full rounded-[24px] border border-[#25261f]/10 bg-white/55 p-5 text-lg outline-none" /></div>;
    return <div className="space-y-3"><button onClick={()=>photoInputRef.current?.click()} className="relative aspect-[4/3] w-full overflow-hidden rounded-[30px] border border-dashed border-[#25261f]/12 bg-white/45"><Photo src={photo}/>{!photo && <span className="absolute inset-x-0 bottom-5 text-center text-sm font-semibold">Add your move</span>}</button><input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e=>pickImage(e,setPhoto)}/></div>;
  };

  if (screen === 'create') return <main className="min-h-screen bg-[#f6f1e7] px-5 pb-28 pt-8 text-[#25261f]"><div className="mx-auto max-w-xl"><button onClick={()=>go('home')} className="mb-8 flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={17}/> Back</button><div className="mb-8"><p className="mb-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#858579]">Create</p><h1 className="text-[42px] font-semibold leading-[.98] tracking-[-.04em]">Start a Pulse.</h1><p className="mt-4 max-w-sm text-base leading-7 text-[#696a5e]">Leave the first move. Someone else will decide what happens next.</p></div><button onClick={()=>creatorInputRef.current?.click()} className="group relative aspect-[4/3] w-full overflow-hidden rounded-[34px] bg-[#e8e0d2] text-left shadow-sm">{creatorPhoto ? <Photo src={creatorPhoto}/> : <><div className="absolute inset-0 grid place-items-center"><div className="grid h-16 w-16 place-items-center rounded-full bg-[#25261f] text-[#f6f1e7] transition-transform group-hover:scale-105"><Camera size={25}/></div></div><div className="absolute inset-x-0 bottom-0 p-6"><p className="text-lg font-semibold">Capture the first move</p><p className="mt-1 text-sm text-[#77786b]">It can be anywhere. It just has to give the next person something to act on.</p></div></>}</button><input ref={creatorInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>pickImage(e,setCreatorPhoto)}/><div className="mt-6 flex items-center justify-between"><span className="text-sm text-[#77786b]">One starting point.</span><Button disabled={!creatorPhoto||busy} onClick={createPulse}>{busy?'Starting…':'Start Pulse'}</Button></div>{error&&<p className="mt-4 text-sm font-medium text-[#9a4c3f]">{error}</p>}</div><BottomNav screen={screen} go={go}/></main>;

  if (screen === 'history') return <main className="min-h-screen bg-[#f6f1e7] px-5 pb-28 pt-8 text-[#25261f]"><div className="mx-auto max-w-xl"><p className="text-[11px] font-bold uppercase tracking-[.22em] text-[#858579]">Activity</p><div className="mt-2 flex items-end justify-between"><h1 className="text-4xl font-semibold tracking-[-.04em]">Your traces.</h1><span className="text-xs text-[#858579]">{history.length} Pulses</span></div><div className="mt-8 space-y-3">{history.length===0?<div className="rounded-[30px] border border-[#25261f]/10 bg-white/45 p-8 text-center"><p className="text-lg font-semibold">Nothing here yet.</p><p className="mt-2 text-sm leading-6 text-[#77786b]">Join a Pulse and your move will stay with it.</p></div>:history.map((h,i)=><button key={`${h.id}-${i}`} onClick={()=>resume(h)} className="flex w-full items-center justify-between rounded-[25px] border border-[#25261f]/9 bg-white/45 p-5 text-left"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#858579]"><span>{h.status==='complete'?'Completed':'Moving'}</span><span>·</span><span>{h.stepCount||0}/{MAX_STEPS}</span></div><p className="mt-2 text-lg font-semibold">{h.role==='creator'?'Your Pulse':'A Pulse you joined'}</p></div><ArrowRight size={18}/></button>)}</div></div><BottomNav screen={screen} go={go}/></main>;

  if (screen === 'task') return <main className="min-h-screen bg-[#f6f1e7] px-5 pb-10 pt-6 text-[#25261f]"><div className="mx-auto max-w-xl"><div className="flex items-center justify-between"><button onClick={reset} className="grid h-10 w-10 place-items-center rounded-full border border-[#25261f]/10 bg-white/45"><ArrowLeft size={17}/></button><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#858579]">Move {count+1} / {MAX_STEPS}</p><p className="mt-1 flex items-center justify-end gap-2 text-xs font-semibold"><ActionIcon action={task.actionType}/>{actionLabel(task.actionType)}</p></div></div><div className="mt-8"><AnimatePresence mode="wait"><motion.div key={task.id||`${count}-${task.actionType}`} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.25}}><div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#858579]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#25261f] text-[#f6f1e7]"><ActionIcon action={task.actionType} size={14}/></span><span>Your move</span></div><h1 className="max-w-xl text-[39px] font-semibold leading-[1.03] tracking-[-.045em]">{task.prompt || 'Make something happen.'}</h1><p className="mt-3 text-sm leading-6 text-[#77786b]">The next person will inherit what you leave here.</p><div className="mt-7">{taskInput()}</div><div className="mt-6 flex items-center justify-between gap-4"><span className="text-xs text-[#858579]">No perfect answer.</span><Button disabled={busy}>{busy?'Passing…':'Pass it on'}</Button></div></motion.div></AnimatePresence>{error&&<p className="mt-4 text-sm font-medium text-[#9a4c3f]">{error}</p>}</div></div></main>;

  if (screen === 'waiting') return <main className="min-h-screen bg-[#f6f1e7] px-5 pb-10 pt-7 text-[#25261f]"><div className="mx-auto flex min-h-[90vh] max-w-xl flex-col"><div className="flex items-center justify-between"><button onClick={reset} className="grid h-10 w-10 place-items-center rounded-full border border-[#25261f]/10 bg-white/45"><RotateCcw size={16}/></button><span className="text-[10px] font-bold uppercase tracking-[.22em] text-[#858579]">Pulse is moving</span></div><div className="my-auto"><div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-[34px] bg-[#25261f]"><Photo src={currentArtifact}/><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/><div className="absolute inset-x-0 bottom-0 p-6 text-[#f6f1e7]"><p className="text-[10px] font-bold uppercase tracking-[.2em] opacity-65">{count} moves made</p><p className="mt-2 text-2xl font-semibold">Someone else gets the next move.</p></div></div><div className="mt-7 text-center"><div className="mx-auto flex items-center justify-center gap-2">{Array.from({length:MAX_STEPS+1}).map((_,i)=><span key={i} className={`h-1.5 rounded-full transition-all ${i<=count?'w-8 bg-[#25261f]':'w-3 bg-[#25261f]/12'}`}/>)}</div><p className="mt-5 text-sm leading-6 text-[#77786b]">You left your trace. The chain continues until the reveal.</p><button onClick={()=>go('home')} className="mt-6 text-sm font-semibold underline underline-offset-4">Find another Pulse</button></div></div></div></main>;

  if (screen === 'result') return <main className="min-h-screen bg-[#25261f] px-5 pb-10 pt-7 text-[#f6f1e7]"><div className="mx-auto max-w-xl"><div className="flex items-center justify-between"><button onClick={reset} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5"><ArrowLeft size={17}/></button><span className="text-[10px] font-bold uppercase tracking-[.22em] opacity-55">The Reveal</span></div><div className="mt-8"><p className="text-[11px] font-bold uppercase tracking-[.2em] opacity-55">5 people · {moves.length} moves</p><h1 className="mt-3 text-5xl font-semibold leading-[.94] tracking-[-.05em]">Look what<br/>happened.</h1><div className="mt-8 space-y-3">{moves.map((m,i)=><motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*.06}} className="overflow-hidden rounded-[27px] border border-white/10 bg-white/5">{imageOf(m)?<div className="aspect-[4/3]"><Photo src={imageOf(m)}/></div>:<div className="p-6 text-xl leading-8">{textOf(m)}</div>}<div className="flex items-center gap-2 px-5 py-4 text-[10px] font-bold uppercase tracking-[.18em] opacity-55"><ActionIcon action={m.action}/><span>Move {i+1} · {actionLabel(m.action)}</span></div></motion.div>)}</div><div className="mt-8 rounded-[27px] border border-white/10 bg-white/5 p-6"><p className="text-xs font-bold uppercase tracking-[.2em] opacity-45">Your trace</p><p className="mt-2 text-2xl font-semibold">YOU WERE HERE.</p><p className="mt-2 text-sm leading-6 opacity-55">The final result exists because every move changed what came next.</p></div><Button secondary onClick={reset} icon={RotateCcw}>Start again</Button></div></div></main>;

  return <main className="min-h-screen bg-[#f6f1e7] px-5 pb-28 pt-7 text-[#25261f]"><div className="mx-auto max-w-xl"><header className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#858579]">PULSE</p><p className="mt-1 text-xs text-[#858579]">Something is moving.</p></div><button onClick={()=>go('history')} className="grid h-10 w-10 place-items-center rounded-full border border-[#25261f]/10 bg-white/45"><History size={17}/></button></header><section className="mt-7"><div className="relative overflow-hidden rounded-[34px] bg-[#25261f] text-[#f6f1e7] shadow-sm"><div className="absolute inset-0 opacity-70" style={{background:'radial-gradient(circle at 80% 15%, rgba(255,255,255,.16), transparent 32%), radial-gradient(circle at 15% 85%, rgba(255,255,255,.08), transparent 30%)'}}/><div className="relative p-7 pb-8"><div className="flex items-center justify-between"><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em]">Still moving</span><span className="text-xs opacity-45">LIVE</span></div><h1 className="mt-16 max-w-sm text-[44px] font-semibold leading-[.95] tracking-[-.05em]">One move.<br/>Then it’s<br/>someone else’s.</h1><p className="mt-5 max-w-sm text-sm leading-6 opacity-60">A Pulse is a chain of small actions. You never know what your move will become.</p><div className="mt-7"><Button disabled={busy} onClick={claimPulse}>{busy?'Finding…':'Enter a Pulse'}</Button></div></div></div></section><section className="mt-5 grid grid-cols-2 gap-3"><button onClick={()=>go('create')} className="min-h-36 rounded-[28px] border border-[#25261f]/10 bg-white/55 p-5 text-left transition hover:bg-white"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#25261f] text-[#f6f1e7]"><Plus size={18}/></div><p className="mt-7 text-lg font-semibold">Start one</p><p className="mt-1 text-xs leading-5 text-[#77786b]">Leave the first move.</p></button><button onClick={()=>go('history')} className="min-h-36 rounded-[28px] border border-[#25261f]/10 bg-[#e9e2d4] p-5 text-left transition hover:bg-[#e4dccd]"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#77786b]"><Users size={15}/>{history.length} traces</div><p className="mt-7 text-lg font-semibold">Your activity</p><p className="mt-1 text-xs leading-5 text-[#77786b]">See where you’ve been.</p></button></section><section className="mt-9"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#858579]">The idea</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.03em]">Don’t just watch.</h2></div><span className="text-xs text-[#858579]">ACT → RESULT</span></div><div className="mt-4 grid gap-2"><div className="flex items-center gap-4 rounded-[24px] border border-[#25261f]/8 bg-white/45 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25261f] text-[#f6f1e7]">1</span><div><p className="text-sm font-semibold">Someone acts.</p><p className="text-xs leading-5 text-[#77786b]">A move becomes the next person’s starting point.</p></div></div><div className="flex items-center gap-4 rounded-[24px] border border-[#25261f]/8 bg-white/45 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25261f] text-[#f6f1e7]">2</span><div><p className="text-sm font-semibold">The state changes.</p><p className="text-xs leading-5 text-[#77786b]">Each decision narrows, twists or expands the chain.</p></div></div><div className="flex items-center gap-4 rounded-[24px] border border-[#25261f]/8 bg-white/45 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25261f] text-[#f6f1e7]">3</span><div><p className="text-sm font-semibold">Then comes the reveal.</p><p className="text-xs leading-5 text-[#77786b]">The whole chain becomes one piece.</p></div></div></div></section>{error&&<p className="mt-5 rounded-2xl bg-[#9a4c3f]/8 p-4 text-sm font-medium text-[#9a4c3f]">{error}</p>}</div><BottomNav screen={screen} go={go}/></main>;
}
