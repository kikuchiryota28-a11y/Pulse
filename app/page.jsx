'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, GitCompare, History, MessageCircleQuestion, Target, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ACTIONS, MAX_STEPS, START_TASK, generateNextTask, latestPayload, parsePayload, serializeStep, starterPayload } from '../lib/pulse-v2';

const HISTORY_KEY = 'pulse:v3:pulses';
const SESSION_KEY = 'pulse:v3:sessions';
const DEVICE_KEY = 'pulse:v4:creator-id';

function safeParse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function stepsOf(relay) { return Array.isArray(relay?.steps) ? relay.steps : []; }
function readHistory() { if (typeof window === 'undefined') return []; return safeParse(localStorage.getItem(HISTORY_KEY) || '[]', []); }
function readSessions() { if (typeof window === 'undefined') return {}; return safeParse(localStorage.getItem(SESSION_KEY) || '{}', {}); }
function saveHistory(entry) { const next = [entry, ...readHistory().filter((x) => x.id !== entry.id)].slice(0, 30); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); }
function saveSession(id, value) { const next = readSessions(); next[id] = value; localStorage.setItem(SESSION_KEY, JSON.stringify(next)); }
function deviceId() { if (typeof window === 'undefined') return ''; let id = localStorage.getItem(DEVICE_KEY); if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); } return id; }
function payloadsOf(relay) { return stepsOf(relay).map((s) => parsePayload(s?.output)).filter(Boolean); }
function currentPayload(relay) { return latestPayload(relay) || parsePayload(relay?.seed) || null; }
function imageOf(payload) { return payload?.artifact?.dataUrl || payload?.result?.dataUrl || null; }
function textOf(payload) { return payload?.artifact?.text || payload?.result?.text || payload?.result?.note || payload?.result?.evidence || payload?.result?.summary || ''; }
function actionIcon(action) { if (action === ACTIONS.CHOOSE) return Target; if (action === ACTIONS.FIND || action === ACTIONS.CAPTURE) return Camera; if (action === ACTIONS.COMPARE) return GitCompare; if (action === ACTIONS.CHALLENGE) return MessageCircleQuestion; return Zap; }

async function imageFileToDataUrl(file, maxSide = 720, quality = 0.55) {
  if (!file?.type?.startsWith('image/')) throw Error('Choose an image.');
  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Could not read the image.');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.toDataURL('image/jpeg', quality);
}

function PhotoFrame({ dataUrl, marker, onMark }) {
  if (!dataUrl) return <div className="grid aspect-[4/3] place-items-center rounded-[28px] border border-dashed border-[#24251f]/15 bg-[#f3efe5]/45 text-sm text-[#686b5b]">Add a photo</div>;
  return <div className={`relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[#d6cdbb] ${onMark ? 'cursor-crosshair' : ''}`} onClick={(event) => { if (!onMark) return; const rect = event.currentTarget.getBoundingClientRect(); onMark({ x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 }); }}><img src={dataUrl} alt="Pulse" className="block h-full w-full object-cover" />{marker ? <motion.div initial={{ scale: .3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/10 shadow-[0_0_0_5px_rgba(36,37,31,.28)]" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} /> : null}</div>;
}

function PrimaryButton({ children, onClick, disabled, icon: Icon = ArrowRight, type = 'button' }) {
  return <button type={type} disabled={disabled} onClick={onClick} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#24251f] px-6 py-3 text-sm font-semibold text-[#f3efe5] transition-transform hover:-translate-y-0.5 active:scale-[.98] disabled:pointer-events-none disabled:opacity-35">{children}<Icon size={17} /></button>;
}

function ActionMark({ action }) { const Icon = actionIcon(action); return <Icon size={15} strokeWidth={2.2} />; }

function PreviousMove({ payload }) {
  const image = imageOf(payload); const text = textOf(payload); const marker = payload?.artifact?.marker || payload?.result?.marker;
  return <div className="overflow-hidden rounded-[28px] bg-[#24251f] text-[#f3efe5]">{image ? <PhotoFrame dataUrl={image} marker={marker} /> : <div className="min-h-32 p-6 text-xl leading-8">{text || 'The previous move is waiting.'}</div>}</div>;
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
  const [text, setText] = useState('');
  const [compareNote, setCompareNote] = useState('');
  const [claim, setClaim] = useState('');
  const [challengeEvidence, setChallengeEvidence] = useState('');
  const creatorInputRef = useRef(null);
  const payload = useMemo(() => currentPayload(relay), [relay]);
  const task = useMemo(() => payload?.task || START_TASK, [payload]);
  const count = relay?.step_count ?? stepsOf(relay).length;
  const revealSteps = useMemo(() => payloadsOf(relay), [relay]);
  const currentArtifact = imageOf(payload);

  useEffect(() => { setHistory(readHistory()); }, []);
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

  function reset() { setScreen('home'); setRelay(null); setRole(''); setToken(''); setCreatorPhoto(''); setPhoto(''); setMarker(null); setText(''); setCompareNote(''); setClaim(''); setChallengeEvidence(''); setError(''); setShowHistory(false); }

  async function onPhotoPicked(event, setter) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try { setBusy(true); setError(''); setter(await imageFileToDataUrl(file)); } catch (err) { setError(err?.message || 'Could not read the image.'); } finally { setBusy(false); }
  }

  async function createPulse() {
    if (!creatorPhoto) { setError('Add the first photo.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('create_relay', { p_seed: JSON.stringify(starterPayload(creatorPhoto, deviceId())) });
      if (rpcError) throw rpcError; if (!data?.id) throw Error('Could not create the Pulse.');
      setRelay(data); setRole('creator'); setToken(''); setScreen('waiting');
      saveSession(data.id, { role: 'creator', token: '' }); saveHistory({ id: data.id, role: 'creator', status: data.status, stepCount: data.step_count ?? 0, updatedAt: Date.now() }); setHistory(readHistory());
    } catch (err) { setError(err?.message || 'Could not create the Pulse.'); } finally { setBusy(false); }
  }

  async function claimPulse() {
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_relay', { p_exclude_creator_id: deviceId() });
      if (rpcError) throw rpcError; if (!data?.relay) { setError('No Pulse is available right now.'); return; }
      setRelay(data.relay); setRole('stranger'); setToken(data.token); setPhoto(''); setMarker(null); setText(''); setCompareNote(''); setClaim(''); setChallengeEvidence(''); setScreen('task');
      saveSession(data.relay.id, { role: 'stranger', token: data.token }); saveHistory({ id: data.relay.id, role: 'stranger', status: data.relay.status, stepCount: data.relay.step_count ?? 0, updatedAt: Date.now() }); setHistory(readHistory());
    } catch (err) { setError(err?.message || 'Could not find a Pulse.'); } finally { setBusy(false); }
  }

  async function submitStep() {
    if (!relay || !token || busy) return;
    const action = task?.actionType; const inputType = task?.inputType; let result = {}; let nextArtifact = payload?.artifact || null;
    if (inputType === 'tap') {
      if (!marker) { setError('Tap one place in the image.'); return; }
      result = { marker, summary: 'Selected one point in the image.' }; nextArtifact = { ...nextArtifact, marker };
    } else if (inputType === 'text') {
      const clean = text.trim().replace(/\s+/g, ' '); if (!clean) { setError('Enter one short sentence.'); return; }
      if (clean.length > (task.maxLength || 120)) { setError(`Keep it under ${task.maxLength || 120} characters.`); return; }
      result = { text: clean, summary: clean }; nextArtifact = { type: 'text', text: clean };
    } else if (inputType === 'compare') {
      const note = compareNote.trim().replace(/\s+/g, ' '); if (!photo) { setError('Add one new photo to compare.'); return; }
      if (!note || note.length > 120) { setError('Describe the difference in one sentence.'); return; }
      result = { dataUrl: photo, note, summary: note }; nextArtifact = { type: 'compare', previousDataUrl: currentArtifact || null, dataUrl: photo, note };
    } else if (inputType === 'challenge') {
      const cleanClaim = claim.trim().replace(/\s+/g, ' '); const evidence = challengeEvidence.trim().replace(/\s+/g, ' ');
      if (!cleanClaim || cleanClaim.length > 120) { setError('State the claim in one sentence.'); return; }
      if (!photo) { setError('Add a photo that could challenge the claim.'); return; }
      if (!evidence || evidence.length > 120) { setError('Explain the challenge in one sentence.'); return; }
      result = { claim: cleanClaim, dataUrl: photo, evidence, summary: evidence }; nextArtifact = { type: 'challenge', dataUrl: photo, claim: cleanClaim, evidence };
    } else {
      if (!photo) { setError('Add one photo.'); return; }
      result = { dataUrl: photo, summary: 'Left a new photo.' }; nextArtifact = { type: 'photo', dataUrl: photo, marker: null, text: null };
    }
    const currentStep = count + 1; const previous = { ...payload, action, result, artifact: nextArtifact, task };
    const actionHistory = [...payloadsOf(relay).map((item) => item.action).filter(Boolean), action];
    const nextTask = currentStep >= MAX_STEPS ? null : generateNextTask({ previous, history: actionHistory, seed: relay.id, step: currentStep + 1 });
    const output = serializeStep({ artifact: nextArtifact, action, result, step: currentStep, task, nextTask });
    try { JSON.parse(output); } catch { setError('Could not prepare your response.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output });
      if (rpcError) throw rpcError;
      setRelay(data); setToken(''); saveSession(relay.id, { role, token: '' });
      saveHistory({ id: data.id, role, status: data.status, stepCount: data.step_count ?? stepsOf(data).length, updatedAt: Date.now() }); setHistory(readHistory());
      setPhoto(''); setMarker(null); setText(''); setCompareNote(''); setClaim(''); setChallengeEvidence('');
      setScreen(data.status === 'complete' || !nextTask ? 'result' : 'waiting');
    } catch (err) { setError(err?.message || 'Could not pass the Pulse to the next person.'); } finally { setBusy(false); }
  }

  async function resume(entry) {
    setBusy(true); setError('');
    try {
      const { data, error: fetchError } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle();
      if (fetchError || !data) throw fetchError || Error('That Pulse is no longer available.');
      const session = readSessions()[entry.id] || {};
      setRelay(data); setRole(entry.role || session.role || 'creator'); setToken(session.token || ''); setShowHistory(false); setScreen(data.status === 'complete' ? 'result' : session.token ? 'task' : 'waiting');
    } catch (err) { setError(err?.message || 'Could not open that Pulse.'); } finally { setBusy(false); }
  }

  function renderInput() {
    const type = task?.inputType;
    if (type === 'tap') return <div className="space-y-4"><PhotoFrame dataUrl={currentArtifact} marker={marker} onMark={setMarker} /><p className="text-sm text-[#686b5b]">Choose the place that catches your eye.</p></div>;
    if (type === 'text') return <div className="rounded-[26px] border border-[#24251f]/12 bg-[#f3efe5]/70 p-5"><textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); submitStep(); } }} maxLength={task.maxLength || 120} rows={4} placeholder={task.actionType === ACTIONS.PREDICT ? 'Your prediction' : 'Your move'} className="w-full resize-none bg-transparent text-xl leading-8 outline-none placeholder:text-[#686b5b]/40" /><div className="mt-3 text-right text-xs text-[#686b5b]">{text.length}/{task.maxLength || 120}</div></div>;
    if (type === 'compare') return <div className="space-y-4"><div className="grid grid-cols-2 gap-2"><PhotoFrame dataUrl={currentArtifact} /><PhotoFrame dataUrl={photo} /></div><label className="block rounded-[24px] border border-[#24251f]/12 bg-[#f3efe5]/70 p-5"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.18em] text-[#686b5b]">Your observation</span><textarea value={compareNote} onChange={(event) => setCompareNote(event.target.value)} maxLength={120} rows={3} placeholder="What changed?" className="w-full resize-none bg-transparent text-lg leading-7 outline-none" /></label><button type="button" onClick={() => document.getElementById('pulse-photo-input')?.click()} className="rounded-full border border-[#24251f]/15 px-5 py-3 text-sm font-semibold">Add photo</button></div>;
    if (type === 'challenge') return <div className="space-y-4"><label className="block rounded-[24px] border border-[#24251f]/12 bg-[#f3efe5]/70 p-5"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.18em] text-[#686b5b]">Claim</span><textarea value={claim} onChange={(event) => setClaim(event.target.value)} maxLength={120} rows={2} placeholder="What are you challenging?" className="w-full resize-none bg-transparent text-lg leading-7 outline-none" /></label><PhotoFrame dataUrl={photo} /><label className="block rounded-[24px] border border-[#24251f]/12 bg-[#f3efe5]/70 p-5"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.18em] text-[#686b5b]">Your evidence</span><textarea value={challengeEvidence} onChange={(event) => setChallengeEvidence(event.target.value)} maxLength={120} rows={2} placeholder="Why does it challenge the claim?" className="w-full resize-none bg-transparent text-lg leading-7 outline-none" /></label><button type="button" onClick={() => document.getElementById('pulse-photo-input')?.click()} className="rounded-full border border-[#24251f]/15 px-5 py-3 text-sm font-semibold">Add photo</button></div>;
    return <div className="space-y-4"><PhotoFrame dataUrl={photo} /><button type="button" onClick={() => document.getElementById('pulse-photo-input')?.click()} className="rounded-full border border-[#24251f]/15 px-5 py-3 text-sm font-semibold">Add photo</button></div>;
  }

  return <main className="min-h-screen bg-[#e8e1d2] text-[#24251f]"><input id="pulse-photo-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => onPhotoPicked(event, setPhoto)} /><div className="mx-auto min-h-screen w-full max-w-xl px-5 py-6 sm:px-7"><header className="mb-8 flex items-center justify-between"><button type="button" onClick={reset} className="text-2xl font-black tracking-[-.06em]">PULSE</button><button type="button" onClick={() => setShowHistory(true)} aria-label="History" className="rounded-full p-2 text-[#686b5b] transition-colors hover:bg-[#f3efe5]/50"><History size={18} /></button></header><AnimatePresence mode="wait">
    {screen === 'home' && <motion.section key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[70vh] flex-col justify-center"><p className="mb-4 text-[10px] font-bold uppercase tracking-[.22em] text-[#686b5b]">PULSE</p><h1 className="max-w-lg text-5xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl">One move.<br />Then another.</h1><p className="mt-6 max-w-md text-base leading-7 text-[#55584c]">A stranger starts. You change it. Someone else takes it further.</p><div className="mt-9 flex flex-wrap gap-3"><PrimaryButton onClick={claimPulse} disabled={busy}>Join a Pulse</PrimaryButton><button type="button" onClick={() => { setCreatorPhoto(''); setError(''); setScreen('create'); }} className="min-h-12 rounded-full border border-[#24251f]/15 bg-[#f3efe5]/55 px-6 py-3 text-sm font-semibold">Create</button></div></motion.section>}
    {screen === 'create' && <motion.section key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><button type="button" onClick={reset} className="mb-7 inline-flex items-center gap-2 text-sm text-[#686b5b]"><ArrowLeft size={16} />Back</button><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#686b5b]">First move</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em]">Start somewhere.</h2><p className="mt-3 text-sm leading-6 text-[#686b5b]">{START_TASK.prompt}</p><div className="mt-7"><PhotoFrame dataUrl={creatorPhoto} /></div><div className="mt-5 flex gap-3"><button type="button" onClick={() => creatorInputRef.current?.click()} className="min-h-12 rounded-full border border-[#24251f]/15 px-5 py-3 text-sm font-semibold">Choose photo</button><PrimaryButton onClick={createPulse} disabled={busy || !creatorPhoto}>Start</PrimaryButton></div><input ref={creatorInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => onPhotoPicked(event, setCreatorPhoto)} /></motion.section>}
    {screen === 'task' && <motion.section key="task" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8"><div className="mb-8 flex items-center justify-between text-xs text-[#686b5b]"><span className="font-bold tracking-[.16em]">{count + 1} / {MAX_STEPS}</span><span className="flex items-center gap-2"><ActionMark action={task.actionType} />{task.actionType}</span></div><div className="mb-8"><PreviousMove payload={payload} /></div><div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#686b5b]">Your move</p><h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-.045em]">{task?.title}</h1><p className="mt-4 text-xl leading-8">{task?.prompt}</p><p className="mt-2 text-sm leading-6 text-[#686b5b]">{task?.hint}</p></div><div>{renderInput()}</div><div className="mt-7 flex justify-end"><PrimaryButton onClick={submitStep} disabled={busy || !token}>{busy ? 'Passing…' : 'Make your move'}</PrimaryButton></div></motion.section>}
    {screen === 'waiting' && <motion.section key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[65vh] flex-col justify-center"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#686b5b]">Pulse {count} / {MAX_STEPS}</p><h2 className="mt-4 text-4xl font-black tracking-[-.04em]">Your move is in it.</h2><p className="mt-4 max-w-md text-base leading-7 text-[#686b5b]">The Pulse is waiting for the next person.</p><div className="mt-8 h-1 overflow-hidden rounded-full bg-[#24251f]/10"><motion.div className="h-full rounded-full bg-[#24251f]" animate={{ width: `${Math.min(100, count / MAX_STEPS * 100)}%` }} /></div><button type="button" onClick={reset} className="mt-8 rounded-full border border-[#24251f]/15 px-5 py-3 text-sm font-semibold">Home</button></motion.section>}
    {screen === 'result' && <motion.section key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#686b5b]">Reveal</p><h2 className="mt-3 text-5xl font-black leading-[.98] tracking-[-.05em]">Look what<br />happened.</h2><div className="mt-8 space-y-4">{revealSteps.map((step, index) => <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }} key={`${index}-${step.action}`} className="overflow-hidden rounded-[28px] bg-[#f3efe5]/70"><div className="flex items-center justify-between px-5 pt-5 text-xs font-bold"><span className="flex items-center gap-2"><ActionMark action={step.action} />{step.action}</span><span className="text-[#686b5b]">{index + 1}</span></div><div className="mt-4"><PreviousMove payload={step} /></div>{textOf(step) ? <p className="px-5 py-4 text-sm leading-6 text-[#55584c] break-words">{textOf(step)}</p> : null}</motion.div>)}</div><button type="button" onClick={reset} className="mt-7 rounded-full border border-[#24251f]/15 px-5 py-3 text-sm font-semibold">Back home</button></motion.section>}
    {showHistory && <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-[#24251f]/25 p-4 sm:p-8" onClick={() => setShowHistory(false)}><div className="mx-auto mt-10 max-w-xl rounded-[30px] bg-[#f3efe5] p-6" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-2xl font-black">History</h2><button type="button" onClick={() => setShowHistory(false)} className="rounded-full p-2"><X size={18} /></button></div><div className="mt-5 space-y-2">{history.length ? history.map((entry) => <button type="button" key={entry.id} onClick={() => resume(entry)} className="flex w-full items-center justify-between rounded-2xl border border-[#24251f]/10 bg-white/35 px-4 py-4 text-left"><span><span className="block text-sm font-semibold">{entry.role === 'creator' ? 'Created Pulse' : 'Joined Pulse'}</span><span className="text-xs text-[#686b5b]">{entry.stepCount ?? 0} / {MAX_STEPS} · {entry.status}</span></span><ArrowRight size={16} /></button>) : <p className="py-8 text-center text-sm text-[#686b5b]">No history yet.</p>}</div></div></motion.div>}
  </AnimatePresence>{error ? <div className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 rounded-2xl border border-[#8b3f2f]/20 bg-[#f7e5dc] px-4 py-3 text-sm text-[#6b3025]">{error}</div> : null}</div></main>;
}
