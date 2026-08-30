'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, CircleDot, Clock3, Copy, LoaderCircle, Palette, Radio, RotateCcw, Shapes, Sparkles, Type, Users, Waves, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const MAX_STEPS = 3;
const PULSES_KEY = 'pulse:v6:pulses';
const SESSIONS_KEY = 'pulse:v6:sessions';
const STARTERS = ['A door that opens somewhere impossible.', 'A signal from a city nobody can find.', 'A tiny object that should not exist.'];
const FORM_SHAPES = ['circle', 'square', 'triangle', 'organic'];
const COLORS = [
  { label: 'Cyan', hue: 190 },
  { label: 'Lime', hue: 78 },
  { label: 'Violet', hue: 270 },
  { label: 'Coral', hue: 14 },
];
const TEXT_ACTIONS = [
  ['STRANGER', 'Make it stranger'],
  ['SOFTER', 'Make it softer'],
  ['BIGGER', 'Make it bigger'],
];
const FORM_ACTIONS = [
  ['ROTATE', 'Rotate it'],
  ['RESHAPE', 'Reshape it'],
  ['CHARGE', 'Charge it'],
];
const COLOR_ACTIONS = [
  ['WARM', 'Shift warmer'],
  ['COOL', 'Shift cooler'],
  ['LOUD', 'Amplify it'],
];

const spring = { type: 'spring', stiffness: 320, damping: 24, mass: 0.72 };
const softSpring = { type: 'spring', stiffness: 210, damping: 26, mass: 0.9 };

function safeJson(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function stepsOf(relay) { return Array.isArray(relay?.steps) ? relay.steps : []; }
function payloadOf(relay) {
  const steps = stepsOf(relay);
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const parsed = safeJson(steps[i]?.output, null);
    if (parsed?.type) return parsed;
  }
  const seed = safeJson(relay?.seed, null);
  return seed?.type ? seed : { type: 'text', text: relay?.seed || '' };
}
function adjustHue(h, d) { return (Number(h || 0) + d + 360) % 360; }
function mutate(artifact, action, step) {
  const a = { ...artifact };
  if (a.type === 'form') {
    if (action === 'ROTATE') a.rotation = (Number(a.rotation || 0) + 28) % 360;
    if (action === 'RESHAPE') a.shape = FORM_SHAPES[(FORM_SHAPES.indexOf(a.shape) + 1) % FORM_SHAPES.length];
    if (action === 'CHARGE') { a.hue = adjustHue(a.hue || 190, step % 2 ? 26 : -26); a.glow = Math.min(1, Number(a.glow || .2) + .22); }
    a.size = Math.min(1.2, Number(a.size || 1) + 0.04);
    return a;
  }
  if (a.type === 'color') {
    if (action === 'WARM') a.hue = adjustHue(a.hue, 22);
    if (action === 'COOL') a.hue = adjustHue(a.hue, -22);
    if (action === 'LOUD') { a.sat = Math.min(100, Number(a.sat || 82) + 10); a.light = Math.min(72, Number(a.light || 58) + 5); }
    a.angle = (Number(a.angle || 30) + 14) % 360;
    return a;
  }
  return a;
}
function seedPayload(kind, text, shape, hue) {
  if (kind === 'form') return JSON.stringify({ v: 2, type: 'form', shape, hue, size: 1, rotation: 0, glow: .22 });
  if (kind === 'color') return JSON.stringify({ v: 2, type: 'color', hue, sat: 84, light: 58, angle: 28 });
  return text.trim();
}
function VisualArtifact({ payload, large = false }) {
  if (payload.type === 'form') {
    const hue = Number(payload.hue || 190);
    const style = {
      width: large ? 220 : 132,
      height: large ? 220 : 132,
      background: `hsl(${hue} 90% 62%)`,
      transform: `rotate(${Number(payload.rotation || 0)}deg) scale(${Number(payload.size || 1)})`,
      boxShadow: `0 0 ${large ? 72 : 44}px hsla(${hue}, 90%, 62%, ${Number(payload.glow || .22)})`,
    };
    return <motion.div layout transition={softSpring} className={`relative ${large ? 'h-[280px]' : 'h-[180px]'} w-full flex items-center justify-center`}><motion.div layout className={`relative ${payload.shape === 'circle' ? 'rounded-full' : payload.shape === 'square' ? 'rounded-3xl' : payload.shape === 'triangle' ? '' : 'rounded-[48%_52%_38%_62%]'} shadow-none`} style={{ ...style, clipPath: payload.shape === 'triangle' ? 'polygon(50% 0%, 100% 100%, 0% 100%)' : undefined }} animate={{ y: [0, -8, 0], rotate: [Number(payload.rotation || 0) - 2, Number(payload.rotation || 0) + 3, Number(payload.rotation || 0) - 2] }} transition={{ y: { duration: 4.8, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 6.4, repeat: Infinity, ease: 'easeInOut' } }} /></motion.div>;
  }
  if (payload.type === 'color') {
    const hue = Number(payload.hue || 190);
    return <motion.div layout className={`${large ? 'h-[260px] w-[260px]' : 'h-[140px] w-[140px]'} rounded-full`} style={{ background: `hsl(${hue} ${payload.sat || 84}% ${payload.light || 58}%)`, boxShadow: `0 0 80px hsla(${hue},90%,60%,.22)` }} animate={{ scale: [0.96, 1.04, 0.96], rotate: [0, 12, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} />;
  }
  return <motion.div layout className={`max-w-full rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 ${large ? 'text-2xl' : 'text-base'}`}><p className="leading-relaxed text-white break-words">{payload.text}</p></motion.div>;
}

function MotionButton({ children, className = '', onClick, disabled = false }) {
  return <motion.button type="button" disabled={disabled} onClick={onClick} whileHover={disabled ? undefined : { scale: 1.035, rotate: 0.6 }} whileTap={disabled ? undefined : { scale: 0.95 }} transition={spring} className={`group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold tracking-[-0.01em] transition-colors duration-200 hover:border-white/20 focus-visible:outline-2 focus-visible:outline-cyan-300 active:border-white/30 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}>{children}</motion.button>;
}

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [myPulses, setMyPulses] = useState([]);
  const [kind, setKind] = useState('form');
  const [seed, setSeed] = useState('');
  const [shape, setShape] = useState('circle');
  const [hue, setHue] = useState(190);
  const [mode, setMode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [event, setEvent] = useState('');
  const [copied, setCopied] = useState(false);

  const steps = stepsOf(relay);
  const count = relay?.step_count ?? steps.length;
  const complete = relay?.status === 'complete' || count >= MAX_STEPS;
  const artifact = payloadOf(relay);
  const actions = artifact.type === 'form' ? FORM_ACTIONS : artifact.type === 'color' ? COLOR_ACTIONS : TEXT_ACTIONS;

  const loadHistory = () => safeJson(localStorage.getItem(PULSES_KEY) || '[]', []);
  const writeHistory = (entry) => {
    const current = loadHistory();
    const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 24);
    localStorage.setItem(PULSES_KEY, JSON.stringify(next));
    setMyPulses(next);
  };
  const sessionMap = () => safeJson(localStorage.getItem(SESSIONS_KEY) || '{}', {});
  const saveSession = (id, data) => {
    const sessions = sessionMap();
    sessions[id] = data;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  };

  useEffect(() => {
    setMyPulses(loadHistory());
    const sessions = sessionMap();
    const ids = Object.keys(sessions);
    const latest = ids.at(-1);
    if (!latest) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from('relays').select('*').eq('id', latest).maybeSingle();
      if (!alive || !data) return;
      const session = sessions[latest] || {};
      setRelay(data); setRole(session.role || 'creator'); setToken(session.token || '');
      setScreen(data.status === 'complete' ? 'result' : 'waiting');
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!relay?.id) return undefined;
    const channel = supabase.channel(`pulse-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, (payload) => {
      setRelay(payload.new);
      setEvent(payload.new.step_count > count ? 'PULSE MOVED' : payload.new.status === 'active' ? 'STRANGER JOINED' : 'PULSE UPDATED');
      window.setTimeout(() => setEvent(''), 1800);
      if (payload.new.status === 'complete') setScreen('result');
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id, count]);

  const createPulse = async () => {
    setError(''); setBusy(true);
    if (kind === 'text' && seed.trim().length < 4) { setBusy(false); return setError('Give the Pulse a starting idea.'); }
    const payload = seedPayload(kind, seed, shape, hue);
    const { data, error: dbError } = await supabase.rpc('create_relay', { p_seed: payload });
    setBusy(false);
    if (dbError) return setError(dbError.message);
    setRelay(data); setRole('creator'); setToken(''); saveSession(data.id, { role: 'creator', token: '' }); writeHistory({ id: data.id, role: 'creator', seed: data.seed, status: data.status, updatedAt: Date.now() }); setEvent('PULSE CREATED'); setScreen('waiting');
  };

  const joinPulse = async () => {
    setError(''); setBusy(true);
    const { data, error: dbError } = await supabase.rpc('claim_relay');
    setBusy(false);
    if (dbError) return setError(dbError.message);
    if (!data) return setError('No Pulse is waiting right now. Leave one in the pool and try again.');
    setRelay(data.relay); setRole('stranger'); setToken(data.token); saveSession(data.relay.id, { role: 'stranger', token: data.token }); writeHistory({ id: data.relay.id, role: 'stranger', seed: data.relay.seed, status: data.relay.status, updatedAt: Date.now() }); setEvent('STRANGER JOINED'); setScreen('turn');
  };

  const submitMove = async () => {
    if (!relay || !token || !mode) return;
    setBusy(true); setError('');
    let output;
    if (artifact.type === 'text') {
      const label = { STRANGER: 'stranger', SOFTER: 'softer', BIGGER: 'bigger' }[mode];
      output = JSON.stringify({ type: 'text', text: `${artifact.text} → ${label}.` });
    } else {
      output = JSON.stringify(mutate(artifact, mode, count));
    }
    const { data, error: dbError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output });
    setBusy(false);
    if (dbError) return setError(dbError.message);
    setRelay(data); saveSession(relay.id, { role, token: '' }); setToken(''); setMode(''); writeHistory({ id: data.id, role, seed: data.seed, status: data.status, updatedAt: Date.now() }); setEvent(data.status === 'complete' ? 'PULSE COMPLETE' : 'MOVE PASSED'); setScreen(data.status === 'complete' ? 'result' : 'waiting');
  };

  const resumePulse = async (entry) => {
    setError(''); setBusy(true);
    const { data, error: dbError } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle();
    setBusy(false);
    if (dbError || !data) return setError('That Pulse is no longer available.');
    const session = sessionMap()[entry.id] || {};
    setRelay(data); setRole(entry.role); setToken(session.token || ''); setScreen(data.status === 'complete' ? 'result' : session.token ? 'turn' : 'waiting');
  };

  const goHome = () => setScreen('home');
  const newPulse = () => { setRelay(null); setRole(''); setToken(''); setMode(''); setSeed(''); setScreen('home'); setError(''); setEvent(''); };
  const copyId = async () => { if (!relay?.id) return; await navigator.clipboard.writeText(relay.id); setCopied(true); window.setTimeout(() => setCopied(false), 1000); };

  const creationPreview = useMemo(() => {
    if (kind === 'text') return { type: 'text', text: seed || STARTERS[0] };
    if (kind === 'color') return { type: 'color', hue, sat: 84, light: 58, angle: 28 };
    return { type: 'form', shape, hue, size: 1, rotation: 0, glow: .22 };
  }, [kind, seed, shape, hue]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#090A0F] text-white selection:bg-cyan-300 selection:text-[#090A0F]">
      <div className="pulse-grid" />
      <div className="pulse-grain" />
      <motion.div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-cyan-300/[0.05] blur-3xl" animate={{ x: [0, 50, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.15, .9, 1] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="pointer-events-none absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-purple-400/[0.045] blur-3xl" animate={{ x: [0, -30, 20, 0], y: [0, 22, -18, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />

      <header className="relative z-20 mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <button onClick={goHome} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-black tracking-[0.18em] hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-95 transition-transform">
          PULSE <span className="text-cyan-300">●</span>
        </button>
        <div className="hidden items-center gap-3 text-xs font-semibold text-white/55 sm:flex"><span>HUMAN RELAY / 03</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5"><span className="h-1.5 w-1.5 rounded-full bg-lime-300 pulse-lime-glow" /> LIVE</span></div>
        <div className="flex items-center gap-2">
          <MotionButton onClick={() => setScreen('mine')} className="bg-[#12141C]/80 text-white/80 hover:bg-[#171a24]"><Clock3 size={15} /> MY PULSES</MotionButton>
          <MotionButton onClick={newPulse} className="bg-transparent text-white/55 hover:bg-white/[0.04]"><RotateCcw size={15} /> NEW</MotionButton>
        </div>
      </header>

      <AnimatePresence>{event && <motion.div initial={{ y: -12, opacity: 0, scale: .96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -8, opacity: 0 }} transition={spring} className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#12141C]/90 px-4 py-2 text-xs font-bold tracking-[0.16em] text-white shadow-[0_0_15px_rgba(85,231,255,.12)] backdrop-blur-md">{event}</motion.div>}</AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.section key="home" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={softSpring} className="relative z-10 mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-7xl items-center px-5 pb-8 sm:px-8">
            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.05fr_.95fr]">
              <div className="flex min-h-[420px] flex-col justify-center lg:min-h-0">
                <span className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-white/45">One small thing. Three strangers.</span>
                <h1 className="max-w-3xl text-[clamp(3.5rem,8vw,7.5rem)] font-black leading-[.88] tracking-[-0.08em]">Start<br /><span className="text-cyan-300">something.</span></h1>
                <p className="mt-6 max-w-xl text-sm leading-6 text-white/60 sm:text-base">Create a Pulse, leave it behind, and let another person change it. The next move is never yours to predict.</p>
                <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.14em] text-white/45"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />No feed</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" />No profiles</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Only the relay</span></div>
              </div>

              <motion.div layout className="flex min-h-[520px] items-center justify-center rounded-3xl border border-white/10 bg-[#12141C]/82 p-5 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,.03)] sm:p-7">
                <div className="w-full max-w-lg">
                  <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Create</p><p className="mt-1 text-sm font-semibold text-white">Choose what gets passed on.</p></div><span className="font-mono text-xs text-white/40">01 / 03</span></div>
                  <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/10 p-1">
                    {[['text', Type, 'TEXT'], ['form', Shapes, 'FORM'], ['color', Palette, 'COLOR']].map(([value, Icon, label]) => <button key={value} onClick={() => setKind(value)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold transition ${kind === value ? 'bg-white/[0.09] text-white' : 'text-white/40 hover:bg-white/[0.04] hover:text-white/75'} focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-[.97]`}><Icon size={15} /> {label}</button>)}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-[#0E1016] p-4">
                    <div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Preview</span><span className="font-mono text-xs text-white/35">{kind.toUpperCase()}</span></div>
                    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] p-5"><VisualArtifact payload={creationPreview} /></div>
                  </div>

                  {kind === 'text' && <div className="mt-4"><textarea value={seed} onChange={(e) => setSeed(e.target.value)} maxLength={180} placeholder="Give the next person a starting idea…" className="h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#0E1016] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/40 focus:outline-none" /> <div className="mt-2 flex flex-wrap gap-2">{STARTERS.map((item) => <button key={item} onClick={() => setSeed(item)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-white/20 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-95">{item}</button>)}</div></div>}
                  {kind === 'form' && <div className="mt-4 grid grid-cols-[1fr_auto] gap-4"><div><p className="mb-2 text-xs font-bold text-white/45">FORM</p><div className="grid grid-cols-4 gap-2">{FORM_SHAPES.map((item) => <button key={item} onClick={() => setShape(item)} className={`h-11 rounded-xl border text-xs font-bold uppercase transition ${shape === item ? 'border-cyan-300/50 bg-cyan-300/[0.06] text-cyan-200' : 'border-white/10 bg-white/[0.02] text-white/45 hover:border-white/20'} focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-95`}>{item}</button>)}</div></div><div><p className="mb-2 text-xs font-bold text-white/45">COLOR</p><div className="flex gap-2">{COLORS.map((color) => <button key={color.label} aria-label={color.label} onClick={() => setHue(color.hue)} className={`h-11 w-11 rounded-xl border transition ${hue === color.hue ? 'border-white/60' : 'border-white/10'} focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-95`} style={{ background: `hsl(${color.hue} 88% 62%)` }} />)}</div></div></div>}
                  {kind === 'color' && <div className="mt-4"><p className="mb-2 text-xs font-bold text-white/45">CHOOSE A COLOR</p><div className="grid grid-cols-4 gap-2">{COLORS.map((color) => <button key={color.label} onClick={() => setHue(color.hue)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${hue === color.hue ? 'border-white/40 bg-white/[0.06]' : 'border-white/10 bg-white/[0.02] hover:border-white/20'} focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-95`}><span className="h-3 w-3 rounded-full" style={{ background: `hsl(${color.hue} 88% 62%)` }} />{color.label}</button>)}</div></div>}

                  <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2"><MotionButton onClick={createPulse} disabled={busy} className="bg-white text-[#090A0F] hover:bg-white/90">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />} START A PULSE <ArrowRight size={16} /></MotionButton><MotionButton onClick={joinPulse} disabled={busy} className="bg-[#12141C] text-white/80 hover:bg-[#171a24]"><Users size={16} /> JOIN A STRANGER'S PULSE</MotionButton></div>
                  {error && <p className="mt-3 rounded-xl border border-red-300/20 bg-red-300/[0.04] px-3 py-2 text-xs font-semibold text-red-200 break-words">{error}</p>}
                </div>
              </motion.div>
            </div>
          </motion.section>
        )}

        {screen === 'mine' && (
          <motion.section key="mine" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={softSpring} className="relative z-10 mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-5xl items-center px-5 pb-8 sm:px-8">
            <div className="w-full rounded-3xl border border-white/10 bg-[#12141C]/82 p-5 backdrop-blur-md sm:p-7"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Local memory</p><h2 className="mt-1 text-4xl font-black tracking-[-0.06em]">Your pulses.</h2></div><span className="font-mono text-xs text-white/40">{String(myPulses.length).padStart(2,'0')} SAVED</span></div><div className="mt-5 grid gap-2 overflow-y-auto pr-1 sm:max-h-[62dvh]">{myPulses.length === 0 ? <div className="rounded-2xl border border-white/10 bg-[#0E1016] p-6 text-sm text-white/55">No saved Pulses yet. Start one and leave it in the pool.</div> : myPulses.map((item) => <motion.button key={item.id} whileHover={{ x: 3 }} whileTap={{ scale: .985 }} transition={spring} onClick={() => resumePulse(item)} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0E1016] px-4 py-4 text-left transition hover:border-white/20 focus-visible:outline-2 focus-visible:outline-cyan-300"><span className={`h-2.5 w-2.5 rounded-full ${item.status === 'complete' ? 'bg-lime-300' : 'bg-cyan-300'}`} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold uppercase tracking-[0.14em] text-white/40">{item.role === 'creator' ? 'YOU STARTED' : 'YOU JOINED'} · {item.status?.toUpperCase()}</span><span className="mt-1 block truncate text-sm font-semibold text-white/80">{safeJson(item.seed, null)?.type ? `${safeJson(item.seed, {}).type.toUpperCase()} PULSE` : item.seed}</span></span><span className="font-mono text-xs text-white/35">{String(item.id).slice(0, 8).toUpperCase()}</span><ArrowRight size={16} className="text-white/35" /></motion.button>)}</div></div>
          </motion.section>
        )}

        {screen === 'waiting' && relay && !complete && (
          <motion.section key="waiting" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={softSpring} className="relative z-10 mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl items-center px-5 pb-8 sm:px-8">
            <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[1fr_1.15fr]">
              <div className="rounded-3xl border border-white/10 bg-[#12141C]/82 p-6 backdrop-blur-md sm:p-8"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />{role === 'creator' ? 'Waiting for a stranger' : 'Move passed on'}</div><h2 className="mt-5 text-5xl font-black leading-[.92] tracking-[-0.07em] sm:text-6xl">{role === 'creator' ? <>Your spark is<br /><span className="text-cyan-300">out there.</span></> : <>Your move is<br /><span className="text-lime-300">in motion.</span></>}</h2><p className="mt-5 max-w-lg text-sm leading-6 text-white/55">{role === 'creator' ? 'You do not need to keep this screen open. The Pulse stays in the network until another person picks it up.' : 'Someone else can continue this Pulse now. Your screen can stay closed; the relay keeps moving.'}</p><div className="mt-8 flex items-center gap-2 text-xs text-white/40"><span className="font-mono">{String(count).padStart(2, '0')}</span><span>/</span><span className="font-mono">03 MOVES</span><span className="ml-auto flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" />LIVE</span></div></div>
              <div className="rounded-3xl border border-white/10 bg-[#0E1016] p-5 sm:p-7"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Pulse trace</span><span className="font-mono text-xs text-white/35">{String(count).padStart(2,'0')} / 03</span></div><div className="mt-4 rounded-2xl border border-white/10 bg-[#12141C] p-5"><div className="flex justify-center border-b border-white/8 pb-5"><VisualArtifact payload={artifact} large /></div><div className="mt-5 space-y-3">{[{ label:'START', value: payloadOf({ seed: relay.seed }).text || 'Pulse started' }, ...steps.map((step, i) => ({ label: `STRANGER ${i + 1}`, value: payloadOf({ seed: step.output }).text || 'Visual move' }))].map((item, i) => <motion.div key={`${i}-${item.label}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...softSpring, delay: i * .08 }} className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/20" /><div className="min-w-0"><span className="text-xs font-bold uppercase tracking-[0.12em] text-white/35">{item.label}</span><p className="mt-1 text-sm leading-5 text-white/75 break-words">{item.value}</p></div></motion.div>)}</div></div><div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#12141C] px-4 py-3"><span className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">Pulse ID</span><div className="flex items-center gap-2"><span className="font-mono text-xs text-white/55">{String(relay.id).slice(0, 8).toUpperCase()}</span><button onClick={copyId} className="rounded-xl p-2 text-white/40 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-95">{copied ? <Check size={15} /> : <Copy size={15} />}</button></div></div></div>
            </div>
          </motion.section>
        )}

        {screen === 'turn' && relay && !complete && (
          <motion.section key="turn" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={softSpring} className="relative z-10 mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl items-center px-5 pb-8 sm:px-8">
            <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[.86fr_1.14fr]">
              <div className="rounded-3xl border border-white/10 bg-[#12141C]/82 p-6 backdrop-blur-md sm:p-7"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">The relay so far</span><span className="font-mono text-xs text-white/35">{String(count).padStart(2,'0')} / 03</span></div><div className="mt-7 rounded-2xl border border-white/10 bg-[#0E1016] p-5"><VisualArtifact payload={artifact} large /><div className="mt-5 border-t border-white/8 pt-4"><span className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">Current artifact</span><p className="mt-2 text-sm text-white/65">You are looking at what the previous stranger left behind.</p></div></div><div className="mt-4 flex gap-2">{Array.from({ length: MAX_STEPS }).map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < count ? 'bg-lime-300' : 'bg-white/10'}`} />)}</div></div>
              <div className="rounded-3xl border border-white/10 bg-[#12141C]/82 p-6 backdrop-blur-md sm:p-7"><span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Your turn</span><h2 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Make one move.</h2><p className="mt-3 text-sm leading-6 text-white/55">No essays. No profile. Just change the thing once.</p><div className="mt-6 grid gap-2">{actions.map(([code, label]) => <motion.button key={code} whileHover={{ y: -2, scale: 1.015 }} whileTap={{ scale: .975 }} transition={spring} onClick={() => setMode(code)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-2 focus-visible:outline-cyan-300 ${mode === code ? 'border-cyan-300/45 bg-cyan-300/[0.06]' : 'border-white/10 bg-[#0E1016] hover:border-white/20'}`}><span><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs text-white/40">{artifact.type === 'form' ? 'Change the visual object.' : artifact.type === 'color' ? 'Change its visual energy.' : 'Push the idea forward.'}</span></span><ArrowRight size={17} className={mode === code ? 'text-cyan-300' : 'text-white/25'} /></motion.button>)} </div><MotionButton onClick={submitMove} disabled={!mode || busy} className="mt-4 w-full bg-white text-[#090A0F] hover:bg-white/90">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Waves size={16} />} PASS IT ON</MotionButton>{error && <p className="mt-3 rounded-xl border border-red-300/20 bg-red-300/[0.04] px-3 py-2 text-xs font-semibold text-red-200 break-words">{error}</p>}</div>
            </div>
          </motion.section>
        )}

        {screen === 'result' && relay && (
          <motion.section key="result" initial={{ opacity: 0, scale: .985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={softSpring} className="relative z-10 mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-5xl items-center px-5 pb-8 sm:px-8"><div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="rounded-3xl border border-white/10 bg-[#12141C]/82 p-6 backdrop-blur-md sm:p-8"><span className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">The relay returned</span><h2 className="mt-3 text-6xl font-black leading-[.9] tracking-[-0.08em] sm:text-7xl">Look what<br /><span className="text-cyan-300">happened.</span></h2><div className="mt-7 flex items-center justify-center rounded-3xl border border-white/10 bg-[#0E1016] p-8"><VisualArtifact payload={artifact} large /></div></div><div className="rounded-3xl border border-white/10 bg-[#12141C]/82 p-6 backdrop-blur-md sm:p-7"><span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Three strangers. One object.</span><div className="mt-5 space-y-3">{[{ label:'START', value: payloadOf({ seed: relay.seed }).text || 'Origin' }, ...steps.map((step, i) => ({ label: `STRANGER ${i + 1}`, value: payloadOf({ seed: step.output }).text || 'Changed it' }))].map((item, i) => <motion.div key={`${i}-${item.label}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring, delay: i * .08 }} className="rounded-2xl border border-white/10 bg-[#0E1016] p-4"><span className="text-xs font-bold uppercase tracking-[0.12em] text-white/35">{item.label}</span><p className="mt-2 text-sm leading-5 text-white/75 break-words">{item.value}</p></motion.div>)}</div><div className="mt-4 grid grid-cols-2 gap-2"><MotionButton onClick={newPulse} className="bg-white text-[#090A0F] hover:bg-white/90"><Sparkles size={16} /> START ANOTHER</MotionButton><MotionButton onClick={copyId} className="bg-[#0E1016] text-white/75 hover:bg-white/[0.06]">{copied ? <Check size={16} /> : <Copy size={16} />} COPY ID</MotionButton></div></div></div></motion.section>
        )}
      </AnimatePresence>
      <footer className="pointer-events-none absolute bottom-3 left-0 right-0 z-20 mx-auto flex max-w-7xl items-center justify-between px-5 text-xs font-semibold text-white/25 sm:px-8"><span>01 / PULSE SYSTEM</span><span className="font-mono">0.6</span></footer>
    </main>
  );
}
