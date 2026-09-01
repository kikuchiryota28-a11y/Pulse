'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, Check, History, RotateCcw, Search, Send, Sparkles, Target, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ACTIONS, MAX_STEPS, PEOPLE_PER_PULSE, START_TASK, generateNextTask, latestPayload, parsePayload, serializeStep, starterPayload } from '../lib/pulse-v2';

const HISTORY_KEY = 'pulse:v3:pulses';
const SESSION_KEY = 'pulse:v3:sessions';

function safeParse(value, fallback = null) { try { return JSON.parse(value); } catch { return fallback; } }
function stepsOf(relay) { return Array.isArray(relay?.steps) ? relay.steps : []; }
function readSessions() { if (typeof window === 'undefined') return {}; return safeParse(localStorage.getItem(SESSION_KEY) || '{}', {}); }
function readHistory() { if (typeof window === 'undefined') return []; return safeParse(localStorage.getItem(HISTORY_KEY) || '[]', []); }
function saveSession(id, value) { const all = readSessions(); all[id] = value; localStorage.setItem(SESSION_KEY, JSON.stringify(all)); }
function saveHistory(entry) { const next = [entry, ...readHistory().filter((item) => item.id !== entry.id)].slice(0, 30); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); }
function payloadsOf(relay) { return stepsOf(relay).map((step) => parsePayload(step?.output)).filter(Boolean); }
function taskForRelay(relay) { return latestPayload(relay)?.task || START_TASK; }
function actionIcon(action) { if (action === ACTIONS.CHOOSE) return Target; if (action === ACTIONS.FIND || action === ACTIONS.COMPARE || action === ACTIONS.CHALLENGE) return Search; if (action === ACTIONS.CAPTURE) return Camera; return Zap; }

async function imageFileToDataUrl(file, maxSide = 960, quality = 0.68) {
  if (!file?.type?.startsWith('image/')) throw new Error('画像を選んでください。');
  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像を読み込めませんでした。');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.toDataURL('image/jpeg', quality);
}

function PhotoFrame({ dataUrl, marker, onMark }) {
  return <div className={`relative aspect-[4/3] overflow-hidden rounded-[30px] bg-[#d6cdbb] ${onMark ? 'cursor-crosshair' : ''}`} onClick={(event) => {
    if (!onMark) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onMark({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
  }}>
    {dataUrl ? <img src={dataUrl} alt="Pulse" className="block h-full w-full object-cover" /> : null}
    {marker ? <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#f8f4eb] bg-[#f8f4eb]/10 shadow-[0_0_0_5px_rgba(36,37,31,.26)]" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} /> : null}
  </div>;
}

function PrimaryButton({ children, onClick, disabled, icon: Icon = ArrowRight }) {
  return <button disabled={disabled} onClick={onClick} className="inline-flex items-center justify-center gap-3 rounded-full bg-[#24251f] px-6 py-3 text-sm font-semibold text-[#f3efe5] transition-transform hover:-translate-y-0.5 active:scale-[.98] disabled:pointer-events-none disabled:opacity-35">{children}<Icon size={17} /></button>;
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
  const creatorInputRef = useRef(null);

  const payload = useMemo(() => latestPayload(relay), [relay]);
  const task = useMemo(() => taskForRelay(relay), [relay]);
  const count = relay?.step_count ?? stepsOf(relay).length;
  const finalPhoto = payload?.artifact?.dataUrl;
  const revealSteps = useMemo(() => payloadsOf(relay), [relay]);

  useEffect(() => { setHistory(readHistory()); }, []);

  useEffect(() => {
    if (!relay?.id) return undefined;
    const channel = supabase.channel(`pulse-v3-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, ({ new: next }) => {
      setRelay(next);
      saveHistory({ id: next.id, role, status: next.status, stepCount: next.step_count ?? stepsOf(next).length, updatedAt: Date.now() });
      setHistory(readHistory());
      if (next.status === 'complete') setScreen('result');
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id, role]);

  function reset() { setScreen('home'); setRelay(null); setRole(''); setToken(''); setCreatorPhoto(''); setPhoto(''); setMarker(null); setText(''); setError(''); setShowHistory(false); }
  function openCreate() { setCreatorPhoto(''); setError(''); setScreen('create'); }

  async function onPhotoPicked(event, setter) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { setBusy(true); setError(''); setter(await imageFileToDataUrl(file)); }
    catch (err) { setError(err?.message || '画像を読み込めませんでした。'); }
    finally { setBusy(false); }
  }

  async function createPulse() {
    if (!creatorPhoto) { setError('最初の写真を撮ってください。'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: dbError } = await supabase.rpc('create_relay', { p_seed: JSON.stringify(starterPayload(creatorPhoto)) });
      if (dbError) throw dbError;
      if (!data?.id) throw new Error('Pulseを作れませんでした。');
      setRelay(data); setRole('creator'); setToken('');
      saveSession(data.id, { role: 'creator', token: '' });
      saveHistory({ id: data.id, role: 'creator', status: data.status, stepCount: data.step_count ?? 0, updatedAt: Date.now() });
      setHistory(readHistory()); setScreen('waiting');
    } catch (err) { setError(err?.message || 'Pulseを作れませんでした。'); }
    finally { setBusy(false); }
  }

  async function claimPulse() {
    setBusy(true); setError('');
    try {
      const { data, error: dbError } = await supabase.rpc('claim_relay');
      if (dbError) throw dbError;
      if (!data?.relay) { setError('今は待っているPulseがありません。'); return; }
      setRelay(data.relay); setRole('stranger'); setToken(data.token); setPhoto(''); setMarker(null); setText('');
      saveSession(data.relay.id, { role: 'stranger', token: data.token });
      saveHistory({ id: data.relay.id, role: 'stranger', status: data.relay.status, stepCount: data.relay.step_count ?? 0, updatedAt: Date.now() });
      setHistory(readHistory()); setScreen('task');
    } catch (err) { setError(err?.message || 'Pulseを見つけられませんでした。'); }
    finally { setBusy(false); }
  }

  async function submitStep() {
    if (!relay || !token || busy) return;
    let action = task?.actionType;
    let result;
    let nextArtifact;

    if (task?.inputType === 'tap') {
      if (!marker) { setError('写真の中から1か所をタップしてください。'); return; }
      result = { marker, summary: '写真の中の1点を選択した' };
      nextArtifact = { ...payload?.artifact, marker };
    } else if (task?.inputType === 'text') {
      const clean = text.trim().replace(/\s+/g, ' ');
      if (!clean || clean.length > (task.maxLength || 90)) { setError('短い一文で入力してください。'); return; }
      result = { text: clean, summary: clean };
      nextArtifact = { ...payload?.artifact, text: clean };
    } else {
      if (!photo) { setError('写真を1枚追加してください。'); return; }
      result = { dataUrl: photo, summary: '新しい写真を1枚残した' };
      nextArtifact = { type: 'photo', dataUrl: photo, marker: null, text: null };
    }

    const currentStep = count + 1;
    const previous = { ...payload, action, result, artifact: nextArtifact, task };
    const actionHistory = [...payloadsOf(relay).map((item) => item.action).filter(Boolean), action];
    const nextTask = generateNextTask({ previous, history: actionHistory, seed: relay.id, step: currentStep + 1 });
    const output = serializeStep({ artifact: nextArtifact, action, result, step: currentStep, task: nextTask });

    setBusy(true); setError('');
    try {
      const { data, error: dbError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output });
      if (dbError) throw dbError;
      setRelay(data); setToken(''); saveSession(relay.id, { role, token: '' });
      saveHistory({ id: data.id, role, status: data.status, stepCount: data.step_count ?? stepsOf(data).length, updatedAt: Date.now() });
      setHistory(readHistory()); setPhoto(''); setMarker(null); setText('');
      setScreen(data.status === 'complete' || !nextTask ? 'result' : 'waiting');
    } catch (err) { setError(err?.message || 'Pulseを次へ渡せませんでした。'); }
    finally { setBusy(false); }
  }

  async function resume(entry) {
    setBusy(true); setError('');
    try {
      const { data, error: dbError } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle();
      if (dbError || !data) throw dbError || new Error('そのPulseはもうありません。');
      const session = readSessions()[entry.id] || {};
      setRelay(data); setRole(entry.role || session.role || 'creator'); setToken(session.token || ''); setShowHistory(false);
      setScreen(data.status === 'complete' ? 'result' : session.token ? 'task' : 'waiting');
    } catch (err) { setError(err?.message || 'そのPulseを開けませんでした。'); }
    finally { setBusy(false); }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#e8e1d2] text-[#24251f]">
      <div className="pulse-grid" />
      <div className="pulse-grain" />
      <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 sm:px-9"><button onClick={reset} className="text-sm font-black tracking-[.28em]">PULSE</button><button onClick={() => setShowHistory(true)} aria-label="履歴" className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/12 bg-[#f3efe5]/75"><History size={17} strokeWidth={1.7} /></button></header>

      <AnimatePresence mode="wait">
        {screen === 'home' && <motion.section key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex min-h-dvh items-center px-5 py-28 sm:px-10"><div className="mx-auto w-full max-w-6xl"><div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end"><div><p className="mb-5 text-[11px] font-black uppercase tracking-[.3em] text-[#686b5b]">one task. one human. then another.</p><h1 className="max-w-5xl text-balance text-[clamp(3.2rem,9vw,8rem)] font-semibold leading-[.84] tracking-[-.07em]">The world<br />changes hands.</h1><p className="mt-7 max-w-xl text-base leading-7 text-[#686b5b]">One person makes a move. A stranger inherits it, changes what happens next, and passes the change on.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:pb-2"><button onClick={openCreate} className="group min-h-48 rounded-[30px] bg-[#667052] p-6 text-left text-[#f3efe5] transition-transform hover:-translate-y-1 active:scale-[.99]"><div className="flex items-start justify-between"><Camera size={22} /><ArrowRight className="transition-transform group-hover:translate-x-1" size={20} /></div><div className="mt-20 text-xl font-semibold tracking-[-.03em]">Start a Pulse</div><div className="mt-1 text-sm text-[#f3efe5]/65">Give a stranger the first move.</div></button><button onClick={claimPulse} disabled={busy} className="group min-h-48 rounded-[30px] border border-[#24251f]/12 bg-[#f3efe5]/78 p-6 text-left transition-transform hover:-translate-y-1 active:scale-[.99] disabled:opacity-40"><div className="flex items-start justify-between"><Target size={22} /><ArrowRight className="transition-transform group-hover:translate-x-1" size={20} /></div><div className="mt-20 text-xl font-semibold tracking-[-.03em]">Find a Pulse</div><div className="mt-1 text-sm text-[#686b5b]">Pick up where someone left off.</div></button></div></div></div></motion.section>}

        {screen === 'create' && <motion.section key="create" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 flex min-h-dvh items-center justify-center px-5 py-28 sm:px-9"><div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center"><div><button onClick={reset} className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#686b5b]"><ArrowLeft size={14} /> Back</button><p className="text-[11px] font-black uppercase tracking-[.3em] text-[#686b5b]">start</p><h1 className="mt-3 text-5xl font-semibold tracking-[-.05em] sm:text-6xl">Make the<br />first move.</h1><p className="mt-5 max-w-md text-sm leading-6 text-[#686b5b]">Take one ordinary photo. A stranger decides what happens next.</p><input ref={creatorInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => onPhotoPicked(event, setCreatorPhoto)} /><div className="mt-8"><PrimaryButton onClick={() => creatorInputRef.current?.click()} disabled={busy} icon={Camera}>{creatorPhoto ? 'Change photo' : 'Take first photo'}</PrimaryButton></div>{error ? <p className="mt-4 text-sm text-[#ad735c]">{error}</p> : null}</div><div className="pulse-paper overflow-hidden rounded-[32px] p-3 sm:p-4">{creatorPhoto ? <PhotoFrame dataUrl={creatorPhoto} /> : <button onClick={() => creatorInputRef.current?.click()} className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-[24px] bg-[#ded6c4] text-[#686b5b]"><Camera size={34} strokeWidth={1.4} /><span className="mt-4 text-sm">Tap to add a photo</span></button>}<div className="flex items-center justify-between px-2 pb-1 pt-4"><span className="text-xs text-[#686b5b]">1 / {PEOPLE_PER_PULSE}</span>{creatorPhoto ? <PrimaryButton onClick={createPulse} disabled={busy}>Release it</PrimaryButton> : null}</div></div></div></motion.section>}

        {screen === 'task' && <motion.section key="task" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 min-h-dvh px-5 pb-16 pt-28 sm:px-9"><div className="mx-auto w-full max-w-5xl"><div className="mb-8 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]">your move · {Math.min(count + 2, PEOPLE_PER_PULSE)} / {PEOPLE_PER_PULSE}</p><div className="mt-2 flex items-center gap-2 text-xs text-[#686b5b]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#667052] text-[#f3efe5]"><Zap size={13} /></span><span>{task?.actionLabel || 'your action'}</span></div></div><button onClick={reset} className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/12 bg-[#f3efe5]/72"><X size={16} /></button></div><div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-start"><div><div className="max-w-2xl"><h1 className="text-balance text-[clamp(2.4rem,6vw,5.2rem)] font-semibold leading-[.9] tracking-[-.06em]">{task?.title}</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#686b5b]">{task?.prompt}</p><p className="mt-3 text-sm text-[#8b8674]">{task?.hint}</p></div><div className="mt-8">{task?.inputType === 'tap' && previousPhoto ? <PhotoFrame dataUrl={previousPhoto} marker={marker || payload?.artifact?.marker} onMark={setMarker} /> : null}{task?.inputType === 'photo' ? <PhotoInput photo={photo} onChange={(event) => onPhotoPicked(event, setPhoto)} /> : null}{task?.inputType === 'text' ? <div className="pulse-paper rounded-[28px] p-4"><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={task.maxLength || 90} placeholder="一文だけ残す…" className="min-h-48 w-full resize-none bg-transparent p-3 text-xl leading-8 outline-none placeholder:text-[#9b9687]" /><div className="flex items-center justify-between border-t border-[#24251f]/10 px-3 pt-3 text-xs text-[#8b8674]"><span>{text.length} / {task.maxLength || 90}</span><span>短く、具体的に。</span></div></div> : null}</div>{error ? <p className="mt-4 text-sm text-[#ad735c]">{error}</p> : null}<div className="mt-6"><PrimaryButton onClick={submitStep} disabled={busy} icon={Send}>Pass it on</PrimaryButton></div></div><aside className="pulse-paper rounded-[28px] p-5 lg:sticky lg:top-24"><div className="text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]">the rule</div><p className="mt-3 text-lg font-semibold leading-snug">前の人の一手が、あなたのTaskを決めています。</p><p className="mt-3 text-sm leading-6 text-[#686b5b]">あなたの結果は、そのまま次の人の入口になります。先の展開は見えません。</p><div className="mt-7 flex items-center gap-2">{Array.from({ length: PEOPLE_PER_PULSE }, (_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= count ? 'bg-[#667052]' : 'bg-[#24251f]/10'}`} />)}</div></aside></div></div></motion.section>}

        {screen === 'waiting' && <motion.section key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex min-h-dvh items-center justify-center px-5 py-28 text-center"><div className="max-w-xl">{finalPhoto ? <PhotoFrame dataUrl={finalPhoto} marker={payload?.artifact?.marker} /> : null}<div className="mx-auto mt-8"><p className="text-[10px] font-black uppercase tracking-[.3em] text-[#686b5b]">pulse in motion</p><h1 className="mt-3 text-5xl font-semibold tracking-[-.05em] sm:text-6xl">Someone else<br />has the move.</h1><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#686b5b]">The next person will see what you left behind, then decide what happens next.</p><div className="mx-auto mt-9 flex max-w-xs items-center justify-center gap-2">{Array.from({ length: PEOPLE_PER_PULSE }, (_, index) => <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < count + 1 ? 'bg-[#667052]' : 'bg-[#24251f]/12'}`} />)}</div><p className="mt-5 text-xs text-[#8b8674]">{count + 1} / {PEOPLE_PER_PULSE} people</p><button onClick={reset} className="mt-10 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#686b5b]"><RotateCcw size={14} /> Go home</button></div></div></motion.section>}

        {screen === 'result' && <motion.section key="result" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 min-h-dvh px-5 pb-16 pt-28 sm:px-9"><div className="mx-auto w-full max-w-6xl"><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-[#686b5b]">pulse complete</p><h1 className="mt-3 text-[clamp(3.4rem,8vw,7rem)] font-semibold leading-[.84] tracking-[-.07em]">Look what<br />happened.</h1><p className="mt-6 max-w-md text-sm leading-6 text-[#686b5b]">{PEOPLE_PER_PULSE} people touched the same starting point. No one planned the final shape.</p><div className="mt-8"><PrimaryButton onClick={reset} icon={RotateCcw}>Run another</PrimaryButton></div></div><div><div className="pulse-paper overflow-hidden rounded-[32px] p-4"><div className="mb-4 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]">what it became</span><span className="text-xs text-[#8b8674]">{Math.min(count + 1, PEOPLE_PER_PULSE)} / {PEOPLE_PER_PULSE}</span></div>{finalPhoto ? <PhotoFrame dataUrl={finalPhoto} marker={payload?.artifact?.marker} /> : null}</div><div className="mt-4 grid gap-3 sm:grid-cols-2">{revealSteps.map((item, index) => { const Icon = actionIcon(item.action); return <div key={`${item.step}-${index}`} className="pulse-paper rounded-[24px] p-4"><div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#24251f] text-[#f3efe5]"><Icon size={14} /></span><span className="text-[10px] font-black uppercase tracking-[.2em] text-[#8b8674]">move {item.step ?? index + 1}</span></div><p className="mt-4 text-sm font-semibold">{item.result?.summary || item.result?.text || 'A human made a move.'}</p></div>; })}</div></div></div></div></motion.section>}
      </AnimatePresence>

      {showHistory ? <div className="fixed inset-0 z-[70] bg-[#24251f]/25 backdrop-blur-sm" onClick={() => setShowHistory(false)}><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#f3efe5] p-6 sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#686b5b]">archive</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.04em]">Your Pulses</h2></div><button onClick={() => setShowHistory(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/12"><X size={16} /></button></div><div className="mt-7 flex-1 space-y-3 overflow-y-auto">{history.length ? history.map((entry) => <button key={entry.id} onClick={() => resume(entry)} className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-[#24251f]/10 bg-white/35 p-4 text-left"><div><div className="text-sm font-semibold">{entry.status === 'complete' ? 'Complete' : entry.role === 'creator' ? 'Waiting' : 'In motion'}</div><div className="mt-1 text-xs text-[#686b5b]">{entry.stepCount || 0} handoff{entry.stepCount === 1 ? '' : 's'}</div></div><ArrowRight size={15} /></button>) : <div className="rounded-[22px] border border-dashed border-[#24251f]/15 p-5 text-sm leading-6 text-[#686b5b]">まだ履歴はありません。</div>}</div>{error ? <p className="mt-4 text-sm text-[#ad735c]">{error}</p> : null}</aside></div> : null}
    </main>
  );
}

function PhotoInput({ photo, onChange }) {
  const inputRef = useRef(null);
  return <div>{<input ref={inputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={onChange} />}{photo ? <PhotoFrame dataUrl={photo} /> : <button onClick={() => inputRef.current?.click()} className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-[30px] bg-[#ded6c4] text-[#686b5b]"><Camera size={36} strokeWidth={1.4} /><span className="mt-4 text-sm">Tap to add the photo</span></button>}</div>;
}
