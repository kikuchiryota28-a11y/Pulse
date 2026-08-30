'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Copy, History, LoaderCircle, Palette, Radio, RotateCcw, Shapes, Sparkles, Type, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const MAX_STEPS = 3;
const HISTORY_KEY = 'pulse:warm:pulses';
const SESSION_KEY = 'pulse:warm:sessions';
const FORM_SHAPES = ['circle', 'square', 'triangle', 'organic'];
const STARTERS = ['A door that opens somewhere impossible.', 'A signal from a city nobody can find.', 'A tiny object that should not exist.'];
const TYPES = [
  { id: 'form', label: 'FORM', icon: Shapes, note: 'Leave a shape.' },
  { id: 'color', label: 'COLOR', icon: Palette, note: 'Leave a color.' },
  { id: 'text', label: 'TEXT', icon: Type, note: 'Leave a thought.' },
];
const ACTIONS = {
  form: [['ROTATE', 'Turn it'], ['RESHAPE', 'Change its shape'], ['CHARGE', 'Make it bolder']],
  color: [['WARM', 'Move it warmer'], ['COOL', 'Move it cooler'], ['LOUD', 'Push it further']],
  text: [['STRANGER', 'Make it stranger'], ['SOFTER', 'Make it softer'], ['BIGGER', 'Make it bigger']],
};
const spring = { type: 'spring', stiffness: 360, damping: 28, mass: 0.72 };
const gentle = { type: 'spring', stiffness: 180, damping: 24, mass: 0.9 };

function json(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function getSteps(relay) { return Array.isArray(relay?.steps) ? relay.steps : []; }
function getArtifact(relay) {
  const steps = getSteps(relay);
  for (let i = steps.length - 1; i >= 0; i -= 1) { const value = json(steps[i]?.output, null); if (value?.type) return value; }
  const seed = json(relay?.seed, null);
  return seed?.type ? seed : { type: 'text', text: relay?.seed || '' };
}
function adjustHue(value, delta) { return (Number(value || 0) + delta + 360) % 360; }
function seedValue(type, text, shape, hue) {
  if (type === 'form') return JSON.stringify({ v: 3, type, shape, hue, size: 1, rotation: 0, glow: .15 });
  if (type === 'color') return JSON.stringify({ v: 3, type, hue, sat: 52, light: 58, angle: 22 });
  return text.trim();
}
function mutate(a, action, step) {
  const next = { ...a };
  if (a.type === 'form') {
    if (action === 'ROTATE') next.rotation = (Number(a.rotation || 0) + 34) % 360;
    if (action === 'RESHAPE') next.shape = FORM_SHAPES[(FORM_SHAPES.indexOf(a.shape) + 1) % FORM_SHAPES.length];
    if (action === 'CHARGE') { next.hue = adjustHue(a.hue, step % 2 ? 18 : -18); next.glow = Math.min(.5, Number(a.glow || .15) + .07); }
    next.size = Math.min(1.18, Number(a.size || 1) + .035);
  }
  if (a.type === 'color') {
    if (action === 'WARM') next.hue = adjustHue(a.hue, 18);
    if (action === 'COOL') next.hue = adjustHue(a.hue, -18);
    if (action === 'LOUD') { next.sat = Math.min(76, Number(a.sat || 52) + 7); next.light = Math.min(68, Number(a.light || 58) + 3); }
    next.angle = (Number(a.angle || 22) + 12) % 360;
  }
  return next;
}

function Artifact({ payload, large = false, responding = false }) {
  if (!payload) return null;
  if (payload.type === 'text') return (
    <motion.div layout className={`${large ? 'max-w-2xl px-8 py-7 text-3xl sm:text-4xl' : 'max-w-xl px-6 py-5 text-lg'} rounded-[2rem] border border-[#252820]/10 bg-[#faf7ef]/80 text-[#252820] pulse-object-shadow`} animate={responding ? { scale: [1, .96, 1.02, 1], rotate: [0, -1, .7, 0] } : { y: [0, -2, 0] }} transition={responding ? { duration: .65, ease: 'easeOut' } : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}><p className="break-words leading-[1.12] tracking-[-.035em]">{payload.text}</p></motion.div>
  );
  const hue = Number(payload.hue || 78);
  const size = large ? 250 : 150;
  const shape = payload.shape === 'circle' ? 'rounded-full' : payload.shape === 'square' ? 'rounded-[28%]' : payload.shape === 'organic' ? 'rounded-[54%_46%_62%_38%]' : '';
  return (
    <motion.div layout className={`${large ? 'h-[320px]' : 'h-[210px]'} w-full flex items-center justify-center`}>
      <motion.div layout className={`relative ${shape}`} style={{ width: size, height: size, background: `hsl(${hue} 24% ${payload.type === 'color' ? payload.light || 58 : 48}%)`, clipPath: payload.shape === 'triangle' ? 'polygon(50% 0%,100% 100%,0% 100%)' : undefined, boxShadow: `0 28px 65px rgba(64,68,47,.22), 0 0 0 1px rgba(255,255,255,.28) inset` }} animate={responding ? { scale: [1, .88, 1.05, 1], rotate: [Number(payload.rotation || 0), Number(payload.rotation || 0) - 8, Number(payload.rotation || 0) + 5, Number(payload.rotation || 0)] } : { y: [0, -6, 0], rotate: Number(payload.rotation || 0) }} transition={responding ? { duration: .72, ease: 'easeOut' } : { y: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' }, rotate: gentle }} />
    </motion.div>
  );
}

function Button({ children, onClick, primary = false, disabled = false, className = '' }) {
  return <motion.button type="button" disabled={disabled} onClick={onClick} whileHover={disabled ? undefined : { y: -2 }} whileTap={disabled ? undefined : { scale: .965 }} transition={spring} className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full border px-6 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052] disabled:cursor-not-allowed disabled:opacity-45 ${primary ? 'border-[#4f5940] bg-[#667052] text-[#faf7ef] hover:bg-[#5c6749] active:bg-[#4f5940]' : 'border-[#252820]/15 bg-[#f4f0e6]/75 text-[#252820] hover:border-[#252820]/25 hover:bg-[#faf7ef] active:bg-[#ded6c4]'} ${className}`}>{children}</motion.button>;
}
function IconButton({ label, onClick, children }) { return <motion.button type="button" aria-label={label} onClick={onClick} whileHover={{ y: -1 }} whileTap={{ scale: .93 }} transition={spring} className="grid h-11 w-11 place-items-center rounded-full border border-[#252820]/15 bg-[#f4f0e6]/70 text-[#4f5940] transition hover:bg-[#faf7ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052] active:bg-[#ded6c4]">{children}</motion.button>; }

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [history, setHistory] = useState([]);
  const [type, setType] = useState('form');
  const [seed, setSeed] = useState('');
  const [shape, setShape] = useState('circle');
  const [hue, setHue] = useState(78);
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);

  const readHistory = () => json(localStorage.getItem(HISTORY_KEY) || '[]', []);
  const readSessions = () => json(localStorage.getItem(SESSION_KEY) || '{}', {});
  const saveSession = (id, value) => { const all = readSessions(); all[id] = value; localStorage.setItem(SESSION_KEY, JSON.stringify(all)); };
  const saveHistory = (entry) => { const next = [entry, ...readHistory().filter((item) => item.id !== entry.id)].slice(0, 30); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); setHistory(next); };
  const steps = getSteps(relay);
  const count = relay?.step_count ?? steps.length;
  const complete = relay?.status === 'complete' || count >= MAX_STEPS;
  const artifact = getArtifact(relay);
  const actions = ACTIONS[artifact?.type || 'form'];
  const preview = useMemo(() => type === 'text' ? { type, text: seed || STARTERS[0] } : type === 'color' ? { type, hue, sat: 52, light: 58 } : { type, shape, hue, size: 1, rotation: 0 }, [type, seed, shape, hue]);

  useEffect(() => {
    setHistory(readHistory());
    const all = readSessions(); const id = Object.keys(all).at(-1); if (!id) return;
    let live = true;
    (async () => { const { data } = await supabase.from('relays').select('*').eq('id', id).maybeSingle(); if (!live || !data) return; const s = all[id] || {}; setRelay(data); setRole(s.role || 'creator'); setToken(s.token || ''); setScreen(data.status === 'complete' ? 'result' : s.token ? 'turn' : 'waiting'); })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!relay?.id) return undefined;
    const channel = supabase.channel(`pulse-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, ({ new: next }) => {
      setRelay(next); setResponding(true); setTimeout(() => setResponding(false), 760); setMessage(next.status === 'complete' ? 'The relay is complete.' : next.step_count > count ? 'A stranger changed it.' : 'Pulse updated.'); setTimeout(() => setMessage(''), 2200); if (next.status === 'complete') setScreen('result');
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id, count]);

  const createPulse = async () => {
    if (type === 'text' && seed.trim().length < 4) return setError('Give the Pulse a starting idea.');
    setBusy(true); setError(''); const { data, error: dbError } = await supabase.rpc('create_relay', { p_seed: seedValue(type, seed, shape, hue) }); setBusy(false);
    if (dbError) return setError(dbError.message);
    setRelay(data); setRole('creator'); setToken(''); saveSession(data.id, { role: 'creator', token: '' }); saveHistory({ id: data.id, role: 'creator', seed: data.seed, status: data.status, updatedAt: Date.now() }); setMessage('Pulse released.'); setScreen('waiting');
  };
  const joinPulse = async () => {
    setBusy(true); setError(''); const { data, error: dbError } = await supabase.rpc('claim_relay'); setBusy(false);
    if (dbError) return setError(dbError.message); if (!data) return setError('There is no Pulse waiting right now.');
    setRelay(data.relay); setRole('stranger'); setToken(data.token); saveSession(data.relay.id, { role: 'stranger', token: data.token }); saveHistory({ id: data.relay.id, role: 'stranger', seed: data.relay.seed, status: data.relay.status, updatedAt: Date.now() }); setMessage('You found a Pulse.'); setScreen('turn');
  };
  const submitMove = async () => {
    if (!relay || !token || !action) return; setBusy(true); setError(''); setResponding(true);
    let output;
    if (artifact.type === 'text') { const labels = { STRANGER: 'stranger', SOFTER: 'softer', BIGGER: 'bigger' }; output = JSON.stringify({ type: 'text', text: `${artifact.text} → ${labels[action]}.` }); } else output = JSON.stringify(mutate(artifact, action, count));
    const { data, error: dbError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output }); setBusy(false); setResponding(false);
    if (dbError) return setError(dbError.message);
    setRelay(data); saveSession(relay.id, { role, token: '' }); setToken(''); setAction(''); saveHistory({ id: data.id, role, seed: data.seed, status: data.status, updatedAt: Date.now() }); setMessage(data.status === 'complete' ? 'Pulse complete.' : 'Passed to a stranger.'); setScreen(data.status === 'complete' ? 'result' : 'waiting');
  };
  const resume = async (entry) => {
    setBusy(true); setError(''); const { data, error: dbError } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle(); setBusy(false);
    if (dbError || !data) return setError('That Pulse is no longer available.'); const s = readSessions()[entry.id] || {}; setRelay(data); setRole(entry.role); setToken(s.token || ''); setScreen(data.status === 'complete' ? 'result' : s.token ? 'turn' : 'waiting');
  };
  const reset = () => { setRelay(null); setToken(''); setRole(''); setAction(''); setSeed(''); setError(''); setMessage(''); setScreen('home'); };

  const nav = (
    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
      <button type="button" onClick={reset} className="flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052]"><span className="grid h-10 w-10 place-items-center rounded-full border border-[#252820]/15 bg-[#f4f0e6]/70"><Radio size={16} /></span><span className="text-sm font-black tracking-[.22em]">PULSE</span></button>
      <div className="flex items-center gap-3"><span className="hidden text-xs font-medium tracking-[.14em] text-[#686b5b] sm:block">HUMAN RELAY</span><span className="h-2 w-2 rounded-full bg-[#667052]" /></div>
    </header>
  );

  return <main className="relative h-dvh w-full overflow-hidden bg-[#e8e1d2] text-[#252820]">
    <div className="pulse-grid" /><div className="pulse-grain" />
    <motion.div className="pointer-events-none absolute -left-40 top-[-180px] h-[480px] w-[480px] rounded-full bg-[#faf7ef]/55 blur-3xl" animate={{ x: [0, 30, -10, 0], y: [0, 15, -5, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
    {nav}
    <AnimatePresence mode="wait">
      {screen === 'home' && <motion.section key="home" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={gentle} className="relative z-10 mx-auto grid h-full max-w-6xl grid-cols-1 items-center gap-8 px-5 pb-8 pt-24 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
        <div className="order-2 lg:order-1">
          <p className="mb-5 text-xs font-bold tracking-[.24em] text-[#667052]">A HUMAN RELAY</p>
          <h1 className="max-w-3xl text-[clamp(3.2rem,8vw,7.4rem)] font-black leading-[.84] tracking-[-.075em]">PASS<br/>SOMETHING<br/><span className="text-[#667052]">ON.</span></h1>
          <p className="mt-7 max-w-md text-sm leading-6 text-[#686b5b]">Leave a small thing behind. A stranger will change it once. Then it moves again.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button primary onClick={() => setScreen('create')}>Make a Pulse <ArrowRight size={16}/></Button><Button onClick={joinPulse} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={16}/> : <Users size={16}/>} Find a stranger</Button></div>
          {error && <p className="mt-4 text-sm font-medium text-[#ad735c]">{error}</p>}
        </div>
        <div className="order-1 flex items-center justify-center lg:order-2"><motion.div className="pulse-paper flex h-[min(55vw,420px)] w-[min(55vw,420px)] min-h-[280px] min-w-[280px] items-center justify-center rounded-[42%]" animate={{ rotate: [0, 2, -1, 0], scale: [1, 1.018, .99, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}><Artifact payload={{ type: 'form', shape: 'organic', hue: 78, size: 1, rotation: -8 }} large /></motion.div></div>
      </motion.section>}

      {screen === 'create' && <motion.section key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={gentle} className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-5 pt-20 sm:px-8">
        <div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold tracking-[.22em] text-[#667052]">LEAVE SOMETHING</p><h2 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-6xl">What goes into the relay?</h2></div><IconButton label="Back" onClick={() => setScreen('home')}><X size={18}/></IconButton></div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 pb-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="pulse-paper flex min-h-0 flex-col rounded-[2rem] p-5 sm:p-7">
            <div className="grid grid-cols-3 gap-2">{TYPES.map((item) => { const I = item.icon; return <motion.button key={item.id} type="button" onClick={() => setType(item.id)} whileTap={{ scale: .97 }} className={`rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052] ${type === item.id ? 'border-[#667052]/40 bg-[#667052]/10' : 'border-[#252820]/10 hover:border-[#252820]/20 hover:bg-[#faf7ef]'}`}><I size={17}/><p className="mt-5 text-xs font-black tracking-[.12em]">{item.label}</p><p className="mt-1 hidden text-xs text-[#686b5b] sm:block">{item.note}</p></motion.button>; })}</div>
            {type === 'text' && <div className="mt-5 flex min-h-0 flex-1 flex-col"><textarea value={seed} onChange={(e) => setSeed(e.target.value)} placeholder={STARTERS[0]} maxLength={180} className="min-h-[180px] flex-1 resize-none rounded-3xl border border-[#252820]/12 bg-[#faf7ef]/65 p-5 text-lg leading-7 text-[#252820] placeholder:text-[#686b5b]/60 focus-visible:outline-[#667052]" /><div className="mt-3 flex items-center justify-between text-xs text-[#686b5b]"><span>One starting thought.</span><span>{seed.length}/180</span></div></div>}
            {type === 'form' && <div className="mt-6 flex flex-1 flex-col justify-center"><p className="text-xs font-bold tracking-[.18em] text-[#686b5b]">CHOOSE A SHAPE</p><div className="mt-4 grid grid-cols-4 gap-3">{FORM_SHAPES.map((s) => <motion.button key={s} type="button" onClick={() => setShape(s)} whileHover={{ y: -3 }} whileTap={{ scale: .94 }} className={`h-16 rounded-2xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052] ${shape === s ? 'border-[#667052] bg-[#667052]/10' : 'border-[#252820]/12 bg-[#faf7ef]/60 hover:bg-[#faf7ef]'}`}><span className={`mx-auto block h-7 w-7 ${s === 'circle' ? 'rounded-full' : s === 'square' ? 'rounded-lg' : s === 'organic' ? 'rounded-[55%_45%_60%_40%]' : ''}`} style={{ background: '#667052', clipPath: s === 'triangle' ? 'polygon(50% 0%,100% 100%,0% 100%)' : undefined }} /></motion.button>)}</div></div>}
            {type === 'color' && <div className="mt-6 flex flex-1 flex-col justify-center"><p className="text-xs font-bold tracking-[.18em] text-[#686b5b]">CHOOSE A MOOD</p><input aria-label="Pulse color hue" type="range" min="35" max="120" value={hue} onChange={(e) => setHue(Number(e.target.value))} className="mt-8 w-full accent-[#667052]" /><div className="mt-5 grid grid-cols-5 gap-2">{[42,58,74,90,108].map((h) => <button key={h} type="button" onClick={() => setHue(h)} className="h-12 rounded-2xl border border-[#252820]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052]" style={{ background: `hsl(${h} 24% 58%)` }} aria-label={`Hue ${h}`} />)}</div></div>}
            <Button primary onClick={createPulse} disabled={busy} className="mt-5 w-full">{busy ? <LoaderCircle className="animate-spin" size={17}/> : <Sparkles size={17}/>} Release this Pulse</Button>
            {error && <p className="mt-3 text-sm text-[#ad735c]">{error}</p>}
          </div>
          <div className="pulse-paper flex min-h-0 items-center justify-center overflow-hidden rounded-[2rem] p-6 sm:p-10"><div className="w-full text-center"><p className="mb-5 text-xs font-bold tracking-[.2em] text-[#686b5b]">PREVIEW</p><Artifact payload={preview} large /><p className="mt-2 text-xs text-[#686b5b]">This is the thing a stranger will inherit.</p></div></div>
        </div>
      </motion.section>}

      {(screen === 'waiting' || screen === 'turn') && <motion.section key="relay" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={gentle} className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-5 pt-20 sm:px-8">
        <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.22em] text-[#667052]">RELAY {String(count + 1).padStart(2, '0')} / {String(MAX_STEPS + 1).padStart(2, '0')}</p><p className="mt-1 text-sm text-[#686b5b]">{screen === 'turn' ? 'You are the next stranger.' : role === 'creator' ? 'Your Pulse is waiting for someone.' : 'Waiting for the next stranger.'}</p></div><IconButton label="Pulse history" onClick={() => setScreen('history')}><History size={17}/></IconButton></div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 pb-8 lg:grid-cols-[1.35fr_.65fr]">
          <motion.div className="pulse-paper relative flex min-h-0 items-center justify-center overflow-hidden rounded-[2.5rem] p-6 sm:p-10" animate={responding ? { scale: [.995, 1.01, 1] } : undefined} transition={spring}><Artifact payload={artifact} large responding={responding}/><AnimatePresence>{message && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute bottom-6 rounded-full bg-[#252820] px-5 py-3 text-xs font-semibold text-[#faf7ef] shadow-xl">{message}</motion.div>}</AnimatePresence></motion.div>
          <div className="flex min-h-0 flex-col justify-end">
            {screen === 'turn' ? <div className="pulse-paper rounded-[2rem] p-5 sm:p-6"><p className="text-xs font-bold tracking-[.2em] text-[#667052]">YOUR ONE MOVE</p><h3 className="mt-2 text-2xl font-black tracking-[-.035em]">Change it once.</h3><div className="mt-5 grid gap-2">{actions.map(([id, label]) => <motion.button key={id} type="button" onClick={() => setAction(id)} whileHover={{ x: 3 }} whileTap={{ scale: .98 }} className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052] ${action === id ? 'border-[#667052]/45 bg-[#667052]/10' : 'border-[#252820]/12 bg-[#faf7ef]/55 hover:bg-[#faf7ef]'}`}><span>{label}</span><ArrowRight size={15}/></motion.button>)}</div><Button primary onClick={submitMove} disabled={!action || busy} className="mt-3 w-full">{busy ? <LoaderCircle className="animate-spin" size={16}/> : null} Pass it on</Button> : <div className="pulse-paper rounded-[2rem] p-6"><p className="text-xs font-bold tracking-[.2em] text-[#667052]">OUT IN THE WORLD</p><h3 className="mt-2 text-2xl font-black tracking-[-.035em]">Someone will change this.</h3><p className="mt-3 text-sm leading-6 text-[#686b5b]">Keep this page open if you want to watch the relay. Your history is saved on this device.</p><div className="mt-5 flex gap-2"><Button onClick={() => setScreen('history')}><History size={16}/> My Pulses</Button><Button onClick={reset}><RotateCcw size={16}/> New</Button></div></div>}
            {error && <p className="mt-3 text-sm text-[#ad735c]">{error}</p>}
          </div>
        </div>
      </motion.section>}

      {screen === 'result' && <motion.section key="result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={gentle} className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-5 pt-20 sm:px-8"><div className="text-center"><p className="text-xs font-bold tracking-[.24em] text-[#667052]">A STRANGER FINISHED IT</p><h2 className="mt-3 text-[clamp(3rem,8vw,7rem)] font-black leading-[.86] tracking-[-.07em]">LOOK WHAT<br/><span className="text-[#667052]">HAPPENED.</span></h2></div><div className="pulse-paper mx-auto mt-6 flex w-full max-w-2xl items-center justify-center rounded-[2.5rem] p-5 sm:p-10"><Artifact payload={artifact} large /></div><div className="mt-5 flex justify-center gap-2"><Button primary onClick={reset}><Sparkles size={16}/> Make another</Button><Button onClick={() => setScreen('history')}><History size={16}/> My Pulses</Button></div></motion.section>}

      {screen === 'history' && <motion.section key="history" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={gentle} className="relative z-10 mx-auto flex h-full max-w-5xl flex-col px-5 pb-8 pt-24 sm:px-8"><div className="flex items-end justify-between"><div><p className="text-xs font-bold tracking-[.22em] text-[#667052]">YOUR TRACE</p><h2 className="mt-2 text-5xl font-black tracking-[-.06em]">My Pulses</h2></div><IconButton label="Close history" onClick={() => setScreen(relay ? (complete ? 'result' : token ? 'turn' : 'waiting') : 'home')}><X size={18}/></IconButton></div><div className="mt-6 min-h-0 flex-1 overflow-auto pr-1"><div className="grid gap-3">{history.length ? history.map((item, index) => <motion.button key={item.id} type="button" onClick={() => resume(item)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...gentle, delay: index * .035 }} whileHover={{ y: -2 }} whileTap={{ scale: .99 }} className="pulse-paper flex items-center justify-between rounded-[1.5rem] p-5 text-left transition hover:bg-[#faf7ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052]"><div className="min-w-0"><p className="text-xs font-bold tracking-[.15em] text-[#667052]">{item.role === 'creator' ? 'CREATED' : 'JOINED'} · {item.status === 'complete' ? 'COMPLETE' : 'ACTIVE'}</p><p className="mt-2 truncate text-base font-semibold">{json(item.seed, null)?.type ? `${json(item.seed, {}).type.toUpperCase()} PULSE` : item.seed}</p></div><ArrowRight size={17}/></motion.button>) : <div className="pulse-paper rounded-[2rem] p-8 text-center"><p className="font-semibold">Nothing here yet.</p><p className="mt-2 text-sm text-[#686b5b]">Create or join a Pulse and it will stay in this trace.</p></div>}</div></div></motion.section>}
    </AnimatePresence>
  </main>;
}
