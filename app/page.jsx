'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Copy, LoaderCircle, Radio, RotateCcw, Sparkles, Users, Waves, Clock3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MAX_STEPS = 3;
const STORAGE_KEY = 'pulse:v4:session';
const STARTERS = [
  'A vending machine that only appears at midnight.',
  'The sound of rain on a city nobody has visited.',
  'A tiny door hidden somewhere in this room.',
];
const MODES = [
  { title: 'MAKE IT STRANGER', code: 'STRANGER', copy: 'Push the idea somewhere unexpected.' },
  { title: 'MAKE IT SOFTER', code: 'SOFTER', copy: 'Give it a warmer, more human direction.' },
  { title: 'MAKE IT BIGGER', code: 'BIGGER', copy: 'Scale the idea until it feels impossible.' },
];

function readSteps(relay) { return Array.isArray(relay?.steps) ? relay.steps : []; }
function latestOutput(relay) { const steps = readSteps(relay); return steps.length ? steps[steps.length - 1].output : relay.seed; }
function buildOutput(source, mode) { const label = { STRANGER: 'stranger', SOFTER: 'softer', BIGGER: 'bigger' }[mode] || 'different'; return `${source} → ${label}.`; }
function readSession() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
function writeSession(patch) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSession(), ...patch })); } catch {} }
function clearSession() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [token, setToken] = useState('');
  const [seed, setSeed] = useState('');
  const [mode, setMode] = useState('');
  const [detail, setDetail] = useState('');
  const [role, setRole] = useState('');
  const [liveEvent, setLiveEvent] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [myPulses, setMyPulses] = useState([]);
  const steps = readSteps(relay);
  const currentCount = relay?.step_count ?? steps.length;
  const isComplete = relay?.status === 'complete' || currentCount >= MAX_STEPS;
  const source = relay ? latestOutput(relay) : '';

  const rememberPulse = (nextRelay, nextRole, nextToken = '') => {
    if (!nextRelay?.id) return;
    const entry = { id: nextRelay.id, role: nextRole, seed: nextRelay.seed, status: nextRelay.status, updatedAt: Date.now() };
    setMyPulses(prev => [entry, ...prev.filter(p => p.id !== nextRelay.id)].slice(0, 12));
    writeSession({ relayId: nextRelay.id, role: nextRole, token: nextToken });
  };

  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem('pulse:v4:pulses') || '[]'); if (Array.isArray(raw)) setMyPulses(raw); } catch {}
    const saved = readSession();
    if (!saved.relayId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('relays').select('*').eq('id', saved.relayId).single();
      if (cancelled || !data) { clearSession(); return; }
      setRelay(data); setRole(saved.role || 'stranger'); setToken(saved.token || '');
      setScreen(data.status === 'complete' ? 'result' : saved.role === 'creator' ? 'waiting' : saved.token ? 'turn' : 'waiting');
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { try { localStorage.setItem('pulse:v4:pulses', JSON.stringify(myPulses)); } catch {} }, [myPulses]);

  useEffect(() => {
    if (!relay?.id) return undefined;
    let alive = true;
    const refresh = async () => {
      const { data } = await supabase.from('relays').select('*').eq('id', relay.id).single();
      if (!alive || !data) return;
      setRelay(data);
      setMyPulses(prev => prev.map(p => p.id === data.id ? { ...p, status: data.status, updatedAt: Date.now() } : p));
      if (data.status === 'complete') setScreen('result');
    };
    refresh();
    const channel = supabase.channel(`relay:${relay.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'relays', filter: `id=eq.${relay.id}` }, payload => {
      const next = payload.new; if (!alive) return;
      setRelay(next); setMyPulses(prev => prev.map(p => p.id === next.id ? { ...p, status: next.status, updatedAt: Date.now() } : p));
      setLiveEvent(next.step_count > currentCount ? 'A STRANGER JUST MOVED THE PULSE' : next.status === 'active' ? 'STRANGER JOINED' : 'PULSE UPDATED');
      if (next.status === 'complete') setScreen('result');
      window.setTimeout(() => setLiveEvent(''), 2400);
    }).subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [relay?.id]);

  const currentInstruction = useMemo(() => {
    if (!relay) return '';
    if (currentCount === 0) return 'Choose one instinct. No essays. One move.';
    if (currentCount === 1) return 'Add one tiny detail that changes the direction.';
    return 'Name what this has become. One short title.';
  }, [relay, currentCount]);

  const createRelay = async (value = seed) => {
    setError(''); const clean = value.trim(); if (clean.length < 4) return setError('Give the Pulse something to start with.');
    setBusy(true); const { data, error: dbError } = await supabase.rpc('create_relay', { p_seed: clean }); setBusy(false);
    if (dbError) return setError(dbError.message);
    setRelay(data); setRole('creator'); setToken(''); rememberPulse(data, 'creator'); setSeed(''); setLiveEvent('PULSE CREATED'); setScreen('waiting');
  };

  const joinPulse = async () => {
    setError(''); setBusy(true); const { data, error: dbError } = await supabase.rpc('claim_relay'); setBusy(false);
    if (dbError) return setError(dbError.message); if (!data) return setError('No Pulse is waiting right now. Start one and become the first spark.');
    setRelay(data.relay); setToken(data.token); setRole('stranger'); rememberPulse(data.relay, 'stranger', data.token); setMode(''); setDetail(''); setLiveEvent('STRANGER JOINED'); setScreen('turn');
  };

  const submitStep = async () => {
    setError(''); if (!relay || !token) return;
    if (currentCount === 0 && !mode) return setError('Choose one instinct.');
    if (currentCount === 1 && detail.trim().length < 2) return setError('Add one small detail.');
    if (currentCount === 2 && detail.trim().length < 2) return setError('Give it a short title.');
    let output = source; if (currentCount === 0) output = buildOutput(source, mode); if (currentCount === 1) output = `${source} → detail: ${detail.trim()}`; if (currentCount === 2) output = `${detail.trim()} — born from ${source}`;
    setBusy(true); const { data, error: dbError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output.slice(0, 180) }); setBusy(false);
    if (dbError) return setError(dbError.message);
    setRelay(data); setToken(''); setMode(''); setDetail(''); writeSession({ token: '', status: data.status }); setScreen(data.status === 'complete' ? 'result' : 'waiting');
  };

  const resumePulse = async (entry) => {
    setBusy(true); const { data, error: dbError } = await supabase.from('relays').select('*').eq('id', entry.id).single(); setBusy(false);
    if (dbError || !data) { setError('That Pulse is no longer available.'); return; }
    setRelay(data); setRole(entry.role); const saved = readSession(); setToken(saved.relayId === entry.id ? saved.token || '' : '');
    setScreen(data.status === 'complete' ? 'result' : entry.role === 'stranger' && saved.relayId === entry.id && saved.token ? 'turn' : 'waiting');
  };

  const reset = () => { setRelay(null); setToken(''); setSeed(''); setMode(''); setDetail(''); setRole(''); setLiveEvent(''); setError(''); setCopied(false); clearSession(); setScreen('home'); };
  const copyId = async () => { if (!relay?.id) return; await navigator.clipboard.writeText(relay.id); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };

  return (
    <main className="pulse-app">
      <div className="ambient ambient-a" /><div className="ambient ambient-b" /><div className="ambient ambient-c" />
      <header className="pulse-nav"><button className="brand" onClick={reset}>PULSE<span className="brand-dot">·</span></button><div className="nav-center"><span>HUMAN RELAY / 03</span><span className="live-dot"><Radio size={13} /> LIVE</span></div><div className="nav-actions"><button className="nav-reset" onClick={() => setScreen('mine')}><Clock3 size={15} /> MY PULSES</button><button className="nav-reset" onClick={reset}><RotateCcw size={15} /> NEW</button></div></header>
      {liveEvent && <div className="live-toast"><span className="toast-dot" />{liveEvent}</div>}

      {screen === 'home' && <section className="screen home-screen"><div className="grid-label">01 — START</div><div className="home-grid"><div className="hero-lockup"><p className="kicker">A HUMAN RELAY</p><h1>Start<br /><em>something.</em></h1><p className="hero-sub">One small spark moves through three people. Each person makes one move. Nobody sees the end coming.</p><div className="hero-signal"><span className="signal-line" /><span>LIVE HUMAN SYSTEM</span><Waves size={14} /></div></div><div className="launch-panel glass-panel"><div className="panel-index">01 / CREATE</div><label>SEED THE PULSE</label><textarea value={seed} onChange={e => setSeed(e.target.value)} placeholder="Give the next person something to transform…" maxLength={180} /><button className="black-button" onClick={() => createRelay()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} START A PULSE <ArrowRight size={17} /></button><div className="starter-list">{STARTERS.map(item => <button key={item} onClick={() => setSeed(item)}>{item}</button>)}</div><div className="split-line"><span>OR</span></div><button className="outline-button" onClick={joinPulse} disabled={busy}><Users size={17} /> JOIN A STRANGER'S PULSE <ArrowRight size={17} /></button></div></div>{error && <div className="error-bar">{error}</div>}<div className="home-foot"><span>NO PROFILES</span><span>NO FEED</span><span>JUST THE RELAY</span></div></section>}

      {screen === 'mine' && <section className="screen waiting-screen"><div className="grid-label">01 — YOUR PULSES</div><div className="mine-wrap glass-panel"><div className="result-top"><div><p className="kicker">LOCAL MEMORY</p><h2>Your<br /><em>pulses.</em></h2></div><div className="result-stamp"><span>{String(myPulses.length).padStart(2,'0')}</span><small>SAVED</small></div></div>{myPulses.length === 0 ? <div className="empty-state"><p>No saved Pulses yet.</p><button className="black-button" onClick={() => setScreen('home')}><Sparkles size={17}/> START YOUR FIRST PULSE <ArrowRight size={17}/></button></div> : <div className="pulse-list">{myPulses.map(p => <button className="pulse-list-item" key={p.id} onClick={() => resumePulse(p)}><span className={`status-mark ${p.status === 'complete' ? 'complete' : ''}`} /><span className="pulse-list-copy"><small>{p.role === 'creator' ? 'YOU STARTED' : 'YOU JOINED'} · {p.status?.toUpperCase()}</small><strong>{p.seed}</strong></span><span className="pulse-list-id">{String(p.id).slice(0,8).toUpperCase()} <ArrowRight size={16}/></span></button>)}</div>}{error && <div className="error-bar">{error}</div>}</div></section>}

      {screen === 'waiting' && relay && !isComplete && <section className="screen waiting-screen"><div className="grid-label">02 — THE PULSE IS MOVING</div><div className="waiting-grid"><div><p className="kicker"><span className="pulse-ring" /> {currentCount === 0 ? 'WAITING FOR A STRANGER' : 'A STRANGER JUST MOVED IT'}</p><h2>{role === 'creator' ? <>Someone else<br /><em>has your spark.</em></> : <>You just moved<br /><em>someone's spark.</em></>}</h2><p className="waiting-copy">{currentCount === 0 ? 'Keep this open. A stranger can pick it up from the live Pulse pool. You can also close this tab — your Pulse is saved.' : 'Your move is now part of the relay. The next stranger can continue it.'}</p><div className="live-relay glass-panel"><div className="live-relay-head"><span>LIVE TRACE</span><span>{currentCount} / 3 MOVES</span></div><div className="relay-stream"><div className="stream-item seed-item"><span className="stream-dot" /><div><small>STARTER</small><p>{relay.seed}</p></div></div>{steps.map((step,index)=><div className="stream-item reveal-item" key={`${index}-${step.at}`}><span className="stream-dot" /><div><small>STRANGER {index + 1}</small><p>{step.output}</p></div></div>)}{currentCount < 3 && <div className="stream-item ghost-item"><span className="stream-dot waiting-dot" /><div><small>NEXT STRANGER</small><p>Waiting for a human to continue this.</p></div></div>}</div></div><div className="relay-id-box"><span>PULSE ID</span><strong>{String(relay.id).slice(0, 8).toUpperCase()}</strong><button onClick={copyId}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></div></div><div className="waiting-orbit"><div className="orbit-sweep" /><div className="orbit-core"><span>{String(currentCount).padStart(2,'0')}</span><small>/ 03</small></div>{[0,1,2].map(i=><span key={i} className={`orbit-node node-${i} ${i < currentCount ? 'done' : ''}`} />)}</div></div></section>}

      {screen === 'turn' && relay && !isComplete && <section className="screen turn-screen"><div className="grid-label">{String(currentCount + 2).padStart(2,'0')} — YOUR TURN</div><div className="turn-layout"><aside className="source-column"><span className="kicker">THE RELAY SO FAR</span><div className="source-number">{String(currentCount + 1).padStart(2,'0')}</div><div className="history-mini"><div><small>START</small><p>{relay.seed}</p></div>{steps.map((s,i)=><div key={`${i}-${s.at}`}><small>STRANGER {i + 1}</small><p>{s.output}</p></div>)}</div><div className="mini-status"><span>{currentCount}/03 MOVES</span><span>STRANGER</span></div></aside><div className="action-column"><span className="kicker">A TINY TASK</span><h2>{currentInstruction}</h2>{currentCount === 0 && <div className="choice-grid">{MODES.map(item=><button key={item.code} className={`choice-card ${mode === item.code ? 'selected' : ''}`} onClick={()=>setMode(item.code)}><strong>{item.title}</strong><span>{item.copy}</span><i>{mode === item.code ? '✓' : '↗'}</i></button>)}</div>}{currentCount === 1 && <div className="short-input"><input value={detail} onChange={e=>setDetail(e.target.value)} maxLength={60} placeholder="e.g. a red light flickering in an empty station" autoFocus /><span>{detail.length}/60</span></div>}{currentCount === 2 && <div className="short-input"><input value={detail} onChange={e=>setDetail(e.target.value)} maxLength={48} placeholder="Give the final form a name" autoFocus /><span>{detail.length}/48</span></div>}<button className="black-button large" onClick={submitStep} disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />} PASS IT ON</button>{error && <div className="inline-error">{error}</div>}</div></div></section>}

      {screen === 'result' && relay && <section className="screen result-screen"><div className="grid-label">04 — RESULT</div><div className="result-top"><div><p className="kicker">THE RELAY RETURNED</p><h2>Look what<br /><em>happened.</em></h2></div><div className="result-stamp"><span>03</span><small>HUMANS</small></div></div><div className="timeline-final"><div className="final-seed"><span>00 · START</span><p>{relay.seed}</p></div>{steps.map((step,index)=><div className="final-step" key={`${index}-${step.at}`}><span>{String(index+1).padStart(2,'0')} · STRANGER</span><p>{step.output}</p></div>)}</div><div className="result-actions"><button className="black-button" onClick={()=>{clearSession();setScreen('home');setRelay(null)}}><Sparkles size={17} /> START ANOTHER <ArrowRight size={17} /></button><button className="outline-button" onClick={copyId}>{copied ? <Check size={17}/> : <Copy size={17}/>} COPY PULSE ID</button></div></section>}
      <footer className="pulse-footer"><span>01 / START</span><span>HUMAN RELAY</span><span>0.4</span></footer>
    </main>
  );
}
