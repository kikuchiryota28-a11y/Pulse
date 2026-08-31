'use client';

import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { ArrowUpRight, History, RotateCcw, Type, Circle, Square, Triangle, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const MAX_STEPS = 3;
const HISTORY_KEY = 'pulse:warm:pulses';
const SESSION_KEY = 'pulse:warm:sessions';
const SHAPES = ['circle', 'square', 'triangle', 'organic'];
const STARTER = 'A tiny object that should not exist.';

function parse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function stepsOf(relay) { return Array.isArray(relay?.steps) ? relay.steps : []; }
function artifactOf(relay) {
  const steps = stepsOf(relay);
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const value = parse(steps[i]?.output, null);
    if (value?.type) return value;
  }
  const seed = parse(relay?.seed, null);
  return seed?.type ? seed : { type: 'text', text: relay?.seed || '' };
}
function readSessions() { if (typeof window === 'undefined') return {}; return parse(localStorage.getItem(SESSION_KEY) || '{}', {}); }
function readHistory() { if (typeof window === 'undefined') return []; return parse(localStorage.getItem(HISTORY_KEY) || '[]', []); }
function saveSession(id, value) { const all = readSessions(); all[id] = value; localStorage.setItem(SESSION_KEY, JSON.stringify(all)); }
function saveHistory(entry) { const next = [entry, ...readHistory().filter((x) => x.id !== entry.id)].slice(0, 30); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); }
function seedValue(type, text, shape, hue) {
  if (type === 'text') return JSON.stringify({ v: 3, type, text: text.trim() });
  if (type === 'color') return JSON.stringify({ v: 3, type, hue, sat: 52, light: 58, angle: 22 });
  return JSON.stringify({ v: 3, type: 'form', shape, hue, size: 1, rotation: 0, glow: .15 });
}
function mutate(a, dx, dy) {
  if (a.type === 'text') return { ...a, text: `${a.text} · changed` };
  if (a.type === 'color') return { ...a, hue: (Number(a.hue || 78) + Math.round(dx / 4) + 360) % 360, angle: (Number(a.angle || 22) + Math.round(dy / 5)) % 360 };
  return { ...a, rotation: (Number(a.rotation || 0) + Math.round(dx / 2)) % 360, size: Math.min(1.2, Number(a.size || 1) + .04), shape: Math.abs(dx) > 70 ? SHAPES[(SHAPES.indexOf(a.shape) + (dx > 0 ? 1 : -1) + SHAPES.length) % SHAPES.length] : a.shape };
}

function ObjectView({ payload, size = 210, interactive = false, onThrow }) {
  const x = useMotionValue(0); const y = useMotionValue(0);
  if (!payload) return null;
  const [dragging, setDragging] = useState(false);
  const hue = Number(payload.hue || 78);
  const base = payload.type === 'color' ? `hsl(${hue} ${payload.sat || 52}% ${payload.light || 58}%)` : '#667052';
  const shape = payload.shape === 'square' ? 'rounded-[28%]' : payload.shape === 'organic' ? 'rounded-[54%_46%_62%_38%]' : payload.shape === 'circle' ? 'rounded-full' : '';
  return (
    <motion.div
      drag={interactive}
      dragElastic={.18}
      style={{ x, y, rotate: payload.rotation || 0, width: size, height: size, background: base, clipPath: payload.shape === 'triangle' ? 'polygon(50% 0%,100% 100%,0% 100%)' : undefined, boxShadow: '0 30px 70px rgba(70,62,43,.22), inset 0 1px rgba(255,255,255,.32)' }}
      onDragStart={() => setDragging(true)}
      onDragEnd={(_, info) => { setDragging(false); if (interactive && (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 700)) onThrow?.(info.offset.x, info.offset.y); }}
      whileTap={interactive ? { scale: .94 } : undefined}
      whileHover={interactive ? { scale: 1.025 } : undefined}
      className={`relative touch-none select-none ${interactive ? 'cursor-grab active:cursor-grabbing' : ''} ${shape}`}
      animate={{ scale: dragging ? 1.04 : 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      aria-label="Pulse object"
    >
      <span className="absolute inset-[9%] rounded-full border border-white/20" />
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f3efe5]/75" />
    </motion.div>
  );
}

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [type, setType] = useState('form');
  const [shape, setShape] = useState('circle');
  const [hue, setHue] = useState(78);
  const [seed, setSeed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const artifact = artifactOf(relay);
  const count = relay?.step_count ?? stepsOf(relay).length;

  useEffect(() => { setHistory(readHistory()); }, []);

  useEffect(() => {
    if (!relay?.id) return;
    const channel = supabase.channel(`pulse-${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, ({ new: next }) => {
      setRelay(next);
      if (next.status === 'complete') setScreen('result');
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relay?.id]);

  async function createPulse() {
    if (type === 'text' && seed.trim().length < 4) { setError('Start with a few words.'); return; }
    setBusy(true); setError('');
    const { data, error: dbError } = await supabase.rpc('create_relay', { p_seed: seedValue(type, seed || STARTER, shape, hue) });
    setBusy(false);
    if (dbError) { setError(dbError.message); return; }
    setRelay(data); setRole('creator'); setToken(''); saveSession(data.id, { role: 'creator', token: '' }); saveHistory({ id: data.id, role: 'creator', seed: data.seed, status: data.status, updatedAt: Date.now() }); setHistory(readHistory()); setScreen('waiting');
  }

  async function claimPulse() {
    setBusy(true); setError('');
    const { data, error: dbError } = await supabase.rpc('claim_relay');
    setBusy(false);
    if (dbError) { setError(dbError.message); return; }
    if (!data) { setError('No Pulse is waiting.'); return; }
    setRelay(data.relay); setRole('stranger'); setToken(data.token); saveSession(data.relay.id, { role: 'stranger', token: data.token }); saveHistory({ id: data.relay.id, role: 'stranger', seed: data.relay.seed, status: data.relay.status, updatedAt: Date.now() }); setHistory(readHistory()); setScreen('turn');
  }

  async function passPulse(dx = 140, dy = 0) {
    if (!relay || !token || busy) return;
    setBusy(true); setError('');
    const output = JSON.stringify(mutate(artifact, dx, dy));
    const { data, error: dbError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output });
    setBusy(false);
    if (dbError) { setError(dbError.message); return; }
    setRelay(data); saveSession(relay.id, { role, token: '' }); setToken(''); saveHistory({ id: data.id, role, seed: data.seed, status: data.status, updatedAt: Date.now() }); setHistory(readHistory()); setScreen(data.status === 'complete' ? 'result' : 'waiting');
  }

  async function resume(entry) {
    setBusy(true); setError('');
    const { data, error: dbError } = await supabase.from('relays').select('*').eq('id', entry.id).maybeSingle();
    setBusy(false);
    if (dbError || !data) { setError('That Pulse is gone.'); return; }
    const session = readSessions()[entry.id] || {}; setRelay(data); setRole(entry.role); setToken(session.token || ''); setScreen(data.status === 'complete' ? 'result' : session.token ? 'turn' : 'waiting'); setShowHistory(false);
  }

  function reset() { setScreen('home'); setRelay(null); setToken(''); setRole(''); setError(''); setSeed(''); }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#e8e1d2] text-[#24251f]">
      <div className="pulse-grain" />
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-6 sm:px-9">
        <button onClick={reset} className="text-sm font-black tracking-[.28em]">PULSE</button>
        <button onClick={() => setShowHistory(true)} aria-label="History" className="grid h-10 w-10 place-items-center rounded-full border border-[#24251f]/15 bg-[#f3efe5]/60"><History size={17} strokeWidth={1.6} /></button>
      </header>

      <AnimatePresence mode="wait">
        {screen === 'home' && <motion.section key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center px-6">
          <motion.button onClick={() => setScreen('create')} whileTap={{ scale: .94 }} className="relative grid h-[220px] w-[220px] place-items-center rounded-full bg-[#667052] shadow-[0_35px_90px_rgba(70,62,43,.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#667052]">
            <span className="absolute inset-4 rounded-full border border-white/20" /><span className="h-3 w-3 rounded-full bg-[#f3efe5]" />
          </motion.button>
        </motion.section>}

        {screen === 'create' && <motion.section key="create" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center px-6">
          <div className="flex min-h-[310px] w-full max-w-xl items-center justify-center">
            <ObjectView payload={type === 'text' ? { type, text: seed || STARTER } : type === 'color' ? { type, hue } : { type: 'form', shape, hue }} />
          </div>
          {type === 'text' && <textarea value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="leave a thought" maxLength={120} className="mb-6 w-full max-w-sm resize-none border-b border-[#24251f]/20 bg-transparent px-1 py-3 text-center text-lg outline-none placeholder:text-[#686b5b]/60" rows={2} />}
          <div className="mb-7 flex items-center gap-2 rounded-full border border-[#24251f]/12 bg-[#f3efe5]/55 p-1">
            <button aria-label="Form" onClick={() => setType('form')} className={`grid h-10 w-10 place-items-center rounded-full ${type === 'form' ? 'bg-[#24251f] text-[#f3efe5]' : ''}`}><Circle size={16} /></button>
            <button aria-label="Color" onClick={() => setType('color')} className={`grid h-10 w-10 place-items-center rounded-full ${type === 'color' ? 'bg-[#24251f] text-[#f3efe5]' : ''}`}><Palette size={16} /></button>
            <button aria-label="Text" onClick={() => setType('text')} className={`grid h-10 w-10 place-items-center rounded-full ${type === 'text' ? 'bg-[#24251f] text-[#f3efe5]' : ''}`}><Type size={16} /></button>
          </div>
          {type === 'form' && <div className="mb-6 flex gap-2">
            {SHAPES.slice(0, 3).map((s) => <button key={s} aria-label={s} onClick={() => setShape(s)} className={`grid h-8 w-8 place-items-center rounded-full border ${shape === s ? 'border-[#24251f] bg-[#24251f] text-[#f3efe5]' : 'border-[#24251f]/15'}`}>{s === 'circle' ? <Circle size={12} /> : s === 'square' ? <Square size={12} /> : <Triangle size={12} />}</button>)}
          </div>}
          <button disabled={busy} onClick={createPulse} className="grid h-14 w-14 place-items-center rounded-full bg-[#24251f] text-[#f3efe5] disabled:opacity-40" aria-label="Release Pulse"><ArrowUpRight size={20} /></button>
        </motion.section>}

        {screen === 'waiting' && <motion.section key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center px-6 text-center">
          <motion.div animate={{ scale: [1, 1.035, 1] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}><ObjectView payload={artifact} size={190} /></motion.div>
          {count > 0 && <div className="mt-7 text-xs text-[#686b5b]">{count} / {MAX_STEPS}</div>}
          {role === 'creator' && <button onClick={claimPulse} disabled={busy} aria-label="Find a Pulse" className="mt-7 grid h-11 w-11 place-items-center rounded-full border border-[#24251f]/15 bg-[#f3efe5]/60 disabled:opacity-40"><ArrowUpRight size={16} /></button>}
        </motion.section>}

        {screen === 'turn' && <motion.section key="turn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center px-6">
          <div className="flex h-[430px] w-full items-center justify-center"><ObjectView payload={artifact} interactive onThrow={passPulse} size={210} /></div>
          <div className="mt-3 text-xs text-[#686b5b]">{count + 1} / {MAX_STEPS}</div>
        </motion.section>}

        {screen === 'result' && <motion.section key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center px-6 text-center">
          <ObjectView payload={artifact} size={240} />
          <button onClick={reset} className="mt-10 grid h-12 w-12 place-items-center rounded-full border border-[#24251f]/15 bg-[#f3efe5]/60" aria-label="Again"><RotateCcw size={16} /></button>
        </motion.section>}
      </AnimatePresence>

      {error && <div className="absolute bottom-7 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#ad735c]/25 bg-[#f3efe5] px-4 py-2 text-xs text-[#ad735c]">{error}</div>}

      <AnimatePresence>{showHistory && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-[#e8e1d2]/96 px-6 pt-24 backdrop-blur-sm"><div className="mx-auto max-w-xl"><div className="mb-10 flex items-center justify-between"><h2 className="text-2xl tracking-[-.04em]">History</h2><button onClick={() => setShowHistory(false)} className="text-xs uppercase tracking-[.18em]">close</button></div>{history.length === 0 ? <p className="text-sm text-[#686b5b]">Nothing yet.</p> : <div className="space-y-1">{history.map((entry) => <button key={entry.id} onClick={() => resume(entry)} className="flex w-full items-center justify-between border-b border-[#24251f]/10 py-5 text-left"><span className="text-sm">{entry.role === 'creator' ? 'Your Pulse' : 'A Pulse you found'}</span><span className="text-xs text-[#686b5b]">{entry.status}</span></button>)}</div>}</div></motion.div>}</AnimatePresence>
    </main>
  );
}
