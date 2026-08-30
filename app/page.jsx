'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Copy, LoaderCircle, Radio, RotateCcw, Sparkles, Users, Waves } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MAX_STEPS = 3;
const POLL_MS = 900;

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
function buildOutput(source, mode, detail) {
  const clean = detail.trim();
  const label = { STRANGER: 'stranger', SOFTER: 'softer', BIGGER: 'bigger' }[mode];
  return clean ? `${source} → ${label}: ${clean}` : `${source} → ${label}.`;
}

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [relay, setRelay] = useState(null);
  const [token, setToken] = useState('');
  const [seed, setSeed] = useState('');
  const [mode, setMode] = useState('');
  const [detail, setDetail] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const steps = readSteps(relay);
  const currentCount = relay?.step_count ?? steps.length;
  const isComplete = relay?.status === 'complete' || currentCount >= MAX_STEPS;
  const source = relay ? latestOutput(relay) : '';

  const currentInstruction = useMemo(() => {
    if (!relay) return '';
    if (currentCount === 0) return 'Choose one instinct. No essays. One move.';
    if (currentCount === 1) return 'Add one tiny detail that changes the direction.';
    return 'Name what this has become. One short title.';
  }, [relay, currentCount]);

  useEffect(() => {
    if (!relay?.id) return undefined;
    const poll = async () => {
      const { data } = await supabase.from('relays').select('*').eq('id', relay.id).single();
      if (data) {
        setRelay(data);
        if (data.status === 'complete') setScreen('result');
      }
    };
    const timer = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(timer);
  }, [relay?.id]);

  const createRelay = async (value = seed) => {
    setError(''); const clean = value.trim();
    if (clean.length < 4) return setError('Give the Pulse something to start with.');
    setBusy(true);
    const { data, error: dbError } = await supabase.rpc('create_relay', { p_seed: clean });
    setBusy(false); if (dbError) return setError(dbError.message);
    setRelay(data); setSeed(''); setScreen('waiting');
  };

  const joinPulse = async () => {
    setError(''); setBusy(true);
    const { data, error: dbError } = await supabase.rpc('claim_relay');
    setBusy(false); if (dbError) return setError(dbError.message);
    if (!data) return setError('No Pulse is waiting right now. Start one and become the first spark.');
    setRelay(data.relay); setToken(data.token); setMode(''); setDetail(''); setScreen('turn');
  };

  const submitStep = async () => {
    setError('');
    if (!relay || !token) return;
    if (currentCount === 0 && !mode) return setError('Choose one instinct.');
    if (currentCount === 1 && detail.trim().length < 2) return setError('Add one small detail.');
    if (currentCount === 2 && detail.trim().length < 2) return setError('Give it a short title.');
    let output = source;
    if (currentCount === 0) output = buildOutput(source, mode, '');
    if (currentCount === 1) output = buildOutput(source, mode, detail);
    if (currentCount === 2) output = `${detail.trim()} — born from ${source}`;
    setBusy(true);
    const { data, error: dbError } = await supabase.rpc('submit_relay_step', { p_relay_id: relay.id, p_token: token, p_output: output.slice(0, 180) });
    setBusy(false); if (dbError) return setError(dbError.message);
    setRelay(data); setToken(''); setMode(''); setDetail(''); setScreen(data.status === 'complete' ? 'result' : 'waiting');
  };

  const reset = () => { setRelay(null); setToken(''); setSeed(''); setMode(''); setDetail(''); setError(''); setCopied(false); setScreen('home'); };
  const copyId = async () => { if (!relay?.id) return; await navigator.clipboard.writeText(relay.id); setCopied(true); window.setTimeout(() => setCopied(false), 1200); };

  return (
    <main className="pulse-app">
      <div className="ambient ambient-a" /><div className="ambient ambient-b" /><div className="ambient ambient-c" />
      <header className="pulse-nav">
        <button className="brand" onClick={reset}>PULSE<span className="brand-dot">·</span></button>
        <div className="nav-center"><span>HUMAN RELAY / 03</span><span className="live-dot"><Radio size={13} /> LIVE</span></div>
        <button className="nav-reset" onClick={reset}><RotateCcw size={15} /> NEW</button>
      </header>

      {screen === 'home' && <section className="screen home-screen">
        <div className="grid-label">01 — START</div>
        <div className="home-grid">
          <div className="hero-lockup"><p className="kicker">A HUMAN RELAY</p><h1>Start<br /><em>something.</em></h1><p className="hero-sub">One small spark moves through three people. Each person makes one move. Nobody sees the end coming.</p><div className="hero-signal"><span className="signal-line" /><span>LIVE HUMAN SYSTEM</span><Waves size={14} /></div></div>
          <div className="launch-panel glass-panel"><div className="panel-index">01 / CREATE</div><label>SEED THE PULSE</label><textarea value={seed} onChange={e => setSeed(e.target.value)} placeholder="Give the next person something to transform…" maxLength={180} /><button className="black-button" onClick={() => createRelay()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} START A PULSE <ArrowRight size={17} /></button><div className="starter-list">{STARTERS.map(item => <button key={item} onClick={() => setSeed(item)}>{item}</button>)}</div><div className="split-line"><span>OR</span></div><button className="outline-button" onClick={joinPulse} disabled={busy}><Users size={17} /> JOIN A STRANGER'S PULSE <ArrowRight size={17} /></button></div>
        </div>
        {error && <div className="error-bar">{error}</div>}<div className="home-foot"><span>NO PROFILES</span><span>NO FEED</span><span>JUST THE RELAY</span></div>
      </section>}

      {screen === 'waiting' && relay && !isComplete && <section className="screen waiting-screen">
        <div className="grid-label">02 — THE PULSE IS MOVING</div>
        <div className="waiting-grid">
          <div><p className="kicker"><span className="pulse-ring" /> {currentCount === 0 ? 'WAITING FOR A STRANGER' : 'A STRANGER JUST MOVED IT'}</p><h2>Someone else<br /><em>has your spark.</em></h2><p className="waiting-copy">Keep this open. Every change appears here as another person enters the relay.</p>
            <div className="live-relay glass-panel"><div className="live-relay-head"><span>LIVE TRACE</span><span>{currentCount} / 3 MOVES</span></div><div className="relay-stream"><div className="stream-item seed-item"><span className="stream-dot" /><div><small>YOU · STARTED</small><p>{relay.seed}</p></div></div>{steps.map((step,index)=><div className="stream-item reveal-item" key={`${index}-${step.at}`}><span className="stream-dot" /><div><small>STRANGER {index + 1} · JUST MOVED</small><p>{step.output}</p></div></div>)}{currentCount < 3 && <div className="stream-item ghost-item"><span className="stream-dot waiting-dot" /><div><small>NEXT STRANGER</small><p>Waiting for a human to continue this.</p></div></div>}</div></div>
            <div className="relay-id-box"><span>PULSE ID</span><strong>{String(relay.id).slice(0, 8).toUpperCase()}</strong><button onClick={copyId}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></div>
          </div>
          <div className="waiting-orbit"><div className="orbit-sweep" /><div className="orbit-core"><span>{String(currentCount).padStart(2,'0')}</span><small>/ 03</small></div>{[0,1,2].map(i=><span key={i} className={`orbit-node node-${i} ${i < currentCount ? 'done' : ''}`} />)}</div>
        </div>
      </section>}

      {screen === 'turn' && relay && !isComplete && <section className="screen turn-screen">
        <div className="grid-label">{String(currentCount + 2).padStart(2,'0')} — YOUR TURN</div><div className="turn-layout">
          <aside className="source-column"><span className="kicker">THE RELAY SO FAR</span><div className="source-number">{String(currentCount + 1).padStart(2,'0')}</div><div className="history-mini"><div><small>START</small><p>{relay.seed}</p></div>{steps.map((s,i)=><div key={`${i}-${s.at}`}><small>STRANGER {i + 1}</small><p>{s.output}</p></div>)}</div><div className="mini-status"><span>{currentCount}/03 MOVES</span><span>STRANGER</span></div></aside>
          <div className="action-column"><span className="kicker">A TINY TASK</span><h2>{currentInstruction}</h2>{currentCount === 0 && <div className="choice-grid">{MODES.map(item=><button key={item.code} className={`choice-card ${mode === item.code ? 'selected' : ''}`} onClick={()=>setMode(item.code)}><strong>{item.title}</strong><span>{item.copy}</span><i>{mode === item.code ? '✓' : '↗'}</i></button>)}</div>}{currentCount === 1 && <div className="short-input"><input value={detail} onChange={e=>setDetail(e.target.value)} maxLength={60} placeholder="e.g. a red light flickering in an empty station" autoFocus /><span>{detail.length}/60</span></div>}{currentCount === 2 && <div className="short-input"><input value={detail} onChange={e=>setDetail(e.target.value)} maxLength={48} placeholder="Give the final form a name" autoFocus /><span>{detail.length}/48</span></div>}<button className="black-button large" onClick={submitStep} disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />} PASS IT ON</button>{error && <div className="inline-error">{error}</div>}</div>
        </div>
      </section>}

      {screen === 'result' && relay && <section className="screen result-screen"><div className="grid-label">04 — RESULT</div><div className="result-top"><div><p className="kicker">THE RELAY RETURNED</p><h2>Look what<br /><em>happened.</em></h2></div><div className="result-stamp"><span>03</span><small>HUMANS</small></div></div><div className="timeline-final"><div className="final-seed"><span>00 · YOU</span><p>{relay.seed}</p></div>{steps.map((step,index)=><div className="final-step" key={`${index}-${step.at}`}><span>{String(index+1).padStart(2,'0')} · STRANGER</span><p>{step.output}</p></div>)}</div><div className="result-actions"><button className="black-button" onClick={reset}><Sparkles size={17} /> START ANOTHER <ArrowRight size={17} /></button><button className="outline-button" onClick={copyId}>{copied ? <Check size={17}/> : <Copy size={17}/>} COPY PULSE ID</button></div></section>}

      <footer className="pulse-footer"><span>01 / START</span><span>HUMAN RELAY</span><span>0.3</span></footer>
    </main>
  );
}
