'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Camera, History, MapPin, RotateCcw, Send, Sparkles, Target, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MAX_STEPS, START_TASK, latestPayload, nextTaskForStep, serializeStep, starterPayload } from '../lib/pulse-v2';

const HISTORY_KEY = 'pulse:v2:pulses';
const SESSION_KEY = 'pulse:v2:sessions';

function parse(value, fallback = null) { try { return JSON.parse(value); } catch { return fallback; } }
function stepsOf(relay) { return Array.isArray(relay?.steps) ? relay.steps : []; }
function readSessions() { if (typeof window === 'undefined') return {}; return parse(localStorage.getItem(SESSION_KEY) || '{}', {}); }
function readHistory() { if (typeof window === 'undefined') return []; return parse(localStorage.getItem(HISTORY_KEY) || '[]', []); }
function saveSession(id, value) { const all = readSessions(); all[id] = value; localStorage.setItem(SESSION_KEY, JSON.stringify(all)); }
function saveHistory(entry) { const next = [entry, ...readHistory().filter((item) => item.id !== entry.id)].slice(0, 30); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); }
function taskForRelay(relay) { const payload = latestPayload(relay); return payload?.task || (relay?.step_count ? nextTaskForStep(relay.step_count) : START_TASK); }

async function imageFileToDataUrl(file, maxSide = 960, quality = 0.68) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose an image.');
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

function PhotoFrame({ dataUrl, marker, onMark, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-[32px] bg-[#d7cfbf] shadow-[0_30px_80px_rgba(70,62,43,.18)] ${onMark ? 'cursor-crosshair' : ''} ${className}`} onClick={(event) => {
      if (!onMark) return;
      const rect = event.currentTarget.getBoundingClientRect();
      onMark({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
    }}>
      {dataUrl ? <img src={dataUrl} alt="Pulse" className="block h-full w-full object-cover" /> : null}
      {marker ? <motion.div initial={{ scale: .3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#f3efe5] shadow-[0_0_0_5px_rgba(36,37,31,.24)]" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} /> : null}
    </div>
  );
}

function TaskHeader({ step, task, onClose }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-5 py-5 sm:px-9">
      <div className="pointer-events-auto max-w-[min(560px,78vw)]">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]"><span>{Math.min(step + 1, MAX_STEPS + 1)} / {MAX_STEPS + 1}</span><span className="h-px w-7 bg-[#24251f]/15" /><span>Pulse</span></div>
        <h1 className="text-balance text-[clamp(1.45rem,5vw,2.35rem)] font-semibold leading-[1.02] tracking-[-.035em]">{task?.title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-5 text-[#686b5b]">{task?.prompt}</p>
        {task?.hint ? <p className="mt-1 text-xs text-[#8b8674]">{task.hint}</p> : null}
      </div>
      {onClose ? <button onClick={onClose} className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#24251f]/12 bg-[#f3efe5]/72" aria-label="Close"><X size={16} /></button> : null}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, icon: Icon = ArrowRight }) {
  return <button disabled={disabled} onClick={onClick} className="inline-flex items-center justify-center gap-3 rounded-full bg-[#24251f] px-6 py-3 text-sm font-semibold text-[#f3efe5] transition-transform active:scale-[.98] disabled:opacity-35">{children}<Icon size={17} /></button>;
}

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [creatorPhoto, setCreatorPhoto] = useState('');
  const [photo, setPhoto] = useState('');
  const [marker, setMarker] = useState(null);
  const [title, setTitle] = useState('');
  const photoInputRef = useRef(null);

  const payload = useMemo(() => latestPayload(relay), [relay]);
  const task = useMemo(() => taskForRelay(relay), [relay]);
  const count = relay?.step_count ?? stepsOf(relay).length;

  useEffect(() => { setHistory(readHistory()); }, []);

  useEffect(() => {
    if (!relay?.id) return undefined;
    const channel = supabase.channel(`pulse-v2-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, ({ new: next }) => {
      setRelay(next);
      saveHistory({ id: next.id, role, status: next.status, stepCount: next.step_count ?? stepsOf(next).length, updatedAt: Date.now() });
      setHistory(readHistory());
      if (next.status === 'complete' && role === 'stranger') setScreen('result');
      if (next.status !== 'complete' && role === 'stranger' && !token) setScreen('waiting');
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id, role, token]);

  function openCreate() { setCreatorPhoto(''); setPhoto(''); setMarker(null); setTitle(''); setError(''); setScreen('create'); }

  async function onPhotoPicked(event, setter = setPhoto) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { setBusy(true); setError(''); setter(await imageFileToDataUrl(file)); }
    catch (err) { setError(err?.message || 'Could not read that photo.'); }
    finally { setBusy(false); }
  }

  async function createPulse() {
    if (!creatorPhoto) { setError('Take the first photo.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: dbError } = await supabase.rpc('create_relay', { p_seed: JSON.stringify(starterPayload(creatorPhoto)) });
      if (dbError) throw dbError;
      if (!data?.id) throw new Error('Pulse could not be created.');
      setRelay(data); setRole('creator'); setToken('');
      saveSession(data.id, { role: 'creator', token: '' });
      saveHistory({ id: data.id, role: 'creator', status: data.status, stepCount: data.step_count ?? 0, updatedAt: Date.now() });
      setHistory(readHistory()); setScreen('waiting');
    } catch (err) { setError(err?.message || 'Pulse could not be created.'); }
    finally { setBusy(false); }
  }

  async function claimPulse() {
    setBusy(true); setError('');
    try {
      const { data, error: dbError } = await supabase.rpc('claim_relay');
      if (dbError) throw dbError;
      if (!data?.relay) { setError('Nothing is waiting right now.'); return; }
      setRelay(data.relay); setRole('stranger'); setToken(data.token); setPhoto(''); setMarker(null); setTitle('');
      saveSession(data.relay.id, { role: 'stranger', token: data.token });
      saveHistory({ id: data.relay.id, role: 'stranger', status: data.relay.status, stepCount: data.relay.step_count ?? 0, updatedAt: Date.now() });
      setHistory(readHistory()); setScreen('task');
    } catch (err) { setError(err?.message || 'Could not find a Pulse.'); }
    finally { setBusy(false); }
  }

  async function submitStep() {
    if (!relay || !token || busy) return;
    let action = null; let result = null; let nextArtifact = null;
    if (task?.kind === 'mark') {
      if (!marker) { setError('Tap one detail in the photo.'); return; }
      action = 'mark'; result = { marker }; nextArtifact = { ...payload.artifact, marker };
    } else if (task?.kind === 'title') {
      const clean = title.trim().replace(/\s+/g, ' ');
      if (!clean || clean.length > 36) { setError('Give it a short name.'); return; }
      action = 'title'; result = { title: clean }; nextArtifact = { ...payload.artifact, title: clean };
    } else if (task?.kind === 'capture') {
      if (!photo) { setError('Take the photo first.'); return; }
      action = 'capture'; result = { dataUrl: photo }; nextArtifact = { type: 'photo', dataUrl: photo, title: payload?.artifact?.title || null };
    }
    setBusy(true); setError('');
    try {
      const nextStep = count + 1;
      const output = serializeStep({ artifact: nextArtifact, action, result, step: nextStep, title: nextArtifact?.title || null });
      const { data, error: dbError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output });
      if (dbError) throw dbError;
      setRelay(data); setToken(''); saveSession(relay.id, { role, token: '' });
      saveHistory({ id: data.id, role, status: data.status, stepCount: data.step_count ?? stepsOf(data).length, updatedAt: Date.now() });
      setHistory(readHistory()); setPhoto(''); setMarker(null); setTitle('');
      setScreen(data.status === 'complete' || !nextTaskForStep(nextStep) ? 'result' : 'waiting');
    } catch (err) { setError(err?.message || 'Could not pass this Pulse.'); }
    finally { setBusy(false); }
  }

  async function resume(entry) {
    setBusy(true); setError('');
    try {
      const { data, error: dbError } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle();
      if (dbError || !data) throw dbError || new Error('That Pulse is gone.');
      const session = readSessions()[entry.id] || {};
      setRelay(data); setRole(entry.role || session.role || 'creator'); setToken(session.token || '');
      setScreen(data.status === 'complete' ? 'result' : session.token ? 'task' : 'waiting'); setShowHistory(false);
    } catch (err) { setError(err?.message || 'That Pulse is gone.'); }
    finally { setBusy(false); }
  }

  function reset() { setScreen('home'); setRelay(null); setRole(''); setToken(''); setCreatorPhoto(''); setPhoto(''); setMarker(null); setTitle(''); setError(''); setShowHistory(false); }

  const finalPhoto = payload?.artifact?.dataUrl;
  const displayMarker = payload?.artifact?.marker;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#e8e1d2] text-[#24251f]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-35 [background-image:radial-gradient(rgba(36,37,31,.08)_1px,transparent_1px)] [background-size:5px_5px]" />
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-5 sm:px-9"><button onClick={reset} className="text-sm font-black tracking-[.28em]">PULSE</button><button onClick={() => setShowHistory(true)} aria-label="History" className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/12 bg-[#f3efe5]/72"><History size={17} strokeWidth={1.7} /></button></header>

      <AnimatePresence mode="wait">
        {screen === 'home' && <motion.section key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-dvh flex-col justify-center px-5 py-28 sm:px-10"><div className="mx-auto w-full max-w-6xl"><div className="grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end"><div><p className="mb-5 text-[11px] font-black uppercase tracking-[.3em] text-[#686b5b]">one task. one human. then another.</p><h1 className="max-w-4xl text-balance text-[clamp(3rem,9vw,7.7rem)] font-semibold leading-[.86] tracking-[-.065em]">The world<br />changes hands.</h1><p className="mt-7 max-w-xl text-base leading-7 text-[#686b5b]">A Pulse starts in one real place, gets reinterpreted by strangers, and keeps moving until it becomes something nobody planned.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:pb-2"><button onClick={openCreate} className="group min-h-44 rounded-[30px] bg-[#667052] p-6 text-left text-[#f3efe5] transition-transform active:scale-[.99]"><div className="flex items-start justify-between"><Camera size={22} /><ArrowRight className="transition-transform group-hover:translate-x-1" size={20} /></div><div className="mt-16 text-xl font-semibold tracking-[-.03em]">Start a Pulse</div><div className="mt-1 text-sm text-[#f3efe5]/65">Give a stranger the first move.</div></button><button onClick={claimPulse} disabled={busy} className="group min-h-44 rounded-[30px] border border-[#24251f]/12 bg-[#f3efe5]/72 p-6 text-left transition-transform active:scale-[.99] disabled:opacity-40"><div className="flex items-start justify-between"><Target size={22} /><ArrowRight className="transition-transform group-hover:translate-x-1" size={20} /></div><div className="mt-16 text-xl font-semibold tracking-[-.03em]">Find a Pulse</div><div className="mt-1 text-sm text-[#686b5b]">Pick up where someone left off.</div></button></div></div></div></motion.section>}

        {screen === 'create' && <motion.section key="create" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex min-h-dvh flex-col items-center px-5 pb-12 pt-32 sm:px-9"><div className="w-full max-w-3xl"><div className="mb-7"><span className="text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]">01 / 04</span><h1 className="mt-2 text-4xl font-semibold leading-none tracking-[-.04em]">Start in your town.</h1></div><div className="grid gap-8 md:grid-cols-[1fr_290px] md:items-end"><div>{creatorPhoto ? <PhotoFrame dataUrl={creatorPhoto} className="aspect-[4/3]" /> : <button onClick={() => photoInputRef.current?.click()} className="grid aspect-[4/3] w-full place-items-center rounded-[32px] border border-dashed border-[#24251f]/20 bg-[#f3efe5]/55"><div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#24251f] text-[#f3efe5]"><Camera size={25} /></div><p className="mt-4 font-medium">Take the first photo</p><p className="mt-1 text-sm text-[#686b5b]">Something ordinary that someone might walk past.</p></div></button>}<input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => onPhotoPicked(event, setCreatorPhoto)} /></div><div className="rounded-[26px] border border-[#24251f]/10 bg-[#f3efe5]/65 p-5"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#686b5b]"><MapPin size={14} /> The first task</div><p className="mt-4 text-lg font-semibold leading-tight">Take a photo of something in your town that most people would walk past.</p><p className="mt-4 text-sm leading-6 text-[#686b5b]">No landmark. No setup. Just something you noticed.</p>{creatorPhoto ? <button onClick={() => setCreatorPhoto('')} className="mt-6 text-xs font-semibold underline underline-offset-4">Retake</button> : null}</div></div><div className="mt-7 flex items-center justify-between border-t border-[#24251f]/10 pt-5"><p className="max-w-md text-xs leading-5 text-[#686b5b]">Your photo becomes the starting point. You do not control what the next person does with it.</p><PrimaryButton onClick={createPulse} disabled={!creatorPhoto || busy} icon={Send}>Release it</PrimaryButton></div>{error ? <p className="mt-4 text-sm text-[#9a5f4e]">{error}</p> : null}</div></motion.section>}

        {screen === 'waiting' && <motion.section key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-dvh items-center justify-center px-5 py-28 sm:px-9"><div className="w-full max-w-2xl text-center">{finalPhoto ? <PhotoFrame dataUrl={finalPhoto} marker={displayMarker} className="mx-auto aspect-[4/3] max-w-lg" /> : null}<div className="mx-auto mt-8 max-w-xl"><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]">{count === 0 ? 'released' : `passed ${count} time${count === 1 ? '' : 's'}`}</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">Your Pulse is out there.</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#686b5b]">Someone else gets the next move. Come back later and see what your original idea became.</p>{role === 'creator' ? <button onClick={reset} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Leave it alone <ArrowRight size={14} /></button> : <div className="mt-7 text-xs text-[#686b5b]">Waiting for the next handoff…</div>}</div></div></motion.section>}

        {screen === 'task' && <motion.section key="task" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative flex min-h-dvh flex-col px-5 pb-12 pt-28 sm:px-9"><TaskHeader step={count} task={task} onClose={reset} /><div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center pt-10">
          {task?.kind === 'capture' && <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">{photo ? <PhotoFrame dataUrl={photo} className="aspect-[4/3] w-full" /> : <button onClick={() => photoInputRef.current?.click()} className="grid aspect-[4/3] w-full place-items-center rounded-[32px] border border-dashed border-[#24251f]/20 bg-[#f3efe5]/55"><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#24251f] text-[#f3efe5]"><Camera size={30} /></div><p className="mt-5 font-semibold">Use the camera</p><p className="mt-1 text-sm text-[#686b5b]">Make the next frame a reply.</p></div></button>}<input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => onPhotoPicked(event, setPhoto)} /><div className="rounded-[28px] border border-[#24251f]/10 bg-[#f3efe5]/62 p-5">{payload?.artifact?.title ? <><div className="text-[10px] font-black uppercase tracking-[.22em] text-[#686b5b]">Someone named it</div><div className="mt-3 text-2xl font-semibold leading-tight tracking-[-.03em]">“{payload.artifact.title}”</div></> : null}<div className="mt-7 flex items-center justify-between gap-4"><button onClick={() => setPhoto('')} disabled={!photo} className="text-xs font-semibold underline underline-offset-4 disabled:opacity-30">Retake</button><PrimaryButton onClick={submitStep} disabled={!photo || busy} icon={Send}>Pass it on</PrimaryButton></div></div></div>}
          {task?.kind === 'mark' && <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end"><PhotoFrame dataUrl={payload?.artifact?.dataUrl} marker={marker} onMark={setMarker} className="aspect-[4/3] w-full" /><div className="rounded-[28px] border border-[#24251f]/10 bg-[#f3efe5]/62 p-5"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#686b5b]"><Target size={14} /> One decision</div><p className="mt-4 text-lg font-semibold leading-snug">Do not edit the whole image. Just decide what deserves attention.</p><p className="mt-3 text-sm leading-6 text-[#686b5b]">Tap one detail. That single choice becomes the next person’s context.</p><div className="mt-6 flex items-center justify-between gap-3"><button onClick={() => setMarker(null)} disabled={!marker} className="text-xs font-semibold underline underline-offset-4 disabled:opacity-30">Clear</button><PrimaryButton onClick={submitStep} disabled={!marker || busy} icon={Send}>Pass it on</PrimaryButton></div></div></div>}
          {task?.kind === 'title' && <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end"><PhotoFrame dataUrl={payload?.artifact?.dataUrl} marker={displayMarker} className="aspect-[4/3] w-full" /><div className="rounded-[28px] border border-[#24251f]/10 bg-[#f3efe5]/62 p-5"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#686b5b]"><Sparkles size={14} /> Change the meaning</div><label className="mt-5 block text-sm font-medium" htmlFor="pulse-title">Name what you see</label><input id="pulse-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={36} autoComplete="off" placeholder="The place nobody looks" className="mt-2 w-full border-b border-[#24251f]/20 bg-transparent py-3 text-xl font-semibold outline-none placeholder:text-[#8b8674]/65" /><div className="mt-3 flex items-center justify-between text-[11px] text-[#8b8674]"><span>5 words or less</span><span>{title.length}/36</span></div><div className="mt-6 flex justify-end"><PrimaryButton onClick={submitStep} disabled={!title.trim() || busy} icon={Send}>Pass it on</PrimaryButton></div></div></div>}
        </div>{error ? <p className="mx-auto mt-5 w-full max-w-5xl text-sm text-[#9a5f4e]">{error}</p> : null}</motion.section>}

        {screen === 'result' && <motion.section key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-dvh items-center justify-center px-5 py-28 sm:px-9"><div className="w-full max-w-4xl"><div className="mb-8 flex items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]">pulse complete</p><h1 className="mt-2 text-4xl font-semibold leading-none tracking-[-.045em]">Look what happened.</h1></div><div className="hidden text-right sm:block"><div className="text-2xl font-semibold">{count}</div><div className="text-xs text-[#686b5b]">human handoffs</div></div></div>{finalPhoto ? <div className="overflow-hidden rounded-[34px] bg-[#d7cfbf] shadow-[0_40px_100px_rgba(70,62,43,.18)]"><img src={finalPhoto} alt="Completed Pulse" className="mx-auto max-h-[68vh] w-full object-contain" /></div> : null}{payload?.artifact?.title ? <div className="mt-6 max-w-xl"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#686b5b]">the last title</p><p className="mt-2 text-2xl font-semibold tracking-[-.03em]">“{payload.artifact.title}”</p></div> : null}<div className="mt-7 flex items-center justify-between gap-4"><p className="max-w-md text-sm leading-6 text-[#686b5b]">You did not make this alone. That is the point.</p><PrimaryButton onClick={reset} icon={RotateCcw}>Run another</PrimaryButton></div></div></motion.section>}
      </AnimatePresence>

      {showHistory ? <div className="fixed inset-0 z-50 bg-[#24251f]/25 backdrop-blur-sm" onClick={() => setShowHistory(false)}><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#f3efe5] p-6 sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]">Archive</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.04em]">Your Pulses</h2></div><button onClick={() => setShowHistory(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/12"><X size={16} /></button></div><div className="mt-7 flex-1 space-y-3 overflow-y-auto">{history.length ? history.map((entry) => <button key={entry.id} onClick={() => resume(entry)} className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-[#24251f]/10 bg-white/35 p-4 text-left"><div><div className="text-sm font-semibold">{entry.status === 'complete' ? 'Complete' : entry.role === 'creator' ? 'Waiting' : 'In motion'}</div><div className="mt-1 text-xs text-[#686b5b]">{entry.stepCount || 0} handoff{entry.stepCount === 1 ? '' : 's'}</div></div><ArrowRight size={15} /></button>) : <div className="rounded-[22px] border border-dashed border-[#24251f]/15 p-5 text-sm leading-6 text-[#686b5b]">Nothing here yet. Start one and let it leave your hands.</div>}</div>{error ? <p className="mt-4 text-sm text-[#9a5f4e]">{error}</p> : null}</aside></div> : null}
      {error && screen === 'home' ? <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-5"><div className="rounded-full border border-[#9a5f4e]/20 bg-[#f3efe5]/92 px-5 py-3 text-sm text-[#9a5f4e] shadow-lg">{error}</div></div> : null}
    </main>
  );
}
