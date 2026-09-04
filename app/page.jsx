'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, Check, Clock3, GitCompare, History, ImagePlus, MessageCircleQuestion, Plus, RotateCcw, Target, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ACTIONS, MAX_STEPS, START_TASK, generateNextTask, latestPayload, parsePayload, serializeStep, starterPayload } from '../lib/pulse-v2';

const HISTORY_KEY = 'pulse:v4:history';
const SESSION_KEY = 'pulse:v4:sessions';
const DEVICE_KEY = 'pulse:v4:device';
const readJSON = (key, fallback) => { if (typeof window === 'undefined') return fallback; try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const stepsOf = relay => Array.isArray(relay?.steps) ? relay.steps : [];
const payloadsOf = relay => stepsOf(relay).map(s => parsePayload(s?.output)).filter(Boolean);
const imageOf = p => p?.artifact?.dataUrl || p?.result?.dataUrl || null;
const textOf = p => p?.artifact?.text || p?.result?.text || p?.result?.summary || p?.result?.note || p?.result?.evidence || '';
const deviceId = () => { if (typeof window === 'undefined') return ''; let id = localStorage.getItem(DEVICE_KEY); if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); } return id; };
const saveHistory = entry => { const next = [entry, ...readJSON(HISTORY_KEY, []).filter(x => x.id !== entry.id)].slice(0, 40); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); return next; };
const saveSession = (id, value) => { const next = readJSON(SESSION_KEY, {}); next[id] = value; localStorage.setItem(SESSION_KEY, JSON.stringify(next)); };

async function imageFileToDataUrl(file, maxSide = 900, quality = .62) {
  if (!file?.type?.startsWith('image/')) throw Error('Choose an image.');
  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d'); ctx.drawImage(source, 0, 0, canvas.width, canvas.height); source.close();
  return canvas.toDataURL('image/jpeg', quality);
}

const actionMeta = {
  [ACTIONS.OBSERVE]: { icon: Camera, label: 'Observe' }, [ACTIONS.CHOOSE]: { icon: Target, label: 'Choose' },
  [ACTIONS.FIND]: { icon: Camera, label: 'Find' }, [ACTIONS.CONNECT]: { icon: Zap, label: 'Connect' },
  [ACTIONS.INTERPRET]: { icon: MessageCircleQuestion, label: 'Interpret' }, [ACTIONS.COMPARE]: { icon: GitCompare, label: 'Compare' },
  [ACTIONS.PREDICT]: { icon: Clock3, label: 'Predict' }, [ACTIONS.CHALLENGE]: { icon: MessageCircleQuestion, label: 'Challenge' },
  [ACTIONS.TRANSFORM]: { icon: Zap, label: 'Transform' },
};

function Button({ children, onClick, disabled = false, secondary = false, icon: Icon = ArrowRight, className = '' }) {
  return <button onClick={onClick} disabled={disabled} className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-semibold transition active:scale-[.98] disabled:opacity-35 ${secondary ? 'border border-[#24251f]/12 bg-white/55 text-[#24251f]' : 'bg-[#24251f] text-[#f8f3e9]'} ${className}`}>{children}<Icon size={17}/></button>;
}
function Photo({ src, alt = 'Pulse', className = '' }) { return src ? <img src={src} alt={alt} className={`block h-full w-full object-cover ${className}`}/> : <div className={`grid h-full w-full place-items-center bg-[#e9e2d4] text-[#7c7d71] ${className}`}><ImagePlus size={26}/></div>; }
function BottomNav({ screen, go }) { return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#24251f]/8 bg-[#f7f2e8]/90 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"><div className="mx-auto flex max-w-xl items-center justify-between"><NavItem label="Pulses" active={screen === 'home'} onClick={() => go('home')} icon={Zap}/><button onClick={() => go('create')} className="grid h-12 w-12 place-items-center rounded-full bg-[#24251f] text-[#f7f2e8]"><Plus size={21}/></button><NavItem label="Activity" active={screen === 'history'} onClick={() => go('history')} icon={History}/><NavItem label="You" active={false} onClick={() => go('history')} icon={Users}/></div></nav>; }
function NavItem({ label, active, onClick, icon: Icon }) { return <button onClick={onClick} className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-semibold tracking-wide ${active ? 'text-[#24251f]' : 'text-[#85867a]'}`}><Icon size={18}/><span>{label}</span></button>; }

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [seedPhoto, setSeedPhoto] = useState('');
  const [seedText, setSeedText] = useState('');
  const [seedMode, setSeedMode] = useState('photo');
  const [photo, setPhoto] = useState('');
  const [marker, setMarker] = useState(null);
  const [text, setText] = useState('');
  const [secondPhoto, setSecondPhoto] = useState('');
  const [claim, setClaim] = useState('');
  const [evidence, setEvidence] = useState('');
  const seedInput = useRef(null); const photoInput = useRef(null);

  const payload = useMemo(() => latestPayload(relay), [relay]);
  const task = useMemo(() => payload?.task || START_TASK, [payload]);
  const count = relay?.step_count ?? stepsOf(relay).length;
  const currentArtifact = imageOf(payload);
  const moves = useMemo(() => payloadsOf(relay), [relay]);
  const currentState = payload?.state || { step: count, summary: textOf(payload) || 'The chain is waiting.' };
  const progress = Math.min(1, count / MAX_STEPS);

  useEffect(() => setHistory(readJSON(HISTORY_KEY, [])), []);
  useEffect(() => {
    if (!relay?.id) return;
    const channel = supabase.channel(`pulse-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, ({ new: next }) => {
      setRelay(next);
      setHistory(saveHistory({ id: next.id, role, status: next.status, stepCount: next.step_count ?? stepsOf(next).length, updatedAt: Date.now() }));
      if (next.status === 'complete') setScreen('result');
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id, role]);

  const clearMoveInputs = () => { setPhoto(''); setMarker(null); setText(''); setSecondPhoto(''); setClaim(''); setEvidence(''); setError(''); };
  const reset = () => { setScreen('home'); setRelay(null); setRole(''); setToken(''); clearMoveInputs(); setSeedPhoto(''); setSeedText(''); };
  const go = next => { setError(''); if (next === 'home' || next === 'create' || next === 'history') { setRelay(null); setRole(''); setToken(''); } setScreen(next); };
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
      setRelay(data); setRole('creator'); setToken(''); setScreen('waiting');
      saveSession(data.id, { role: 'creator', token: '' }); setHistory(saveHistory({ id: data.id, role: 'creator', status: data.status, stepCount: data.step_count ?? 0, updatedAt: Date.now() }));
    } catch (e) { setError(e?.message || 'Could not create the Pulse.'); } finally { setBusy(false); }
  }

  async function claimPulse() {
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_relay', { p_exclude_creator_id: deviceId() });
      if (rpcError) throw rpcError; if (!data?.relay) { setError('No Pulse is waiting right now.'); return; }
      setRelay(data.relay); setRole('stranger'); setToken(data.token); clearMoveInputs(); setScreen('move');
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
    const nextTask = step >= MAX_STEPS ? null : generateNextTask({ previous, history: actionHistory, seed: relay.id, step: step + 1, state: currentState });
    const output = serializeStep({ artifact, action, result, step, task, nextTask, state: currentState });
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
      setScreen(data.status === 'complete' ? 'result' : session.token ? 'move' : 'waiting');
    } catch (e) { setError(e?.message || 'Could not open that Pulse.'); } finally { setBusy(false); }
  }

  const taskInput = () => {
    if (task.inputType === 'tap') return <div className="space-y-3"><div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[#e9e2d4]" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setMarker({ x: ((e.clientX-r.left)/r.width)*100, y: ((e.clientY-r.top)/r.height)*100 }); }}><Photo src={currentArtifact}/>{marker && <motion.div initial={{ scale: .4 }} animate={{ scale: 1 }} className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/10 shadow-[0_0_0_5px_rgba(0,0,0,.25)]" style={{ left: `${marker.x}%`, top: `${marker.y}%` }}/>}</div><p className="text-sm text-[#7d7e72]">Tap the part you want to carry forward.</p></div>;
    if (task.inputType === 'text') return <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={5} maxLength={task.maxLength || 160} placeholder="Make your move…" className="w-full resize-none rounded-[28px] border border-[#24251f]/10 bg-white/65 p-5 text-lg outline-none placeholder:text-[#aaa99e] focus:border-[#24251f]/25"/>;
    if (task.inputType === 'compare') return <div className="space-y-3"><div className="grid aspect-[4/3] overflow-hidden rounded-[28px] bg-[#e9e2d4] grid-cols-2"><Photo src={currentArtifact}/><button onClick={() => photoInput.current?.click()} className="relative"><Photo src={secondPhoto}/>{!secondPhoto && <span className="absolute inset-0 grid place-items-center text-xs font-semibold">Add scene</span>}</button></div><input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={e => pickImage(e,setSecondPhoto)}/><textarea value={text} onChange={e=>setText(e.target.value)} rows={2} maxLength={160} placeholder="What changed?" className="w-full resize-none rounded-[24px] border border-[#24251f]/10 bg-white/65 p-4 outline-none"/></div>;
    if (task.inputType === 'challenge') return <div className="space-y-3"><input value={claim} onChange={e=>setClaim(e.target.value)} maxLength={160} placeholder="The current idea is…" className="w-full rounded-[24px] border border-[#24251f]/10 bg-white/65 p-4 outline-none"/><button onClick={() => photoInput.current?.click()} className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-[#e9e2d4]"><Photo src={secondPhoto}/>{!secondPhoto && <span className="absolute inset-0 grid place-items-center text-sm font-semibold">Add evidence</span>}</button><input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={e=>pickImage(e,setSecondPhoto)}/><textarea value={evidence} onChange={e=>setEvidence(e.target.value)} rows={2} maxLength={160} placeholder="How does it challenge the idea?" className="w-full resize-none rounded-[24px] border border-[#24251f]/10 bg-white/65 p-4 outline-none"/></div>;
    return <div className="space-y-3"><button onClick={() => photoInput.current?.click()} className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-[#e9e2d4]"><Photo src={photo}/>{!photo && <span className="absolute inset-0 grid place-items-center gap-2 text-sm font-semibold"><Camera size={22}/>Add a scene</span>}</button><input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={e=>pickImage(e,setPhoto)}/></div>;
  };

  const header = (title, back = true) => <header className="flex items-center justify-between pb-6">{back ? <button onClick={() => go('home')} className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/10 bg-white/45"><ArrowLeft size={18}/></button> : <div className="text-xs font-bold tracking-[.22em]">PULSE</div>}<span className="text-xs font-semibold text-[#7d7e72]">{title}</span><div className="w-10"/></header>;

  return <main className="min-h-screen bg-[#f7f2e8] text-[#24251f] selection:bg-[#24251f] selection:text-[#f7f2e8]">
    <AnimatePresence mode="wait">
      {screen === 'home' && <motion.section key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto min-h-screen max-w-xl px-5 pb-28 pt-8">
        {header('Pulses', false)}
        <div className="mb-5 flex items-end justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#85867a]">Still moving</p><h1 className="max-w-[300px] text-[42px] font-semibold leading-[.98] tracking-[-.045em]">Something is waiting for your move.</h1></div><Zap size={25}/></div>
        <button onClick={claimPulse} disabled={busy} className="group relative mb-5 block w-full overflow-hidden rounded-[32px] bg-[#24251f] p-6 text-left text-[#f7f2e8] shadow-xl"><div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border border-white/10"/><div className="relative"><div className="mb-20 text-xs font-semibold uppercase tracking-[.2em] text-white/55">LIVE RELAY</div><div className="flex items-end justify-between"><div><div className="text-2xl font-semibold">Enter a Pulse</div><p className="mt-1 text-sm text-white/55">See what someone left. Change it.</p></div><ArrowRight className="transition-transform group-hover:translate-x-1"/></div></div></button>
        <div className="grid grid-cols-2 gap-3"><button onClick={()=>go('create')} className="rounded-[28px] border border-[#24251f]/10 bg-white/50 p-5 text-left"><Plus size={19}/><div className="mt-12 font-semibold">Start one</div><p className="mt-1 text-xs text-[#85867a]">Leave the first move.</p></button><button onClick={()=>go('history')} className="rounded-[28px] border border-[#24251f]/10 bg-white/50 p-5 text-left"><History size={19}/><div className="mt-12 font-semibold">Your traces</div><p className="mt-1 text-xs text-[#85867a]">See where you changed things.</p></button></div>
        {error && <p className="mt-4 rounded-2xl bg-[#24251f] p-4 text-sm text-[#f7f2e8]">{error}</p>}
        <div className="mt-8 border-t border-[#24251f]/8 pt-6"><p className="text-xs leading-5 text-[#85867a]">A Pulse changes every time someone touches it. No two chains need to end in the same place.</p></div>
        <BottomNav screen={screen} go={go}/>
      </motion.section>}

      {screen === 'create' && <motion.section key="create" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-8">
        {header('Create')}
        <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#85867a]">Start a Pulse</p><h1 className="text-[44px] font-semibold leading-[.95] tracking-[-.05em]">Leave a starting point.</h1><p className="mt-4 max-w-md text-[#77786c]">It can be a scene or a thought. The next person decides what happens to it.</p>
        <div className="mt-7 flex gap-2 rounded-full bg-[#24251f]/6 p-1"><button onClick={()=>setSeedMode('photo')} className={`flex-1 rounded-full py-3 text-sm font-semibold ${seedMode==='photo'?'bg-white shadow-sm':''}`}>Scene</button><button onClick={()=>setSeedMode('text')} className={`flex-1 rounded-full py-3 text-sm font-semibold ${seedMode==='text'?'bg-white shadow-sm':''}`}>Thought</button></div>
        <div className="mt-4">{seedMode==='photo' ? <><button onClick={()=>seedInput.current?.click()} className="relative aspect-[4/3] w-full overflow-hidden rounded-[32px] bg-[#e9e2d4]"><Photo src={seedPhoto}/>{!seedPhoto && <span className="absolute inset-0 grid place-items-center gap-2 text-sm font-semibold"><Camera size={24}/>Add a scene</span>}</button><input ref={seedInput} type="file" accept="image/*" className="hidden" onChange={e=>pickImage(e,setSeedPhoto)}/></> : <textarea value={seedText} onChange={e=>setSeedText(e.target.value)} maxLength={240} rows={7} autoFocus placeholder="Leave a thought, question, observation…" className="w-full resize-none rounded-[32px] border border-[#24251f]/10 bg-white/60 p-6 text-lg outline-none placeholder:text-[#aaa99e]"/>}</div>
        {error && <p className="mt-4 text-sm font-medium">{error}</p>}<div className="mt-6"><Button onClick={createPulse} disabled={busy}>{busy?'Starting…':'Start Pulse'}</Button></div><p className="mt-4 text-xs leading-5 text-[#85867a]">Keep it safe and ordinary: no faces, private information, dangerous or restricted places.</p>
      </motion.section>}

      {screen === 'move' && <motion.section key="move" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto min-h-screen max-w-xl px-5 pb-10 pt-8">
        {header(`Move ${count + 1} / ${MAX_STEPS}`)}
        <div className="mb-8 h-1 overflow-hidden rounded-full bg-[#24251f]/8"><motion.div className="h-full rounded-full bg-[#24251f]" animate={{ width: `${progress*100}%` }}/></div>
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#85867a]">{actionMeta[task.actionType]?.icon && (()=>{const I=actionMeta[task.actionType].icon;return <I size={15}/>})()}{task.actionLabel || actionMeta[task.actionType]?.label || 'Move'}</div>
        <h1 className="max-w-[380px] text-[38px] font-semibold leading-[1.02] tracking-[-.04em]">{task.title}</h1><p className="mt-4 text-lg leading-7 text-[#5f6056]">{task.prompt}</p>
        <div className="mt-7">{taskInput()}</div><p className="mt-4 text-xs leading-5 text-[#85867a]">{task.hint}</p>{error && <p className="mt-4 rounded-2xl bg-[#24251f] p-4 text-sm text-[#f7f2e8]">{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#85867a]">The next person inherits your change.</span><Button onClick={submitMove} disabled={busy}>{busy?'Passing…':'Pass it on'}</Button></div>
      </motion.section>}

      {screen === 'waiting' && <motion.section key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-8">{header('Moving')}<div className="pt-10"><div className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-[#24251f] text-[#f7f2e8]"><Zap size={26}/></div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#85867a]">Pulse is moving</p><h1 className="mt-3 text-[46px] font-semibold leading-[.94] tracking-[-.05em]">Someone else gets the next move.</h1><div className="mt-10 overflow-hidden rounded-[32px] border border-[#24251f]/8 bg-white/45">{imageOf(payload) ? <div className="aspect-[4/3]"><Photo src={imageOf(payload)}/></div> : <div className="p-6 text-xl leading-8">{textOf(payload) || currentState.summary}</div>}<div className="flex items-center justify-between border-t border-[#24251f]/8 p-5"><span className="text-sm font-semibold">{count} / {MAX_STEPS} moves</span><div className="flex gap-1">{Array.from({length:MAX_STEPS}).map((_,i)=><span key={i} className={`h-2 w-7 rounded-full ${i<count?'bg-[#24251f]':'bg-[#24251f]/10'}`}/>)}</div></div></div><div className="mt-7"><Button secondary onClick={()=>go('home')} icon={ArrowLeft}>Back to Pulses</Button></div></div></motion.section>}

      {screen === 'result' && <motion.section key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-[#24251f] px-5 pb-12 pt-8 text-[#f7f2e8]"> <div className="mx-auto max-w-xl"> <header className="flex items-center justify-between"><button onClick={()=>go('home')} className="grid h-10 w-10 place-items-center rounded-full border border-white/10"><ArrowLeft size={18}/></button><span className="text-xs font-bold uppercase tracking-[.2em] text-white/45">The Reveal</span><div className="w-10"/></header><div className="pt-16"><p className="text-xs font-bold uppercase tracking-[.2em] text-white/45">5 people. One Pulse.</p><h1 className="mt-3 text-[52px] font-semibold leading-[.92] tracking-[-.055em]">Look what happened.</h1><p className="mt-5 max-w-md text-lg leading-7 text-white/55">Nobody had the whole picture. The chain made the final state.</p></div><div className="mt-10 space-y-3">{payloadsOf(relay).map((p,i)=><div key={i} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[.05]"><div className="flex items-center justify-between px-5 py-4"><span className="text-xs font-bold uppercase tracking-[.16em] text-white/45">Move {i+1}</span>{p.action && <span className="text-xs text-white/45">{p.action}</span>}</div>{imageOf(p)?<div className="aspect-[4/3]"><Photo src={imageOf(p)}/></div>:<div className="px-5 pb-6 text-xl leading-8">{textOf(p) || p.state?.summary}</div>}</div>)}</div><div className="mt-8 rounded-[28px] border border-white/10 bg-white/[.05] p-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-white/45">Your trace</p><p className="mt-2 text-2xl font-semibold">YOU WERE HERE.</p><p className="mt-2 text-sm leading-6 text-white/55">Your move is one link in the chain.</p></div><div className="mt-8 flex gap-3"><Button onClick={()=>go('home')} icon={RotateCcw}>Start again</Button><Button secondary onClick={claimPulse} icon={ArrowRight} className="border-white/15 bg-white/10 text-white">Another Pulse</Button></div></div></motion.section>}

      {screen === 'history' && <motion.section key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-8">{header('Activity')}<p className="text-xs font-bold uppercase tracking-[.2em] text-[#85867a]">Your traces</p><h1 className="mt-2 text-[46px] font-semibold leading-[.95] tracking-[-.05em]">Where you changed things.</h1><div className="mt-8 space-y-3">{history.length===0?<div className="rounded-[30px] border border-[#24251f]/8 bg-white/45 p-6 text-[#77786c]">Your first trace will appear here.</div>:history.map(entry=><button key={entry.id} onClick={()=>resume(entry)} className="flex w-full items-center justify-between rounded-[26px] border border-[#24251f]/8 bg-white/45 p-5 text-left"><div><p className="text-sm font-semibold">{entry.status==='complete'?'Completed Pulse':'Pulse in motion'}</p><p className="mt-1 text-xs text-[#85867a]">{entry.stepCount} / {MAX_STEPS} moves · {entry.role==='creator'?'Started':'Joined'}</p></div><ArrowRight size={17}/></button>)}</div>{error && <p className="mt-4 text-sm">{error}</p>}<div className="mt-8"><Button secondary onClick={()=>go('home')} icon={ArrowLeft}>Back</Button></div></motion.section>}
    </AnimatePresence>
  </main>;
}
